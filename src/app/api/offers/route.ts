import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { checkRateLimit, offersLimiter } from '@/lib/ratelimit';
import { v4 as uuid } from 'uuid';
import {
  createOffer, getOffersByUser, getOfferById,
  updateOfferStatus, getItemById, createNotification, sendMessage,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await checkRateLimit(offersLimiter, buyerId);
  if (limited) return limited;

  const body = await req.json();
  const { itemId, amount, message } = body;
  if (!itemId || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sellerId === buyerId) return NextResponse.json({ error: 'Cannot offer on your own item' }, { status: 400 });

  const clerkUser = await currentUser();
  const buyerName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'SwipeFit User';

  const parsedAmount = parseFloat(amount);
  const now = Date.now();
  const offerId = uuid();

  await createOffer({
    id: offerId,
    buyerId,
    sellerId: item.sellerId,
    itemId,
    amount: parsedAmount,
    message: message || '',
    status: 'pending',
    createdAt: now,
  });

  // Auto-send a message to open the conversation thread
  const autoText = message
    ? `I would like to purchase "${item.title}" for $${parsedAmount}. ${message}`
    : `I would like to purchase "${item.title}" for $${parsedAmount}.`;

  await sendMessage({
    id: uuid(),
    senderId: buyerId,
    senderName: buyerName,
    receiverId: item.sellerId,
    itemId,
    text: autoText,
    read: false,
    createdAt: now,
    replyToId: null,
    replyToText: null,
    replyToSender: null,
    reactions: {},
  });

  // Notify seller of new offer
  await createNotification({
    id: `notif_${now}_${uuid().slice(0, 8)}`,
    userId: item.sellerId,
    type: 'offer_received',
    title: `New offer on "${item.title}"`,
    body: `${buyerName} offered $${parsedAmount}`,
    payload: JSON.stringify({ offerId, itemId, buyerId, amount: parsedAmount }),
    createdAt: now,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = (searchParams.get('role') ?? 'buyer') as 'buyer' | 'seller';
  return NextResponse.json(await getOffersByUser(userId, role));
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { offerId, status, counterAmount } = body;
  if (!offerId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Verify the acting user is the seller on this offer
  const offer = await getOfferById(offerId);
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  if (offer.sellerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await updateOfferStatus(offerId, status, counterAmount);

  // Notify the buyer of the seller's response
  const item = await getItemById(offer.itemId);
  const itemTitle = item?.title ?? 'an item';
  const now = Date.now();

  if (status === 'accepted') {
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'offer_accepted',
      title: 'Offer accepted! 🎉',
      body: `Your $${offer.amount} offer on "${itemTitle}" was accepted`,
      payload: JSON.stringify({
        offerId,
        itemId: offer.itemId,
        sellerId: userId,
        amount: offer.amount,
        action: 'pay_now',
      }),
      createdAt: now,
    });
  } else if (status === 'countered' && counterAmount != null) {
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'offer_countered',
      title: 'Counter offer received',
      body: `Seller countered at $${counterAmount} on "${itemTitle}"`,
      payload: JSON.stringify({
        offerId,
        itemId: offer.itemId,
        sellerId: userId,
        originalAmount: offer.amount,
        counterAmount,
        action: 'counter_offer',
      }),
      createdAt: now,
    });
  } else if (status === 'declined') {
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'offer_declined',
      title: 'Offer declined',
      body: `Your offer on "${itemTitle}" was not accepted`,
      payload: JSON.stringify({ offerId, itemId: offer.itemId }),
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
