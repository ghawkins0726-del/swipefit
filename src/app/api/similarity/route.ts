/**
 * POST /api/similarity
 *
 * Admin-only batch job that (re-)computes pairwise cosine similarity between
 * every user who has a taste profile with ≥3 interactions.
 *
 * Only stores the top-N neighbours per user (default 20) to keep the
 * user_similarities table small.  Safe to run on a schedule (e.g. nightly
 * via a cron job) — all writes are upserts.
 *
 * Guarded by ADMIN_SECRET header.
 *
 * Returns:
 *   { users: number, pairs: number, elapsed_ms: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTasteProfileUserIds,
  getTasteProfile,
  saveUserSimilarity,
} from '@/lib/db';
import { profileSimilarity } from '@/lib/scoring';

const TOP_N = 20; // neighbours to keep per user

function isAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret');
  return !!(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const start = Date.now();

  // Users with enough interactions to have a meaningful taste profile
  const userIds = await getAllTasteProfileUserIds();
  if (userIds.length < 2) {
    return NextResponse.json({ users: userIds.length, pairs: 0, elapsed_ms: Date.now() - start });
  }

  // Fetch all profiles up front — O(users) DB round-trips but avoids N² queries
  const profiles = await Promise.all(userIds.map(id => getTasteProfile(id)));
  const profileMap = new Map(userIds.map((id, i) => [id, profiles[i]]));

  let pairs = 0;

  // For every (A, B) pair (upper triangle only — similarity is symmetric)
  for (let i = 0; i < userIds.length; i++) {
    const userA = userIds[i];
    const profA = profileMap.get(userA)!;

    // Collect all similarities for userA so we can trim to top-N
    const similarities: Array<{ userId: string; score: number }> = [];

    for (let j = i + 1; j < userIds.length; j++) {
      const userB = userIds[j];
      const profB = profileMap.get(userB)!;
      const score = profileSimilarity(profA, profB);
      similarities.push({ userId: userB, score });
    }

    // Sort descending and keep only top-N per user
    similarities.sort((a, b) => b.score - a.score);
    const topNeighbours = similarities.slice(0, TOP_N);

    for (const { userId: userB, score } of topNeighbours) {
      await saveUserSimilarity(userA, userB, score);
      pairs++;
    }
  }

  return NextResponse.json({ users: userIds.length, pairs, elapsed_ms: Date.now() - start });
}
