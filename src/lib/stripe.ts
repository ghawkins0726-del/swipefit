/**
 * Lazy-initialized Stripe client.
 * Calling `new Stripe(undefined!)` at module-load time crashes Next.js's
 * page-data collection step during `next build`. Wrapping the construction
 * in a function defers it until the request actually runs.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY env var is not set');
  }
  _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  return _stripe;
}
