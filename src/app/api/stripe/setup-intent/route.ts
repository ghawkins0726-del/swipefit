import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';
import { setUserStripeCustomerId } from '@/lib/db-coin-flip';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  const user = await getOrCreateUser(userId);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const customer = await stripe.customers.create({ email: email ?? undefined });
    customerId = customer.id;
    await setUserStripeCustomerId(userId, customerId);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
