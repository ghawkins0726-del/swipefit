import { NextRequest, NextResponse } from 'next/server';
import { joinWaitlist, getWaitlistEntry, getWaitlistCount, initDb } from '@/lib/db';

// Basic email shape check — not RFC-perfect, just enough to reject junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/waitlist — join the waitlist. Public (no account needed). */
export async function POST(req: NextRequest) {
  await initDb(); // ensure waitlist table exists (idempotent, cached)
  let body: { email?: string; ref?: string | null; utm?: { source?: string; medium?: string; campaign?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  }

  const ref = body.ref && typeof body.ref === 'string' ? body.ref.slice(0, 12).toUpperCase() : null;
  const utm = {
    source:   body.utm?.source?.slice(0, 60)   ?? null,
    medium:   body.utm?.medium?.slice(0, 60)   ?? null,
    campaign: body.utm?.campaign?.slice(0, 60) ?? null,
  };

  const entry = await joinWaitlist(email, ref, utm);
  const total = await getWaitlistCount();

  return NextResponse.json({
    referralCode: entry.referralCode,
    position: entry.effectivePosition,
    rawPosition: entry.position,
    referralCount: entry.referralCount,
    total,
  });
}

/** GET /api/waitlist?ref=CODE — fetch live status for a referral code. */
export async function GET(req: NextRequest) {
  await initDb(); // ensure waitlist table exists (idempotent, cached)
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 });

  const entry = await getWaitlistEntry(ref.toUpperCase());
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const total = await getWaitlistCount();
  return NextResponse.json({
    referralCode: entry.referralCode,
    position: entry.effectivePosition,
    rawPosition: entry.position,
    referralCount: entry.referralCount,
    total,
  });
}
