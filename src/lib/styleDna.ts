/**
 * Style DNA — SwipeFit's signature feature.
 *
 * After a user has swiped enough items, we build their "Style DNA":
 * a personality-style breakdown across 8 aesthetic dimensions.
 * This is shareable, transparent, and powers the match % shown on every card.
 *
 * Think MBTI meets fashion. Nobody else does this.
 */

import { SwipeRecord } from './types';

export interface StyleDna {
  /** 0-100 score per dimension */
  dimensions: Record<string, number>;
  /** Dominant archetype label */
  archetype: string;
  /** Archetype description */
  archetypeDesc: string;
  /** Three adjectives that define this person's style */
  keywords: string[];
  /** How many swipes the DNA is based on (confidence indicator) */
  basedOn: number;
  /** True if enough data to show confidently */
  confident: boolean;
}

const DIMENSIONS: Record<string, string[]> = {
  Streetwear:   ['streetwear', 'hypebeast', 'skate', 'graphic', 'y2k'],
  Minimal:      ['minimal', 'clean', 'monochrome', 'scandinavian', 'tonal'],
  Vintage:      ['vintage', 'thrift', 'retro', 'americana', '90s', 'archive'],
  Luxury:       ['luxury', 'designer', 'avant garde', 'editorial', 'high fashion'],
  Outdoor:      ['outdoor', 'techwear', 'utility', 'gorpcore', 'workwear'],
  Preppy:       ['preppy', 'classic', 'ivy', 'collegiate', 'americana'],
  Bohemian:     ['bohemian', 'boho', 'floral', 'earthy', 'artisanal'],
  Athletic:     ['athletic', 'sport', 'running', 'performance', 'gym'],
};

const ARCHETYPES: Array<{
  name: string;
  desc: string;
  keywords: string[];
  dominates: string[];
}> = [
  { name: 'The Hype Curator', desc: 'Supreme, Off-White, limited drops — you know the release dates before anyone.', keywords: ['hyped', 'cultural', 'rare'], dominates: ['Streetwear'] },
  { name: 'The Quiet Minimalist', desc: 'You wear the same 10 things. Every piece is intentional. Nothing is wasted.', keywords: ['intentional', 'restrained', 'sharp'], dominates: ['Minimal'] },
  { name: 'The Archive Hunter', desc: 'You live for deadstock, flipping through racks for pieces with stories.', keywords: ['storied', 'worn', 'rare'], dominates: ['Vintage'] },
  { name: 'The Fashion Insider', desc: 'You follow the shows, not the trends. Avant-garde is your comfort zone.', keywords: ['editorial', 'daring', 'seasonal'], dominates: ['Luxury'] },
  { name: 'The Gorpcore Explorer', desc: "Arc'teryx, Patagonia, and Salomon — functional is beautiful to you.", keywords: ['functional', 'durable', 'technical'], dominates: ['Outdoor'] },
  { name: 'The East Coast Prep', desc: 'Boat shoes, polo shirts, and chinos. Classic never goes out of style.', keywords: ['classic', 'polished', 'heritage'], dominates: ['Preppy'] },
  { name: 'The Eclectic Bohemian', desc: 'Your wardrobe is a mood board. Prints mix, textures clash — intentionally.', keywords: ['expressive', 'textured', 'free'], dominates: ['Bohemian'] },
  { name: 'The Style Chameleon', desc: "You don't belong to one aesthetic — you define your own.", keywords: ['versatile', 'fluid', 'experimental'], dominates: [] },
];

type ItemLike = {
  styles: string[];
  priceRange: number;
};

const WEIGHTS = { superlike: 5, like: 1, dislike: -1.5 } as const;

export function computeStyleDna(
  swipes: SwipeRecord[],
  itemMap: Map<string, ItemLike>
): StyleDna {
  const rawScores: Record<string, number> = {};
  for (const dim of Object.keys(DIMENSIONS)) rawScores[dim] = 0;

  const likeSwipes = swipes.filter(s => s.action !== 'dislike');
  const basedOn = likeSwipes.length;

  for (const swipe of swipes) {
    const item = itemMap.get(swipe.itemId);
    if (!item) continue;
    const w = WEIGHTS[swipe.action as keyof typeof WEIGHTS] ?? 0;

    for (const [dim, tags] of Object.entries(DIMENSIONS)) {
      const matches = item.styles.filter(s => tags.some(t => s.toLowerCase().includes(t))).length;
      if (matches > 0) rawScores[dim] += w * matches;
    }
  }

  // Normalize to 0-100
  const max = Math.max(...Object.values(rawScores), 1);
  const dimensions: Record<string, number> = {};
  for (const [dim, val] of Object.entries(rawScores)) {
    dimensions[dim] = Math.max(0, Math.round((val / max) * 100));
  }

  // Pick archetype: find highest scoring dimension
  const topDim = Object.entries(dimensions).sort((a, b) => b[1] - a[1])[0][0];
  const archetype = ARCHETYPES.find(a => a.dominates.includes(topDim))
    ?? ARCHETYPES[ARCHETYPES.length - 1];

  return {
    dimensions,
    archetype: archetype.name,
    archetypeDesc: archetype.desc,
    keywords: archetype.keywords,
    basedOn,
    confident: basedOn >= 5,
  };
}

export function computeMatchScore(
  itemStyles: string[],
  userDna: StyleDna
): number {
  if (!userDna.confident) return 0;

  let total = 0;
  let matches = 0;

  for (const [dim, tags] of Object.entries(DIMENSIONS)) {
    const dimScore = userDna.dimensions[dim] ?? 0;
    const hasTag = itemStyles.some(s => tags.some(t => s.toLowerCase().includes(t)));
    if (hasTag && dimScore > 20) {
      matches += dimScore;
      total += 100;
    } else if (total === 0) {
      total = 100; // ensure we always have a denominator
    }
  }

  if (total === 0) return 0;
  return Math.min(99, Math.round((matches / total) * 100));
}
