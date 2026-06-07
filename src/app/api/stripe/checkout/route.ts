import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { withAuth, apiError } from '@/lib/api-helpers';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

export const POST = withAuth(async (_req, { userId }) => {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const user = await getOrCreateUser(userId);

  if (user.isPremium) return apiError.badRequest('Already premium');

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    metadata: { userId },
    success_url: `${process.env.NEXT_PUBLIC_URL}/subscribe/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/subscribe`,
  });

  return NextResponse.json({ url: session.url });
});
