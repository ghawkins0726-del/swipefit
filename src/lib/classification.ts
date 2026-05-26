/**
 * Item classification pipeline.
 *
 * Stage 1 — keyword + brand + price signals   (always runs, O(1))
 * Stage 2 — Claude haiku tool-call            (only when stage-1 confidence is low < 0.35)
 *
 * Result is saved to item_classifications via saveItemClassification().
 */

import Anthropic from '@anthropic-ai/sdk';
import { saveItemClassification } from './db';
import { ItemClassification, PriceTier } from './db-types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Keyword maps ─────────────────────────────────────────────────────────────

const STYLE_KEYWORDS: Record<string, string[]> = {
  outdoor:    ['hiking', 'cargo', 'technical', 'gore-tex', 'patagonia', 'columbia', 'north face', 'tnf', 'fleece', 'trail', 'camp', 'utility', 'workwear'],
  streetwear: ['supreme', 'off-white', 'bape', 'stüssy', 'stussy', 'palace', 'kith', 'hype', 'collab', 'drop', 'grailed', 'travis', 'asap', 'fear of god', 'fog', 'essentials'],
  luxury:     ['gucci', 'prada', 'versace', 'dior', 'chanel', 'louis vuitton', 'lv', 'fendi', 'burberry', 'balenciaga', 'bottega', 'saint laurent', 'ysl', 'designer', 'haute couture'],
  minimal:    ['minimalist', 'clean', 'simple', 'monochrome', 'neutral', 'basics', 'wardrobe staple', 'uniqlo', 'cos', 'arket', 'aritzia', 'everlane', 'toteme'],
  preppy:     ['polo', 'lacoste', 'brooks brothers', 'nautical', 'varsity', 'ivy', 'ralph lauren', 'vineyard vines', 'j.crew', 'stripe', 'blazer', 'chino'],
  vintage:    ['vintage', 'retro', '70s', '80s', '90s', 'y2k', 'archive', 'deadstock', 'thrift', 'thrifted', 'rework', 'upcycled', 'levi', 'wrangler'],
};

const BRAND_AFFINITIES: Record<string, Partial<Record<string, number>>> = {
  'supreme':        { streetwear: 0.95, luxury: 0.35 },
  'off-white':      { streetwear: 0.9,  luxury: 0.65 },
  'palace':         { streetwear: 0.9,  outdoor: 0.2 },
  'stussy':         { streetwear: 0.85, vintage: 0.3 },
  'patagonia':      { outdoor: 0.95,    minimal: 0.4 },
  'north face':     { outdoor: 0.9,     streetwear: 0.3 },
  'columbia':       { outdoor: 0.85 },
  'gucci':          { luxury: 0.95,     vintage: 0.25 },
  'prada':          { luxury: 0.95,     minimal: 0.55 },
  'balenciaga':     { luxury: 0.85,     streetwear: 0.5 },
  'dior':           { luxury: 0.9,      minimal: 0.4 },
  'chanel':         { luxury: 0.95,     minimal: 0.5 },
  'lacoste':        { preppy: 0.9,      minimal: 0.4 },
  'ralph lauren':   { preppy: 0.9,      luxury: 0.5 },
  'brooks brothers':{ preppy: 0.9 },
  'uniqlo':         { minimal: 0.85 },
  'cos':            { minimal: 0.9 },
  'toteme':         { minimal: 0.85,    luxury: 0.4 },
  'levi':           { vintage: 0.7,     minimal: 0.3 },
  'wrangler':       { vintage: 0.75,    outdoor: 0.2 },
};

// Brand tier score (0-1, higher = more aspirational / resale premium)
const BRAND_TIERS: Record<string, number> = {
  'gucci': 0.95, 'prada': 0.95, 'chanel': 0.97, 'dior': 0.94, 'louis vuitton': 0.96,
  'fendi': 0.93, 'versace': 0.9, 'burberry': 0.88, 'balenciaga': 0.88, 'bottega': 0.9,
  'saint laurent': 0.9, 'off-white': 0.82, 'supreme': 0.8, 'palace': 0.72, 'kith': 0.68,
  'stussy': 0.6, 'bape': 0.72, 'fear of god': 0.78, 'essentials': 0.65,
  'ralph lauren': 0.7, 'lacoste': 0.65, 'patagonia': 0.72, 'north face': 0.68,
  'uniqlo': 0.45, 'cos': 0.55, 'zara': 0.3, 'h&m': 0.25, 'unknown': 0.3,
};

const STYLES = ['outdoor', 'streetwear', 'luxury', 'minimal', 'preppy', 'vintage'] as const;
type Style = typeof STYLES[number];

interface StyleScores { outdoor: number; streetwear: number; luxury: number; minimal: number; preppy: number; vintage: number }

// ─── Stage 1: Keyword analysis ────────────────────────────────────────────────

function keywordScores(title: string, description: string, brand: string): StyleScores {
  const text = `${title} ${description} ${brand}`.toLowerCase();
  const brandKey = brand.toLowerCase().trim();
  const brandAffinity = BRAND_AFFINITIES[brandKey] ?? {};

  const scores = {} as StyleScores;
  for (const style of STYLES) {
    const kwHits = STYLE_KEYWORDS[style].filter(kw => text.includes(kw)).length;
    const kwScore = Math.min(kwHits * 0.2, 0.8);
    const brandScore = brandAffinity[style] ?? 0;
    // Weight: 45% keywords, 55% brand affinity (brand is highly reliable)
    scores[style] = kwScore * 0.45 + brandScore * 0.55;
  }
  return scores;
}

function priceTier(price: number): PriceTier {
  if (price < 30)  return 'budget';
  if (price < 80)  return 'midrange';
  if (price < 200) return 'premium';
  return 'luxury';
}

function priceStyleSignal(price: number): Partial<StyleScores> {
  const tier = priceTier(price);
  if (tier === 'luxury')  return { luxury: 0.5, streetwear: 0.25 };
  if (tier === 'premium') return { streetwear: 0.2, preppy: 0.15, outdoor: 0.1 };
  if (tier === 'budget')  return { vintage: 0.2, minimal: 0.1 };
  return {};
}

function brandTierScore(brand: string): number {
  const key = brand.toLowerCase().trim();
  return BRAND_TIERS[key] ?? 0.4;
}

function mergeScores(kw: StyleScores, price: Partial<StyleScores>): StyleScores {
  const merged = { ...kw };
  for (const style of STYLES) {
    const ps = price[style] ?? 0;
    // price signal contributes 20% when present
    merged[style] = Math.min(1, merged[style] * 0.8 + ps * 0.2);
  }
  return merged;
}

function normalise(scores: StyleScores): StyleScores {
  const max = Math.max(...Object.values(scores));
  if (max === 0) return { outdoor: 0, streetwear: 0, luxury: 0, minimal: 0.5, preppy: 0, vintage: 0 };
  const out = {} as StyleScores;
  for (const s of STYLES) out[s] = scores[s] / max;
  return out;
}

function primaryStyle(scores: StyleScores): Style {
  return STYLES.reduce((best, s) => scores[s] > scores[best] ? s : best, STYLES[0]);
}

// ─── Stage 2: AI classification (Claude haiku) ────────────────────────────────

async function classifyWithAI(item: {
  title: string; description: string; brand: string; price: number; category: string;
}): Promise<StyleScores | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      tools: [{
        name: 'classify_style',
        description: 'Classify a secondhand fashion item into style categories',
        input_schema: {
          type: 'object' as const,
          properties: {
            outdoor:    { type: 'number', description: '0-1 confidence this is outdoor/utilitarian style' },
            streetwear: { type: 'number', description: '0-1 confidence this is streetwear/hype style' },
            luxury:     { type: 'number', description: '0-1 confidence this is luxury/designer style' },
            minimal:    { type: 'number', description: '0-1 confidence this is minimal/clean style' },
            preppy:     { type: 'number', description: '0-1 confidence this is preppy/classic style' },
            vintage:    { type: 'number', description: '0-1 confidence this is vintage/retro style' },
          },
          required: ['outdoor', 'streetwear', 'luxury', 'minimal', 'preppy', 'vintage'],
        },
      }],
      tool_choice: { type: 'tool', name: 'classify_style' },
      messages: [{
        role: 'user',
        content: `Classify this secondhand fashion item. Be precise — most items lean clearly toward 1-2 styles.\n\nTitle: ${item.title}\nBrand: ${item.brand || 'Unknown'}\nPrice: $${item.price}\nCategory: ${item.category}\nDescription: ${item.description?.slice(0, 200) || 'None'}`,
      }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') return null;
    const inp = toolUse.input as StyleScores;

    // Clamp all values
    const out = {} as StyleScores;
    for (const s of STYLES) out[s] = Math.max(0, Math.min(1, inp[s] ?? 0));
    return out;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ItemInput {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  brand: string;
  price: number;
  category: string;
  condition: string;
}

/**
 * Classify an item and save the result to the DB.
 * Uses keyword analysis; falls back to AI when confidence is low.
 */
export async function classifyAndSave(item: ItemInput): Promise<ItemClassification> {
  const kwRaw    = keywordScores(item.title, item.description, item.brand);
  const priceRaw = priceStyleSignal(item.price);
  let scores     = mergeScores(kwRaw, priceRaw);
  const maxRaw   = Math.max(...Object.values(scores));
  let aiAssisted = false;

  // If keyword confidence is too low, ask Claude
  if (maxRaw < 0.35) {
    const aiScores = await classifyWithAI(item);
    if (aiScores) {
      // Blend: 30% keyword + 70% AI (AI wins when keywords are weak)
      for (const s of STYLES) scores[s] = scores[s] * 0.3 + aiScores[s] * 0.7;
      aiAssisted = true;
    }
  }

  scores = normalise(scores);
  const primary = primaryStyle(scores);
  const bTier   = brandTierScore(item.brand);
  const tier    = priceTier(item.price);

  // Trend signal: luxury + streetwear items tend to hold trend value; budget vintage does too
  const trendScore = Math.min(1, scores.luxury * 0.4 + scores.streetwear * 0.3 + scores.vintage * 0.2 + bTier * 0.1);

  const classification: ItemClassification = {
    itemId:               item.id,
    sellerId:             item.sellerId,
    primaryStyle:         primary,
    category:             item.category,
    priceTier:            tier,
    condition:            item.condition,
    outdoorConfidence:    scores.outdoor,
    streetwearConfidence: scores.streetwear,
    luxuryConfidence:     scores.luxury,
    minimalConfidence:    scores.minimal,
    preppyConfidence:     scores.preppy,
    vintageConfidence:    scores.vintage,
    brandTierScore:       bTier,
    trendScore,
    classifiedAt:         Date.now(),
    aiAssisted,
  };

  await saveItemClassification(classification);
  return classification;
}
