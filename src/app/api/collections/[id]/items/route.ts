import { NextResponse } from 'next/server';
import { withAuthParams, parseJson, apiError } from '@/lib/api-helpers';
import { addItemToCollection, removeItemFromCollection } from '@/lib/db';

export const POST = withAuthParams<{ id: string }, unknown>(async (req, { params }) => {
  const { id: collectionId } = await params;
  const body = await parseJson<{ itemId?: string }>(req);
  if (!body?.itemId) return apiError.badRequest('itemId required');
  await addItemToCollection(collectionId, body.itemId);
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuthParams<{ id: string }, unknown>(async (req, { params }) => {
  const { id: collectionId } = await params;
  const body = await parseJson<{ itemId?: string }>(req);
  if (!body?.itemId) return apiError.badRequest('itemId required');
  await removeItemFromCollection(collectionId, body.itemId);
  return NextResponse.json({ ok: true });
});
