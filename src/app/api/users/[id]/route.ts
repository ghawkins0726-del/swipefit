import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserById, getFollowCounts, isFollowing, getSellerRating, getSellerItems } from '@/lib/db';

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
    avatar: user.avatar,
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
