import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { recordSwipe } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { itemId, action } = body;
  if (!itemId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const validActions = ['like', 'dislike', 'superlike', 'purchase'];
  if (!validActions.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  await recordSwipe({ id: uuid(), userId, itemId, action, timestamp: Date.now() });
  return NextResponse.json({ ok: true });
}
