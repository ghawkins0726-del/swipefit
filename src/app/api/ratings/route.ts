import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderId, stars, comment } = await req.json() as {
    orderId?: string; stars?: number; comment?: string;
  };
  if (!orderId || typeof stars !== 'number' || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'Bad request — orderId + stars (1..5) required' }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== userId) {
    return NextResponse.json({ error: 'Only the buyer can rate this order' }, { status: 403 });
  }
  if (order.status === 'pending_payment' || order.status === 'cancelled') {
    return NextResponse.json({ error: "Can't rate an unpaid or cancelled order" }, { status: 400 });
  }

  await createOrUpdateRating(orderId, userId, order.sellerId, stars, comment);
  return NextResponse.json({ ok: true, stars });
}

/**
 * GET /api/ratings?orderId=xxx — fetch the existing rating for an order.
 * Used by the rating modal to pre-fill if the buyer is editing.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const rating = await getRatingForOrder(orderId);
  return NextResponse.json(rating ?? null);
}
