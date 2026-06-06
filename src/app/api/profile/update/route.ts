import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { updateUser, getOrCreateUser } from '@/lib/db';

export const PATCH = withAuth(async (req, { userId: authUserId }) => {
  const body = await parseJson<{
    userId?: string;
    name?: string;
    bio?: string;
    avatar?: string;
  }>(req);
  if (!body) return apiError.badRequest('Invalid body');

  const { userId: bodyUserId, name, bio, avatar } = body;

  // Reject attempts to update another user's profile
  if (bodyUserId && bodyUserId !== authUserId) return apiError.forbidden();

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return apiError.badRequest('Name cannot be empty');
  }

  await updateUser(authUserId, {
    ...(name !== undefined && { name: (name as string).trim() }),
    ...(bio !== undefined && { bio: bio as string }),
    ...(avatar !== undefined && { avatar: avatar as string }),
  });
  const user = await getOrCreateUser(authUserId);
  return NextResponse.json({ ok: true, user });
});
