import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getOrCreateUser } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getOrCreateUser(userId);
  const rows = await stripe.customers.list({ limit: 1, email: undefined });
  // Find by stripe customer id stored on user
  const customerId = rows.data.find(() => true)?.id;

  if (!customerId) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/profile`,
  });

  return NextResponse.json({ url: session.url });
}
