import { NextResponse } from 'next/server';
import { withAuth, apiError } from '@/lib/api-helpers';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

export const POST = withAuth(async (_req, { userId }) => {
  const user = await getOrCreateUser(userId);
  if (!user.stripeCustomerId) return apiError.notFound('No active subscription found');

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/profile`,
  });

  return NextResponse.json({ url: session.url });
});
