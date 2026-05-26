import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { getLikedItems } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, genre, history = [] } = await req.json() as {
    message: string;
    genre?: string;
    history?: HistoryMessage[];
  };

  const liked = await getLikedItems(userId);

  if (liked.length < 3) {
    return NextResponse.json({
      verdict: "Like at least 3 items on the feed and I'll build you a real outfit.",
      outfit: [],
    });
  }

  const itemList = liked.slice(0, 40).map(i =>
    `ID:${i.id} | "${i.title}" | ${i.brand} | $${i.price} | ${i.category} | styles:${i.styles.join('/')}`
  ).join('\n');

  const genreContext = genre ? `\nUser's preferred aesthetic: ${genre}. Prioritize items that match this vibe.` : '';

  const systemPrompt = `You are Fit, SwipeFit's bold AI stylist. Build complete outfits from the user's liked items and remember previous conversations in this session.
${genreContext}

RESPOND WITH VALID JSON ONLY — no prose, no markdown, just the JSON object.

Format:
{
  "verdict": "1-2 sentence bold style verdict. Be specific, opinionated, sharp. Reference the occasion and aesthetic.",
  "items": [
    { "id": "EXACT_ID_FROM_LIST", "role": "Top" },
    { "id": "EXACT_ID_FROM_LIST", "role": "Bottom" },
    { "id": "EXACT_ID_FROM_LIST", "role": "Shoes" }
  ]
}

Rules:
- Pick 3 to 5 items ONLY from this fixed list. Use EXACT IDs.
- Valid roles: Top, Bottom, Shoes, Layer, Dress, Accessory, Bag
- If it's a dress occasion, pick Dress + Shoes + optionally Layer/Accessory
- Verdict must be punchy — max 30 words
- Never repeat an item across the outfit
- If the user asks for changes or feedback on a previous outfit, acknowledge it and adjust

Available items:
${itemList}`;

  // Build messages array for multi-turn
  const claudeMessages: Anthropic.MessageParam[] = [
    // Inject prior history
    ...history.map((h): Anthropic.MessageParam => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    // Current user message
    { role: 'user', content: message },
  ];

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let parsed: { verdict: string; items: { id: string; role: string }[] };

    try {
      const clean = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({
        verdict: "I had trouble putting that together. Try a more specific occasion.",
        outfit: [],
        rawResponse: raw,
      });
    }

    // Resolve IDs → full item data
    const likedMap = new Map(liked.map(i => [i.id, i]));
    const outfit = (parsed.items || [])
      .filter((p: { id: string }) => likedMap.has(p.id))
      .map((p: { id: string; role: string }) => {
        const item = likedMap.get(p.id)!;
        return {
          id: item.id,
          title: item.title,
          brand: item.brand,
          price: item.price,
          images: item.images,
          role: p.role,
        };
      });

    return NextResponse.json({ verdict: parsed.verdict || '', outfit });
  } catch {
    return NextResponse.json({
      verdict: "Something went wrong. Try again.",
      outfit: [],
    });
  }
}
