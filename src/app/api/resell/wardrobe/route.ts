import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getUserWardrobe } from '@/lib/db';

export const GET = withAuth(async (_req, { userId }) => {
  const wardrobe = await getUserWardrobe(userId);
  return NextResponse.json(wardrobe);
});
