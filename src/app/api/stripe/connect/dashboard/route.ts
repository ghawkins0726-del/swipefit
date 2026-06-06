import { NextResponse } from 'next/server';
import { withAuth, apiError } from '@/lib/api-helpers';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

/**
 * Creates a one-time login link for a seller's Stripe Express dashboard.
 * Sellers use this to view their balance, payouts, taxes, etc.
 */
export const POST = withAuth(async (_req, { userId }) => {
  const profile = await getOrCreateUser(userId);
  if (!profile.stripeAccountId) return apiError.notFound('No Connect account — onboard first');

  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(profile.stripeAccountId);
  return NextResponse.json({ url: link.url });
});
