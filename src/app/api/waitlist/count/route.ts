import { NextResponse } from 'next/server';
import { getWaitlistCount, initDb } from '@/lib/db';

/** GET /api/waitlist/count — live signup counter for the landing page. Public. */
export async function GET() {
  await initDb(); // ensure waitlist table exists (idempotent, cached)
  const total = await getWaitlistCount();
  return NextResponse.json({ total });
}
