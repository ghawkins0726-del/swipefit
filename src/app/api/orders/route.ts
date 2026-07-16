import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrdersByUser, getOrderById, updateOrderStatus, updateOrderTracking, getItemById } from '@/lib/db';

// NOTE: order creation for purchases goes through /api/stripe/item-checkout,
// /api/stripe/resell purchase, and the coin-flip flip route — all of which
// handle payment, offer-aware pricing, and the atomic sold-guard. There is
// deliberately no POST here; a bare createOrder that only knew the list price
// would reject accepted-offer purchases and duplicate authorization logic.

export async function GET(req: NextRequest) {
  // Always require auth — never rely on "secret enough" IDs
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const role = (searchParams.get('role') ?? 'buyer') as 'buyer' | 'seller';

  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Only the buyer or seller may view the order
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const item = await getItemById(order.itemId);
    return NextResponse.json({ ...order, item });
  }

  return NextResponse.json(await getOrdersByUser(userId, role));
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { orderId, status, trackingNumber } = body;
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  // Verify the user owns this order (buyer or seller) before allowing any update
  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== userId && order.sellerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only the seller may add tracking or change shipping status
  if ((trackingNumber || status === 'shipped') && order.sellerId !== userId) {
    return NextResponse.json({ error: 'Only the seller can update shipping' }, { status: 403 });
  }

  // Only the buyer may mark as delivered/received
  if (status === 'delivered' && order.buyerId !== userId) {
    return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 });
  }

  if (trackingNumber) {
    await updateOrderTracking(orderId, trackingNumber);
  } else if (status) {
    await updateOrderStatus(orderId, status);
  } else {
    return NextResponse.json({ error: 'Missing status or trackingNumber' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
