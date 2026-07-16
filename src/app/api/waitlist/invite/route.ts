import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { initDb, getUninvitedBatch, markWaitlistInvited, getUninvitedCount } from '@/lib/db';

/**
 * POST /api/waitlist/invite — release the next tier off the waitlist.
 *
 * Admin-only (x-admin-secret header). Takes the next `count` un-invited signups
 * in effective-position order, sends each a Clerk sign-up invitation, and marks
 * them invited. Requires the Clerk instance to be in **Restricted** sign-up mode
 * (Dashboard → Restrictions) so only invited emails can actually create an
 * account — this endpoint issues the invites; Clerk enforces the gate.
 *
 * Body: { "count": number }  — how many to release. Use a large number to invite
 * everyone currently waiting.
 */

// Clerk bulk-invite limits: max 10 emails per call, 25 bulk calls/hour per
// instance. Cap a single release at 250 so we never blow the hourly budget in
// one request; call again for larger drops.
const CHUNK = 10;
const MAX_PER_REQUEST = 250;

function isAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret');
  return !!secret && !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await initDb();

  let body: { count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const requested = Number(body.count);
  if (!Number.isFinite(requested) || requested <= 0) {
    return NextResponse.json({ error: 'count must be a positive number' }, { status: 400 });
  }
  const limit = Math.min(Math.floor(requested), MAX_PER_REQUEST);

  const batch = await getUninvitedBatch(limit);
  if (batch.length === 0) {
    return NextResponse.json({ invited: 0, remaining: 0, message: 'No one left to invite.' });
  }

  const redirectUrl = `${process.env.NEXT_PUBLIC_URL ?? ''}/sign-up`;
  const client = await clerkClient();

  const invitedIds: string[] = [];
  const failures: { email: string; error: string }[] = [];

  for (let i = 0; i < batch.length; i += CHUNK) {
    const slice = batch.slice(i, i + CHUNK);
    try {
      await client.invitations.createInvitationBulk(
        slice.map(({ email }) => ({
          emailAddress: email,
          redirectUrl,
          // Don't error if this email was already invited — just skip it.
          ignoreExisting: true,
        })),
      );
      invitedIds.push(...slice.map(s => s.id));
    } catch (err) {
      // Chunk failed (rate limit, transient Clerk error) — leave these
      // un-invited so a retry picks them up, and record why.
      const message = err instanceof Error ? err.message : 'unknown error';
      failures.push(...slice.map(s => ({ email: s.email, error: message })));
    }
  }

  await markWaitlistInvited(invitedIds);
  const remaining = await getUninvitedCount();

  return NextResponse.json({
    invited: invitedIds.length,
    failed: failures.length,
    remaining,
    ...(failures.length ? { failures } : {}),
  });
}
