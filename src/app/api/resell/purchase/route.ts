import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getStripe } from '@/lib/stripe';
import {
  getResellListingById,
  getItemById,
  getOrCreateUser,
  createResellOrder,
  cancelResellOrderAndReleaseListing,
} from '@/lib/db';
import { Order } from '@/lib/db-types';

const PLATFORM_FEE_PCT = 0.10;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resellListingId } = await req.json();
  if (!resellListingId) {
    return NextResponse.json({ error: 'Missing resellListingId' }, { status: 400 });
  }

  // Fetch listing (must be active)
  const listing = await getResellListingById(resellListingId);
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is no longer available' }, { status: 409 });
  }
  if (listing.sellerUserId === userId) {
    return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 });
  }

  // Fetch the underlying item
  const item = await getItemById(listing.itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // Fetch seller and check Stripe Connect readiness
  const seller = await getOrCreateUser(listing.sellerUserId);
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({
      error: 'Seller has not set up payouts yet',
      code: 'seller_not_onboarded',
    }, { status: 409 });
  }

  const now = Date.now();
  const orderId = uuid();

  // Create order in DB (status: pending_payment). createResellOrder atomically
  // claims the listing (active → sold); if another buyer won the race it throws
  // RESELL_ALREADY_SOLD. It does NOT touch items.sold — the resold item's
  // original row is already sold=true, which is exactly why the plain
  // createOrder path (with its item sold-guard) cannot be used here.
  const order: Order = {
    id: orderId,
    buyerId: userId,
    sellerId: listing.sellerUserId,
    itemId: listing.itemId,
    amount: listing.price,
    status: 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await createResellOrder(order, resellListingId);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'RESELL_ALREADY_SOLD') {
      return NextResponse.json({ error: 'Listing was just purchased by someone else' }, { status: 409 });
    }
    throw err;
  }

  // Build Stripe checkout session
  const stripe = getStripe();
  const amountCents = Math.round(listing.price * 100);
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    // Release the listing if the buyer never pays (checkout.session.expired).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: item.title,
            description: `${item.brand} · Size ${item.size} · ${listing.condition.replace('_', ' ')} (Resell)`,
            ...(listing.images?.[0]
              ? { images: [listing.images[0]] }
              : item.images?.[0]
                ? { images: [item.images[0]] }
                : {}),
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
      type: 'resell_purchase',
      orderId,
      resellListingId,
      buyerId: userId,
      sellerId: listing.sellerUserId,
      itemId: listing.itemId,
      platformFeeCents: String(platformFeeCents),
    },
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
    success_url: `${process.env.NEXT_PUBLIC_URL}/orders/${orderId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/item/${listing.itemId}`,
    });
  } catch (err) {
    // Session creation failed after we claimed the listing — release it.
    await cancelResellOrderAndReleaseListing(orderId, resellListingId);
    throw err;
  }

  return NextResponse.json({ url: session.url, orderId });
}
