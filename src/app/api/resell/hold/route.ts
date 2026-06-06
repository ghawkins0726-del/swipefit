import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrderById, getOrderHoldExpiresAt, setOrderHold } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  // Validate user owns the order
  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Idempotency: return the existing hold if it hasn't expired yet
  const existingHold = await getOrderHoldExpiresAt(orderId);
  if (existingHold !== null && existingHold > Date.now()) {
    return NextResponse.json({ holdsUntil: existingHold });
  }

  const holdExpiresAt = Date.now() + 48 * 60 * 60 * 1000;
  await setOrderHold(orderId, holdExpiresAt);

  return NextResponse.json({ holdsUntil: holdExpiresAt });
}
