import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import {
  setPremium,
  getUserByStripeCustomer,
  updateOrderStatus,
  getOrderById,
  getItemById,
  createNotification,
} from '@/lib/db';

// 31 days from now in ms — premium window, refreshed on each invoice.paid
const PREMIUM_MS = 31 * 24 * 3600 * 1000;

const customerId = (obj: unknown): string | null =>
  typeof (obj as { customer?: unknown }).customer === 'string'
    ? (obj as { customer: string }).customer
    : null;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {

    // ── Checkout completed ────────────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const cid = typeof session.customer === 'string' ? session.customer : null;

      if (meta.type === 'item_purchase') {
        // ── Item purchase ────────────────────────────────────────────────────
        const { orderId, buyerId, sellerId, itemId } = meta;
        if (!orderId) break;

        await updateOrderStatus(orderId, 'processing');

        // Fire notifications for both parties
        const [order, item] = await Promise.all([
          getOrderById(orderId),
          getItemById(itemId),
        ]);
        const now = Date.now();
        await Promise.all([
          createNotification({
            id: `notif_${uuid()}`,
            userId: buyerId,
            type: 'order',
            title: `Payment confirmed for ${item?.title ?? 'your item'}`,
            body: `Your order of $${order?.amount ?? ''} is being prepared by the seller.`,
            payload: JSON.stringify({ orderId, itemId }),
            createdAt: now,
          }),
          createNotification({
            id: `notif_${uuid()}`,
            userId: sellerId,
            type: 'order',
            title: `New sale — ${item?.title ?? 'item'} sold`,
            body: `Payment of $${order?.amount ?? ''} received. Please ship soon.`,
            payload: JSON.stringify({ orderId, itemId }),
            createdAt: now,
          }),
        ]);

      } else if (meta.userId && session.subscription) {
        // ── Subscription ─────────────────────────────────────────────────────
        await setPremium(meta.userId, true, Date.now() + PREMIUM_MS, cid ?? undefined);
      }
      break;
    }

    // ── Subscription renewal ──────────────────────────────────────────────────
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const cid2 = customerId(invoice);
      if (cid2) {
        const user = await getUserByStripeCustomer(cid2);
        if (user) await setPremium(user.id, true, Date.now() + PREMIUM_MS);
      }
      break;
    }

    // ── Subscription cancelled / payment failed ───────────────────────────────
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const cid3 = customerId(event.data.object);
      if (cid3) {
        const user = await getUserByStripeCustomer(cid3);
        if (user) await setPremium(user.id, false);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
