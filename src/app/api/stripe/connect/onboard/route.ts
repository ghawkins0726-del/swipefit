import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser, setStripeAccountId } from '@/lib/db';

/**
 * Starts (or resumes) Stripe Connect Express onboarding for the signed-in user.
 *
 * Flow:
 *   1. Ensure the user has a Stripe Connect account (create one if missing).
 *   2. Generate a one-time Account Link URL pointing at Stripe's hosted form.
 *   3. Return that URL — the client redirects the user to it.
 *
 * The account is created with `transfers` + `card_payments` capabilities so it
 * can receive destination charges from item purchases.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  const profile = await getOrCreateUser(userId);
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

  let accountId = profile.stripeAccountId;

  if (!accountId) {
    // Create a brand-new Express account for this user
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { userId },
    });
    accountId = account.id;
    await setStripeAccountId(userId, accountId);
  }

  // Account Link — one-time URL to Stripe's hosted onboarding form
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://swipefit-ruby.vercel.app';
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/connect/refresh`,
    return_url: `${baseUrl}/connect/return`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url, accountId });
}
