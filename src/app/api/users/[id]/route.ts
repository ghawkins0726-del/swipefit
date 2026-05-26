import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserById, getFollowCounts, isFollowing } from '@/lib/db';

/**
 * Public-ish user lookup. Returns basic profile + social-graph stats and,
 * if a viewer is signed in, whether they follow this user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const counts = await getFollowCounts(id);

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
    viewerFollows,
    isSelf,
  });
}
