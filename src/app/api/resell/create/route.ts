import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import {
  getOrderById,
  createResellListing,
  addResellPriceHistory,
  getResellListings,
} from '@/lib/db';
import { ResellListing, ResellPriceHistory } from '@/lib/db-types';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderId, condition, price, images } = await req.json();
  if (!orderId || !condition || !price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate user owns the order
  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check order status is valid for reselling
  if (order.status === 'pending_payment' || order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order cannot be resold in its current state' }, { status: 409 });
  }

  // Check no active resell listing exists for this order
  const existingListings = await getResellListings(order.itemId);
  const alreadyListed = existingListings.some(l => l.originalOrderId === orderId);
  if (alreadyListed) {
    return NextResponse.json({ error: 'An active resell listing already exists for this order' }, { status: 409 });
  }

  const now = Date.now();
  const listing: ResellListing = {
    id: uuid(),
    originalOrderId: orderId,
    sellerUserId: userId,
    itemId: order.itemId,
    condition: condition as ResellListing['condition'],
    price: parseFloat(String(price)),
    images: Array.isArray(images) ? images : [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await createResellListing(listing);

  const historyEntry: ResellPriceHistory = {
    id: uuid(),
    itemId: order.itemId,
    orderId,
    sellerUserId: userId,
    price: listing.price,
    condition: listing.condition,
    createdAt: now,
  };
  await addResellPriceHistory(historyEntry);

  return NextResponse.json({ listing });
}
