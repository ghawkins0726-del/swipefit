import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getItems, getUserSwipes, getSwipedItemIds, getTasteProfile, getItemClassifications, getCollaborativeItemIds, getSimilarUsers, getUserPreferences } from '@/lib/db';
import { buildUserPreferences, rankItems } from '@/lib/algorithm';
import { computeStyleDna, computeMatchScore } from '@/lib/styleDna';
import { buildTasteBoosts } from '@/lib/scoring';
import { Item } from '@/lib/types';

// Minimum interactions before the taste layer activates.
// Below this threshold the user hasn't given us enough signal,
// so we fall back to the existing algorithm unchanged.
const TASTE_ACTIVATION_THRESHOLD = 3;

// Blend weights for the final score when taste layer is active:
//   algorithm score  →  50% (preserves freshness / diversity signals)
//   taste boost      →  35% (content-based personalisation)
//   collab boost     →  15% (similar-user signal, available after enough users)
const W_ALGO  = 0.50;
const W_TASTE = 0.35;
const W_COLLAB = 0.15;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchSize = parseInt(searchParams.get('batch') ?? '10');

  // ── Base data (always fetched) ──────────────────────────────────────────────
  const [allItems, swipes, seenIds, userPrefs] = await Promise.all([
    getItems(500),
    getUserSwipes(userId),
    getSwipedItemIds(userId),
    getUserPreferences(userId),
  ]);

  // Build a flat set of all sizes the user wears for quick lookup
  const userSizes = new Set<string>([
    ...(userPrefs?.topSizes ?? []),
    ...(userPrefs?.bottomSizes ?? []),
    ...(userPrefs?.shoeSizes ?? []),
  ]);

  const itemMap = new Map<string, Item>(allItems.map(i => [i.id, i]));
  const prefs   = buildUserPreferences(swipes, itemMap);

  const dnaItemMap = new Map(allItems.map(i => [i.id, { styles: i.styles, priceRange: i.priceRange }]));
  const dna = computeStyleDna(swipes, dnaItemMap);

  // Existing algorithm produces a ranked list with a score per item
  const ranked = rankItems(allItems, prefs, seenIds, allItems.length); // rank all, slice later

  // ── Taste layer (only if user has enough interaction history) ───────────────
  const tasteProfile = await getTasteProfile(userId);
  const tasteActive  = tasteProfile.totalInteractions >= TASTE_ACTIVATION_THRESHOLD;

  let tasteBoosts   = new Map<string, number>();
  let collabItemIds = new Set<string>();

  if (tasteActive) {
    // Content-based: score every ranked item against the user's taste profile
    const itemIds = ranked.map(r => r.itemId);
    const classifications = await getItemClassifications(itemIds);
    tasteBoosts = buildTasteBoosts(tasteProfile, classifications);

    // Collaborative: fetch items liked by similar users that this user hasn't seen
    const similarUsers = await getSimilarUsers(userId, 10);
    if (similarUsers.length > 0) {
      const similarUserIds = similarUsers.map(u => u.userId);
      collabItemIds = await getCollaborativeItemIds(userId, similarUserIds, 100);
    }
  }

  // ── Blend & re-rank ─────────────────────────────────────────────────────────
  const scored = ranked.map(r => {
    const item = itemMap.get(r.itemId);

    // Soft size boost: +0.1 when item size matches any of the user's stored sizes.
    // Kept small so it nudges ranking without overriding freshness or taste signals.
    const sizeBonus = (userSizes.size > 0 && item && userSizes.has(item.size)) ? 0.10 : 0;

    if (!tasteActive) return { ...r, _finalScore: r.score + sizeBonus };

    // Normalise the algorithm score to [0,1] using the max in this batch
    const algoScore   = r.score;                            // already 0-1 from rankItems
    const tasteScore  = tasteBoosts.get(r.itemId) ?? 0.5;  // 0.5 = neutral when no classification
    const collabBonus = collabItemIds.has(r.itemId) ? 1 : 0;

    const finalScore = algoScore * W_ALGO + tasteScore * W_TASTE + collabBonus * W_COLLAB + sizeBonus;
    return { ...r, _finalScore: finalScore };
  });

  // Sort descending by blended score, then take the requested batch
  scored.sort((a, b) => b._finalScore - a._finalScore);
  const page = scored.slice(0, batchSize);

  // ── Build response ──────────────────────────────────────────────────────────
  const feed = page
    .map(r => {
      const item = itemMap.get(r.itemId);
      if (!item) return null;
      return {
        ...item,
        _reason:    r.reason,
        matchScore: dna.confident ? computeMatchScore(item.styles, dna) : 0,
        tasteScore: tasteBoosts.get(r.itemId) ?? null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    feed,
    total: allItems.length - seenIds.size,
    dna,
    tasteActive,
  });
}
