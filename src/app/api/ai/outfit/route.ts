import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { getLikedItems } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { occasion, message } = await req.json();
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

  const systemPrompt = `You are Fit, SwipeFit's bold AI stylist. Build a complete outfit from the user's liked items.

RESPOND WITH VALID JSON ONLY — no prose, no markdown, just the JSON object.

Format:
{
  "verdict": "1-2 sentence bold style verdict for this occasion. Be specific, opinionated, sharp.",
  "items": [
    { "id": "EXACT_ID_FROM_LIST", "role": "Top" },
    { "id": "EXACT_ID_FROM_LIST", "role": "Bottom" },
    { "id": "EXACT_ID_FROM_LIST", "role": "Shoes" }
  ]
}

Rules:
- Pick 3 to 5 items ONLY from the list. Use the exact IDs.
- Valid roles: Top, Bottom, Shoes, Layer, Dress, Accessory, Bag
- If it's a dress occasion, pick Dress + Shoes + optionally Layer/Accessory
- Verdict must be punchy — max 25 words
- Never repeat an item`;

  const userMsg = occasion ? `Build me an outfit for: ${occasion}` : message;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: `${userMsg}\n\nAvailable items:\n${itemList}` }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    let parsed: { verdict: string; items: { id: string; role: string }[] };

    try {
      // Strip possible markdown code fences
      const clean = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({
        verdict: "I had trouble putting that together. Try a more specific occasion.",
        outfit: [],
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
