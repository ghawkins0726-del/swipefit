import { NextResponse } from 'next/server';
import { getWaitlistCount, initDb } from '@/lib/db';

/**
 * GET /api/waitlist/count — live signup counter for the landing page. Public.
 * The count changes slowly and is decorative, so let the CDN serve one cached
 * value to everyone (30s) instead of running a COUNT(*) per visitor per poll —
 * this is what absorbs an ad-driven traffic spike.
 */
export async function GET() {
  await initDb(); // ensure waitlist table exists (idempotent, cached)
  const total = await getWaitlistCount();
  return NextResponse.json(
    { total },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  );
}
