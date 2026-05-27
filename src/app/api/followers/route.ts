/**
 * GET /api/followers?mode=followers  → people who follow the current user
 * GET /api/followers?mode=following  → people the current user follows
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFollowers, getFollowing } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mode = new URL(req.url).searchParams.get('mode');
  if (mode === 'following') {
    const list = await getFollowing(userId);
    return NextResponse.json(list.map(u => ({ userId: u.id, name: u.name, avatar: u.avatar })));
  }
  // default: followers
  const list = await getFollowers(userId);
  return NextResponse.json(list.map(u => ({ userId: u.id, name: u.name, avatar: u.avatar })));
}
