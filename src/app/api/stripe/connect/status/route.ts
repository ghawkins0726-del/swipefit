import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser, setStripeAccountReady } from '@/lib/db';

/**
 * Returns the seller-payouts status for the signed-in user.
 *
 *   { connected: false }                        → no Connect account at all
 *   { connected: true, ready: false, ... }      → account exists but not done
 *   { connected: true, ready: true,  ... }      → can accept charges + payouts
 *
 * Side effect: refreshes the cached `stripe_account_ready` flag in our DB
 * so we don't have to ping Stripe on every page load.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateUser(userId);
  if (!profile.stripeAccountId) {
    return NextResponse.json({ connected: false });
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(profile.stripeAccountId);

  const charges = account.charges_enabled;
  const payouts = account.payouts_enabled;
  const detailsSubmitted = account.details_submitted;
  const ready = !!(charges && payouts && detailsSubmitted);

  // Sync DB cache if it drifted
  if (ready !== profile.stripeAccountReady) {
    await setStripeAccountReady(userId, ready);
  }

  return NextResponse.json({
    connected: true,
    ready,
    chargesEnabled: charges,
    payoutsEnabled: payouts,
    detailsSubmitted,
    requirementsDue: account.requirements?.currently_due ?? [],
  });
}
