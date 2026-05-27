import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchUsers } from '@/lib/db';

/**
 * GET /api/users/search?q=...
 * Returns up to 30 users matching the query by name (case-insensitive,
 * prefix-then-substring). Excludes the signed-in user from the results.
 */
export async function GET(req: NextRequest) {
  const { userId: viewerId } = await auth();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json([]);
  const users = await searchUsers(q, viewerId ?? undefined, 30);
  return NextResponse.json(users);
}
