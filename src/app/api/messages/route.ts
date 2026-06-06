import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { checkRateLimit, messagesLimiter } from '@/lib/ratelimit';
import { v4 as uuid } from 'uuid';
import { sendMessage, getConversation, getAllMessagesBetween, markMessagesRead, markAllMessagesReadFromSender, getItemById, createNotification, getConversationList, getUnreadMessageCount } from '@/lib/db';


export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await checkRateLimit(messagesLimiter, userId);
  if (limited) return limited;

  const clerkUser = await currentUser();
  const senderName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'SwipeFit User';

  const body = await req.json();
  const { receiverId, itemId, text, replyToId, replyToText, replyToSender } = body;
  if (!receiverId || !itemId || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
  }
  if (userId === receiverId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }
  const message = {
    id: uuid(), senderId: userId, senderName, receiverId, itemId, text,
    read: false, createdAt: Date.now(),
    replyToId: replyToId ?? null,
    replyToText: replyToText ?? null,
    replyToSender: replyToSender ?? null,
    reactions: {},
  };
  await sendMessage(message);
  const item = await getItemById(itemId);
  await createNotification({
    id: `notif_${uuid()}`,
    userId: receiverId,
    type: 'message',
    title: `New message from ${senderName}`,
    body: text.length > 80 ? text.slice(0, 80) + '…' : text,
    payload: JSON.stringify({ senderId: userId, senderName, itemId, itemTitle: item?.title ?? '' }),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, message });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');
  const otherId = searchParams.get('otherId');

  if (searchParams.get('count') === 'true') {
    return NextResponse.json({ count: await getUnreadMessageCount(userId) });
  }
  if (searchParams.get('list') === 'true') {
    return NextResponse.json(await getConversationList(userId));
  }
  if (!otherId) {
    return NextResponse.json({ error: 'Missing otherId' }, { status: 400 });
  }
  // No itemId → return all messages between the two users (unified view)
  if (!itemId) {
    return NextResponse.json(await getAllMessagesBetween(userId, otherId));
  }
  return NextResponse.json(await getConversation(userId, itemId, otherId));
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { senderId, itemId } = body;
  if (!senderId) {
    return NextResponse.json({ error: 'Missing senderId' }, { status: 400 });
  }
  if (itemId) {
    await markMessagesRead(userId, senderId, itemId);
  } else {
    await markAllMessagesReadFromSender(userId, senderId);
  }
  return NextResponse.json({ ok: true });
}
