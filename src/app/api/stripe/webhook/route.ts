import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { setPremium, getUserByStripeCustomer } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

// 31 days from now in ms — premium window, refreshed on each invoice.paid
const PREMIUM_MS = 31 * 24 * 3600 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const getCustomerId = (obj: unknown): string | null =>
    typeof (obj as { customer?: unknown }).customer === 'string'
      ? (obj as { customer: string }).customer
      : null;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      if (userId && session.subscription) {
        await setPremium(userId, true, Date.now() + PREMIUM_MS, customerId ?? undefined);
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = getCustomerId(invoice);
      if (customerId) {
        const user = await getUserByStripeCustomer(customerId);
        if (user) {
          await setPremium(user.id, true, Date.now() + PREMIUM_MS);
        }
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = getCustomerId(event.data.object);
      if (customerId) {
        const user = await getUserByStripeCustomer(customerId);
        if (user) await setPremium(user.id, false);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
