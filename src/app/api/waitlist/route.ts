import { NextRequest, NextResponse } from 'next/server';
import { joinWaitlist, getWaitlistEntry, getWaitlistCount, initDb, type WaitlistEntry } from '@/lib/db';
import { parseJson, apiError } from '@/lib/api-helpers';
import { waitlistLimiter, waitlistReadLimiter, checkRateLimit, clientIp } from '@/lib/ratelimit';

// Basic email shape check — not RFC-perfect, just enough to reject junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The status payload the client's waitlist page consumes. */
function statusPayload(entry: WaitlistEntry, total: number) {
  return {
    referralCode: entry.referralCode,
    position: entry.effectivePosition,
    rawPosition: entry.position,
    referralCount: entry.referralCount,
    total,
  };
}

/** POST /api/waitlist — join the waitlist. Public (no account needed). */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(waitlistLimiter, clientIp(req));
  if (limited) return limited;

  await initDb(); // ensure waitlist table exists (idempotent, cached)

  const body = await parseJson<{ email?: string; ref?: string | null; utm?: { source?: string; medium?: string; campaign?: string } }>(req);
  if (!body) return apiError.badRequest('Invalid body');

  const email = (body.email ?? '').trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return apiError.badRequest('Enter a valid email');
  }

  const ref = body.ref && typeof body.ref === 'string' ? body.ref.slice(0, 12).toUpperCase() : null;
  const utm = {
    source:   body.utm?.source?.slice(0, 60)   ?? null,
    medium:   body.utm?.medium?.slice(0, 60)   ?? null,
    campaign: body.utm?.campaign?.slice(0, 60) ?? null,
  };

  const entry = await joinWaitlist(email, ref, utm);
  const total = await getWaitlistCount();
  return NextResponse.json(statusPayload(entry, total));
}

/** GET /api/waitlist?ref=CODE — fetch live status for a referral code. */
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(waitlistReadLimiter, clientIp(req));
  if (limited) return limited;

  await initDb(); // ensure waitlist table exists (idempotent, cached)
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  if (!ref) return apiError.badRequest('Missing ref');

  const entry = await getWaitlistEntry(ref.toUpperCase());
  if (!entry) return apiError.notFound();

  const total = await getWaitlistCount();
  return NextResponse.json(statusPayload(entry, total));
}
