import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { undoSwipe } from '@/lib/db';

export const DELETE = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ itemId?: string }>(req);
  if (!body?.itemId) return apiError.badRequest('Missing itemId');

  await undoSwipe(userId, body.itemId);
  return NextResponse.json({ ok: true });
});
