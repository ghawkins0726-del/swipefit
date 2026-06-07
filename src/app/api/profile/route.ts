import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import {
  getOrCreateUser, getLikedItems, getNotifications, markAllRead, updateUser,
  getSellerItems, getOrderCount, getFollowCounts, getSellerRating,
  getPreferredSizes, savePreferredSizes,
} from '@/lib/db';

export const GET = withAuth(async (_req, { userId, getDisplayName }) => {
  try {
    // Sync Clerk name into our DB on first load
    const displayName = await getDisplayName('SwipeFit User');

    const [user, liked, listings, notifications, purchaseCount, follow, rating, preferredSizes] =
      await Promise.all([
        getOrCreateUser(userId, displayName),
        getLikedItems(userId),
        getSellerItems(userId),
        getNotifications(userId),
        getOrderCount(userId, 'buyer'),
        getFollowCounts(userId),
        getSellerRating(userId),
        getPreferredSizes(userId),
      ]);

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
  } catch (err) {
    console.error('Profile GET error:', err);
    return apiError.server();
  }
});

export const PATCH = withAuth(async (req, { userId }) => {
  const body = await parseJson<{
    name?: string;
    bio?: string;
    markNotificationsRead?: boolean;
    preferredSizes?: string[];
  }>(req);
  if (!body) return apiError.badRequest('Invalid body');

  const { name, bio, markNotificationsRead, preferredSizes } = body;
  if (name !== undefined || bio !== undefined) await updateUser(userId, { name, bio });
  if (markNotificationsRead) await markAllRead(userId);
  if (preferredSizes !== undefined) await savePreferredSizes(userId, preferredSizes);
  return NextResponse.json({ ok: true });
});
