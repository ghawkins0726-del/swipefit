/**
 * Row → domain object mappers.
 *
 * The DB module currently inlines these mappings repeatedly (e.g. the user-row
 * → UserProfile mapping is written 3 times in db.ts). Domains like items and
 * messages already have private `rowToX()` helpers; this module collects the
 * remaining ones for opt-in adoption.
 *
 * Adopting these in db.ts is a separate refactor — see plan in docs/.
 *
 * NOTE: `getUserByStripeCustomer` and `getUserByStripeAccount` in db.ts
 * currently drop `paymentStrikes` and `accountStatus` from the result.
 * Switching them to `rowToUserProfile` will start returning those fields
 * (matching what `getOrCreateUser` already does). That divergence is a latent
 * bug, not a contract.
 */
import type { UserProfile } from '@/lib/types';

type Row = Record<string, unknown>;

export function rowToUserProfile(r: Row): UserProfile {
  const premiumUntil = r.premium_until ? Number(r.premium_until) : undefined;
  const isPremium = Boolean(r.is_premium) && (!premiumUntil || premiumUntil > Date.now());
  return {
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: (r.bio as string) ?? '',
    createdAt: Number(r.created_at),
    totalLikes: (r.total_likes as number) ?? 0,
    totalListings: (r.total_listings as number) ?? 0,
    isPremium,
    premiumUntil,
    stripeCustomerId: (r.stripe_customer_id as string | null) ?? undefined,
    stripeAccountId: (r.stripe_account_id as string | null) ?? undefined,
    stripeAccountReady: (r.stripe_account_ready as boolean) ?? false,
    paymentStrikes: (r.payment_strikes as number) ?? 0,
    accountStatus:
      ((r.account_status as 'active' | 'suspended_pending_review' | null) ?? 'active'),
  };
}
