import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import { getItemById, createOrder, getOrCreateUser } from '@/lib/db';
import { Order } from '@/lib/db-types';

// Platform takes 10% — seller gets 90%. Tweak here if you change the cut.
const PLATFORM_FEE_PCT = 0.10;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId, sellerId, amount } = await req.json();
  if (!itemId || !sellerId || !amount) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (item.sellerId === userId) return NextResponse.json({ error: 'Cannot buy your own item' }, { status: 400 });

  // The seller must have a Stripe Connect account that can accept charges.
  const seller = await getOrCreateUser(sellerId);
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({
      error: 'Seller has not set up payouts yet',
      code: 'seller_not_onboarded',
    }, { status: 409 });
  }

  // Create the order in pending_payment state — webhook will advance it to processing
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId: userId,
    sellerId,
    itemId,
    amount: parseFloat(String(amount)),
    status: 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };
  await createOrder(order);

  // Build Stripe checkout session — destination charge with 10% platform fee.
  // Stripe sends the full charge to OUR account, takes our application_fee_amount,
  // then transfers the rest to the seller's connected account.
  const stripe = getStripe();
  const amountCents = Math.round(parseFloat(String(amount)) * 100);
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: item.title,
            description: `${item.brand} · Size ${item.size} · ${item.condition.replace('_', ' ')}`,
            ...(item.images?.[0] ? { images: [item.images[0]] } : {}),
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: seller.stripeAccountId },
    },
    metadata: {
      type: 'item_purchase',
      orderId: order.id,
      buyerId: userId,
      sellerId,
      itemId,
      platformFeeCents: String(platformFeeCents),
    },
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
    success_url: `${process.env.NEXT_PUBLIC_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/item/${itemId}`,
  });

  return NextResponse.json({ url: session.url, orderId: order.id });
}
