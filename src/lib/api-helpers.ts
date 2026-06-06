/**
 * Route helpers — opt-in wrappers to eliminate the auth/parse/displayName
 * boilerplate that repeats across ~47 API routes.
 *
 * Adoption is incremental: routes can switch to these as they're touched.
 * Nothing here changes runtime behavior of existing routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export type AuthedContext = {
  userId: string;
  /** Resolved Clerk display name with the same fallback logic used across routes. */
  getDisplayName: (fallback?: string) => Promise<string>;
};

/**
 * Wrap a route handler so it only runs for authenticated requests.
 * Returns 401 automatically when there's no Clerk session.
 *
 * Usage:
 *   export const POST = withAuth(async (req, ctx) => {
 *     const name = await ctx.getDisplayName();
 *     ...
 *   });
 *
 * For dynamic routes that need `params`, prefer `withAuthParams` below.
 */
export function withAuth<T>(
  handler: (req: NextRequest, ctx: AuthedContext) => Promise<NextResponse<T> | NextResponse>,
) {
  return async (req: NextRequest) => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(req, { userId, getDisplayName: makeDisplayNameResolver() });
  };
}

/**
 * Variant for dynamic route segments. Next.js 16 passes `params` as a Promise.
 */
export function withAuthParams<P, T>(
  handler: (
    req: NextRequest,
    args: { params: Promise<P> },
    ctx: AuthedContext,
  ) => Promise<NextResponse<T> | NextResponse>,
) {
  return async (req: NextRequest, args: { params: Promise<P> }) => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(req, args, { userId, getDisplayName: makeDisplayNameResolver() });
  };
}

/**
 * Lazy display-name resolver. Caches the Clerk fetch so repeat calls within
 * the same request don't re-hit Clerk.
 */
function makeDisplayNameResolver() {
  let cached: string | null = null;
  return async (fallback = 'User') => {
    if (cached !== null) return cached;
    const user = await currentUser();
    const name =
      user?.username ||
      `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
      fallback;
    cached = name;
    return name;
  };
}

/**
 * Safe JSON body parser. Returns `null` for empty/malformed bodies so callers
 * can return a 400 instead of leaking an unhandled rejection into Next.js'
 * generic 500 page.
 */
export async function parseJson<T = unknown>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Standard error responses for consistency across new code. */
export const apiError = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: (msg = 'Forbidden') => NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = 'Not found') => NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = 'Bad request') => NextResponse.json({ error: msg }, { status: 400 }),
  conflict: (msg = 'Conflict') => NextResponse.json({ error: msg }, { status: 409 }),
  server: (msg = 'Server error') => NextResponse.json({ error: msg }, { status: 500 }),
};
