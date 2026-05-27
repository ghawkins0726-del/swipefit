import { NextRequest, NextResponse } from 'next/server';
import { getItems, createItem, ensureSchema, getOrCreateUser, updateUser } from '@/lib/db';
import { getSeedItems, getSeedUsers } from '@/lib/seed';

/**
 * Guard: always requires the ADMIN_SECRET header (both dev and prod).
 * This route is NOT in the Clerk public-routes list, so it also requires
 * a valid Clerk session — the admin secret is a second layer on top.
 */
function checkAuth(req: NextRequest): NextResponse | null {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || !process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const guard = checkAuth(req);
  if (guard) return guard;

  await ensureSchema();

  // Check if already seeded (avoid double-seeding)
  const existing = await getItems(1);
  if (existing.length > 0) {
    const all = await getItems(500);
    return NextResponse.json({ message: 'Already seeded', count: all.length });
  }

  // 1. Seed seller user records first so FK relationships are valid
  const users = getSeedUsers();
  for (const user of users) {
    await getOrCreateUser(user.id, user.name);
    await updateUser(user.id, { bio: user.bio, avatar: user.avatar });
  }

  // 2. Seed items
  const items = getSeedItems();
  for (const item of items) {
    await createItem(item);
  }

  return NextResponse.json({
    message: 'Seeded',
    users: users.length,
    items: items.length,
  });
}

export async function GET(req: NextRequest) {
  const guard = checkAuth(req);
  if (guard) return guard;

  await ensureSchema();
  const items = await getItems(500);
  return NextResponse.json({ count: items.length });
}
