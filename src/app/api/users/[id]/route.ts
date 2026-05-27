import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser, getPublicProfile, getSellerItems } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;
  const { userId: viewerId } = await auth();

  // Full profile view (for /user/[id] page)
  if (req.nextUrl.searchParams.get('full') === '1') {
    const [profile, listings] = await Promise.all([
      getPublicProfile(targetId, viewerId ?? undefined),
      getSellerItems(targetId),
    ]);
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...profile, listings });
  }

  // Lightweight name lookup (for conversation header)
  const user = await getOrCreateUser(targetId);
  return NextResponse.json({ id: user.id, name: user.name, avatar: user.avatar });
}
