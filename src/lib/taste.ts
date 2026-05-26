/**
 * Taste profile management.
 *
 * When a user swipes, we update their taste profile using an
 * exponential moving average (EMA):
 *   new = old * α + signal * (1 - α)
 *
 * α = 0.85 (slow drift — 14 swipes to move a score ~50% of the way)
 * Signals are clamped to [0, 1].
 *
 * We only update dimensions for which the item has non-trivial confidence
 * (> 0.1) so a vague "good" item doesn't pollute every dimension.
 */

import { v4 as uuid } from 'uuid';
import {
  getTasteProfile,
  saveTasteProfile,
  recordInteraction,
  getItemClassification,
} from './db';
import { TasteProfile, ItemClassification } from './db-types';

const ALPHA = 0.85; // EMA decay — higher = slower taste change

const ACTION_STRENGTH: Record<string, number> = {
  superlike: 1.0,
  like:       0.7,
  dislike:   -0.4,
  pass:      -0.2,
};

function ema(current: number, signal: number, confidence: number, alpha: number): number {
  // Only move proportional to item's confidence on this dimension
  const effective = signal * confidence;
  const next = current * alpha + effective * (1 - alpha);
  return Math.max(0, Math.min(1, next));
}

/**
 * Apply one interaction to a taste profile and return the updated copy.
 * Pure function — does not touch the DB.
 */
export function applyInteraction(
  profile: TasteProfile,
  classification: ItemClassification,
  action: string,
): TasteProfile {
  const strength = ACTION_STRENGTH[action] ?? 0;
  if (strength === 0) return profile;

  // A dislike signal is weaker (we don't want to over-penalise exploration)
  const positive = strength > 0;
  const signal   = positive ? strength : strength * 0.5; // halve negative signals

  const updated: TasteProfile = { ...profile };

  // ── Style dimensions ─────────────────────────────────────────────────────
  if (classification.outdoorConfidence > 0.1)
    updated.outdoorScore = ema(profile.outdoorScore, positive ? signal : 0.5 + signal, classification.outdoorConfidence, ALPHA);
  if (classification.streetwearConfidence > 0.1)
    updated.streetwearScore = ema(profile.streetwearScore, positive ? signal : 0.5 + signal, classification.streetwearConfidence, ALPHA);
  if (classification.luxuryConfidence > 0.1)
    updated.luxuryScore = ema(profile.luxuryScore, positive ? signal : 0.5 + signal, classification.luxuryConfidence, ALPHA);
  if (classification.minimalConfidence > 0.1)
    updated.minimalScore = ema(profile.minimalScore, positive ? signal : 0.5 + signal, classification.minimalConfidence, ALPHA);
  if (classification.preppyConfidence > 0.1)
    updated.preppyScore = ema(profile.preppyScore, positive ? signal : 0.5 + signal, classification.preppyConfidence, ALPHA);
  if (classification.vintageConfidence > 0.1)
    updated.vintageScore = ema(profile.vintageScore, positive ? signal : 0.5 + signal, classification.vintageConfidence, ALPHA);

  // ── Category ──────────────────────────────────────────────────────────────
  const cat = classification.category.toLowerCase();
  const catSignal = positive ? strength : 0.5 + signal;
  if (cat === 'tops')        updated.topsScore       = ema(profile.topsScore,       catSignal, 1, ALPHA);
  else if (cat === 'bottoms')updated.bottomsScore    = ema(profile.bottomsScore,    catSignal, 1, ALPHA);
  else if (cat === 'dresses')updated.dressesScore    = ema(profile.dressesScore,    catSignal, 1, ALPHA);
  else if (cat === 'outerwear')updated.outerwearScore= ema(profile.outerwearScore,  catSignal, 1, ALPHA);
  else if (cat === 'shoes')  updated.shoesScore      = ema(profile.shoesScore,      catSignal, 1, ALPHA);
  else if (cat === 'accessories')updated.accessoriesScore = ema(profile.accessoriesScore, catSignal, 1, ALPHA);

  // ── Price tier ────────────────────────────────────────────────────────────
  const priceSignal = positive ? strength : 0.5 + signal;
  if (classification.priceTier === 'budget')    updated.budgetScore     = ema(profile.budgetScore,     priceSignal, 1, ALPHA);
  if (classification.priceTier === 'midrange')  updated.midrangeScore   = ema(profile.midrangeScore,   priceSignal, 1, ALPHA);
  if (classification.priceTier === 'premium')   updated.premiumScore    = ema(profile.premiumScore,    priceSignal, 1, ALPHA);
  if (classification.priceTier === 'luxury')    updated.luxuryTierScore = ema(profile.luxuryTierScore, priceSignal, 1, ALPHA);

  // ── Condition ─────────────────────────────────────────────────────────────
  const condSignal = positive ? strength : 0.5 + signal;
  const cond = classification.condition.toLowerCase().replace(/\s+/g, '_');
  if (cond === 'new' || cond === 'mint')                   updated.mintConditionScore      = ema(profile.mintConditionScore,      condSignal, 1, ALPHA);
  else if (cond === 'like_new' || cond === 'excellent')    updated.excellentConditionScore = ema(profile.excellentConditionScore, condSignal, 1, ALPHA);
  else if (cond === 'good')                                updated.goodConditionScore      = ema(profile.goodConditionScore,      condSignal, 1, ALPHA);
  else if (cond === 'fair')                                updated.fairConditionScore      = ema(profile.fairConditionScore,      condSignal, 1, ALPHA);

  updated.totalInteractions = profile.totalInteractions + 1;
  updated.lastInteractionAt = Date.now();
  updated.updatedAt         = Date.now();

  return updated;
}

/**
 * Handle a swipe — records the interaction and updates the taste profile.
 * Fire-and-forget safe (caller does not need to await).
 *
 * @param timeViewingMs  How long the card was visible (ms). Pass 0 if unknown.
 */
export async function handleSwipeInteraction(
  userId: string,
  itemId: string,
  action: string,
  timeViewingMs = 0,
): Promise<void> {
  const strength = ACTION_STRENGTH[action] ?? 0;

  // Always record the raw interaction
  await recordInteraction(uuid(), userId, itemId, action, strength, timeViewingMs);

  // Only update taste profile if we have a classification for this item
  const classification = await getItemClassification(itemId);
  if (!classification) return;

  const profile = await getTasteProfile(userId);
  const updated = applyInteraction(profile, classification, action);
  await saveTasteProfile(updated);
}
