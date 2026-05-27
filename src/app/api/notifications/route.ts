import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNotifications, getUnreadCount, markAllRead } from '@/lib/db';

/** GET /api/notifications — returns recent notifications + unread count */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(userId),
    getUnreadCount(userId),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

/** PATCH /api/notifications — marks all as read */
export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await markAllRead(userId);
  return NextResponse.json({ ok: true });
}
