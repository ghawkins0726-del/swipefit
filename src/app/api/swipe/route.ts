import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { recordSwipe } from '@/lib/db';
import { handleSwipeInteraction } from '@/lib/taste';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { itemId, action, timeViewingMs = 0 } = body;
  if (!itemId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const validActions = ['like', 'dislike', 'superlike', 'purchase', 'pass'];
  if (!validActions.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  // Record the raw swipe (existing behaviour)
  await recordSwipe({ id: uuid(), userId, itemId, action, timestamp: Date.now() });

  // Fire-and-forget: update taste profile without blocking the response.
  // handleSwipeInteraction also records the interaction in the v2 table with
  // strength and dwell-time, then applies the EMA update if a classification exists.
  handleSwipeInteraction(userId, itemId, action, timeViewingMs).catch(() => {
    // Non-critical — taste update failure must not surface to the client
  });

  return NextResponse.json({ ok: true });
}
