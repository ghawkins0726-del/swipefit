import { NextResponse } from 'next/server';
import { getItems, createItem, ensureSchema } from '@/lib/db';
import { getSeedItems } from '@/lib/seed';

// Seed endpoint is development-only
function devOnly() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST() {
  const guard = devOnly();
  if (guard) return guard;

  await ensureSchema();
  const existing = await getItems(1);
  if (existing.length > 0) {
    const all = await getItems(500);
    return NextResponse.json({ message: 'Already seeded', count: all.length });
  }
  const items = getSeedItems();
  for (const item of items) {
    await createItem(item);
  }
  return NextResponse.json({ message: 'Seeded', count: items.length });
}

export async function GET() {
  const guard = devOnly();
  if (guard) return guard;

  await ensureSchema();
  const items = await getItems(500);
  return NextResponse.json({ count: items.length });
}
