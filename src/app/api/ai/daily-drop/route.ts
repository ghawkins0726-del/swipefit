import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { getUserSwipes, getItems, getLikedItems } from '@/lib/db';
import { computeStyleDna } from '@/lib/styleDna';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [swipes, allItems, liked] = await Promise.all([
    getUserSwipes(userId),
    getItems(100),
    getLikedItems(userId),
  ]);

  const dnaItemMap = new Map(allItems.map(i => [i.id, { styles: i.styles, priceRange: i.priceRange }]));
  const dna = computeStyleDna(swipes, dnaItemMap);

  const likedIds = new Set(liked.map(i => i.id));
  const unseenItems = allItems.filter(i => !likedIds.has(i.id)).slice(0, 30);

  const itemSummaries = unseenItems.map(i =>
    `ID:${i.id} | "${i.title}" by ${i.brand} | $${i.price} | styles:${i.styles.join(',')} | category:${i.category}`
  ).join('\n');

  const prompt = `You are SwipeFit's AI stylist. A user has this Style DNA profile:
Archetype: ${dna.archetype}
Top styles: ${Object.entries(dna.dimensions).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}(${v}%)`).join(', ')}

Here are available items. Pick exactly 5 that would excite this user most. For each, write a 1-sentence reason WHY it fits their DNA (be specific, reference their archetype).

Available items:
${itemSummaries}

Respond ONLY with valid JSON array, no markdown:
[{"id":"item_id","reason":"why this fits their DNA"}]`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  let picks: { id: string; reason: string }[] = [];
  try {
    picks = JSON.parse(text.trim());
  } catch {
    picks = [];
  }

  const itemMap = new Map(unseenItems.map(i => [i.id, i]));
  const drop = picks
    .map(p => ({ ...itemMap.get(p.id), reason: p.reason }))
    .filter(p => p.id);

  return NextResponse.json({ drop, archetype: dna.archetype, date: new Date().toDateString() });
}
