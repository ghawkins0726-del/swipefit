import { NextRequest, NextResponse } from 'next/server';
import { withAuthParams, parseJson, apiError } from '@/lib/api-helpers';
import { getItemById, updateItem } from '@/lib/db';

// Public GET — anyone can view an item.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

const ALLOWED_FIELDS = [
  'title', 'description', 'price', 'originalPrice',
  'images', 'condition', 'brand', 'size', 'styles', 'colors',
] as const;

export const PATCH = withAuthParams<{ id: string }, unknown>(
  async (req, { params }, { userId }) => {
    const { id } = await params;

    const existing = await getItemById(id);
    if (!existing) return apiError.notFound();
    if (existing.sellerId !== userId) return apiError.forbidden();
    if (existing.sold) return apiError.conflict('Cannot edit a sold item');

    const body = await parseJson<Record<string, unknown>>(req);
    if (!body) return apiError.badRequest('Invalid body');

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return apiError.badRequest('No valid fields to update');
    }

    const updated = await updateItem(id, userId, updates);
    return NextResponse.json(updated);
  },
);
