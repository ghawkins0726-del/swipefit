import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

export const GET = withAuth(async (_req, { userId }) => {
  const user = await getOrCreateUser(userId);
  if (!user.stripeCustomerId) return NextResponse.json({ paymentMethods: [] });

  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: 'card',
  });

  return NextResponse.json({
    paymentMethods: pms.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '????',
    })),
  });
});
