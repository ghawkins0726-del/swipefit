/**
 * POST /api/classify-batch
 *
 * Admin-only batch endpoint that backfills item classifications for any
 * items that were listed before the classification pipeline was deployed.
 *
 * Guarded by ADMIN_SECRET so it cannot be triggered by end-users.
 * Safe to run repeatedly — classifyAndSave() upserts (ON CONFLICT DO UPDATE).
 *
 * Body (optional):
 *   { limit: number }  — max items to process per call, default 50
 *
 * Returns:
 *   { processed: number, aiAssisted: number, errors: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnclassifiedItemIds } from '@/lib/db';
import { classifyAndSave } from '@/lib/classification';

function isAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret');
  return !!(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let limit = 50;
  try {
    const body = await req.json();
    if (typeof body.limit === 'number') limit = Math.min(body.limit, 200);
  } catch {
    // body is optional — defaults are fine
  }

  // getUnclassifiedItemIds returns full partial-item objects (no condition column).
  // Items that pre-date the classification pipeline won't have condition stored
  // in this query, so we default to 'good' — a safe middle-of-the-road value.
  const items = await getUnclassifiedItemIds(limit);
  if (items.length === 0) {
    return NextResponse.json({ processed: 0, aiAssisted: 0, errors: 0, message: 'All items classified' });
  }

  let processed = 0;
  let aiAssisted = 0;
  let errors = 0;

  // Process sequentially to avoid hammering the AI API with parallel requests
  for (const item of items) {
    try {
      const result = await classifyAndSave({
        id: item.id,
        sellerId: item.sellerId,
        title: item.title,
        description: item.description,
        brand: item.brand,
        price: item.price,
        category: item.category,
        condition: 'good', // condition not included in the unclassified query
      });
      processed++;
      if (result.aiAssisted) aiAssisted++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed, aiAssisted, errors });
}
