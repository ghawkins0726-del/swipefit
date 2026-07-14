import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, getOrCreateUser, createOrder, sendMessage, createNotification } from '@/lib/db';
import {
  getCoinFlipOfferById,
  updateCoinFlipOfferStatus,
  updateCoinFlipOfferStatusConditional,
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

  const clerkUser = await currentUser();
  const buyerName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Buyer';

  const { id } = await params;
  const offer = await getCoinFlipOfferById(id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (offer.buyerId !== buyerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (offer.status !== 'accepted') return NextResponse.json({ error: 'Offer not in accepted state' }, { status: 409 });
  if (Date.now() > offer.expiresAt) {
    await updateCoinFlipOfferStatus(id, 'expired');
    return NextResponse.json({ error: 'Offer has expired', expired: true }, { status: 410 });
  }

  const [buyer, seller, item] = await Promise.all([
    getOrCreateUser(buyerId),
    getOrCreateUser(offer.sellerId),
    getItemById(offer.itemId),
  ]);

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (buyer.accountStatus === 'suspended_pending_review') {
    return NextResponse.json({ error: 'Your account is suspended pending review.' }, { status: 403 });
  }
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({ error: 'Seller payout not ready' }, { status: 409 });
  }

  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({ customer: buyer.stripeCustomerId!, type: 'card' });
  if (!pms.data.length) return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  const pmId = pms.data[0].id;

  // Generate flip result server-side
  const flipResult: 'win' | 'loss' = randomInt(2) === 0 ? 'win' : 'loss';
  const chargeAmount = flipResult === 'win' ? offer.winAmount : offer.lossAmount;
  const amountCents = Math.round(chargeAmount * 100);
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

  // Atomic transition: accepted → flipped (with result). Guards against double-flip.
  const didFlip = await updateCoinFlipOfferStatusConditional(id, 'accepted', 'flipped', { flipResult });
  if (!didFlip) return NextResponse.json({ error: 'Flip already in progress or completed' }, { status: 409 });

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
    const failureMsg = `⚠ Your payment of $${chargeAmount} failed. This is strike ${strikes} of 3. Three strikes results in indefinite account suspension pending review. Update your card and contact support.`;

    await sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: buyerId, itemId: offer.itemId,
      text: failureMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    });
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: buyerId, type: 'coin_flip_payment_failed',
      title: 'Payment failed',
      body: failureMsg,
      payload: JSON.stringify({ coinFlipId: id, strikes }),
      createdAt: now,
    });

    if (strikes >= 3) {
      await suspendUser(buyerId);
      const suspendMsg = `Your account has been suspended pending review due to 3 non-payment violations. Contact support.`;
      await sendMessage({
        id: uuid(), senderId: 'system', senderName: 'Wove',
        receiverId: buyerId, itemId: offer.itemId,
        text: suspendMsg, read: false, createdAt: now,
        replyToId: null, replyToText: null, replyToSender: null, reactions: {},
      });
      await createNotification({
        id: `notif_${now}_${uuid().slice(0, 8)}`,
        userId: buyerId, type: 'account_suspended',
        title: 'Account suspended',
        body: suspendMsg,
        payload: JSON.stringify({ coinFlipId: id }),
        createdAt: now,
      });
    }

    return NextResponse.json({
      error: 'Payment failed',
      code: 'payment_failed',
      strikes,
    }, { status: 402 });
  }

  // Payment succeeded — create order, mark completed.
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId,
    sellerId: offer.sellerId,
    itemId: offer.itemId,
    amount: chargeAmount,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };
  // The charge already captured. If the item was bought out from under this flip
  // between the pre-check (line 47) and here, createOrder throws ITEM_ALREADY_SOLD
  // — refund the buyer rather than leave them charged with no order.
  try {
    await createOrder(order);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ITEM_ALREADY_SOLD') {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      await updateCoinFlipOfferStatus(id, 'cancelled', { flipResult, stripePaymentIntentId: paymentIntentId });
      const refundMsg = `The item sold before your flip could complete, so your $${chargeAmount} payment was fully refunded. No charge stands.`;
      await sendMessage({
        id: uuid(), senderId: 'system', senderName: 'Wove',
        receiverId: buyerId, itemId: offer.itemId,
        text: refundMsg, read: false, createdAt: now,
        replyToId: null, replyToText: null, replyToSender: null, reactions: {},
      });
      await createNotification({
        id: `notif_${now}_${uuid().slice(0, 8)}`,
        userId: buyerId, type: 'coin_flip_result',
        title: 'Flip voided — you were refunded',
        body: refundMsg,
        payload: JSON.stringify({ coinFlipId: id }),
        createdAt: now,
      });
      return NextResponse.json({ error: 'Item was just purchased by someone else — your payment was refunded', code: 'item_already_sold' }, { status: 409 });
    }
    throw err;
  }
  await updateCoinFlipOfferStatus(id, 'completed', { flipResult, stripePaymentIntentId: paymentIntentId });

  const resultMsg = flipResult === 'win'
    ? `🪙 @${buyerName} won the flip — paying $${offer.winAmount} for "${item.title}".`
    : `💸 @${buyerName} lost the flip — paying $${offer.lossAmount} for "${item.title}".`;

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
