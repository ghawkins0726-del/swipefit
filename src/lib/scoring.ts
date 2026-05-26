/**
 * Pure scoring functions — no DB access.
 * The feed route pre-fetches all required data then calls these.
 *
 * scoreTasteMatch()  → 0-1 how well an item fits a user's taste profile
 * buildTasteBoosts() → Map<itemId, boostScore> for a batch of items
 */

import { TasteProfile, ItemClassification } from './db-types';

/**
 * Cosine similarity between two numeric vectors.
 */
function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Extract the 6-dim style vector from a taste profile */
function styleVector(p: TasteProfile): number[] {
  return [p.outdoorScore, p.streetwearScore, p.luxuryScore, p.minimalScore, p.preppyScore, p.vintageScore];
}

/** Extract the 6-dim style vector from an item classification */
function itemStyleVector(c: ItemClassification): number[] {
  return [c.outdoorConfidence, c.streetwearConfidence, c.luxuryConfidence, c.minimalConfidence, c.preppyConfidence, c.vintageConfidence];
}

/** Price tier match: 1 if user prefers this tier, 0 if not */
function priceTierMatch(profile: TasteProfile, classification: ItemClassification): number {
  switch (classification.priceTier) {
    case 'budget':    return profile.budgetScore;
    case 'midrange':  return profile.midrangeScore;
    case 'premium':   return profile.premiumScore;
    case 'luxury':    return profile.luxuryTierScore;
    default:          return 0.5;
  }
}

/** Category match: pull the relevant category score */
function categoryMatch(profile: TasteProfile, classification: ItemClassification): number {
  const cat = classification.category.toLowerCase();
  switch (cat) {
    case 'tops':        return profile.topsScore;
    case 'bottoms':     return profile.bottomsScore;
    case 'dresses':     return profile.dressesScore;
    case 'outerwear':   return profile.outerwearScore;
    case 'shoes':       return profile.shoesScore;
    case 'accessories': return profile.accessoriesScore;
    default:            return 0.5;
  }
}

/** Condition match */
function conditionMatch(profile: TasteProfile, classification: ItemClassification): number {
  const cond = classification.condition.toLowerCase().replace(/\s+/g, '_');
  if (cond === 'new' || cond === 'mint')                return profile.mintConditionScore;
  if (cond === 'like_new' || cond === 'excellent')      return profile.excellentConditionScore;
  if (cond === 'good')                                  return profile.goodConditionScore;
  if (cond === 'fair')                                  return profile.fairConditionScore;
  return 0.5;
}

/**
 * Compute a 0-1 taste-match score for a single (profile, classification) pair.
 *
 * Component weights — tuned to sum to 1.0:
 *   Style cosine  40%
 *   Category      20%
 *   Price tier    18%
 *   Condition     10%
 *   Brand tier    7%
 *   Trend         5%
 */
export function scoreTasteMatch(profile: TasteProfile, classification: ItemClassification): number {
  const styleSim   = cosine(styleVector(profile), itemStyleVector(classification));   // 0-1
  const catScore   = categoryMatch(profile, classification);                           // 0-1
  const priceScore = priceTierMatch(profile, classification);                          // 0-1
  const condScore  = conditionMatch(profile, classification);                          // 0-1
  const brandScore = classification.brandTierScore;                                    // 0-1
  const trendScore = classification.trendScore;                                        // 0-1

  return (
    styleSim   * 0.40 +
    catScore   * 0.20 +
    priceScore * 0.18 +
    condScore  * 0.10 +
    brandScore * 0.07 +
    trendScore * 0.05
  );
}

/**
 * Build a Map<itemId, tasteBoost> for a batch of items.
 * tasteBoost ∈ [0, 1].
 *
 * If no taste profile or classification exists for an item, it is
 * omitted from the map (caller should treat missing entries as 0.5).
 */
export function buildTasteBoosts(
  profile: TasteProfile,
  classifications: Map<string, ItemClassification>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [itemId, cls] of classifications) {
    result.set(itemId, scoreTasteMatch(profile, cls));
  }
  return result;
}

/**
 * Cosine similarity between two taste profiles (for user-user similarity).
 * Used by the similarity batch job.
 */
export function profileSimilarity(a: TasteProfile, b: TasteProfile): number {
  return cosine(styleVector(a), styleVector(b));
}
