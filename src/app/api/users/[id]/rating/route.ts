import { NextRequest, NextResponse } from 'next/server';
import { getSellerRating } from '@/lib/db';

/** GET /api/users/[id]/rating → { average, count } — algorithmic mean of all stars. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rating = await getSellerRating(id);
  return NextResponse.json(rating);
}
