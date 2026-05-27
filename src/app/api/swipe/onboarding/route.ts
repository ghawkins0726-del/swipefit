import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItems, recordSwipe, savePreferredSizes, getTasteProfile, saveTasteProfile } from '@/lib/db';
import { Item } from '@/lib/types';

// Maps quiz style picks → taste profile dimension
const STYLE_TO_DIMENSION: Record<string, keyof {
  streetwearScore: number; minimalScore: number; vintageScore: number;
  luxuryScore: number; outdoorScore: number; preppyScore: number;
}> = {
  streetwear: 'streetwearScore',
  minimal:    'minimalScore',
  vintage:    'vintageScore',
  y2k:        'streetwearScore',
  luxury:     'luxuryScore',
  techwear:   'outdoorScore',
  workwear:   'outdoorScore',
  preppy:     'preppyScore',
  bohemian:   'minimalScore',
  athletic:   'outdoorScore',
};

const BUDGET_TO_TIERS: Record<string, Partial<{
  budgetScore: number; midrangeScore: number; premiumScore: number; luxuryTierScore: number;
}>> = {
  '0': { budgetScore: 0.9, midrangeScore: 0.5, premiumScore: 0.2, luxuryTierScore: 0.1 },
  '1': { budgetScore: 0.7, midrangeScore: 0.85, premiumScore: 0.4, luxuryTierScore: 0.2 },
  '2': { budgetScore: 0.4, midrangeScore: 0.8, premiumScore: 0.8, luxuryTierScore: 0.4 },
  '3': { budgetScore: 0.2, midrangeScore: 0.5, premiumScore: 0.85, luxuryTierScore: 0.75 },
  '4': { budgetScore: 0.1, midrangeScore: 0.3, premiumScore: 0.7, luxuryTierScore: 0.95 },
};

const CAT_TO_DIMENSION: Record<string, keyof {
  topsScore: number; bottomsScore: number; shoesScore: number;
  outerwearScore: number; dressesScore: number; accessoriesScore: number;
}> = {
  tops:        'topsScore',
  bottoms:     'bottomsScore',
  shoes:       'shoesScore',
  outerwear:   'outerwearScore',
  dresses:     'dressesScore',
  accessories: 'accessoriesScore',
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { styles = [], categories = [], budget = '1', topSizes = [], bottomSizes = [], shoeSizes = [] } = await req.json();

  // ── Persist size preferences ───────────────────────────────────────────────
  const allSizes = [...new Set([...topSizes, ...bottomSizes, ...shoeSizes])].filter(Boolean);
  if (allSizes.length > 0) {
    await savePreferredSizes(userId, allSizes);
  }

  // ── Pre-populate taste profile from quiz answers ───────────────────────────
  const profile = await getTasteProfile(userId);

  const p = profile as unknown as Record<string, number>;

  // Style affinities
  for (const style of styles) {
    const dim = STYLE_TO_DIMENSION[style];
    if (dim) p[dim] = Math.min(1, (p[dim] ?? 0.5) + 0.2);
  }

  // Budget affinities
  const tiers = BUDGET_TO_TIERS[budget] ?? BUDGET_TO_TIERS['1'];
  Object.assign(p, tiers);

  // Category affinities
  for (const cat of categories) {
    const dim = CAT_TO_DIMENSION[cat];
    if (dim) p[dim] = Math.min(1, (p[dim] ?? 0.5) + 0.25);
  }

  // Mark as having some signal so taste layer activates sooner
  profile.totalInteractions = Math.max(profile.totalInteractions, 3);
  profile.updatedAt = Date.now();
  await saveTasteProfile(profile);

  // ── Bootstrap initial swipes ───────────────────────────────────────────────
  const allItems = await getItems(500);
  const now = Date.now();

  const scored = allItems.map(item => {
    let score = 0;
    const styleMatches = item.styles.filter(s => styles.includes(s)).length;
    score += styleMatches * 3;
    if (categories.includes(item.category)) score += 2;
    if (categories.includes(item.subcategory)) score += 1;
    score += Math.max(0, 3 - Math.abs(item.priceRange - parseInt(budget)));
    // Size match bonus
    if (allSizes.length > 0 && allSizes.includes(item.size)) score += 1;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const total = allItems.length;
  const superCount = Math.max(1, Math.floor(total * 0.05));
  const likeCount  = Math.max(3, Math.floor(total * 0.15));

  const toSwipe: { item: Item; action: 'superlike' | 'like' }[] = [
    ...scored.slice(0, superCount).map(s => ({ item: s.item, action: 'superlike' as const })),
    ...scored.slice(superCount, superCount + likeCount).map(s => ({ item: s.item, action: 'like' as const })),
  ];

  for (const { item, action } of toSwipe) {
    await recordSwipe({ id: uuid(), userId, itemId: item.id, action, timestamp: now - Math.random() * 86400000 });
  }

  return NextResponse.json({ bootstrapped: toSwipe.length, sizessaved: allSizes.length });
}
