import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getItems, getUserSwipes, getSwipedItemIds } from '@/lib/db';
import { buildUserPreferences, rankItems } from '@/lib/algorithm';
import { computeStyleDna, computeMatchScore } from '@/lib/styleDna';
import { Item } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchSize = parseInt(searchParams.get('batch') ?? '10');

  const [allItems, swipes, seenIds] = await Promise.all([
    getItems(500),
    getUserSwipes(userId),
    getSwipedItemIds(userId),
  ]);

  const itemMap = new Map<string, Item>(allItems.map(i => [i.id, i]));
  const prefs = buildUserPreferences(swipes, itemMap);

  const dnaItemMap = new Map(allItems.map(i => [i.id, { styles: i.styles, priceRange: i.priceRange }]));
  const dna = computeStyleDna(swipes, dnaItemMap);

  const ranked = rankItems(allItems, prefs, seenIds, batchSize);

  const feed = ranked
    .map(r => {
      const item = itemMap.get(r.itemId);
      if (!item) return null;
      return { ...item, _reason: r.reason, matchScore: dna.confident ? computeMatchScore(item.styles, dna) : 0 };
    })
    .filter(Boolean);

  return NextResponse.json({ feed, total: allItems.length - seenIds.size, dna });
}
