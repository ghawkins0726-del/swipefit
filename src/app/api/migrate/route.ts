import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-secret') === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await ensureSchema();
  return NextResponse.json({ ok: true, message: 'Schema migrations applied' });
}
