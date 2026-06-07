import { NextResponse } from 'next/server';
import { withAuthParams } from '@/lib/api-helpers';
import { deleteCollection, getCollectionItems } from '@/lib/db';

export const GET = withAuthParams<{ id: string }, unknown>(
  async (_req, { params }) => {
    const { id } = await params;
    const items = await getCollectionItems(id);
    return NextResponse.json(items);
  },
);

export const DELETE = withAuthParams<{ id: string }, unknown>(
  async (_req, { params }, { userId }) => {
    const { id } = await params;
    await deleteCollection(id, userId);
    return NextResponse.json({ ok: true });
  },
);
