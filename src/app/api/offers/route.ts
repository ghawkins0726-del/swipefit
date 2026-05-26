import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { createOffer, getOffersByUser, updateOfferStatus, getItemById } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { itemId, amount, message } = body;
  if (!itemId || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  await createOffer({ id: uuid(), buyerId, sellerId: item.sellerId, itemId, amount: parseFloat(amount), message: message || '', status: 'pending', createdAt: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = (searchParams.get('role') ?? 'buyer') as 'buyer' | 'seller';
  return NextResponse.json(await getOffersByUser(userId, role));
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { offerId, status } = body;
  if (!offerId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  await updateOfferStatus(offerId, status);
  return NextResponse.json({ ok: true });
}
