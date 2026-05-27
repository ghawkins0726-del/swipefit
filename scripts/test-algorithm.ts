/**
 * Standalone algorithm test — verifies the FYP recommendation engine
 * produces sensible rankings against known synthetic users + items.
 *
 * Pure functions only — no DB, no network. Run with:
 *   npx tsx scripts/test-algorithm.ts
 */

import { scoreTasteMatch, buildTasteBoosts, profileSimilarity } from '../src/lib/scoring';
import { applyInteraction } from '../src/lib/taste';
import type { TasteProfile, ItemClassification } from '../src/lib/db-types';

// ─── Test helpers ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`  ✗ ${name}\n      ${msg}`);
  }
}

function expect(actual: number, op: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'near', expected: number, tolerance = 0.05) {
  const ok =
    op === 'gt'  ? actual > expected :
    op === 'lt'  ? actual < expected :
    op === 'gte' ? actual >= expected :
    op === 'lte' ? actual <= expected :
    op === 'eq'  ? Math.abs(actual - expected) < 1e-9 :
    Math.abs(actual - expected) <= tolerance;
  if (!ok) throw new Error(`expected ${actual.toFixed(4)} ${op} ${expected} (tolerance ${tolerance})`);
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// ─── Factory: synthetic profiles ─────────────────────────────────────────────

function newProfile(userId = 'u1'): TasteProfile {
  return {
    userId,
    outdoorScore: 0.5, streetwearScore: 0.5, luxuryScore: 0.5,
    minimalScore: 0.5, preppyScore: 0.5, vintageScore: 0.5,
    topsScore: 0.5, bottomsScore: 0.5, dressesScore: 0.5,
    outerwearScore: 0.5, shoesScore: 0.5, accessoriesScore: 0.5,
    budgetScore: 0.5, midrangeScore: 0.5, premiumScore: 0.5, luxuryTierScore: 0.5,
    mintConditionScore: 0.5, excellentConditionScore: 0.5, goodConditionScore: 0.5, fairConditionScore: 0.5,
    totalInteractions: 0, lastInteractionAt: null, updatedAt: Date.now(),
  };
}

function profile(overrides: Partial<TasteProfile>): TasteProfile {
  return { ...newProfile(), ...overrides };
}

function classification(overrides: Partial<ItemClassification>): ItemClassification {
  return {
    itemId: 'i1', sellerId: 's1', primaryStyle: 'minimal',
    category: 'tops', priceTier: 'midrange', condition: 'like_new',
    outdoorConfidence: 0, streetwearConfidence: 0, luxuryConfidence: 0,
    minimalConfidence: 0, preppyConfidence: 0, vintageConfidence: 0,
    brandTierScore: 0.5, trendScore: 0.5,
    classifiedAt: Date.now(), aiAssisted: false,
    ...overrides,
  };
}

// ═══ SCORING TESTS ═══════════════════════════════════════════════════════════

section('Style match — pure cosine');

test('Streetwear item scores HIGH for streetwear user', () => {
  const user = profile({ streetwearScore: 0.95 });
  const item = classification({ streetwearConfidence: 0.95, primaryStyle: 'streetwear' });
  const s = scoreTasteMatch(user, item);
  expect(s, 'gt', 0.5);
});

test('Streetwear item scores LOW for preppy user', () => {
  const streetwearItem = classification({ streetwearConfidence: 0.95 });
  const streetwearUser  = profile({ streetwearScore: 0.95 });
  const preppyUser      = profile({ preppyScore: 0.95, streetwearScore: 0.05 });
  const high = scoreTasteMatch(streetwearUser, streetwearItem);
  const low  = scoreTasteMatch(preppyUser,    streetwearItem);
  if (high <= low) throw new Error(`expected streetwearUser score (${high.toFixed(3)}) > preppyUser score (${low.toFixed(3)})`);
});

test('Luxury user prefers luxury > streetwear > outdoor', () => {
  const user = profile({ luxuryScore: 0.95, streetwearScore: 0.4, outdoorScore: 0.1 });
  const lux = classification({ luxuryConfidence: 0.95 });
  const str = classification({ streetwearConfidence: 0.95 });
  const out = classification({ outdoorConfidence: 0.95 });
  const sLux = scoreTasteMatch(user, lux);
  const sStr = scoreTasteMatch(user, str);
  const sOut = scoreTasteMatch(user, out);
  if (!(sLux > sStr && sStr > sOut))
    throw new Error(`expected lux>str>out, got ${sLux.toFixed(3)}, ${sStr.toFixed(3)}, ${sOut.toFixed(3)}`);
});

test('Mixed-style user (luxury + minimal) ranks luxury-minimal hybrid above pure-outdoor', () => {
  const user   = profile({ luxuryScore: 0.85, minimalScore: 0.8, outdoorScore: 0.1 });
  const hybrid = classification({ luxuryConfidence: 0.7, minimalConfidence: 0.85 });
  const outdoor= classification({ outdoorConfidence: 0.9 });
  if (scoreTasteMatch(user, hybrid) <= scoreTasteMatch(user, outdoor))
    throw new Error('hybrid should outrank pure outdoor for a luxury+minimal user');
});

section('Category preference');

test('User who loves shoes scores shoes-item higher than tops-item (same style)', () => {
  const user  = profile({ shoesScore: 0.95, topsScore: 0.2, minimalScore: 0.9 });
  const shoe  = classification({ category: 'shoes', minimalConfidence: 0.9 });
  const top   = classification({ category: 'tops',  minimalConfidence: 0.9 });
  if (scoreTasteMatch(user, shoe) <= scoreTasteMatch(user, top))
    throw new Error('shoe-loving user should rank shoes higher than tops');
});

section('Price tier');

test('Budget user prefers cheap items, luxury user prefers expensive', () => {
  const budget = profile({ budgetScore: 0.95, luxuryTierScore: 0.05, minimalScore: 0.9 });
  const luxury = profile({ budgetScore: 0.05, luxuryTierScore: 0.95, minimalScore: 0.9 });
  const cheap  = classification({ priceTier: 'budget',  minimalConfidence: 0.9 });
  const fancy  = classification({ priceTier: 'luxury',  minimalConfidence: 0.9 });

  if (scoreTasteMatch(budget, cheap) <= scoreTasteMatch(budget, fancy))
    throw new Error('budget user should prefer cheap');
  if (scoreTasteMatch(luxury, fancy) <= scoreTasteMatch(luxury, cheap))
    throw new Error('luxury user should prefer expensive');
});

section('Score range invariants');

test('Score is always in [0, 1]', () => {
  // 50 random combos
  for (let i = 0; i < 50; i++) {
    const u = profile({
      streetwearScore: Math.random(), luxuryScore: Math.random(), minimalScore: Math.random(),
      outdoorScore: Math.random(), preppyScore: Math.random(), vintageScore: Math.random(),
      topsScore: Math.random(), shoesScore: Math.random(),
      budgetScore: Math.random(), luxuryTierScore: Math.random(),
      excellentConditionScore: Math.random(),
    });
    const c = classification({
      streetwearConfidence: Math.random(), luxuryConfidence: Math.random(),
      minimalConfidence: Math.random(), outdoorConfidence: Math.random(),
      brandTierScore: Math.random(), trendScore: Math.random(),
      category: ['tops','shoes','dresses','bottoms','outerwear','accessories'][i % 6]!,
      priceTier: (['budget','midrange','premium','luxury'] as const)[i % 4]!,
    });
    const s = scoreTasteMatch(u, c);
    if (s < 0 || s > 1) throw new Error(`score out of range: ${s}`);
  }
});

test('Component weights sum to 1.0 (no score inflation)', () => {
  // Max score: every component at 1.0
  const user = profile({
    streetwearScore: 1, luxuryScore: 1, minimalScore: 1, outdoorScore: 1, preppyScore: 1, vintageScore: 1,
    topsScore: 1, midrangeScore: 1, excellentConditionScore: 1,
  });
  const item = classification({
    streetwearConfidence: 1, luxuryConfidence: 1, minimalConfidence: 1,
    outdoorConfidence: 1, preppyConfidence: 1, vintageConfidence: 1,
    brandTierScore: 1, trendScore: 1,
  });
  expect(scoreTasteMatch(user, item), 'near', 1.0, 0.02);
});

// ═══ TASTE PROFILE LEARNING (EMA) ═══════════════════════════════════════════

section('EMA — taste learning over time');

test('Profile drifts toward liked dimensions after many likes', () => {
  let p = newProfile();
  const lux = classification({ luxuryConfidence: 0.95, primaryStyle: 'luxury', priceTier: 'luxury', category: 'shoes' });
  for (let i = 0; i < 30; i++) p = applyInteraction(p, lux, 'like');
  if (p.luxuryScore <= 0.5) throw new Error(`luxuryScore should rise (got ${p.luxuryScore.toFixed(3)})`);
  if (p.shoesScore <= 0.5) throw new Error(`shoesScore should rise (got ${p.shoesScore.toFixed(3)})`);
});

test('Profile resists vague items (low confidence ⇒ no drift)', () => {
  let p = newProfile();
  // Item has 0.05 confidence on luxury (below the 0.1 threshold)
  const vague = classification({ luxuryConfidence: 0.05, primaryStyle: 'luxury' });
  for (let i = 0; i < 20; i++) p = applyInteraction(p, vague, 'like');
  // luxuryScore should stay near 0.5 (didn't get updated)
  expect(p.luxuryScore, 'near', 0.5, 0.02);
});

test('Superlike moves the profile faster than like', () => {
  let pLike = newProfile();
  let pSuper = newProfile();
  const item = classification({ luxuryConfidence: 0.9 });
  for (let i = 0; i < 5; i++) {
    pLike  = applyInteraction(pLike,  item, 'like');
    pSuper = applyInteraction(pSuper, item, 'superlike');
  }
  if (pSuper.luxuryScore <= pLike.luxuryScore)
    throw new Error(`superlike should beat like (super=${pSuper.luxuryScore.toFixed(3)}, like=${pLike.luxuryScore.toFixed(3)})`);
});

test('totalInteractions increments each call', () => {
  let p = newProfile();
  const c = classification({ minimalConfidence: 0.5 });
  p = applyInteraction(p, c, 'like');
  p = applyInteraction(p, c, 'dislike');
  p = applyInteraction(p, c, 'superlike');
  expect(p.totalInteractions, 'eq', 3);
});

test('Profile scores stay in [0,1] after extreme swipe sequence', () => {
  let p = newProfile();
  const c = classification({ luxuryConfidence: 1.0, category: 'shoes', priceTier: 'luxury' });
  for (let i = 0; i < 100; i++) p = applyInteraction(p, c, 'superlike');
  if (p.luxuryScore < 0 || p.luxuryScore > 1) throw new Error(`out of range: ${p.luxuryScore}`);
  if (p.shoesScore  < 0 || p.shoesScore  > 1) throw new Error(`out of range: ${p.shoesScore}`);
});

// ═══ BUILD-TASTE-BOOSTS BATCH RANKING ═══════════════════════════════════════

section('Batch ranking realism');

test('Real-world scenario: streetwear user, mixed catalog of 10 items', () => {
  const user = profile({
    streetwearScore: 0.9, luxuryScore: 0.55, minimalScore: 0.3,
    outdoorScore: 0.15, preppyScore: 0.1, vintageScore: 0.5,
    topsScore: 0.85, shoesScore: 0.75, midrangeScore: 0.8, premiumScore: 0.6,
    excellentConditionScore: 0.7,
  });

  const items = new Map<string, ItemClassification>([
    ['supreme-tee',     classification({ itemId: 'supreme-tee',     streetwearConfidence: 0.95, primaryStyle: 'streetwear', category: 'tops',  priceTier: 'midrange' })],
    ['off-white-hoodie',classification({ itemId: 'off-white-hoodie',streetwearConfidence: 0.9, luxuryConfidence: 0.65, primaryStyle: 'streetwear', category: 'tops', priceTier: 'premium' })],
    ['jordan-1',        classification({ itemId: 'jordan-1',        streetwearConfidence: 0.85, primaryStyle: 'streetwear', category: 'shoes', priceTier: 'premium' })],
    ['gucci-bag',       classification({ itemId: 'gucci-bag',       luxuryConfidence: 0.95, primaryStyle: 'luxury', category: 'accessories', priceTier: 'luxury' })],
    ['polo-shirt',      classification({ itemId: 'polo-shirt',      preppyConfidence: 0.9, primaryStyle: 'preppy', category: 'tops', priceTier: 'midrange' })],
    ['patagonia-fleece',classification({ itemId: 'patagonia-fleece',outdoorConfidence: 0.9, primaryStyle: 'outdoor', category: 'outerwear', priceTier: 'midrange' })],
    ['cos-trousers',    classification({ itemId: 'cos-trousers',    minimalConfidence: 0.9, primaryStyle: 'minimal', category: 'bottoms', priceTier: 'midrange' })],
    ['levi-501',        classification({ itemId: 'levi-501',        vintageConfidence: 0.85, primaryStyle: 'vintage', category: 'bottoms', priceTier: 'budget' })],
    ['palace-cap',      classification({ itemId: 'palace-cap',      streetwearConfidence: 0.85, primaryStyle: 'streetwear', category: 'accessories', priceTier: 'midrange' })],
    ['noname-tshirt',   classification({ itemId: 'noname-tshirt',   minimalConfidence: 0.3, primaryStyle: 'minimal', category: 'tops', priceTier: 'budget' })],
  ]);

  const boosts = buildTasteBoosts(user, items);
  const ranked = [...boosts.entries()].sort(([, a], [, b]) => b - a);

  console.log('     Ranking for streetwear user:');
  for (const [id, score] of ranked) console.log(`       ${score.toFixed(3)}  ${id}`);

  const top3 = ranked.slice(0, 3).map(([id]) => id);
  const streetwearIds = ['supreme-tee', 'off-white-hoodie', 'jordan-1', 'palace-cap'];

  const top3StreetwearCount = top3.filter(id => streetwearIds.includes(id)).length;
  if (top3StreetwearCount < 2)
    throw new Error(`expected at least 2/3 top picks to be streetwear, got ${top3StreetwearCount}`);

  const polo = boosts.get('polo-shirt')!;
  const supreme = boosts.get('supreme-tee')!;
  if (supreme <= polo)
    throw new Error(`streetwear user should rank supreme-tee above polo-shirt (supreme=${supreme.toFixed(3)}, polo=${polo.toFixed(3)})`);
});

test('Luxury-minimal user gets COS + Gucci on top', () => {
  const user = profile({
    luxuryScore: 0.9, minimalScore: 0.9, streetwearScore: 0.1,
    outdoorScore: 0.05, preppyScore: 0.2, vintageScore: 0.3,
    topsScore: 0.7, bottomsScore: 0.7, accessoriesScore: 0.75,
    premiumScore: 0.7, luxuryTierScore: 0.85,
    excellentConditionScore: 0.8, mintConditionScore: 0.9,
  });

  const items = new Map<string, ItemClassification>([
    ['gucci-shirt',  classification({ itemId: 'gucci-shirt',  luxuryConfidence: 0.95, minimalConfidence: 0.5, category: 'tops', priceTier: 'luxury', brandTierScore: 0.95 })],
    ['cos-coat',     classification({ itemId: 'cos-coat',     minimalConfidence: 0.92, category: 'outerwear', priceTier: 'premium', brandTierScore: 0.55 })],
    ['supreme-tee',  classification({ itemId: 'supreme-tee',  streetwearConfidence: 0.95, category: 'tops', priceTier: 'midrange', brandTierScore: 0.8 })],
    ['cargo-pants',  classification({ itemId: 'cargo-pants',  outdoorConfidence: 0.85, category: 'bottoms', priceTier: 'midrange', brandTierScore: 0.5 })],
  ]);
  const boosts = buildTasteBoosts(user, items);
  const ranked = [...boosts.entries()].sort(([, a], [, b]) => b - a);
  console.log('     Ranking for luxury-minimal user:');
  for (const [id, score] of ranked) console.log(`       ${score.toFixed(3)}  ${id}`);

  const top2 = ranked.slice(0, 2).map(([id]) => id);
  if (!top2.includes('gucci-shirt') || !top2.includes('cos-coat'))
    throw new Error(`expected gucci-shirt + cos-coat in top 2, got ${top2.join(', ')}`);
});

// ═══ USER-USER SIMILARITY ════════════════════════════════════════════════════

section('User-user collaborative similarity');

test('Two streetwear users have high similarity', () => {
  const a = profile({ streetwearScore: 0.9, luxuryScore: 0.5, vintageScore: 0.4 });
  const b = profile({ streetwearScore: 0.85, luxuryScore: 0.55, vintageScore: 0.3 });
  const sim = profileSimilarity(a, b);
  if (sim < 0.85) throw new Error(`expected high similarity, got ${sim.toFixed(3)}`);
});

test('Opposite users (streetwear vs preppy) have lower similarity', () => {
  const street = profile({ streetwearScore: 0.95, preppyScore: 0.05, luxuryScore: 0.5, vintageScore: 0.5, outdoorScore: 0.4, minimalScore: 0.4 });
  const preppy = profile({ streetwearScore: 0.05, preppyScore: 0.95, luxuryScore: 0.5, vintageScore: 0.2, outdoorScore: 0.3, minimalScore: 0.7 });
  const same   = profile({ streetwearScore: 0.95, preppyScore: 0.05, luxuryScore: 0.5, vintageScore: 0.5, outdoorScore: 0.4, minimalScore: 0.4 });
  const simOpp  = profileSimilarity(street, preppy);
  const simSame = profileSimilarity(street, same);
  if (simOpp >= simSame)
    throw new Error(`opposite users (sim=${simOpp.toFixed(3)}) should not exceed same-taste users (sim=${simSame.toFixed(3)})`);
});

// ═══ END-TO-END SIMULATION ═══════════════════════════════════════════════════

section('End-to-end: simulated user converges on their actual taste');

test('30 swipes shape profile — RELATIVE ordering correctly reflects taste', () => {
  // Simulated user: likes vintage streetwear, dislikes outdoor/preppy.
  // NOTE: the EMA targets `signal × confidence`, so absolute scores plateau
  // below 0.7 even with all likes. What matters is RELATIVE ordering —
  // that's what cosine similarity uses for ranking.
  let p = newProfile();

  const items = {
    str:  classification({ streetwearConfidence: 0.9, vintageConfidence: 0.5, category: 'tops',      priceTier: 'midrange' }),
    vint: classification({ vintageConfidence: 0.9, streetwearConfidence: 0.4, category: 'bottoms',   priceTier: 'midrange' }),
    out:  classification({ outdoorConfidence: 0.9, category: 'outerwear', priceTier: 'midrange' }),
    prep: classification({ preppyConfidence: 0.9, category: 'tops',      priceTier: 'midrange' }),
  };
  for (let i = 0; i < 30; i++) {
    if (i % 10 < 4)      p = applyInteraction(p, items.str,  'like');
    else if (i % 10 < 7) p = applyInteraction(p, items.vint, 'like');
    else if (i % 10 < 9) p = applyInteraction(p, items.out,  'dislike');
    else                 p = applyInteraction(p, items.prep, 'dislike');
  }

  console.log(`     Final taste profile after 30 swipes:`);
  console.log(`       streetwear=${p.streetwearScore.toFixed(3)}  vintage=${p.vintageScore.toFixed(3)}`);
  console.log(`       outdoor=${p.outdoorScore.toFixed(3)}     preppy=${p.preppyScore.toFixed(3)}`);

  // The two liked styles should both exceed the two disliked styles
  const liked  = Math.min(p.streetwearScore, p.vintageScore);
  const disliked = Math.max(p.outdoorScore, p.preppyScore);
  if (liked <= disliked)
    throw new Error(`liked styles (min=${liked.toFixed(3)}) should beat disliked (max=${disliked.toFixed(3)})`);
});

test('Profile RANKS items correctly even though absolute scores plateau low', () => {
  // After the same simulation as above, verify the profile still ranks
  // streetwear/vintage items above outdoor/preppy items via scoreTasteMatch.
  let p = newProfile();
  const items = {
    str:  classification({ streetwearConfidence: 0.9, vintageConfidence: 0.5, category: 'tops',    priceTier: 'midrange' }),
    vint: classification({ vintageConfidence: 0.9, streetwearConfidence: 0.4, category: 'bottoms', priceTier: 'midrange' }),
    out:  classification({ outdoorConfidence: 0.9, category: 'outerwear', priceTier: 'midrange' }),
    prep: classification({ preppyConfidence: 0.9, category: 'tops',      priceTier: 'midrange' }),
  };
  for (let i = 0; i < 30; i++) {
    if (i % 10 < 4)      p = applyInteraction(p, items.str,  'like');
    else if (i % 10 < 7) p = applyInteraction(p, items.vint, 'like');
    else if (i % 10 < 9) p = applyInteraction(p, items.out,  'dislike');
    else                 p = applyInteraction(p, items.prep, 'dislike');
  }

  // Now score 4 fresh items the user hasn't seen
  const fresh = {
    newStreet: classification({ itemId: 'newStreet', streetwearConfidence: 0.95, category: 'tops',    priceTier: 'midrange' }),
    newVint:   classification({ itemId: 'newVint',   vintageConfidence: 0.95,   category: 'bottoms', priceTier: 'midrange' }),
    newOut:    classification({ itemId: 'newOut',    outdoorConfidence: 0.95,   category: 'outerwear', priceTier: 'midrange' }),
    newPrep:   classification({ itemId: 'newPrep',   preppyConfidence: 0.95,    category: 'tops',    priceTier: 'midrange' }),
  };
  const sStr  = scoreTasteMatch(p, fresh.newStreet);
  const sVint = scoreTasteMatch(p, fresh.newVint);
  const sOut  = scoreTasteMatch(p, fresh.newOut);
  const sPrep = scoreTasteMatch(p, fresh.newPrep);
  console.log(`     Fresh-item scores: street=${sStr.toFixed(3)} vint=${sVint.toFixed(3)} out=${sOut.toFixed(3)} prep=${sPrep.toFixed(3)}`);
  if (Math.min(sStr, sVint) <= Math.max(sOut, sPrep))
    throw new Error(`fresh streetwear/vintage items should outrank outdoor/preppy`);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
