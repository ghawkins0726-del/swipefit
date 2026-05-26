import { NextRequest, NextResponse } from 'next/server';
import { searchItems } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') ?? '';
  const filters = {
    category: searchParams.get('category') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    condition: searchParams.get('condition') || undefined,
    sort: searchParams.get('sort') || 'created_at',
  };
  const results = await searchItems(query, filters);
  return NextResponse.json(results);
}
