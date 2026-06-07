import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getCoinFlipMonthCount } from '@/lib/db-coin-flip';

const MONTHLY_LIMIT = 3;

export const GET = withAuth(async (_req, { userId }) => {
  const used = await getCoinFlipMonthCount(userId);
  const remaining = Math.max(0, MONTHLY_LIMIT - used);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetsAt = nextMonth.getTime();

  return NextResponse.json({ remaining, used, resetsAt });
});
