import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
}
