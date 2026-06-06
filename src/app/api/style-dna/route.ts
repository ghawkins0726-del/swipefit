import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { getUserSwipes, getItems } from '@/lib/db';
import { computeStyleDna } from '@/lib/styleDna';

export const GET = withAuth(async (_req, { userId }) => {
  const [swipes, allItems] = await Promise.all([getUserSwipes(userId), getItems(500)]);
  const itemMap = new Map(allItems.map(i => [i.id, { styles: i.styles, priceRange: i.priceRange }]));
  return NextResponse.json(computeStyleDna(swipes, itemMap));
});
