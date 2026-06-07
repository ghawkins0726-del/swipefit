import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { getOrderById, getOrderHoldExpiresAt, setOrderHold } from '@/lib/db';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ orderId?: string }>(req);
  if (!body?.orderId) return apiError.badRequest('Missing orderId');

  // Validate user owns the order
  const order = await getOrderById(body.orderId);
  if (!order) return apiError.notFound('Order not found');
  if (order.buyerId !== userId) return apiError.forbidden();

  // Idempotency: return the existing hold if it hasn't expired yet
  const existingHold = await getOrderHoldExpiresAt(body.orderId);
  if (existingHold !== null && existingHold > Date.now()) {
    return NextResponse.json({ holdsUntil: existingHold });
  }

  const holdExpiresAt = Date.now() + 48 * 60 * 60 * 1000;
  await setOrderHold(body.orderId, holdExpiresAt);

  return NextResponse.json({ holdsUntil: holdExpiresAt });
});
