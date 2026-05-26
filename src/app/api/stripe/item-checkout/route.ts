import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import { getItemById, createOrder } from '@/lib/db';
import { Order } from '@/lib/db-types';

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

  // Build Stripe checkout session (one-time payment, not subscription)
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(parseFloat(String(amount)) * 100), // dollars → cents
          product_data: {
            name: item.title,
            description: `${item.brand} · Size ${item.size} · ${item.condition.replace('_', ' ')}`,
            ...(item.images?.[0] ? { images: [item.images[0]] } : {}),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'item_purchase',
      orderId: order.id,
      buyerId: userId,
      sellerId,
      itemId,
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/item/${itemId}`,
  });

  return NextResponse.json({ url: session.url, orderId: order.id });
}
