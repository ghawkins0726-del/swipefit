import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { getOrderById, createOrUpdateRating, getRatingForOrder } from '@/lib/db';

/**
 * POST /api/ratings — submit (or update) a star rating after a purchase.
 *
 * Body: { orderId: string, stars: 1..5, comment?: string }
 * Only the buyer on the order can submit a rating.
 *
 * The rating is keyed by orderId — if you submit again for the same order
 * it overwrites the previous one (lets buyers change their mind).
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ orderId?: string; stars?: number; comment?: string }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { orderId, stars, comment } = body;
  if (!orderId || typeof stars !== 'number' || stars < 1 || stars > 5) {
    return apiError.badRequest('Bad request — orderId + stars (1..5) required');
  }

  const order = await getOrderById(orderId);
  if (!order) return apiError.notFound('Order not found');
  if (order.buyerId !== userId) return apiError.forbidden('Only the buyer can rate this order');
  if (order.status === 'pending_payment' || order.status === 'cancelled') {
    return apiError.badRequest("Can't rate an unpaid or cancelled order");
  }

  await createOrUpdateRating(orderId, userId, order.sellerId, stars, comment);
  return NextResponse.json({ ok: true, stars });
});

/**
 * GET /api/ratings?orderId=xxx — fetch the existing rating for an order.
 * Used by the rating modal to pre-fill if the buyer is editing.
 */
export const GET = withAuth(async (req, _ctx) => {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return apiError.badRequest('orderId required');

  const rating = await getRatingForOrder(orderId);
  return NextResponse.json(rating ?? null);
});
