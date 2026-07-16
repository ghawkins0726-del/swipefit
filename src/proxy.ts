import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/items(.*)',
  '/api/search(.*)',
  '/api/trending(.*)',
  '/api/classify-batch(.*)',
  '/api/migrate(.*)',
  '/api/stripe/webhook',
  '/api/users/(.*)',
  '/api/seed',
  '/waitlist',
  '/api/waitlist(.*)',
]);

const isSignUpRoute = createRouteMatcher(['/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Pre-launch gating: funnel cold sign-up traffic to the waitlist. Clerk's
  // Restricted mode already blocks un-invited sign-ups, but redirecting keeps
  // people in the funnel instead of showing a dead-end "you need an invite"
  // wall. Invitation links carry a __clerk_ticket param — let those through so
  // invited users can actually complete sign-up.
  if (
    process.env.WAITLIST_MODE === '1' &&
    isSignUpRoute(req) &&
    !req.nextUrl.searchParams.has('__clerk_ticket')
  ) {
    return NextResponse.redirect(new URL('/waitlist', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
