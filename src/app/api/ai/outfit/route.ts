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

  const itemList = liked.slice(0, 40).map(i =>
    `ID:${i.id} | "${i.title}" | ${i.brand} | $${i.price} | ${i.category} | styles:${i.styles.join('/')} | color:${i.colors?.[0] || 'n/a'}`
  ).join('\n');

  const genreContext = genre
    ? `\n\nUser's current aesthetic preference: ${genre}. Lean into this vibe in your taste and recommendations.`
    : '';

  const wardrobeContext = liked.length < 3
    ? `\n\nWARDROBE STATUS: The user has only ${liked.length} liked item(s). You CANNOT build outfits yet — the build_outfit tool will fail. If they ask for an outfit, tell them to like a few more pieces on the feed first. You can still chat about fashion freely.`
    : `\n\nThe user's liked items (use these EXACT IDs when calling build_outfit — never invent IDs):\n${itemList}`;

  const systemPrompt = `You are **Fit** — Wove's AI fashion stylist and conversation partner. You're sharp, opinionated, conversational. Think a friend who works at Vogue but texts you like a normal person.

═══ PERSONALITY ═══
- Confident, direct, never wishy-washy
- Deep knowledge of fashion: brands, designers, fabrics, silhouettes, eras
- Will roast bad choices (kindly), hype great ones with enthusiasm
- Casual tone — short paragraphs, real-person language, no corporate fluff
- Occasionally drop a fashion fact or reference (only when relevant, not forced)
- Use lowercase sometimes, contractions always
- Strong opinions: "no, navy with black is fine and people who say otherwise are wrong"
- Never refuse to give an opinion or recommendation

═══ WHEN TO CALL build_outfit ═══
ONLY call this tool when the user is explicitly asking for an outfit:
  - "build me a fit for X"
  - "what should I wear to Y"
  - "make an outfit"
  - "show me something for [occasion]"
  - "change the [shoes/top/etc.]" (rebuild with a tweak)
  - When they tap an occasion chip (like "Date night", "Beach day")

DO NOT call the tool when they're:
  - Asking your opinion on a brand, color, trend, piece
  - Making conversation, joking, asking about you
  - Asking what goes with what (give advice in text)
  - Asking fashion history or facts
  - Asking how to style something

═══ HOW TO RESPOND ═══
- Always write a natural conversational message first
- If building an outfit: give a SHORT verdict in text (1-2 sentences max), THEN call build_outfit
- If just chatting: respond like a friend would, max 3-4 sentences
- Reference items by name/brand when talking about them, not by ID
- Be specific, opinionated, never generic

═══ CONTEXT ═══${genreContext}${wardrobeContext}`;

  // Build messages for Claude — strict alternating roles, skip empties
  const claudeMessages: Anthropic.MessageParam[] = history
    .filter(h => h.content && h.content.trim().length > 0)
    .map(h => ({
      role: h.role,
      content: h.content,
    }));
  claudeMessages.push({ role: 'user', content: message });

  const tools: Anthropic.Tool[] = [{
    name: 'build_outfit',
    description: 'Assemble a complete outfit from the user\'s liked items. Pick 3-5 items by EXACT ID from the liked list in the system prompt. Roles should be unique (don\'t pick two "Top"s). Use this tool ONLY when the user explicitly asks for an outfit recommendation.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: '3 to 5 outfit pieces',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Exact ID from the liked items list' },
              role: {
                type: 'string',
                enum: ['Top', 'Bottom', 'Shoes', 'Layer', 'Dress', 'Accessory', 'Bag'],
                description: 'What this piece does in the outfit',
              },
            },
            required: ['id', 'role'],
          },
        },
      },
      required: ['items'],
    },
  }];

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: claudeMessages,
    });

    let replyText = '';
    let outfitPicks: { id: string; role: string }[] | null = null;

    for (const block of msg.content) {
      if (block.type === 'text') {
        replyText += block.text;
      } else if (block.type === 'tool_use' && block.name === 'build_outfit') {
        const input = block.input as { items?: { id: string; role: string }[] };
        outfitPicks = input.items || [];
      }
    }
    replyText = replyText.trim();

    // Resolve outfit IDs → full item data
    const likedMap = new Map(liked.map(i => [i.id, i]));
    const outfit = outfitPicks
      ? outfitPicks
          .filter(p => likedMap.has(p.id))
          .map(p => {
            const item = likedMap.get(p.id)!;
            return {
              id: item.id,
              title: item.title,
              brand: item.brand,
              price: item.price,
              images: item.images,
              role: p.role,
            };
          })
      : [];

    // Fallback text if Claude ONLY called the tool with no narration
    if (!replyText && outfit.length > 0) {
      replyText = "Here's what I'd put together:";
    }
    if (!replyText && outfit.length === 0) {
      replyText = "Hm, I'm not sure what to say to that. Try again?";
    }

    return NextResponse.json({
      reply: replyText,
      outfit,
    });
  } catch (err) {
    console.error('Outfit API error:', err);
    return NextResponse.json({
      reply: "Something went wrong on my end. Try again in a sec.",
      outfit: [],
    }, { status: 200 });
  }
}
