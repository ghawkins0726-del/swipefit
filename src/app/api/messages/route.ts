import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { checkRateLimit, messagesLimiter } from '@/lib/ratelimit';
import {
  sendMessage, getConversation, getAllMessagesBetween, markMessagesRead,
  markAllMessagesReadFromSender, getItemById, createNotification,
  getConversationList, getUnreadMessageCount,
} from '@/lib/db';

export const POST = withAuth(async (req, { userId, getDisplayName }) => {
  const limited = await checkRateLimit(messagesLimiter, userId);
  if (limited) return limited;

  const senderName = await getDisplayName('SwipeFit User');

  const body = await parseJson<{
    receiverId?: string;
    itemId?: string;
    text?: string;
    replyToId?: string | null;
    replyToText?: string | null;
    replyToSender?: string | null;
  }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { receiverId, itemId, text, replyToId, replyToText, replyToSender } = body;
  if (!receiverId || !itemId || !text) return apiError.badRequest('Missing fields');
  if (typeof text !== 'string' || text.trim().length === 0) return apiError.badRequest('Message cannot be empty');
  if (text.length > 2000) return apiError.badRequest('Message too long (max 2000 chars)');
  if (userId === receiverId) return apiError.badRequest('Cannot message yourself');

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
});

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');
  const otherId = searchParams.get('otherId');

  if (searchParams.get('count') === 'true') {
    return NextResponse.json({ count: await getUnreadMessageCount(userId) });
  }
  if (searchParams.get('list') === 'true') {
    return NextResponse.json(await getConversationList(userId));
  }
  if (!otherId) return apiError.badRequest('Missing otherId');
  if (!itemId) {
    return NextResponse.json(await getAllMessagesBetween(userId, otherId));
  }
  return NextResponse.json(await getConversation(userId, itemId, otherId));
});

export const PATCH = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ senderId?: string; itemId?: string }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { senderId, itemId } = body;
  if (!senderId) return apiError.badRequest('Missing senderId');
  if (itemId) {
    await markMessagesRead(userId, senderId, itemId);
  } else {
    await markAllMessagesReadFromSender(userId, senderId);
  }
  return NextResponse.json({ ok: true });
});
