import { NextResponse } from 'next/server';
import { withAuthParams, apiError } from '@/lib/api-helpers';
import { getCoinFlipOfferById } from '@/lib/db-coin-flip';

export const GET = withAuthParams<{ id: string }, unknown>(
  async (_req, { params }, { userId }) => {
    const { id } = await params;
    const offer = await getCoinFlipOfferById(id);
    if (!offer) return apiError.notFound();

    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return apiError.forbidden();
    }

    return NextResponse.json(offer);
  },
);
