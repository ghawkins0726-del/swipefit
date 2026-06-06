import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { createOrder, getOrdersByUser, getOrderById, updateOrderStatus, updateOrderTracking, getItemById, createNotification, getOrCreateUser } from '@/lib/db';
import { Order } from '@/lib/db-types';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { sellerId, itemId, amount } = body;
  if (!sellerId || !itemId || !amount) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (item.sellerId === userId) return NextResponse.json({ error: 'Cannot buy your own item' }, { status: 400 });

  // Validate amount matches item price (cannot forge a lower price)
  const parsedAmount = parseFloat(String(amount));
  if (!isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }
  if (Math.abs(parsedAmount - item.price) > 0.01) {
    return NextResponse.json({ error: 'Amount does not match item price' }, { status: 400 });
  }

  const buyer = await getOrCreateUser(userId);
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId: userId,
    sellerId: item.sellerId, // always from DB, not client
    itemId,
    amount: item.price,     // always from DB, not client
    status: 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };
  await createOrder(order);

  await Promise.all([
    createNotification({
      id: `notif_${uuid()}`,
      userId,
      type: 'order',
      title: `Order confirmed for ${item.title}`,
      body: `Your order for $${order.amount} is being processed.`,
      payload: JSON.stringify({ orderId: order.id, itemId }),
      createdAt: now,
    }),
    createNotification({
      id: `notif_${uuid()}`,
      userId: item.sellerId,
      type: 'order',
      title: `${buyer.name} purchased ${item.title}`,
      body: `You have a new sale for $${order.amount}. Ship it soon!`,
      payload: JSON.stringify({ orderId: order.id, itemId }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ orderId: order.id, status: order.status });
}

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
