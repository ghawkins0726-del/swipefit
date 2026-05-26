/**
 * TikTok-style recommendation engine.
 *
 * Scoring model (same conceptual layers as TT's dual model):
 *   1. Candidate generation — pull unseen items from DB
 *   2. Ranking — score each candidate against the user's preference vector
 *   3. Diversity injection — penalize category repetition in the served batch
 *   4. Exploration tax — 20% of slots go to random/new items regardless of score
 *
 * The user preference vector is a weighted accumulation of item feature signals.
 * Weights: superlike=5, like=1, dislike=-2, purchase=8
 * Signals decay with a 7-day half-life so stale preferences fade naturally.
 */

import { Item, SwipeRecord, UserPreferences, RecommendationScore } from './types';

const WEIGHTS = {
  superlike: 5,
  like: 1,
  dislike: -2,
  purchase: 8,
} as const;

const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const EXPLORE_RATIO = 0.2;
const NEW_ITEM_AGE_MS = 48 * 60 * 60 * 1000;

function decayWeight(weight: number, ageMs: number): number {
  return weight * Math.pow(0.5, ageMs / HALF_LIFE_MS);
}

export function buildUserPreferences(
  swipes: SwipeRecord[],
  itemMap: Map<string, Item>
): UserPreferences {
  const prefs: UserPreferences = {
    categories: {},
    styles: {},
    colors: {},
    brands: {},
    priceRanges: [],
    avgPriceRange: 2,
  };

  const now = Date.now();

  for (const swipe of swipes) {
    const item = itemMap.get(swipe.itemId);
    if (!item) continue;

    const baseWeight = WEIGHTS[swipe.action as keyof typeof WEIGHTS] ?? 0;
    const age = now - swipe.timestamp;
    const w = decayWeight(baseWeight, age);

    prefs.categories[item.category] = (prefs.categories[item.category] ?? 0) + w;
    prefs.categories[item.subcategory] = (prefs.categories[item.subcategory] ?? 0) + w * 0.5;

    for (const style of item.styles) {
      prefs.styles[style] = (prefs.styles[style] ?? 0) + w;
    }
    for (const color of item.colors) {
      prefs.colors[color] = (prefs.colors[color] ?? 0) + w * 0.7;
    }

    prefs.brands[item.brand] = (prefs.brands[item.brand] ?? 0) + w * 0.3;

    if (w > 0) prefs.priceRanges.push(item.priceRange);
  }

  if (prefs.priceRanges.length > 0) {
    prefs.avgPriceRange = prefs.priceRanges.reduce((a, b) => a + b, 0) / prefs.priceRanges.length;
  }

  return prefs;
}

function scoreItem(item: Item, prefs: UserPreferences, now: number): number {
  let score = 0;

  score += (prefs.categories[item.category] ?? 0) * 2;
  score += (prefs.categories[item.subcategory] ?? 0) * 1;

  for (const style of item.styles) {
    score += (prefs.styles[style] ?? 0) * 1.5;
  }
  for (const color of item.colors) {
    score += (prefs.colors[color] ?? 0) * 0.8;
  }

  score += (prefs.brands[item.brand] ?? 0) * 0.5;

  // Price range affinity (gaussian penalty for distance from preferred range)
  const priceDist = Math.abs(item.priceRange - prefs.avgPriceRange);
  score -= priceDist * 0.5;

  // Freshness boost: newer items surface more
  const age = now - item.createdAt;
  if (age < NEW_ITEM_AGE_MS) score += 3;
  else if (age < NEW_ITEM_AGE_MS * 3) score += 1;

  // Popularity signal (log-scaled to prevent rich-get-richer runaway)
  score += Math.log1p(item.likes) * 0.3;

  return score;
}

export function rankItems(
  candidates: Item[],
  prefs: UserPreferences,
  seenIds: Set<string>,
  batchSize: number
): RecommendationScore[] {
  const now = Date.now();
  const unseen = candidates.filter(i => !seenIds.has(i.id) && !i.sold);

  const exploreCount = Math.max(1, Math.floor(batchSize * EXPLORE_RATIO));
  const rankCount = batchSize - exploreCount;

  // Score and sort candidates
  const scored = unseen.map(item => ({
    itemId: item.id,
    score: scoreItem(item, prefs, now),
    reason: 'personalized' as const,
    age: now - item.createdAt,
  }));

  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.slice(0, rankCount);

  // Diversity pass: if top-N has >60% same category, inject variety
  const categoryCount: Record<string, number> = {};
  for (const r of ranked) {
    const item = unseen.find(i => i.id === r.itemId)!;
    categoryCount[item.category] = (categoryCount[item.category] ?? 0) + 1;
  }
  const maxCatAllowed = Math.ceil(rankCount * 0.6);
  const diversified: typeof ranked = [];
  const catUsed: Record<string, number> = {};
  const overflow: typeof ranked = [];

  for (const r of ranked) {
    const item = unseen.find(i => i.id === r.itemId)!;
    catUsed[item.category] = (catUsed[item.category] ?? 0) + 1;
    if (catUsed[item.category] <= maxCatAllowed) {
      diversified.push(r);
    } else {
      overflow.push(r);
    }
  }

  // Fill any gaps from overflow
  while (diversified.length < rankCount && overflow.length > 0) {
    diversified.push(overflow.shift()!);
  }

  // Exploration slots: new items + random
  const newItems = unseen
    .filter(i => now - i.createdAt < NEW_ITEM_AGE_MS && !diversified.some(r => r.itemId === i.id))
    .slice(0, Math.floor(exploreCount / 2))
    .map(i => ({ itemId: i.id, score: 0, reason: 'new' as const }));

  const usedIds = new Set([...diversified.map(r => r.itemId), ...newItems.map(r => r.itemId)]);
  const remainingExplore = unseen
    .filter(i => !usedIds.has(i.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, exploreCount - newItems.length)
    .map(i => ({ itemId: i.id, score: 0, reason: 'explore' as const }));

  // Interleave exploration into the ranked list naturally
  const result: RecommendationScore[] = [];
  const exploreItems = [...newItems, ...remainingExplore];
  let ei = 0;

  for (let i = 0; i < diversified.length; i++) {
    result.push(diversified[i]);
    // Insert an explore item every 5 ranked items
    if ((i + 1) % 5 === 0 && ei < exploreItems.length) {
      result.push(exploreItems[ei++]);
    }
  }

  // Append remaining explore items
  while (ei < exploreItems.length) {
    result.push(exploreItems[ei++]);
  }

  return result.slice(0, batchSize);
}
