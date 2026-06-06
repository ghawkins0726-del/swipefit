import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinFlipMonthCount } from '@/lib/db-coin-flip';

const MONTHLY_LIMIT = 3;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const used = await getCoinFlipMonthCount(userId);
  const remaining = Math.max(0, MONTHLY_LIMIT - used);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetsAt = nextMonth.getTime();

  return NextResponse.json({ remaining, used, resetsAt });
}
