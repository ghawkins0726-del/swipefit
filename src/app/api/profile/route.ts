import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, getLikedItems, getNotifications, getUnreadCount, markAllRead, updateUser, getSellerItems } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'anonymous';
  const [user, liked, listings, notifications, unreadCount] = await Promise.all([
    getOrCreateUser(userId),
    getLikedItems(userId),
    getSellerItems(userId),
    getNotifications(userId),
    getUnreadCount(userId),
  ]);
  return NextResponse.json({ user, liked, listings, notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, name, bio, markNotificationsRead } = body;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  if (name !== undefined || bio !== undefined) await updateUser(userId, { name, bio });
  if (markNotificationsRead) await markAllRead(userId);
  return NextResponse.json({ ok: true });
}
