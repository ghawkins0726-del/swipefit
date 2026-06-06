import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { getCollections, createCollection } from '@/lib/db';

export const GET = withAuth(async (_req, { userId }) => {
  const collections = await getCollections(userId);
  return NextResponse.json(collections);
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ name?: string; emoji?: string }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { name, emoji = '🗂️' } = body;
  if (!name?.trim()) return apiError.badRequest('Name required');

  const collection = await createCollection(userId, name.trim(), emoji);
  return NextResponse.json(collection, { status: 201 });
});
