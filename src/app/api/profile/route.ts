import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser, getLikedItems, getNotifications, getUnreadCount, markAllRead, updateUser, getSellerItems } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Sync Clerk name into our DB on first load
  const clerkUser = await currentUser();
  const displayName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'SwipeFit User';

  const [user, liked, listings, notifications, unreadCount] = await Promise.all([
    getOrCreateUser(userId, displayName),
    getLikedItems(userId),
    getSellerItems(userId),
    getNotifications(userId),
    getUnreadCount(userId),
  ]);
  return NextResponse.json({ user, liked, listings, notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, bio, markNotificationsRead } = body;
  if (name !== undefined || bio !== undefined) await updateUser(userId, { name, bio });
  if (markNotificationsRead) await markAllRead(userId);
  return NextResponse.json({ ok: true });
}
