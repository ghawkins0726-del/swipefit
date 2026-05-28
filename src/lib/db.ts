/**
 * Database layer — Neon serverless Postgres.
 * Works in Vercel serverless functions and local dev (after `vercel env pull`).
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Item, SwipeRecord, UserProfile } from './types';
import { Offer, Notification, Message, Order, ConversationPreview, TasteProfile, ItemClassification, PriceTier } from './db-types';

export interface UserPref {
  userId: string;
  gender: string;
  topSizes: string[];
  bottomSizes: string[];
  shoeSizes: string[];
  styles: string[];
  categories: string[];
  budgetTier: number;
  updatedAt: number;
}

let _sql: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL env var is not set. Run `vercel env pull .env.local` to get it.');
  _sql = neon(url);
  return _sql;
}

// ─── Schema ──────────────────────────────────────────────────────────────────
export async function initDb(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      bio TEXT DEFAULT '',
      created_at BIGINT NOT NULL,
      total_likes INT DEFAULT 0,
      total_listings INT DEFAULT 0,
      is_premium BOOLEAN DEFAULT FALSE,
      premium_until BIGINT,
      stripe_customer_id TEXT,
      stripe_account_id TEXT,
      stripe_account_ready BOOLEAN DEFAULT FALSE
    )
  `;
  // Migration: add columns to existing tables
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until BIGINT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_ready BOOLEAN DEFAULT FALSE`;
  await db`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (follower_id, following_id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`;
  await db`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price FLOAT NOT NULL,
      original_price FLOAT,
      images TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      styles TEXT NOT NULL,
      colors TEXT NOT NULL,
      size TEXT NOT NULL,
      brand TEXT NOT NULL,
      condition TEXT NOT NULL,
      price_range INT NOT NULL,
      created_at BIGINT NOT NULL,
      likes INT DEFAULT 0,
      views INT DEFAULT 0,
      sold BOOLEAN DEFAULT FALSE
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS swipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      UNIQUE(user_id, item_id)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      amount FLOAT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      payload TEXT DEFAULT '{}',
      created_at BIGINT NOT NULL
    )
  `;
  // Live column migrations — safe to run repeatedly
  await db`ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_amount FLOAT`;

  // Indexes (IF NOT EXISTS handled via CREATE INDEX … IF NOT EXISTS)
  await db`CREATE INDEX IF NOT EXISTS idx_swipes_user ON swipes(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_swipes_item ON swipes(item_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id)`;
  await db`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      text TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_messages_item ON messages(item_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)`;
  await db`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      amount FLOAT NOT NULL,
      status TEXT DEFAULT 'pending_payment',
      shipping_address TEXT,
      tracking_number TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`;

  // ── Recommendation engine tables ──────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS user_taste_profiles_v2 (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      outdoor_score FLOAT DEFAULT 0.5,
      streetwear_score FLOAT DEFAULT 0.5,
      luxury_score FLOAT DEFAULT 0.5,
      minimal_score FLOAT DEFAULT 0.5,
      preppy_score FLOAT DEFAULT 0.5,
      vintage_score FLOAT DEFAULT 0.5,
      tops_score FLOAT DEFAULT 0.5,
      bottoms_score FLOAT DEFAULT 0.5,
      dresses_score FLOAT DEFAULT 0.5,
      outerwear_score FLOAT DEFAULT 0.5,
      shoes_score FLOAT DEFAULT 0.5,
      accessories_score FLOAT DEFAULT 0.5,
      budget_score FLOAT DEFAULT 0.5,
      midrange_score FLOAT DEFAULT 0.5,
      premium_score FLOAT DEFAULT 0.5,
      luxury_tier_score FLOAT DEFAULT 0.5,
      mint_condition_score FLOAT DEFAULT 0.5,
      excellent_condition_score FLOAT DEFAULT 0.5,
      good_condition_score FLOAT DEFAULT 0.5,
      fair_condition_score FLOAT DEFAULT 0.5,
      total_interactions INT DEFAULT 0,
      last_interaction_at BIGINT,
      updated_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_taste_updated ON user_taste_profiles_v2(updated_at DESC)`;

  await db`
    CREATE TABLE IF NOT EXISTS item_classifications (
      item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL,
      primary_style TEXT NOT NULL,
      category TEXT NOT NULL,
      price_tier TEXT NOT NULL,
      condition TEXT NOT NULL,
      outdoor_confidence FLOAT DEFAULT 0,
      streetwear_confidence FLOAT DEFAULT 0,
      luxury_confidence FLOAT DEFAULT 0,
      minimal_confidence FLOAT DEFAULT 0,
      preppy_confidence FLOAT DEFAULT 0,
      vintage_confidence FLOAT DEFAULT 0,
      brand_tier_score FLOAT DEFAULT 0.5,
      trend_score FLOAT DEFAULT 0.5,
      classified_at BIGINT NOT NULL,
      ai_assisted BOOLEAN DEFAULT FALSE
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_class_seller ON item_classifications(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_class_style ON item_classifications(primary_style)`;

  await db`
    CREATE TABLE IF NOT EXISTS user_interactions_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      action_strength FLOAT NOT NULL,
      time_viewing_ms INT DEFAULT 0,
      created_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_interact_user ON user_interactions_v2(user_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_interact_item ON user_interactions_v2(item_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS user_similarities (
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      similarity_score FLOAT NOT NULL,
      calculated_at BIGINT NOT NULL,
      PRIMARY KEY (user_a_id, user_b_id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_sim_a ON user_similarities(user_a_id, similarity_score DESC)`;

  await db`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gender TEXT DEFAULT 'all',
      top_sizes TEXT DEFAULT '[]',
      bottom_sizes TEXT DEFAULT '[]',
      shoe_sizes TEXT DEFAULT '[]',
      styles TEXT DEFAULT '[]',
      categories TEXT DEFAULT '[]',
      budget_tier INT DEFAULT 1,
      updated_at BIGINT NOT NULL
    )
  `;

  // Prevent duplicate offers from same buyer on same item
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_buyer_item ON offers(buyer_id, item_id) WHERE status NOT IN ('declined')`;
}

// ─── Items ────────────────────────────────────────────────────────────────────
export async function getItems(limit = 50, offset = 0): Promise<Item[]> {
  const db = sql();
  const rows = await db`SELECT * FROM items WHERE NOT sold ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return rows.map(rowToItem);
}

export async function getItemById(id: string): Promise<Item | null> {
  const db = sql();
  const rows = await db`SELECT * FROM items WHERE id = ${id}`;
  return rows[0] ? rowToItem(rows[0]) : null;
}

export async function createItem(item: Item): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO items VALUES (
      ${item.id}, ${item.sellerId}, ${item.sellerName}, ${item.title},
      ${item.description}, ${item.price}, ${item.originalPrice ?? null},
      ${JSON.stringify(item.images)}, ${item.category}, ${item.subcategory},
      ${JSON.stringify(item.styles)}, ${JSON.stringify(item.colors)},
      ${item.size}, ${item.brand}, ${item.condition}, ${item.priceRange},
      ${item.createdAt}, ${item.likes}, ${item.views}, ${item.sold}
    ) ON CONFLICT (id) DO NOTHING
  `;
}

export async function searchItems(query: string, filters: {
  category?: string; minPrice?: number; maxPrice?: number;
  condition?: string; sort?: string;
} = {}): Promise<Item[]> {
  const db = sql();
  // Build dynamic query safely
  let rows;
  const q = `%${query}%`;
  const orderBy = filters.sort === 'price_asc' ? 'price ASC'
    : filters.sort === 'price_desc' ? 'price DESC'
    : filters.sort === 'popular' ? 'likes DESC'
    : 'created_at DESC';

  // Use a comprehensive query and filter in JS to avoid complex dynamic SQL
  const all = await db`SELECT * FROM items WHERE NOT sold ORDER BY created_at DESC LIMIT 200`;
  return all
    .map(rowToItem)
    .filter(i => {
      if (query && !`${i.title} ${i.brand} ${i.description} ${i.subcategory}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (filters.category && i.category !== filters.category) return false;
      if (filters.minPrice != null && i.price < filters.minPrice) return false;
      if (filters.maxPrice != null && i.price > filters.maxPrice) return false;
      if (filters.condition && i.condition !== filters.condition) return false;
      return true;
    })
    .sort((a, b) =>
      filters.sort === 'price_asc' ? a.price - b.price
      : filters.sort === 'price_desc' ? b.price - a.price
      : filters.sort === 'popular' ? b.likes - a.likes
      : b.createdAt - a.createdAt
    )
    .slice(0, 60);
}

export async function getTrendingItems(limit = 20): Promise<Item[]> {
  const db = sql();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = await db`
    SELECT i.*, COUNT(s.id) as recent_swipes
    FROM items i
    LEFT JOIN swipes s ON i.id = s.item_id AND s.timestamp > ${cutoff}
      AND s.action IN ('like', 'superlike')
    WHERE NOT i.sold
    GROUP BY i.id
    ORDER BY recent_swipes DESC, i.likes DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToItem);
}

// ─── Swipes ───────────────────────────────────────────────────────────────────
export async function recordSwipe(swipe: SwipeRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO swipes (id, user_id, item_id, action, timestamp)
    VALUES (${swipe.id}, ${swipe.userId}, ${swipe.itemId}, ${swipe.action}, ${swipe.timestamp})
    ON CONFLICT (user_id, item_id) DO UPDATE SET action = ${swipe.action}, timestamp = ${swipe.timestamp}
  `;
  if (swipe.action === 'like' || swipe.action === 'superlike') {
    await db`UPDATE items SET likes = likes + 1 WHERE id = ${swipe.itemId}`;
  }
  await db`UPDATE items SET views = views + 1 WHERE id = ${swipe.itemId}`;
}

export async function getUserSwipes(userId: string): Promise<SwipeRecord[]> {
  const db = sql();
  const rows = await db`SELECT * FROM swipes WHERE user_id = ${userId} ORDER BY timestamp DESC`;
  return rows.map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    itemId: r.item_id as string,
    action: r.action as SwipeRecord['action'],
    timestamp: Number(r.timestamp),
  }));
}

export async function getSwipedItemIds(userId: string): Promise<Set<string>> {
  const db = sql();
  const rows = await db`SELECT item_id FROM swipes WHERE user_id = ${userId}`;
  return new Set(rows.map(r => r.item_id as string));
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function getOrCreateUser(userId: string, displayName?: string): Promise<UserProfile> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  if (rows[0]) {
    const r = rows[0];
    const premiumUntil = r.premium_until ? Number(r.premium_until) : undefined;
    const isPremium = (r.is_premium as boolean) && (!premiumUntil || premiumUntil > Date.now());
    return {
      id: r.id as string,
      name: r.name as string,
      avatar: r.avatar as string,
      bio: r.bio as string,
      createdAt: Number(r.created_at),
      totalLikes: r.total_likes as number,
      totalListings: r.total_listings as number,
      isPremium,
      premiumUntil,
      stripeCustomerId: r.stripe_customer_id as string | undefined,
      stripeAccountId: r.stripe_account_id as string | undefined,
      stripeAccountReady: (r.stripe_account_ready as boolean) ?? false,
    };
  }
  const user: UserProfile = {
    id: userId, name: displayName || 'SwipeFit User',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    bio: '', createdAt: Date.now(), totalLikes: 0, totalListings: 0, isPremium: false,
  };
  await db`INSERT INTO users (id, name, avatar, bio, created_at, total_likes, total_listings, is_premium) VALUES (${user.id}, ${user.name}, ${user.avatar}, ${user.bio}, ${user.createdAt}, 0, 0, false) ON CONFLICT (id) DO NOTHING`;
  return user;
}

export async function setPremium(userId: string, isPremium: boolean, premiumUntil?: number, stripeCustomerId?: string): Promise<void> {
  const db = sql();
  await db`UPDATE users SET is_premium = ${isPremium}, premium_until = ${premiumUntil ?? null}, stripe_customer_id = COALESCE(${stripeCustomerId ?? null}, stripe_customer_id) WHERE id = ${userId}`;
}

export async function getUserByStripeCustomer(stripeCustomerId: string): Promise<UserProfile | null> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE stripe_customer_id = ${stripeCustomerId}`;
  if (!rows[0]) return null;
  const r = rows[0];
  const premiumUntil = r.premium_until ? Number(r.premium_until) : undefined;
  const isPremium = (r.is_premium as boolean) && (!premiumUntil || premiumUntil > Date.now());
  return {
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium,
    premiumUntil,
    stripeCustomerId: r.stripe_customer_id as string | undefined,
    stripeAccountId: r.stripe_account_id as string | undefined,
    stripeAccountReady: (r.stripe_account_ready as boolean) ?? false,
  };
}

/** Set or update a user's Stripe Connect (Express) account id. */
export async function setStripeAccountId(userId: string, accountId: string): Promise<void> {
  const db = sql();
  await db`UPDATE users SET stripe_account_id = ${accountId} WHERE id = ${userId}`;
}

/** Mark a user's connected account as ready (or not) for charges + payouts. */
export async function setStripeAccountReady(userId: string, ready: boolean): Promise<void> {
  const db = sql();
  await db`UPDATE users SET stripe_account_ready = ${ready} WHERE id = ${userId}`;
}

/** Look up a user by their Stripe Connect account id — used by webhook handlers. */
export async function getUserByStripeAccount(stripeAccountId: string): Promise<UserProfile | null> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE stripe_account_id = ${stripeAccountId}`;
  if (!rows[0]) return null;
  const r = rows[0];
  const premiumUntil = r.premium_until ? Number(r.premium_until) : undefined;
  const isPremium = (r.is_premium as boolean) && (!premiumUntil || premiumUntil > Date.now());
  return {
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium,
    premiumUntil,
    stripeCustomerId: r.stripe_customer_id as string | undefined,
    stripeAccountId: r.stripe_account_id as string | undefined,
    stripeAccountReady: (r.stripe_account_ready as boolean) ?? false,
  };
}

export async function updateUser(userId: string, data: { name?: string; bio?: string; avatar?: string }): Promise<void> {
  const db = sql();
  if (data.name !== undefined) await db`UPDATE users SET name = ${data.name} WHERE id = ${userId}`;
  if (data.bio !== undefined) await db`UPDATE users SET bio = ${data.bio} WHERE id = ${userId}`;
  if (data.avatar !== undefined) await db`UPDATE users SET avatar = ${data.avatar} WHERE id = ${userId}`;
}

// ─── Seller ratings ──────────────────────────────────────────────────────────
let _ratingsSchemaReady: Promise<void> | null = null;
async function ensureRatingsSchema(): Promise<void> {
  if (_ratingsSchemaReady) return _ratingsSchemaReady;
  _ratingsSchemaReady = (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS ratings (
        order_id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
        comment TEXT,
        created_at BIGINT NOT NULL
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_ratings_seller ON ratings(seller_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_ratings_buyer  ON ratings(buyer_id)`;
  })().catch(err => { _ratingsSchemaReady = null; throw err; });
  return _ratingsSchemaReady;
}

/** Create or update a rating for an order. Returns the saved row. */
export async function createOrUpdateRating(
  orderId: string, buyerId: string, sellerId: string, stars: number, comment?: string,
): Promise<void> {
  await ensureRatingsSchema();
  if (stars < 1 || stars > 5) throw new Error('stars must be 1..5');
  const db = sql();
  await db`
    INSERT INTO ratings (order_id, buyer_id, seller_id, stars, comment, created_at)
    VALUES (${orderId}, ${buyerId}, ${sellerId}, ${stars}, ${comment ?? null}, ${Date.now()})
    ON CONFLICT (order_id) DO UPDATE SET
      stars = EXCLUDED.stars,
      comment = EXCLUDED.comment,
      created_at = EXCLUDED.created_at
  `;
}

/** Returns the existing rating for an order, if any. */
export async function getRatingForOrder(orderId: string): Promise<{ stars: number; comment: string | null; createdAt: number } | null> {
  await ensureRatingsSchema();
  const db = sql();
  const rows = await db`SELECT stars, comment, created_at FROM ratings WHERE order_id = ${orderId}`;
  if (!rows[0]) return null;
  return {
    stars: rows[0].stars as number,
    comment: (rows[0].comment as string | null) ?? null,
    createdAt: Number(rows[0].created_at),
  };
}

/**
 * Algorithmic average rating for a seller.
 *
 * average = SUM(stars) / COUNT(*)        — simple arithmetic mean
 * count   = number of distinct rated orders
 *
 * Returns { average: 0, count: 0 } for new sellers with no ratings yet.
 */
export async function getSellerRating(sellerId: string): Promise<{ average: number; count: number }> {
  await ensureRatingsSchema();
  const db = sql();
  const rows = await db`
    SELECT COUNT(*)::int AS c, COALESCE(AVG(stars), 0)::float AS avg
    FROM ratings
    WHERE seller_id = ${sellerId}
  `;
  const r = rows[0];
  return {
    average: r ? Number(r.avg) : 0,
    count:   r ? Number(r.c)   : 0,
  };
}

// ─── Social graph (follows) ──────────────────────────────────────────────────
// Lazy schema bootstrap — runs once per serverless instance.
// CREATE TABLE/INDEX IF NOT EXISTS are no-ops after the first successful call.
let _followsSchemaReady: Promise<void> | null = null;
async function ensureFollowsSchema(): Promise<void> {
  if (_followsSchemaReady) return _followsSchemaReady;
  _followsSchemaReady = (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (follower_id, following_id)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`;
  })().catch(err => {
    // If migration fails, reset so the next call retries
    _followsSchemaReady = null;
    throw err;
  });
  return _followsSchemaReady;
}

/** Returns user public profile by id (no auth required — for public profiles). */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium: false, // Don't leak premium status on public lookups
  };
}

/** Make followerId follow followingId. Idempotent — duplicate follows are silently ignored. */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return; // Can't follow yourself
  await ensureFollowsSchema();
  const db = sql();
  await db`INSERT INTO follows (follower_id, following_id, created_at) VALUES (${followerId}, ${followingId}, ${Date.now()}) ON CONFLICT (follower_id, following_id) DO NOTHING`;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await ensureFollowsSchema();
  const db = sql();
  await db`DELETE FROM follows WHERE follower_id = ${followerId} AND following_id = ${followingId}`;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  await ensureFollowsSchema();
  const db = sql();
  const rows = await db`SELECT 1 FROM follows WHERE follower_id = ${followerId} AND following_id = ${followingId} LIMIT 1`;
  return rows.length > 0;
}

/** Counts of followers/following for a user. */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  await ensureFollowsSchema();
  const db = sql();
  const [f, g] = await Promise.all([
    db`SELECT COUNT(*)::int AS c FROM follows WHERE following_id = ${userId}`,
    db`SELECT COUNT(*)::int AS c FROM follows WHERE follower_id  = ${userId}`,
  ]);
  return {
    followers: (f[0]?.c as number) ?? 0,
    following: (g[0]?.c as number) ?? 0,
  };
}

/** Users that followerId follows. Most recent first. */
export async function getFollowing(userId: string, limit = 100): Promise<(UserProfile & { followedAt: number })[]> {
  await ensureFollowsSchema();
  const db = sql();
  const rows = await db`
    SELECT u.*, f.created_at AS followed_at
    FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ${userId}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium: false,
    followedAt: Number(r.followed_at),
  }));
}

/** Users that follow userId. Most recent first. */
export async function getFollowers(userId: string, limit = 100): Promise<(UserProfile & { followedAt: number })[]> {
  await ensureFollowsSchema();
  const db = sql();
  const rows = await db`
    SELECT u.*, f.created_at AS followed_at
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ${userId}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium: false,
    followedAt: Number(r.followed_at),
  }));
}

/** Find users by name. Case-insensitive prefix-then-substring match. */
export async function searchUsers(query: string, excludeUserId?: string, limit = 30): Promise<UserProfile[]> {
  if (!query.trim()) return [];
  const db = sql();
  const q = query.trim();
  const pattern = `%${q.toLowerCase()}%`;
  const rows = excludeUserId
    ? await db`
        SELECT * FROM users
        WHERE LOWER(name) LIKE ${pattern}
          AND id != ${excludeUserId}
        ORDER BY
          CASE WHEN LOWER(name) LIKE ${q.toLowerCase() + '%'} THEN 0 ELSE 1 END,
          total_listings DESC,
          total_likes DESC
        LIMIT ${limit}
      `
    : await db`
        SELECT * FROM users
        WHERE LOWER(name) LIKE ${pattern}
        ORDER BY
          CASE WHEN LOWER(name) LIKE ${q.toLowerCase() + '%'} THEN 0 ELSE 1 END,
          total_listings DESC,
          total_likes DESC
        LIMIT ${limit}
      `;
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    bio: r.bio as string,
    createdAt: Number(r.created_at),
    totalLikes: r.total_likes as number,
    totalListings: r.total_listings as number,
    isPremium: false,
  }));
}

export async function getLikedItems(userId: string): Promise<Item[]> {
  const db = sql();
  const rows = await db`
    SELECT i.* FROM items i
    JOIN swipes s ON i.id = s.item_id
    WHERE s.user_id = ${userId} AND s.action IN ('like', 'superlike')
    ORDER BY s.timestamp DESC
  `;
  return rows.map(rowToItem);
}

// ─── Seller ───────────────────────────────────────────────────────────────────
export async function getSellerItems(sellerId: string): Promise<Item[]> {
  const db = sql();
  const rows = await db`SELECT * FROM items WHERE seller_id = ${sellerId} ORDER BY created_at DESC`;
  return rows.map(rowToItem);
}

export async function getSellerAnalytics(sellerId: string) {
  const items = await getSellerItems(sellerId);
  const totalViews = items.reduce((s, i) => s + i.views, 0);
  const totalLikes = items.reduce((s, i) => s + i.likes, 0);
  const totalSold = items.filter(i => i.sold).length;
  const totalRevenue = items.filter(i => i.sold).reduce((s, i) => s + i.price, 0);
  const activeListings = items.filter(i => !i.sold).length;
  const conversionRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0';
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const db = sql();
  const swipeRows = items.length > 0 ? await db`
    SELECT
      TO_CHAR(TO_TIMESTAMP(s.timestamp / 1000), 'MM-DD') AS day,
      COUNT(*)::int AS count
    FROM swipes s
    JOIN items i ON i.id = s.item_id
    WHERE i.seller_id = ${sellerId}
      AND s.action IN ('like', 'superlike')
      AND s.timestamp > ${cutoff}
    GROUP BY day
    ORDER BY day ASC
  ` : [];
  const recentSwipes = swipeRows.map(r => ({ day: r.day as string, count: r.count as number }));
  return { items, totalViews, totalLikes, totalSold, totalRevenue, activeListings, recentSwipes, conversionRate };
}

// ─── Offers ───────────────────────────────────────────────────────────────────
export async function createOffer(offer: Offer): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO offers (id, buyer_id, seller_id, item_id, amount, message, status, created_at, counter_amount)
    VALUES (${offer.id}, ${offer.buyerId}, ${offer.sellerId}, ${offer.itemId}, ${offer.amount}, ${offer.message}, ${offer.status}, ${offer.createdAt}, ${offer.counterAmount ?? null})
  `;
  const item = await getItemById(offer.itemId);
  await createNotification({
    id: `notif_${Date.now()}`,
    userId: offer.sellerId,
    type: 'offer',
    title: `New offer on ${item?.title ?? 'your item'}`,
    body: `$${offer.amount} offer${offer.message ? ` — "${offer.message}"` : ''}`,
    payload: JSON.stringify({ offerId: offer.id, itemId: offer.itemId, buyerId: offer.buyerId, amount: offer.amount }),
    createdAt: Date.now(),
  });
}

function rowToOffer(r: Record<string, unknown>): Offer {
  return {
    id: r.id as string,
    buyerId: r.buyer_id as string,
    sellerId: r.seller_id as string,
    itemId: r.item_id as string,
    amount: Number(r.amount),
    counterAmount: r.counter_amount != null ? Number(r.counter_amount) : undefined,
    message: r.message as string,
    status: r.status as Offer['status'],
    createdAt: Number(r.created_at),
  };
}

export async function getOffersByUser(userId: string, role: 'buyer' | 'seller'): Promise<(Offer & { item: Item | null })[]> {
  const db = sql();
  const rows = role === 'buyer'
    ? await db`SELECT * FROM offers WHERE buyer_id = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM offers WHERE seller_id = ${userId} ORDER BY created_at DESC`;

  return Promise.all(rows.map(async r => ({
    ...rowToOffer(r),
    item: await getItemById(r.item_id as string),
  })));
}

export async function getOfferById(offerId: string): Promise<Offer | null> {
  const db = sql();
  const rows = await db`SELECT * FROM offers WHERE id = ${offerId}`;
  return rows[0] ? rowToOffer(rows[0]) : null;
}

export async function updateOfferStatus(
  offerId: string,
  status: 'accepted' | 'declined' | 'countered',
  counterAmount?: number,
): Promise<void> {
  const db = sql();
  if (status === 'countered' && counterAmount != null) {
    await db`UPDATE offers SET status = ${status}, counter_amount = ${counterAmount} WHERE id = ${offerId}`;
  } else {
    await db`UPDATE offers SET status = ${status} WHERE id = ${offerId}`;
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(n: Omit<Notification, 'read'>): Promise<void> {
  const db = sql();
  await db`INSERT INTO notifications VALUES (${n.id}, ${n.userId}, ${n.type}, ${n.title}, ${n.body}, false, ${n.payload}, ${n.createdAt})`;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const db = sql();
  const rows = await db`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
  return rows.map(r => ({
    id: r.id as string, userId: r.user_id as string, type: r.type as string,
    title: r.title as string, body: r.body as string, read: r.read as boolean,
    payload: r.payload as string, createdAt: Number(r.created_at),
  }));
}

export async function markAllRead(userId: string): Promise<void> {
  const db = sql();
  await db`UPDATE notifications SET read = true WHERE user_id = ${userId}`;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = sql();
  const rows = await db`SELECT COUNT(*) as c FROM notifications WHERE user_id = ${userId} AND NOT read`;
  return Number(rows[0]?.c ?? 0);
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(order: Order): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO orders (id, buyer_id, seller_id, item_id, amount, status, shipping_address, tracking_number, created_at, updated_at)
    VALUES (${order.id}, ${order.buyerId}, ${order.sellerId}, ${order.itemId}, ${order.amount}, ${order.status}, ${order.shippingAddress ?? null}, ${order.trackingNumber ?? null}, ${order.createdAt}, ${order.updatedAt})
  `;
  await db`UPDATE items SET sold = true WHERE id = ${order.itemId}`;
}

export async function getOrdersByUser(userId: string, role: 'buyer' | 'seller'): Promise<(Order & { item: Item | null })[]> {
  const db = sql();
  const rows = role === 'buyer'
    ? await db`SELECT * FROM orders WHERE buyer_id = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM orders WHERE seller_id = ${userId} ORDER BY created_at DESC`;
  return Promise.all(rows.map(async r => ({
    ...rowToOrder(r),
    item: await getItemById(r.item_id as string),
  })));
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = sql();
  const rows = await db`SELECT * FROM orders WHERE id = ${orderId}`;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const db = sql();
  await db`UPDATE orders SET status = ${status}, updated_at = ${Date.now()} WHERE id = ${orderId}`;
}

export async function updateOrderTracking(orderId: string, trackingNumber: string): Promise<void> {
  const db = sql();
  await db`UPDATE orders SET tracking_number = ${trackingNumber}, status = 'shipped', updated_at = ${Date.now()} WHERE id = ${orderId}`;
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function sendMessage(message: Message): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO messages (id, sender_id, sender_name, receiver_id, item_id, text, read, created_at)
    VALUES (${message.id}, ${message.senderId}, ${message.senderName}, ${message.receiverId}, ${message.itemId}, ${message.text}, false, ${message.createdAt})
  `;
}

export async function getConversation(userId: string, itemId: string, otherUserId: string, limit = 50): Promise<Message[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM messages
    WHERE item_id = ${itemId}
      AND (
        (sender_id = ${userId} AND receiver_id = ${otherUserId})
        OR (sender_id = ${otherUserId} AND receiver_id = ${userId})
      )
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return rows.map(rowToMessage);
}

export async function markMessagesRead(userId: string, senderId: string, itemId: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE messages SET read = true
    WHERE receiver_id = ${userId} AND sender_id = ${senderId} AND item_id = ${itemId} AND NOT read
  `;
}

export async function getOrderCount(userId: string, role: 'buyer' | 'seller'): Promise<number> {
  const db = sql();
  const rows = role === 'buyer'
    ? await db`SELECT COUNT(*) as c FROM orders WHERE buyer_id = ${userId}`
    : await db`SELECT COUNT(*) as c FROM orders WHERE seller_id = ${userId}`;
  return Number(rows[0]?.c ?? 0);
}

export async function getConversationList(userId: string): Promise<ConversationPreview[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM (
      SELECT DISTINCT ON (
        LEAST(m.sender_id, m.receiver_id),
        GREATEST(m.sender_id, m.receiver_id),
        m.item_id
      )
        m.item_id,
        m.text AS last_message,
        m.created_at AS last_message_at,
        CASE WHEN m.sender_id = ${userId} THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
        CASE WHEN m.sender_id = ${userId} THEN COALESCE(u.name, 'User') ELSE m.sender_name END AS other_user_name,
        COALESCE(i.title, 'Item') AS item_title,
        (m.receiver_id = ${userId} AND NOT m.read) AS unread
      FROM messages m
      LEFT JOIN items i ON i.id = m.item_id
      LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = ${userId} THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
      ORDER BY
        LEAST(m.sender_id, m.receiver_id),
        GREATEST(m.sender_id, m.receiver_id),
        m.item_id,
        m.created_at DESC
    ) t
    ORDER BY t.last_message_at DESC
  `;
  return rows.map(r => ({
    itemId: r.item_id as string,
    itemTitle: r.item_title as string,
    otherUserId: r.other_user_id as string,
    otherUserName: r.other_user_name as string,
    lastMessage: r.last_message as string,
    lastMessageAt: Number(r.last_message_at),
    unread: r.unread as boolean,
  }));
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const db = sql();
  const rows = await db`SELECT COUNT(*) as c FROM messages WHERE receiver_id = ${userId} AND NOT read`;
  return Number(rows[0]?.c ?? 0);
}

// ─── DB init (called from seed route) ────────────────────────────────────────
export async function ensureSchema(): Promise<void> {
  await initDb();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    itemId: row.item_id as string,
    amount: row.amount as number,
    status: row.status as Order['status'],
    shippingAddress: row.shipping_address as string | undefined,
    trackingNumber: row.tracking_number as string | undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    receiverId: row.receiver_id as string,
    itemId: row.item_id as string,
    text: row.text as string,
    read: row.read as boolean,
    createdAt: Number(row.created_at),
  };
}

function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    title: row.title as string,
    description: row.description as string,
    price: row.price as number,
    originalPrice: row.original_price as number | undefined,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images as string[],
    category: row.category as string,
    subcategory: row.subcategory as string,
    styles: typeof row.styles === 'string' ? JSON.parse(row.styles) : row.styles as string[],
    colors: typeof row.colors === 'string' ? JSON.parse(row.colors) : row.colors as string[],
    size: row.size as string,
    brand: row.brand as string,
    condition: row.condition as Item['condition'],
    priceRange: row.price_range as number,
    createdAt: Number(row.created_at),
    likes: row.likes as number,
    views: row.views as number,
    sold: row.sold as boolean,
  };
}

// ─── Recommendation engine ────────────────────────────────────────────────────

function rowToTasteProfile(r: Record<string, unknown>): TasteProfile {
  return {
    userId: r.user_id as string,
    outdoorScore: Number(r.outdoor_score),
    streetwearScore: Number(r.streetwear_score),
    luxuryScore: Number(r.luxury_score),
    minimalScore: Number(r.minimal_score),
    preppyScore: Number(r.preppy_score),
    vintageScore: Number(r.vintage_score),
    topsScore: Number(r.tops_score),
    bottomsScore: Number(r.bottoms_score),
    dressesScore: Number(r.dresses_score),
    outerwearScore: Number(r.outerwear_score),
    shoesScore: Number(r.shoes_score),
    accessoriesScore: Number(r.accessories_score),
    budgetScore: Number(r.budget_score),
    midrangeScore: Number(r.midrange_score),
    premiumScore: Number(r.premium_score),
    luxuryTierScore: Number(r.luxury_tier_score),
    mintConditionScore: Number(r.mint_condition_score),
    excellentConditionScore: Number(r.excellent_condition_score),
    goodConditionScore: Number(r.good_condition_score),
    fairConditionScore: Number(r.fair_condition_score),
    totalInteractions: Number(r.total_interactions),
    lastInteractionAt: r.last_interaction_at ? Number(r.last_interaction_at) : null,
    updatedAt: Number(r.updated_at),
  };
}

function rowToClassification(r: Record<string, unknown>): ItemClassification {
  return {
    itemId: r.item_id as string,
    sellerId: r.seller_id as string,
    primaryStyle: r.primary_style as string,
    category: r.category as string,
    priceTier: r.price_tier as PriceTier,
    condition: r.condition as string,
    outdoorConfidence: Number(r.outdoor_confidence),
    streetwearConfidence: Number(r.streetwear_confidence),
    luxuryConfidence: Number(r.luxury_confidence),
    minimalConfidence: Number(r.minimal_confidence),
    preppyConfidence: Number(r.preppy_confidence),
    vintageConfidence: Number(r.vintage_confidence),
    brandTierScore: Number(r.brand_tier_score),
    trendScore: Number(r.trend_score),
    classifiedAt: Number(r.classified_at),
    aiAssisted: r.ai_assisted as boolean,
  };
}

/** Get (or create) a user's taste profile */
export async function getTasteProfile(userId: string): Promise<TasteProfile> {
  const db = sql();
  await db`
    INSERT INTO user_taste_profiles_v2 (user_id, updated_at)
    VALUES (${userId}, ${Date.now()})
    ON CONFLICT (user_id) DO NOTHING
  `;
  const rows = await db`SELECT * FROM user_taste_profiles_v2 WHERE user_id = ${userId}`;
  return rowToTasteProfile(rows[0]);
}

/** Persist updated taste profile values */
export async function saveTasteProfile(p: TasteProfile): Promise<void> {
  const db = sql();
  await db`
    UPDATE user_taste_profiles_v2 SET
      outdoor_score             = ${p.outdoorScore},
      streetwear_score          = ${p.streetwearScore},
      luxury_score              = ${p.luxuryScore},
      minimal_score             = ${p.minimalScore},
      preppy_score              = ${p.preppyScore},
      vintage_score             = ${p.vintageScore},
      tops_score                = ${p.topsScore},
      bottoms_score             = ${p.bottomsScore},
      dresses_score             = ${p.dressesScore},
      outerwear_score           = ${p.outerwearScore},
      shoes_score               = ${p.shoesScore},
      accessories_score         = ${p.accessoriesScore},
      budget_score              = ${p.budgetScore},
      midrange_score            = ${p.midrangeScore},
      premium_score             = ${p.premiumScore},
      luxury_tier_score         = ${p.luxuryTierScore},
      mint_condition_score      = ${p.mintConditionScore},
      excellent_condition_score = ${p.excellentConditionScore},
      good_condition_score      = ${p.goodConditionScore},
      fair_condition_score      = ${p.fairConditionScore},
      total_interactions        = ${p.totalInteractions},
      last_interaction_at       = ${p.lastInteractionAt ?? null},
      updated_at                = ${p.updatedAt}
    WHERE user_id = ${p.userId}
  `;
}

/** Record a raw user→item interaction for audit trail */
export async function recordInteraction(
  id: string,
  userId: string,
  itemId: string,
  action: string,
  actionStrength: number,
  timeViewingMs: number,
): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO user_interactions_v2 (id, user_id, item_id, action, action_strength, time_viewing_ms, created_at)
    VALUES (${id}, ${userId}, ${itemId}, ${action}, ${actionStrength}, ${timeViewingMs}, ${Date.now()})
    ON CONFLICT (id) DO NOTHING
  `;
}

/** Get a single item's classification (null if not yet classified) */
export async function getItemClassification(itemId: string): Promise<ItemClassification | null> {
  const db = sql();
  const rows = await db`SELECT * FROM item_classifications WHERE item_id = ${itemId}`;
  return rows[0] ? rowToClassification(rows[0]) : null;
}

/** Get classifications for a batch of item IDs */
export async function getItemClassifications(itemIds: string[]): Promise<Map<string, ItemClassification>> {
  if (itemIds.length === 0) return new Map();
  const db = sql();
  const rows = await db`SELECT * FROM item_classifications WHERE item_id = ANY(${itemIds})`;
  return new Map(rows.map(r => [r.item_id as string, rowToClassification(r)]));
}

/** Save (upsert) an item classification */
export async function saveItemClassification(c: ItemClassification): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO item_classifications (
      item_id, seller_id, primary_style, category, price_tier, condition,
      outdoor_confidence, streetwear_confidence, luxury_confidence,
      minimal_confidence, preppy_confidence, vintage_confidence,
      brand_tier_score, trend_score, classified_at, ai_assisted
    ) VALUES (
      ${c.itemId}, ${c.sellerId}, ${c.primaryStyle}, ${c.category}, ${c.priceTier}, ${c.condition},
      ${c.outdoorConfidence}, ${c.streetwearConfidence}, ${c.luxuryConfidence},
      ${c.minimalConfidence}, ${c.preppyConfidence}, ${c.vintageConfidence},
      ${c.brandTierScore}, ${c.trendScore}, ${c.classifiedAt}, ${c.aiAssisted}
    )
    ON CONFLICT (item_id) DO UPDATE SET
      primary_style          = EXCLUDED.primary_style,
      price_tier             = EXCLUDED.price_tier,
      condition              = EXCLUDED.condition,
      outdoor_confidence     = EXCLUDED.outdoor_confidence,
      streetwear_confidence  = EXCLUDED.streetwear_confidence,
      luxury_confidence      = EXCLUDED.luxury_confidence,
      minimal_confidence     = EXCLUDED.minimal_confidence,
      preppy_confidence      = EXCLUDED.preppy_confidence,
      vintage_confidence     = EXCLUDED.vintage_confidence,
      brand_tier_score       = EXCLUDED.brand_tier_score,
      trend_score            = EXCLUDED.trend_score,
      classified_at          = EXCLUDED.classified_at,
      ai_assisted            = EXCLUDED.ai_assisted
  `;
}

/** Get IDs of items not yet in item_classifications */
export async function getUnclassifiedItemIds(limit = 100): Promise<{ id: string; title: string; description: string; brand: string; price: number; category: string; sellerId: string }[]> {
  const db = sql();
  const rows = await db`
    SELECT i.id, i.title, i.description, i.brand, i.price, i.category, i.seller_id
    FROM items i
    LEFT JOIN item_classifications ic ON i.id = ic.item_id
    WHERE ic.item_id IS NULL
    ORDER BY i.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: r.description as string,
    brand: r.brand as string,
    price: Number(r.price),
    category: r.category as string,
    sellerId: r.seller_id as string,
  }));
}

/** Store a computed similarity score between two users */
export async function saveUserSimilarity(userAId: string, userBId: string, score: number): Promise<void> {
  const db = sql();
  const now = Date.now();
  await db`
    INSERT INTO user_similarities (user_a_id, user_b_id, similarity_score, calculated_at)
    VALUES (${userAId}, ${userBId}, ${score}, ${now})
    ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET similarity_score = EXCLUDED.similarity_score, calculated_at = EXCLUDED.calculated_at
  `;
}

/** Find the most similar users to a given user */
export async function getSimilarUsers(userId: string, topN = 10): Promise<Array<{ userId: string; similarityScore: number }>> {
  const db = sql();
  const rows = await db`
    SELECT user_b_id, similarity_score
    FROM user_similarities
    WHERE user_a_id = ${userId}
    ORDER BY similarity_score DESC
    LIMIT ${topN}
  `;
  return rows.map(r => ({ userId: r.user_b_id as string, similarityScore: Number(r.similarity_score) }));
}

// ─── User preferences ─────────────────────────────────────────────────────────

export async function saveUserPreferences(prefs: UserPref): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO user_preferences (user_id, gender, top_sizes, bottom_sizes, shoe_sizes, styles, categories, budget_tier, updated_at)
    VALUES (
      ${prefs.userId}, ${prefs.gender},
      ${JSON.stringify(prefs.topSizes)}, ${JSON.stringify(prefs.bottomSizes)}, ${JSON.stringify(prefs.shoeSizes)},
      ${JSON.stringify(prefs.styles)}, ${JSON.stringify(prefs.categories)},
      ${prefs.budgetTier}, ${prefs.updatedAt}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      gender      = EXCLUDED.gender,
      top_sizes   = EXCLUDED.top_sizes,
      bottom_sizes = EXCLUDED.bottom_sizes,
      shoe_sizes  = EXCLUDED.shoe_sizes,
      styles      = EXCLUDED.styles,
      categories  = EXCLUDED.categories,
      budget_tier = EXCLUDED.budget_tier,
      updated_at  = EXCLUDED.updated_at
  `;
}

export async function getUserPreferences(userId: string): Promise<UserPref | null> {
  const db = sql();
  const rows = await db`SELECT * FROM user_preferences WHERE user_id = ${userId}`;
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    userId: r.user_id as string,
    gender: r.gender as string,
    topSizes: JSON.parse(r.top_sizes as string),
    bottomSizes: JSON.parse(r.bottom_sizes as string),
    shoeSizes: JSON.parse(r.shoe_sizes as string),
    styles: JSON.parse(r.styles as string),
    categories: JSON.parse(r.categories as string),
    budgetTier: r.budget_tier as number,
    updatedAt: Number(r.updated_at),
  };
}

// ─── Item editing ─────────────────────────────────────────────────────────────

type ItemUpdates = Partial<Pick<Item, 'title' | 'description' | 'price' | 'originalPrice' | 'images' | 'condition' | 'brand' | 'size' | 'styles' | 'colors'>>;

export async function updateItem(itemId: string, sellerId: string, updates: ItemUpdates): Promise<Item | null> {
  const db = sql();
  // Each field updated separately so only changed fields touch the DB.
  // All queries guard on seller_id so only the owner can edit.
  if (updates.title !== undefined)
    await db`UPDATE items SET title = ${updates.title} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.description !== undefined)
    await db`UPDATE items SET description = ${updates.description} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.price !== undefined)
    await db`UPDATE items SET price = ${updates.price} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.originalPrice !== undefined)
    await db`UPDATE items SET original_price = ${updates.originalPrice} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.images !== undefined)
    await db`UPDATE items SET images = ${JSON.stringify(updates.images)} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.condition !== undefined)
    await db`UPDATE items SET condition = ${updates.condition} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.brand !== undefined)
    await db`UPDATE items SET brand = ${updates.brand} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.size !== undefined)
    await db`UPDATE items SET size = ${updates.size} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.styles !== undefined)
    await db`UPDATE items SET styles = ${JSON.stringify(updates.styles)} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  if (updates.colors !== undefined)
    await db`UPDATE items SET colors = ${JSON.stringify(updates.colors)} WHERE id = ${itemId} AND seller_id = ${sellerId} AND NOT sold`;
  return getItemById(itemId);
}

/** All user IDs that have taste profiles (for similarity batch job) */
export async function getAllTasteProfileUserIds(): Promise<string[]> {
  const db = sql();
  const rows = await db`SELECT user_id FROM user_taste_profiles_v2 WHERE total_interactions >= 3`;
  return rows.map(r => r.user_id as string);
}

/** Item IDs liked by similar users that the target user hasn't seen */
export async function getCollaborativeItemIds(
  userId: string,
  similarUserIds: string[],
  limit = 40,
): Promise<Set<string>> {
  if (similarUserIds.length === 0) return new Set();
  const db = sql();
  const rows = await db`
    SELECT DISTINCT s.item_id
    FROM swipes s
    WHERE s.user_id = ANY(${similarUserIds})
      AND s.action IN ('like', 'superlike')
      AND s.item_id NOT IN (
        SELECT item_id FROM swipes WHERE user_id = ${userId}
      )
    LIMIT ${limit}
  `;
  return new Set(rows.map(r => r.item_id as string));
}

