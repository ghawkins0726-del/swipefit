import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, getOrCreateUser, createOrder, sendMessage, createNotification } from '@/lib/db';
import {
  getCoinFlipOfferById,
  updateCoinFlipOfferStatus,
  incrementPaymentStrike,
  suspendUser,
} from '@/lib/db-coin-flip';
import { getStripe } from '@/lib/stripe';
import { Order } from '@/lib/db-types';

const PLATFORM_FEE_PCT = 0.10;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const offer = await getCoinFlipOfferById(id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (offer.buyerId !== buyerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (offer.status !== 'accepted') return NextResponse.json({ error: 'Offer not in accepted state' }, { status: 409 });

  const [buyer, seller, item] = await Promise.all([
    getOrCreateUser(buyerId),
    getOrCreateUser(offer.sellerId),
    getItemById(offer.itemId),
  ]);

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({ error: 'Seller payout not ready' }, { status: 409 });
  }

  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({ customer: buyer.stripeCustomerId!, type: 'card' });
  if (!pms.data.length) return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  const pmId = pms.data[0].id;

  // Generate flip result server-side
  const flipResult: 'win' | 'loss' = Math.random() < 0.5 ? 'win' : 'loss';
  const chargeAmount = flipResult === 'win' ? offer.winAmount : offer.lossAmount;
  const amountCents = Math.round(chargeAmount * 100);
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

  // Mark as flipped (result known, payment in progress)
  await updateCoinFlipOfferStatus(id, 'flipped', { flipResult });

  // Attempt off-session charge
  let paymentIntentId: string;
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: buyer.stripeCustomerId!,
      payment_method: pmId,
      confirm: true,
      off_session: true,
      application_fee_amount: feeCents,
      transfer_data: { destination: seller.stripeAccountId },
    });
    paymentIntentId = pi.id;
  } catch (err) {
    const strikes = await incrementPaymentStrike(buyerId);
    await updateCoinFlipOfferStatus(id, 'payment_failed', { flipResult });

    const now = Date.now();
    const strikeMsg = strikes >= 3
      ? `⚠️ Payment failed. This is strike ${strikes} of 3. Your account has been suspended pending review. Contact support.`
      : `⚠️ Your payment of $${chargeAmount} failed. This is strike ${strikes} of 3. Three strikes results in indefinite account suspension. Update your card and try again.`;

    if (strikes >= 3) await suspendUser(buyerId);

    await sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: buyerId, itemId: offer.itemId,
      text: strikeMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    });
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: buyerId, type: 'coin_flip_payment_failed',
      title: 'Payment failed',
      body: strikeMsg,
      payload: JSON.stringify({ coinFlipId: id, strikes }),
      createdAt: now,
    });

    return NextResponse.json({
      error: 'Payment failed',
      code: 'payment_failed',
      flipResult,
      chargeAmount,
      strikes,
    }, { status: 402 });
  }

  // Payment succeeded — create order, mark completed
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId,
    sellerId: offer.sellerId,
    itemId: offer.itemId,
    amount: chargeAmount,
    status: 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };
  await createOrder(order);
  await updateCoinFlipOfferStatus(id, 'completed', { flipResult, stripePaymentIntentId: paymentIntentId });

  const resultMsg = flipResult === 'win'
    ? `🪙 Coin Flip result: Buyer won! Paid $${offer.winAmount} for "${item.title}".`
    : `💸 Coin Flip result: Buyer lost! Paid $${offer.lossAmount} for "${item.title}".`;

  await Promise.all([
    sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: buyerId, itemId: offer.itemId,
      text: resultMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    }),
    sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: offer.sellerId, itemId: offer.itemId,
      text: resultMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    }),
    createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: buyerId, type: 'coin_flip_result',
      title: flipResult === 'win' ? '🪙 You won the flip!' : '💸 You lost the flip',
      body: flipResult === 'win' ? `Paid $${offer.winAmount} — great deal!` : `Paid $${offer.lossAmount}`,
      payload: JSON.stringify({ coinFlipId: id, orderId: order.id, flipResult }),
      createdAt: now,
    }),
    createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.sellerId, type: 'coin_flip_result',
      title: 'Coin flip completed',
      body: flipResult === 'win' ? `Buyer paid $${offer.winAmount}` : `Buyer paid $${offer.lossAmount}`,
      payload: JSON.stringify({ coinFlipId: id, orderId: order.id, flipResult }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ flipResult, chargeAmount, orderId: order.id });
}
