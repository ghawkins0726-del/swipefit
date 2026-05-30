import { NextRequest, NextResponse } from 'next/server';
import { getResellListings, getResellPriceHistory, getItemDemandSignal } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const [listings, priceHistory, demandSignal] = await Promise.all([
    getResellListings(itemId),
    getResellPriceHistory(itemId),
    getItemDemandSignal(itemId),
  ]);

  return NextResponse.json({ listings, priceHistory, demandSignal });
}
