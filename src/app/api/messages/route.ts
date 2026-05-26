import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { sendMessage, getConversation, markMessagesRead, getItemById, createNotification, getConversationList, getUnreadMessageCount } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { senderId, senderName, receiverId, itemId, text } = body;
  if (!senderId || !senderName || !receiverId || !itemId || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const message = { id: uuid(), senderId, senderName, receiverId, itemId, text, read: false, createdAt: Date.now() };
  await sendMessage(message);
  const item = await getItemById(itemId);
  await createNotification({
    id: `notif_${uuid()}`,
    userId: receiverId,
    type: 'message',
    title: `New message from ${senderName}`,
    body: text.length > 80 ? text.slice(0, 80) + '…' : text,
    payload: JSON.stringify({ senderId, senderName, itemId, itemTitle: item?.title ?? '' }),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, message });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const itemId = searchParams.get('itemId');
  const otherId = searchParams.get('otherId');

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  if (searchParams.get('count') === 'true') {
    return NextResponse.json({ count: await getUnreadMessageCount(userId) });
  }
  if (searchParams.get('list') === 'true') {
    return NextResponse.json(await getConversationList(userId));
  }
  if (!itemId || !otherId) {
    return NextResponse.json({ error: 'Missing itemId or otherId' }, { status: 400 });
  }
  return NextResponse.json(await getConversation(userId, itemId, otherId));
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, senderId, itemId } = body;
  if (!userId || !senderId || !itemId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  await markMessagesRead(userId, senderId, itemId);
  return NextResponse.json({ ok: true });
}
