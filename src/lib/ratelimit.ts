/**
 * Rate limiting via Upstash Redis.
 *
 * Requires two env vars (add to Vercel dashboard + .env.local):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Get them free at https://console.upstash.com → create a Redis database → REST API tab.
 *
 * If the env vars are missing (local dev without Redis) all rate limit checks
 * pass through so nothing breaks during development.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

// ── Per-route limiters ────────────────────────────────────────────────────────

/** Messages: 30 per minute per user */
export const messagesLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:messages' })
  : null;

/** Offers: 10 per minute per user */
export const offersLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:offers' })
  : null;

/** Swipes: 300 per minute per user (fast swipers are legit, bots do thousands) */
export const swipeLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, '1 m'), prefix: 'rl:swipe' })
  : null;

/** Profile updates: 10 per minute per user */
export const profileLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:profile' })
  : null;

/** AI chat: 20 per minute per user (each call hits Claude API) */
export const aiLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:ai' })
  : null;

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Check the given limiter for the given identifier.
 * Returns a 429 NextResponse if rate-limited, otherwise null (caller continues).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  _req?: NextRequest,
): Promise<NextResponse | null> {
  if (!limiter) return null; // no Redis configured — pass through
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests — slow down and try again shortly.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(reset),
          'Retry-After':           String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    );
  }
  return null;
}
