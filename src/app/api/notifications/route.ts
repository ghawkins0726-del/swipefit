import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getNotifications, getUnreadCount, markAllRead } from '@/lib/db';

/** GET /api/notifications — returns recent notifications + unread count */
export const GET = withAuth(async (_req, { userId }) => {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(userId),
    getUnreadCount(userId),
  ]);
  return NextResponse.json({ notifications, unreadCount });
});

/** PATCH /api/notifications — marks all as read */
export const PATCH = withAuth(async (_req, { userId }) => {
  await markAllRead(userId);
  return NextResponse.json({ ok: true });
});
