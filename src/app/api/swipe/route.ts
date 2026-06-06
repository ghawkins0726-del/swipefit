import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { recordSwipe } from '@/lib/db';
import { handleSwipeInteraction } from '@/lib/taste';
import type { SwipeRecord } from '@/lib/types';

// NOTE: 'pass' is accepted at runtime (matches prior behaviour) even though
// SwipeRecord.action's TS type only covers the other four. Preserved via cast.
const VALID_ACTIONS = ['like', 'dislike', 'superlike', 'purchase', 'pass'];

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseJson<{ itemId?: string; action?: string; timeViewingMs?: number }>(req);
  if (!body) return apiError.badRequest('Invalid body');
  const { itemId, action, timeViewingMs = 0 } = body;
  if (!itemId || !action) return apiError.badRequest('Missing fields');

  if (!VALID_ACTIONS.includes(action)) {
    return apiError.badRequest('Invalid action');
  }

  // Record the raw swipe (existing behaviour)
  await recordSwipe({
    id: uuid(),
    userId,
    itemId,
    action: action as SwipeRecord['action'],
    timestamp: Date.now(),
  });

  // Fire-and-forget: update taste profile without blocking the response.
  // handleSwipeInteraction also records the interaction in the v2 table with
  // strength and dwell-time, then applies the EMA update if a classification exists.
  handleSwipeInteraction(userId, itemId, action as SwipeRecord['action'], timeViewingMs).catch(() => {
    // Non-critical — taste update failure must not surface to the client
  });

  return NextResponse.json({ ok: true });
});
