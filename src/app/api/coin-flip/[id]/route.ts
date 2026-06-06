import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinFlipOfferById } from '@/lib/db-coin-flip';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const offer = await getCoinFlipOfferById(id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (offer.buyerId !== userId && offer.sellerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(offer);
}
