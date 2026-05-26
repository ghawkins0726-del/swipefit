import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

/**
 * Creates a one-time login link for a seller's Stripe Express dashboard.
 * Sellers use this to view their balance, payouts, taxes, etc.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateUser(userId);
  if (!profile.stripeAccountId) {
    return NextResponse.json({ error: 'No Connect account — onboard first' }, { status: 404 });
  }

  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(profile.stripeAccountId);
  return NextResponse.json({ url: link.url });
}
