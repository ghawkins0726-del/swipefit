import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserWardrobe } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wardrobe = await getUserWardrobe(userId);
  return NextResponse.json(wardrobe);
}
