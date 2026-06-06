import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUser, getOrCreateUser } from '@/lib/db';
import { checkRateLimit, profileLimiter } from '@/lib/ratelimit';

export async function PATCH(req: NextRequest) {
  // Always derive userId from the authenticated session — never trust body input
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await checkRateLimit(profileLimiter, userId);
  if (limited) return limited;

  const body = await req.json();
  const { name, bio, avatar } = body;

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (name && name.trim().length > 60) {
    return NextResponse.json({ error: 'Name too long (max 60 chars)' }, { status: 400 });
  }
  if (bio && bio.length > 500) {
    return NextResponse.json({ error: 'Bio too long (max 500 chars)' }, { status: 400 });
  }
  if (avatar && avatar.length > 500) {
    return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
  }

  await updateUser(userId, {
    ...(name !== undefined && { name: name.trim() }),
    ...(bio !== undefined && { bio }),
    ...(avatar !== undefined && { avatar }),
  });

  const user = await getOrCreateUser(userId);
  return NextResponse.json({ ok: true, user });
}
