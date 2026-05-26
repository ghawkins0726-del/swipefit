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
      reply: "You need to like at least 3 items before I can build outfits for you. Head to the feed and start swiping! ❤️"
    });
  }

  const itemList = liked.slice(0, 30).map(i =>
    `- "${i.title}" (${i.brand}, $${i.price}, ${i.category}, styles: ${i.styles.join('/')})`
  ).join('\n');

  const systemPrompt = `You are Fit, SwipeFit's AI stylist. You're sharp, opinionated, and direct — like a stylish friend who tells it straight. You build outfits exclusively from the user's liked items. Never suggest items they don't own. Be specific about what goes with what and why. Keep responses under 150 words. Use line breaks for readability. No emojis except sparingly.

The user's liked items:
${itemList}`;

  const userMessage = occasion
    ? `Build me an outfit for: ${occasion}`
    : message;

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const reply = msg.content[0].type === 'text' ? msg.content[0].text : 'Something went wrong.';
  return NextResponse.json({ reply });
}
