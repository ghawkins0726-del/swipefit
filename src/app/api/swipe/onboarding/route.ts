import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItems, recordSwipe, saveUserPreferences } from '@/lib/db';
import { Item } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { styles, categories, budget, gender, topSizes, bottomSizes, shoeSizes } = await req.json();

  // Build a flat size list from the onboarding payload for SQL-level filtering.
  const sizeFilter: string[] = [
    ...(topSizes    ?? []),
    ...(bottomSizes ?? []),
    ...(shoeSizes   ?? []),
  ];

  // Fetch only size-matched items directly from the DB — no JS filtering needed.
  // No excludeIds: onboarding users have no swipe history yet.
  const allItems = await getItems(50, 0, [], sizeFilter);
  const now = Date.now();

  const scored = allItems.map(item => {
    let score = 0;
    const styleMatches = item.styles.filter(s => styles?.includes(s)).length;
    score += styleMatches * 3;
    if (categories?.includes(item.category)) score += 2;
    if (categories?.includes(item.subcategory)) score += 1;
    if (budget !== undefined) score += Math.max(0, 3 - Math.abs(item.priceRange - parseInt(budget)));
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const total = allItems.length;
  const superCount = Math.max(1, Math.floor(total * 0.05));
  const likeCount = Math.max(3, Math.floor(total * 0.15));

  const toSwipe: { item: Item; action: 'superlike' | 'like' }[] = [
    ...scored.slice(0, superCount).map(s => ({ item: s.item, action: 'superlike' as const })),
    ...scored.slice(superCount, superCount + likeCount).map(s => ({ item: s.item, action: 'like' as const })),
  ];

  for (const { item, action } of toSwipe) {
    await recordSwipe({ id: uuid(), userId, itemId: item.id, action, timestamp: now - Math.random() * 86400000 });
  }

  // Persist preferences to DB so they survive device changes and power the feed size filter
  await saveUserPreferences({
    userId,
    gender: gender ?? 'all',
    topSizes: topSizes ?? [],
    bottomSizes: bottomSizes ?? [],
    shoeSizes: shoeSizes ?? [],
    styles: styles ?? [],
    categories: categories ?? [],
    budgetTier: budget !== undefined ? parseInt(budget) : 1,
    updatedAt: now,
  });

  return NextResponse.json({ bootstrapped: toSwipe.length });
}
