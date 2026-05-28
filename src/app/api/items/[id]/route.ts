import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getItemById, updateItem } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = await getItemById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.sellerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (existing.sold) return NextResponse.json({ error: 'Cannot edit a sold item' }, { status: 409 });

  const body = await req.json();
  const allowed = ['title', 'description', 'price', 'originalPrice', 'images', 'condition', 'brand', 'size', 'styles', 'colors'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await updateItem(id, userId, updates);
  return NextResponse.json(updated);
}
