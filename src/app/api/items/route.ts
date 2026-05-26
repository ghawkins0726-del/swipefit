import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItems, createItem } from '@/lib/db';
import { classifyAndSave } from '@/lib/classification';
import { Item } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const items = await getItems(limit, offset);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerkUser = await currentUser();
  const displayName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'SwipeFit User';

  const body = await req.json();
  const {
    title, description, price, originalPrice,
    images, category, subcategory, styles, colors, size, brand, condition,
  } = body;

  if (!title || !price || !category || !images?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const priceNum = parseFloat(price);
  let priceRange = 0;
  if (priceNum >= 500) priceRange = 4;
  else if (priceNum >= 200) priceRange = 3;
  else if (priceNum >= 75) priceRange = 2;
  else if (priceNum >= 25) priceRange = 1;

  const item: Item = {
    id: uuid(),
    sellerId: userId,
    sellerName: displayName,
    title, description: description || '',
    price: priceNum,
    originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
    images, category,
    subcategory: subcategory || category,
    styles: styles || [], colors: colors || [],
    size: size || 'one size',
    brand: brand || 'Unknown',
    condition: condition || 'good',
    priceRange, createdAt: Date.now(),
    likes: 0, views: 0, sold: false,
  };

  await createItem(item);

  // Fire-and-forget: classify the item so it's ready for taste-based ranking.
  // classifyAndSave uses keyword heuristics first; only calls Claude when
  // keyword confidence is below 0.35 — so most items cost 0 AI tokens.
  classifyAndSave({
    id: item.id,
    sellerId: item.sellerId,
    title: item.title,
    description: item.description,
    brand: item.brand,
    price: item.price,
    category: item.category,
    condition: item.condition,
  }).catch(() => {
    // Non-critical — classification failure must not block listing creation
  });

  return NextResponse.json(item, { status: 201 });
}
