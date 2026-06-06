import { NextResponse } from 'next/server';
import { withAuth, apiError } from '@/lib/api-helpers';
import { getSellerAnalytics } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  if (!sellerId) return apiError.badRequest('Missing sellerId');

  // Users may only fetch their own analytics
  if (sellerId !== userId) return apiError.forbidden();

  return NextResponse.json(await getSellerAnalytics(sellerId));
});
