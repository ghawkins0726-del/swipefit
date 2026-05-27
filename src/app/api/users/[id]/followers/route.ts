import { NextRequest, NextResponse } from 'next/server';
import { getFollowers } from '@/lib/db';

/** GET → list of users that follow [id]. Public. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const followers = await getFollowers(id, 100);
  return NextResponse.json(followers);
}
