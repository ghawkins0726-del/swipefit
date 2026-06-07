import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, getOrCreateUser, sendMessage, createNotification } from '@/lib/db';
import {
  createCoinFlipOffer,
  getCoinFlipMonthCount,
} from '@/lib/db-coin-flip';
import { getStripe } from '@/lib/stripe';

const MONTHLY_LIMIT = 3;
const EXPIRE_MS = 72 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const buyer = await getOrCreateUser(buyerId);
  if (buyer.accountStatus === 'suspended_pending_review') {
    return NextResponse.json({ error: 'Your account is suspended pending review.' }, { status: 403 });
  }

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (item.sellerId === buyerId) return NextResponse.json({ error: 'Cannot coin flip your own item' }, { status: 400 });

  const seller = await getOrCreateUser(item.sellerId);
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({ error: 'Seller has not set up payouts yet', code: 'seller_not_onboarded' }, { status: 409 });
  }

  // Check buyer has a saved payment method
  if (!buyer.stripeCustomerId) {
    return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  }
  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({ customer: buyer.stripeCustomerId, type: 'card' });
  if (!pms.data.length) {
    return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  }

  // Check monthly limit
  const used = await getCoinFlipMonthCount(buyerId);
  if (used >= MONTHLY_LIMIT) {
    return NextResponse.json({ error: 'Monthly coin flip limit reached (3/month)', code: 'limit_reached' }, { status: 429 });
  }

  const clerkUser = await currentUser();
  const buyerName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Wove User';

  const now = Date.now();
  const offerId = uuid();
  const winAmount  = Math.round(item.price * 0.50 * 100) / 100;
  const lossAmount = Math.round(item.price * 1.50 * 100) / 100;

  await createCoinFlipOffer({
    id: offerId,
    buyerId,
    sellerId: item.sellerId,
    itemId,
    itemPrice: item.price,
    winAmount,
    lossAmount,
    status: 'pending',
    flipResult: null,
    stripePaymentIntentId: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + EXPIRE_MS,
  });

  await sendMessage({
    id: uuid(),
    senderId: buyerId,
    senderName: buyerName,
    receiverId: item.sellerId,
    itemId,
    text: `🪙 ${buyerName} sent you a Coin Flip offer on "${item.title}" — if they win: $${winAmount}, if they lose: $${lossAmount}. You have 72h to respond.`,
    read: false,
    createdAt: now,
    replyToId: null,
    replyToText: null,
    replyToSender: null,
    reactions: {},
  });

  await createNotification({
    id: `notif_${now}_${uuid().slice(0, 8)}`,
    userId: item.sellerId,
    type: 'coin_flip_received',
    title: `Coin Flip offer on "${item.title}"`,
    body: `${buyerName} wants to flip — they pay $${winAmount} or $${lossAmount}`,
    payload: JSON.stringify({ coinFlipId: offerId, itemId, buyerId, winAmount, lossAmount }),
    createdAt: now,
  });

  return NextResponse.json({ coinFlipId: offerId });
}
