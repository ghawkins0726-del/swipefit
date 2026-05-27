import { NextRequest, NextResponse } from 'next/server';
import { getFollowing } from '@/lib/db';

/** GET → list of users that [id] follows. Public. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const following = await getFollowing(id, 100);
  return NextResponse.json(following);
}
