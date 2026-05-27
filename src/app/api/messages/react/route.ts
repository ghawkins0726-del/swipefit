import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { toggleReaction } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const result = await toggleReaction(messageId, userId, emoji);
  return NextResponse.json({ ok: true, action: result });
}
