import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, sendMessage, createNotification } from '@/lib/db';
import { getCoinFlipOfferById, updateCoinFlipOfferStatus, updateCoinFlipOfferStatusConditional } from '@/lib/db-coin-flip';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerkUser = await currentUser();
  const sellerName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Seller';

  const { id } = await params;
  const offer = await getCoinFlipOfferById(id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (offer.sellerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (offer.status !== 'pending') return NextResponse.json({ error: 'Offer already resolved' }, { status: 409 });

  // Auto-expire if the 72h window has passed
  if (Date.now() > offer.expiresAt) {
    await updateCoinFlipOfferStatus(id, 'expired');
    return NextResponse.json({ error: 'Offer has expired', expired: true }, { status: 410 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.accepted !== 'boolean') {
    return NextResponse.json({ error: 'Missing or invalid field: accepted' }, { status: 400 });
  }
  const { accepted } = body as { accepted: boolean };

  const now = Date.now();
  const item = await getItemById(offer.itemId);
  const itemTitle = item?.title ?? 'an item';

  if (accepted) {
    // Guard: item must still be available
    if (item?.sold) {
      await updateCoinFlipOfferStatus(id, 'declined');

      await sendMessage({
        id: uuid(),
        senderId: userId,
        senderName: sellerName,
        receiverId: offer.buyerId,
        itemId: offer.itemId,
        text: `❌ Your Coin Flip offer on "${itemTitle}" was declined — the item is no longer available. Your slot has been returned.`,
        read: false,
        createdAt: now,
        replyToId: null,
        replyToText: null,
        replyToSender: null,
        reactions: {},
      });

      await createNotification({
        id: `notif_${now}_${uuid().slice(0, 8)}`,
        userId: offer.buyerId,
        type: 'coin_flip_declined',
        title: 'Coin Flip declined',
        body: `Your flip on "${itemTitle}" was declined — item no longer available. Slot returned.`,
        payload: JSON.stringify({ coinFlipId: id }),
        createdAt: now,
      });

      return NextResponse.json({ error: 'Item is no longer available', declined: true }, { status: 409 });
    }

    const didAccept = await updateCoinFlipOfferStatusConditional(id, 'pending', 'accepted');
    if (!didAccept) {
      return NextResponse.json({ error: 'Offer no longer available' }, { status: 409 });
    }

    await sendMessage({
      id: uuid(),
      senderId: userId,
      senderName: sellerName,
      receiverId: offer.buyerId,
      itemId: offer.itemId,
      text: `✅ Your Coin Flip offer on "${itemTitle}" was accepted! Open the app to flip.`,
      read: false,
      createdAt: now,
      replyToId: null,
      replyToText: null,
      replyToSender: null,
      reactions: {},
    });

    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'coin_flip_accepted',
      title: 'Coin Flip accepted! 🪙',
      body: `Seller accepted your flip on "${itemTitle}". Time to flip!`,
      payload: JSON.stringify({ coinFlipId: id, itemId: offer.itemId }),
      createdAt: now,
    });
  } else {
    await updateCoinFlipOfferStatus(id, 'declined');

    await sendMessage({
      id: uuid(),
      senderId: userId,
      senderName: sellerName,
      receiverId: offer.buyerId,
      itemId: offer.itemId,
      text: `❌ Your Coin Flip offer on "${itemTitle}" was declined. Your slot has been returned.`,
      read: false,
      createdAt: now,
      replyToId: null,
      replyToText: null,
      replyToSender: null,
      reactions: {},
    });

    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'coin_flip_declined',
      title: 'Coin Flip declined',
      body: `Your flip on "${itemTitle}" was declined. Slot returned.`,
      payload: JSON.stringify({ coinFlipId: id }),
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
