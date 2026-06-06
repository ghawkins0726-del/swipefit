import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import { getItemById, createOrder, getOrCreateUser, getOffersByUser } from '@/lib/db';
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

  // ── Amount validation: never trust the client price ────────────────────────
  // Look for an accepted or countered offer from this buyer for this item.
  // If one exists, the amount must match it. Otherwise it must match the listed price.
  const requestedAmount = parseFloat(String(amount));
  if (!isFinite(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }
  const buyerOffers = await getOffersByUser(userId, 'buyer');
  const acceptedOffer = buyerOffers.find(
    o => o.itemId === itemId &&
      o.sellerId === item.sellerId &&
      (o.status === 'accepted' || o.status === 'countered'),
  );
  const authorisedAmount = acceptedOffer
    ? (acceptedOffer.status === 'countered' ? (acceptedOffer.counterAmount ?? acceptedOffer.amount) : acceptedOffer.amount)
    : item.price;
  if (Math.abs(requestedAmount - authorisedAmount) > 0.01) {
    return NextResponse.json({ error: 'Amount does not match authorised price' }, { status: 400 });
  }
  // Use the server-validated amount from here on — never the raw client value
  const validatedAmount = authorisedAmount;

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
    amount: validatedAmount,
    status: 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await createOrder(order);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ITEM_ALREADY_SOLD') {
      return NextResponse.json({ error: 'Item was just purchased by someone else' }, { status: 409 });
    }
    throw err;
  }

  // Build Stripe checkout session — destination charge with 10% platform fee.
  // Stripe sends the full charge to OUR account, takes our application_fee_amount,
  // then transfers the rest to the seller's connected account.
  const stripe = getStripe();
  const amountCents = Math.round(validatedAmount * 100);
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
