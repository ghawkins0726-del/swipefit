import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUser, getOrCreateUser } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  const { userId: authUserId } = await auth();
  if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { userId: bodyUserId, name, bio, avatar } = body as {
    userId?: string;
    name?: string;
    bio?: string;
    avatar?: string;
  };

  // Reject attempts to update another user's profile
  if (bodyUserId && bodyUserId !== authUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }

  await updateUser(authUserId, {
    ...(name !== undefined && { name: (name as string).trim() }),
    ...(bio !== undefined && { bio: bio as string }),
    ...(avatar !== undefined && { avatar: avatar as string }),
  });
  const user = await getOrCreateUser(authUserId);
  return NextResponse.json({ ok: true, user });
}
