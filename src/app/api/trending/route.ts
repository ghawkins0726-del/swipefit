import { NextRequest, NextResponse } from 'next/server';
import { getTrendingItems } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '20');
  return NextResponse.json(await getTrendingItems(limit));
}
