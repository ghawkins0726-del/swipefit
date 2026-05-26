import { NextRequest, NextResponse } from 'next/server';
import { getSellerAnalytics } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  if (!sellerId) return NextResponse.json({ error: 'Missing sellerId' }, { status: 400 });
  return NextResponse.json(await getSellerAnalytics(sellerId));
}
