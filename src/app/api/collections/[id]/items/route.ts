import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addItemToCollection, removeItemFromCollection } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: collectionId } = await params;
  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  await addItemToCollection(collectionId, itemId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: collectionId } = await params;
  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  await removeItemFromCollection(collectionId, itemId);
  return NextResponse.json({ ok: true });
}
