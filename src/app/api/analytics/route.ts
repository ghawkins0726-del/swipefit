import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSellerAnalytics } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  if (!sellerId) return NextResponse.json({ error: 'Missing sellerId' }, { status: 400 });

  // Users may only fetch their own analytics
  if (sellerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(await getSellerAnalytics(sellerId));
}
