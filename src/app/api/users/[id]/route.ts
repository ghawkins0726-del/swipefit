import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserById, getFollowCounts, isFollowing, getSellerRating, getSellerItems, updateUser } from '@/lib/db';

/**
 * Public-ish user lookup. Returns basic profile + social-graph stats and,
 * if a viewer is signed in, whether they follow this user.
 * Append ?listings=1 to also include the user's active listings.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch live avatar from Clerk so we always show the user's current photo,
  // not whatever stale URL is in the DB.
  let liveAvatar = user.avatar;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(id);
    if (clerkUser.imageUrl) {
      liveAvatar = clerkUser.imageUrl;
      // Keep the DB in sync so followers/following lists also get the fresh URL.
      if (liveAvatar !== user.avatar) {
        await updateUser(id, { avatar: liveAvatar });
      }
    }
  } catch {
    // Clerk lookup failed — fall back to the DB value.
  }

  const withListings = req.nextUrl.searchParams.get('listings') === '1';

  const [counts, rating, listings] = await Promise.all([
    getFollowCounts(id),
    getSellerRating(id),
    withListings ? getSellerItems(id) : Promise.resolve(null),
  ]);

  const { userId: viewerId } = await auth();
  let viewerFollows = false;
  let isSelf = false;
  if (viewerId) {
    isSelf = viewerId === id;
    if (!isSelf) viewerFollows = await isFollowing(viewerId, id);
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    avatar: liveAvatar,
    bio: user.bio,
    createdAt: user.createdAt,
    totalLikes: user.totalLikes,
    totalListings: user.totalListings,
    followers: counts.followers,
    following: counts.following,
    ratingAverage: rating.average,
    ratingCount: rating.count,
    viewerFollows,
    isSelf,
    ...(listings ? { listings } : {}),
  });
}
