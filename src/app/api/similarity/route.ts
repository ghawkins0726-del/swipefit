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

function isAuthorized(req: NextRequest): boolean {
  // Accept requests from Vercel Cron (authorization header set by Vercel)
  // or manual calls with the admin secret header.
  const cronAuth = req.headers.get('authorization');
  if (cronAuth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = req.headers.get('x-admin-secret');
  return !!(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
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

  // Build a full similarity list for every user by computing the upper triangle
  // once and populating both sides — so each user's top-N is their true top-N.
  const userSimMap = new Map<string, Array<{ userId: string; score: number }>>();
  for (const id of userIds) userSimMap.set(id, []);

  for (let i = 0; i < userIds.length; i++) {
    const userA = userIds[i];
    const profA = profileMap.get(userA)!;
    for (let j = i + 1; j < userIds.length; j++) {
      const userB = userIds[j];
      const profB = profileMap.get(userB)!;
      const score = profileSimilarity(profA, profB);
      userSimMap.get(userA)!.push({ userId: userB, score });
      userSimMap.get(userB)!.push({ userId: userA, score });
    }
  }

  // For each user, persist only their true top-N neighbours
  let pairs = 0;
  for (const [userId, sims] of userSimMap) {
    sims.sort((a, b) => b.score - a.score);
    const topNeighbours = sims.slice(0, TOP_N);
    for (const { userId: neighbourId, score } of topNeighbours) {
      await saveUserSimilarity(userId, neighbourId, score);
      pairs++;
    }
  }

  return NextResponse.json({ users: userIds.length, pairs, elapsed_ms: Date.now() - start });
}
