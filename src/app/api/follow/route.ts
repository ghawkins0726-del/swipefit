/**
 * POST /api/follow
 * Body: { targetUserId: string; action: 'follow' | 'unfollow' }
 *
 * GET /api/follow?targetUserId=xxx
 * Returns: { isFollowing: boolean }
 */
import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { followUser, unfollowUser, isFollowing } from '@/lib/db';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ targetUserId?: string; action?: string }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { targetUserId, action } = body;
  if (!targetUserId) return apiError.badRequest('Missing targetUserId');
  if (targetUserId === userId) return apiError.badRequest('Cannot follow yourself');

  if (action === 'follow') {
    await followUser(userId, targetUserId);
  } else if (action === 'unfollow') {
    await unfollowUser(userId, targetUserId);
  } else {
    return apiError.badRequest('action must be follow or unfollow');
  }

  return NextResponse.json({ ok: true });
});

export const GET = withAuth(async (req, { userId }) => {
  const targetUserId = new URL(req.url).searchParams.get('targetUserId');
  if (!targetUserId) return apiError.badRequest('Missing targetUserId');

  const following = await isFollowing(userId, targetUserId);
  return NextResponse.json({ isFollowing: following });
});
