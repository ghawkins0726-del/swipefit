import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser, getLikedItems, getNotifications, markAllRead, updateUser, getSellerItems, getOrderCount, getFollowCounts, getSellerRating, getPreferredSizes, savePreferredSizes } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Sync Clerk name into our DB on first load
  const clerkUser = await currentUser();
  const displayName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'SwipeFit User';

  const [user, liked, listings, notifications, purchaseCount, follow, rating, preferredSizes] = await Promise.all([
    getOrCreateUser(userId, displayName),
    getLikedItems(userId),
    getSellerItems(userId),
    getNotifications(userId),
    getOrderCount(userId, 'buyer'),
    getFollowCounts(userId),
    getSellerRating(userId),
    getPreferredSizes(userId),
  ]);

  // Derive unread count from the returned notifications — avoids a separate DB round trip
  const unreadCount = notifications.filter(n => !n.read).length;

  return NextResponse.json({
    user: { ...user, preferredSizes },
    liked,
    listings,
    notifications,
    unreadCount,
    purchaseCount,
    followers: follow.followers,
    following: follow.following,
    ratingAverage: rating.average,
    ratingCount: rating.count,
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, bio, markNotificationsRead, preferredSizes } = body;
  if (name !== undefined || bio !== undefined) await updateUser(userId, { name, bio });
  if (markNotificationsRead) await markAllRead(userId);
  if (preferredSizes !== undefined) await savePreferredSizes(userId, preferredSizes);
  return NextResponse.json({ ok: true });
}
