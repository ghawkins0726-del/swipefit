import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { followUser, unfollowUser, isFollowing, getUserById } from '@/lib/db';

/**
 * POST  → follow the user at [id]
 * DELETE → unfollow the user at [id]
 *
 * Both return { following: boolean } reflecting the new state.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === userId) {
    return NextResponse.json({ error: "Can't follow yourself" }, { status: 400 });
  }

  // Confirm the target user actually exists
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await followUser(userId, targetId);
  return NextResponse.json({ following: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: targetId } = await params;
  await unfollowUser(userId, targetId);
  return NextResponse.json({ following: false });
}

/** GET → { following: boolean } — am I currently following this user? */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ following: false });

  const { id: targetId } = await params;
  const yes = await isFollowing(userId, targetId);
  return NextResponse.json({ following: yes });
}
