import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { undoSwipe } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

  await undoSwipe(userId, itemId);
  return NextResponse.json({ ok: true });
}
