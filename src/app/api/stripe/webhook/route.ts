import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import {
  setPremium,
  getUserByStripeCustomer,
  updateOrderStatus,
  updateOrderShippingAddress,
  getOrderById,
  getItemById,
  createNotification,
  getUserByStripeAccount,
  setStripeAccountReady,
  markResellListingSold,
  isWebhookEventProcessed,
  recordWebhookEvent,
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

  // ── Idempotency: skip events we've already processed ─────────────────────
  // Stripe retries webhooks on non-2xx responses. Without this check, a retry
  // would create duplicate notifications, mark orders twice, etc.
  const alreadyProcessed = await isWebhookEventProcessed(event.id);
  if (alreadyProcessed) return NextResponse.json({ received: true });
  await recordWebhookEvent(event.id);

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

        // Persist shipping address collected during checkout
        const addr = session.collected_information?.shipping_details?.address
          ?? session.customer_details?.address;
        if (addr) {
          const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
          await updateOrderShippingAddress(orderId, parts.join(', '));
        }

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

      } else if (meta.type === 'resell_purchase') {
        // ── Resell purchase ──────────────────────────────────────────────────
        const { orderId, buyerId, sellerId, itemId, resellListingId } = meta;
        if (!orderId) break;

        await updateOrderStatus(orderId, 'processing');

        // Mark the resell listing as sold
        if (resellListingId) {
          await markResellListingSold(resellListingId);
        }

        // Persist shipping address
        const addr = session.collected_information?.shipping_details?.address
          ?? session.customer_details?.address;
        if (addr) {
          const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
          await updateOrderShippingAddress(orderId, parts.join(', '));
        }

        const [order, item] = await Promise.all([
          getOrderById(orderId),
          getItemById(itemId),
        ]);
        const now2 = Date.now();
        await Promise.all([
          createNotification({
            id: `notif_${uuid()}`,
            userId: buyerId,
            type: 'order',
            title: `Payment confirmed for ${item?.title ?? 'your item'}`,
            body: `Your resell purchase of $${order?.amount ?? ''} is confirmed.`,
            payload: JSON.stringify({ orderId, itemId }),
            createdAt: now2,
          }),
          createNotification({
            id: `notif_${uuid()}`,
            userId: sellerId,
            type: 'order',
            title: `Resale sold — ${item?.title ?? 'item'}`,
            body: `Payment of $${order?.amount ?? ''} received. Please ship soon.`,
            payload: JSON.stringify({ orderId, itemId }),
            createdAt: now2,
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

    // ── Connect account status changed ────────────────────────────────────────
    // Fires whenever a seller finishes onboarding, a requirement clears, or
    // Stripe flags a restriction. We cache the ready-state in our DB so the
    // checkout API can fail fast without round-tripping Stripe.
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const user = await getUserByStripeAccount(account.id);
      if (user) {
        const ready = !!(account.charges_enabled && account.payouts_enabled && account.details_submitted);
        if (ready !== user.stripeAccountReady) {
          await setStripeAccountReady(user.id, ready);
          if (ready) {
            await createNotification({
              id: `notif_${uuid()}`,
              userId: user.id,
              type: 'order',
              title: 'Payouts unlocked 🎉',
              body: 'Your Stripe account is verified. You can now accept payments on your listings.',
              payload: JSON.stringify({}),
              createdAt: Date.now(),
            });
          }
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
