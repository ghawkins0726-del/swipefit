import { NextRequest, NextResponse } from 'next/server';
import { updateUser, getOrCreateUser } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, name, bio, avatar } = body;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  await updateUser(userId, {
    ...(name !== undefined && { name: name.trim() }),
    ...(bio !== undefined && { bio }),
    ...(avatar !== undefined && { avatar }),
  });
  const user = await getOrCreateUser(userId);
  return NextResponse.json({ ok: true, user });
}
