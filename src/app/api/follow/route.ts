/**
 * POST /api/follow
 * Body: { targetUserId: string; action: 'follow' | 'unfollow' }
 *
 * GET /api/follow?targetUserId=xxx
 * Returns: { isFollowing: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { followUser, unfollowUser, isFollowing } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetUserId, action } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
  if (targetUserId === userId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  if (action === 'follow') {
    await followUser(userId, targetUserId);
  } else if (action === 'unfollow') {
    await unfollowUser(userId, targetUserId);
  } else {
    return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetUserId = new URL(req.url).searchParams.get('targetUserId');
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });

  const following = await isFollowing(userId, targetUserId);
  return NextResponse.json({ isFollowing: following });
}
