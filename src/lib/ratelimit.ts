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

/** N requests per minute, or null when Redis isn't configured (dev passes through). */
function makeLimiter(requests: number, prefix: string): Ratelimit | null {
  return redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, '1 m'), prefix })
    : null;
}

// ── Per-route limiters ────────────────────────────────────────────────────────

/** Messages: 30 per minute per user */
export const messagesLimiter = makeLimiter(30, 'rl:messages');

/** Offers: 10 per minute per user */
export const offersLimiter = makeLimiter(10, 'rl:offers');

/** Swipes: 300 per minute per user (fast swipers are legit, bots do thousands) */
export const swipeLimiter = makeLimiter(300, 'rl:swipe');

/** Profile updates: 10 per minute per user */
export const profileLimiter = makeLimiter(10, 'rl:profile');

/** AI chat: 20 per minute per user (each call hits Claude API) */
export const aiLimiter = makeLimiter(20, 'rl:ai');

/** Waitlist join: 5 per minute per IP (public, unauthenticated — keyed on IP, not user) */
export const waitlistLimiter = makeLimiter(5, 'rl:waitlist');

/** Waitlist reads (status/count): 30 per minute per IP */
export const waitlistReadLimiter = makeLimiter(30, 'rl:waitlist-read');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Best-effort client IP for keying public (unauthenticated) limiters. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon';
}

/**
 * Check the given limiter for the given identifier.
 * Returns a 429 NextResponse if rate-limited, otherwise null (caller continues).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<NextResponse | null> {
  if (!limiter) return null; // no Redis configured — pass through
  const { success, limit, reset } = await limiter.limit(identifier);
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
