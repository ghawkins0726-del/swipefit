import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { toggleReaction } from '@/lib/db';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ messageId?: string; emoji?: string }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { messageId, emoji } = body;
  if (!messageId || !emoji) return apiError.badRequest('Missing fields');

  const result = await toggleReaction(messageId, userId, emoji);
  return NextResponse.json({ ok: true, action: result });
});
