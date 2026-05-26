import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserSwipes, getItems } from '@/lib/db';
import { computeStyleDna } from '@/lib/styleDna';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [swipes, allItems] = await Promise.all([getUserSwipes(userId), getItems(500)]);
  const itemMap = new Map(allItems.map(i => [i.id, { styles: i.styles, priceRange: i.priceRange }]));
  return NextResponse.json(computeStyleDna(swipes, itemMap));
}
