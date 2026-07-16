import { NextResponse } from 'next/server';
import { withAuth, parseJson, apiError } from '@/lib/api-helpers';
import { updateUser, getOrCreateUser } from '@/lib/db';
import { checkRateLimit, profileLimiter } from '@/lib/ratelimit';

export const PATCH = withAuth(async (req, { userId: authUserId }) => {
  const limited = await checkRateLimit(profileLimiter, authUserId);
  if (limited) return limited;

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
  if (name && (name as string).trim().length > 60) return apiError.badRequest('Name too long (max 60 chars)');
  if (bio && (bio as string).length > 500) return apiError.badRequest('Bio too long (max 500 chars)');
  if (avatar && (avatar as string).length > 500) return apiError.badRequest('Invalid avatar URL');

  await updateUser(authUserId, {
    ...(name !== undefined && { name: (name as string).trim() }),
    ...(bio !== undefined && { bio: bio as string }),
    ...(avatar !== undefined && { avatar: avatar as string }),
  });
  const user = await getOrCreateUser(authUserId);
  return NextResponse.json({ ok: true, user });
});
