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

  const buyer = await getOrCreateUser(userId);
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId: userId,
    sellerId,
    itemId,
    amount: parseFloat(amount),
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
      userId: sellerId,
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
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const role = (searchParams.get('role') ?? 'buyer') as 'buyer' | 'seller';

  // Single order lookup is public (order id is secret enough)
  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const item = await getItemById(order.itemId);
    return NextResponse.json({ ...order, item });
  }

  // List requires auth
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getOrdersByUser(userId, role));
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { orderId, status, trackingNumber } = body;
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  if (trackingNumber) {
    await updateOrderTracking(orderId, trackingNumber);
  } else if (status) {
    await updateOrderStatus(orderId, status);
  } else {
    return NextResponse.json({ error: 'Missing status or trackingNumber' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
