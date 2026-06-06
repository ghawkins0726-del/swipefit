import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withAuthParams, apiError } from '@/lib/api-helpers';
import { followUser, unfollowUser, isFollowing, getUserById } from '@/lib/db';

/**
 * POST  → follow the user at [id]
 * DELETE → unfollow the user at [id]
 *
 * Both return { following: boolean } reflecting the new state.
 */
export const POST = withAuthParams<{ id: string }, unknown>(
  async (_req, { params }, { userId }) => {
    const { id: targetId } = await params;
    if (targetId === userId) return apiError.badRequest("Can't follow yourself");

    // Confirm the target user actually exists
    const target = await getUserById(targetId);
    if (!target) return apiError.notFound('User not found');

    await followUser(userId, targetId);
    return NextResponse.json({ following: true });
  },
);

export const DELETE = withAuthParams<{ id: string }, unknown>(
  async (_req, { params }, { userId }) => {
    const { id: targetId } = await params;
    await unfollowUser(userId, targetId);
    return NextResponse.json({ following: false });
  },
);

/** GET → { following: boolean } — am I currently following this user? */
// Kept on the manual pattern: returns false (not 401) when the viewer is
// signed out, so it doubles as a public probe.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ following: false });

  const { id: targetId } = await params;
  const yes = await isFollowing(userId, targetId);
  return NextResponse.json({ following: yes });
}
