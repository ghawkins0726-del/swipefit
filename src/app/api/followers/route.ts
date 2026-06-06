/**
 * GET /api/followers?mode=followers  → people who follow the current user
 * GET /api/followers?mode=following  → people the current user follows
 */
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getFollowers, getFollowing } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
  const mode = new URL(req.url).searchParams.get('mode');
  const list = mode === 'following' ? await getFollowing(userId) : await getFollowers(userId);
  return NextResponse.json(list.map(u => ({ userId: u.id, name: u.name, avatar: u.avatar })));
});
