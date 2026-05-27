/**
 * Database layer — Neon serverless Postgres.
 * Works in Vercel serverless functions and local dev (after `vercel env pull`).
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Item, SwipeRecord, UserProfile } from './types';
import { Offer, Notification, Message, Order, ConversationPreview, TasteProfile, ItemClassification, PriceTier } from './db-types';

let _sql: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL env var is not set. Run `vercel env pull .env.local` to get it.');
  _sql = neon(url);
  return _sql;
}

// ─── Schema ──────────────────────────────────────────────────────────────────
// Module-level guard: DDL runs only once per serverless instance, not on every cold start.
let _schemaInitialized: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (_schemaInitialized) return _schemaInitialized;
  _schemaInitialized = _runInitDb().catch(err => {
    _schemaInitialized = null; // allow retry on failure
    throw err;
  });
  return _schemaInitialized;
}

async function _runInitDb(): Promise<void> {
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
  // Migrations — idempotent
  await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT`;
  await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_text TEXT`;
  await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_sender TEXT`;
  await db`
    CREATE TABLE IF NOT EXISTS message_reactions (
      message_id TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      emoji      TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (message_id, user_id, emoji)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_reactions_msg ON message_reactions(message_id)`;
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

  // ── User preferences ──────────────────────────────────────────────────────
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_sizes TEXT DEFAULT '[]'`;

  // ── Collections / boards ──────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🗂️',
      created_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)`;
  await db`
    CREATE TABLE IF NOT EXISTS collection_items (
      collection_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      added_at BIGINT NOT NULL,
      PRIMARY KEY (collection_id, item_id)
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_col_items_col  ON collection_items(collection_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_col_items_item ON collection_items(item_id)`;
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
  // Use explicit column names so adding/removing nullable columns doesn't
  // silently shift positional values and cause a Postgres column-count error.
  await db`
    INSERT INTO items (
      id, seller_id, seller_name, title, description, price,
      images, category, subcategory, styles, colors,
      size, brand, condition, price_range, created_at, likes, views, sold
    ) VALUES (
      ${item.id}, ${item.sellerId}, ${item.sellerName}, ${item.title},
      ${item.description}, ${item.price},
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
  const pattern = query ? `%${query.toLowerCase()}%` : null;

  // Push all filtering and sorting into Postgres — no JS-side 200-row cap
  const rows = await db`
    SELECT * FROM items
    WHERE NOT sold
      AND (
        ${pattern} IS NULL
        OR LOWER(title)       LIKE ${pattern ?? ''}
        OR LOWER(brand)       LIKE ${pattern ?? ''}
        OR LOWER(description) LIKE ${pattern ?? ''}
        OR LOWER(subcategory) LIKE ${pattern ?? ''}
      )
      AND (${filters.category ?? null} IS NULL OR category = ${filters.category ?? null})
      AND (${filters.minPrice ?? null} IS NULL OR price    >= ${filters.minPrice ?? null})
      AND (${filters.maxPrice ?? null} IS NULL OR price    <= ${filters.maxPrice ?? null})
      AND (${filters.condition ?? null} IS NULL OR condition = ${filters.condition ?? null})
    ORDER BY
      CASE WHEN ${filters.sort ?? ''} = 'price_asc'  THEN price        END ASC  NULLS LAST,
      CASE WHEN ${filters.sort ?? ''} = 'price_desc' THEN price        END DESC NULLS LAST,
      CASE WHEN ${filters.sort ?? ''} = 'popular'    THEN likes        END DESC NULLS LAST,
      created_at DESC
    LIMIT 60
  `;
  return rows.map(rowToItem);
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

  // Check for an existing swipe so we can correctly adjust the like counter.
  const existing = await db`SELECT action FROM swipes WHERE user_id = ${swipe.userId} AND item_id = ${swipe.itemId} LIMIT 1`;
  const prevAction = (existing[0]?.action as string | undefined) ?? null;

  await db`
    INSERT INTO swipes (id, user_id, item_id, action, timestamp)
    VALUES (${swipe.id}, ${swipe.userId}, ${swipe.itemId}, ${swipe.action}, ${swipe.timestamp})
    ON CONFLICT (user_id, item_id) DO UPDATE SET action = ${swipe.action}, timestamp = ${swipe.timestamp}
  `;

  const wasLike = prevAction === 'like' || prevAction === 'superlike';
  const isLike  = swipe.action === 'like' || swipe.action === 'superlike';

  if (!wasLike && isLike) {
    // Brand-new like — increment
    await db`UPDATE items SET likes = likes + 1 WHERE id = ${swipe.itemId}`;
  } else if (wasLike && !isLike) {
    // Changed from like → dislike — decrement (floor at 0)
    await db`UPDATE items SET likes = GREATEST(0, likes - 1) WHERE id = ${swipe.itemId}`;
  }
  // Same action repeated: no change to likes counter.

  // Only count views on the first-ever swipe to avoid inflation
  if (!prevAction) {
    await db`UPDATE items SET views = views + 1 WHERE id = ${swipe.itemId}`;
  }
}

export async function getUserSwipes(userId: string): Promise<SwipeRecord[]> {
  const db = sql();
  const rows = await db`SELECT * FROM swipes WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 500`;
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
  if (!data.name && data.bio === undefined && !data.avatar) return;
  const db = sql();
  const hasName   = data.name   !== undefined;
  const hasBio    = data.bio    !== undefined;
  const hasAvatar = data.avatar !== undefined;
  // Single UPDATE — CASE keeps unchanged columns untouched
  await db`
    UPDATE users SET
      name   = CASE WHEN ${hasName}   THEN ${data.name   ?? ''} ELSE name   END,
      bio    = CASE WHEN ${hasBio}    THEN ${data.bio    ?? ''} ELSE bio    END,
      avatar = CASE WHEN ${hasAvatar} THEN ${data.avatar ?? ''} ELSE avatar END
    WHERE id = ${userId}
  `;
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
    LIMIT 60
  `;
  return rows.map(rowToItem);
}

// ─── Seller ───────────────────────────────────────────────────────────────────
export async function getSellerItems(sellerId: string): Promise<Item[]> {
  const db = sql();
  const rows = await db`SELECT * FROM items WHERE seller_id = ${sellerId} ORDER BY created_at DESC LIMIT 60`;
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
    ? await db`SELECT * FROM offers WHERE buyer_id  = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM offers WHERE seller_id = ${userId} ORDER BY created_at DESC`;

  // Batch-fetch all referenced items in one query instead of N individual lookups
  const itemIds = [...new Set(rows.map(r => r.item_id as string))];
  const itemRows = itemIds.length > 0
    ? await db`SELECT * FROM items WHERE id = ANY(${itemIds})`
    : [];
  const itemMap = new Map(itemRows.map(r => [r.id as string, rowToItem(r)]));

  return rows.map(r => ({
    ...rowToOffer(r),
    item: itemMap.get(r.item_id as string) ?? null,
  }));
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
    ? await db`SELECT * FROM orders WHERE buyer_id  = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM orders WHERE seller_id = ${userId} ORDER BY created_at DESC`;

  // Batch-fetch all referenced items in one query instead of N individual lookups
  const itemIds = [...new Set(rows.map(r => r.item_id as string))];
  const itemRows = itemIds.length > 0
    ? await db`SELECT * FROM items WHERE id = ANY(${itemIds})`
    : [];
  const itemMap = new Map(itemRows.map(r => [r.id as string, rowToItem(r)]));

  return rows.map(r => ({
    ...rowToOrder(r),
    item: itemMap.get(r.item_id as string) ?? null,
  }));
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
    INSERT INTO messages (id, sender_id, sender_name, receiver_id, item_id, text, read, created_at, reply_to_id, reply_to_text, reply_to_sender)
    VALUES (
      ${message.id}, ${message.senderId}, ${message.senderName}, ${message.receiverId},
      ${message.itemId}, ${message.text}, false, ${message.createdAt},
      ${message.replyToId ?? null}, ${message.replyToText ?? null}, ${message.replyToSender ?? null}
    )
  `;
}

export async function getConversation(userId: string, itemId: string, otherUserId: string, limit = 50): Promise<Message[]> {
  const db = sql();
  const [msgRows, reactRows] = await Promise.all([
    db`
      SELECT * FROM messages
      WHERE item_id = ${itemId}
        AND (
          (sender_id = ${userId} AND receiver_id = ${otherUserId})
          OR (sender_id = ${otherUserId} AND receiver_id = ${userId})
        )
      ORDER BY created_at ASC
      LIMIT ${limit}
    `,
    db`
      SELECT r.message_id, r.user_id, r.emoji
      FROM message_reactions r
      JOIN messages m ON m.id = r.message_id
      WHERE m.item_id = ${itemId}
        AND (
          (m.sender_id = ${userId} AND m.receiver_id = ${otherUserId})
          OR (m.sender_id = ${otherUserId} AND m.receiver_id = ${userId})
        )
    `,
  ]);

  // Build emoji → userIds map per message
  const reactionMap: Record<string, Record<string, string[]>> = {};
  for (const r of reactRows) {
    const mid = r.message_id as string;
    const emoji = r.emoji as string;
    const uid = r.user_id as string;
    if (!reactionMap[mid]) reactionMap[mid] = {};
    if (!reactionMap[mid][emoji]) reactionMap[mid][emoji] = [];
    reactionMap[mid][emoji].push(uid);
  }

  return msgRows.map(row => ({
    ...rowToMessage(row),
    reactions: reactionMap[row.id as string] ?? {},
  }));
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
        u.avatar AS other_user_avatar,
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
    otherUserAvatar: (r.other_user_avatar as string | null) ?? null,
    lastMessage: r.last_message as string,
    lastMessageAt: Number(r.last_message_at),
    unread: r.unread as boolean,
  }));
}

export async function toggleReaction(messageId: string, userId: string, emoji: string): Promise<'added' | 'removed'> {
  const db = sql();
  const existing = await db`
    SELECT 1 FROM message_reactions WHERE message_id = ${messageId} AND user_id = ${userId} AND emoji = ${emoji}
  `;
  if (existing.length > 0) {
    await db`DELETE FROM message_reactions WHERE message_id = ${messageId} AND user_id = ${userId} AND emoji = ${emoji}`;
    return 'removed';
  } else {
    await db`INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (${messageId}, ${userId}, ${emoji}, ${Date.now()})`;
    return 'added';
  }
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
    replyToId: (row.reply_to_id as string | null) ?? null,
    replyToText: (row.reply_to_text as string | null) ?? null,
    replyToSender: (row.reply_to_sender as string | null) ?? null,
    reactions: {},
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

/** All user IDs that have taste profiles (for similarity batch job) */
export async function getAllTasteProfileUserIds(): Promise<string[]> {
  const db = sql();
  const rows = await db`SELECT user_id FROM user_taste_profiles_v2 WHERE total_interactions >= 3`;
  return rows.map(r => r.user_id as string);
}

// ─── Preferred sizes ─────────────────────────────────────────────────────────

export async function savePreferredSizes(userId: string, sizes: string[]): Promise<void> {
  const db = sql();
  await db`UPDATE users SET preferred_sizes = ${JSON.stringify(sizes)} WHERE id = ${userId}`;
}

export async function getPreferredSizes(userId: string): Promise<string[]> {
  const db = sql();
  const rows = await db`SELECT preferred_sizes FROM users WHERE id = ${userId}`;
  if (!rows[0]) return [];
  const raw = rows[0].preferred_sizes as string | null;
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

// ─── Collections / boards ─────────────────────────────────────────────────────

export interface Collection {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  createdAt: number;
  itemCount: number;
  previewImages: string[];
}

export async function getCollections(userId: string): Promise<Collection[]> {
  const db = sql();
  const rows = await db`
    SELECT c.id, c.user_id, c.name, c.emoji, c.created_at,
           COUNT(ci.item_id)::int AS item_count
    FROM collections c
    LEFT JOIN collection_items ci ON ci.collection_id = c.id
    WHERE c.user_id = ${userId}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  // Fetch preview images for each collection (first 3 items)
  const result: Collection[] = [];
  for (const r of rows) {
    const colId = r.id as string;
    const imgRows = await db`
      SELECT i.images FROM collection_items ci
      JOIN items i ON i.id = ci.item_id
      WHERE ci.collection_id = ${colId}
      ORDER BY ci.added_at DESC LIMIT 3
    `;
    const previews = imgRows.map(ir => {
      const imgs = typeof ir.images === 'string' ? JSON.parse(ir.images) : ir.images as string[];
      return imgs[0] ?? '';
    }).filter(Boolean);
    result.push({
      id: colId,
      userId: r.user_id as string,
      name: r.name as string,
      emoji: r.emoji as string,
      createdAt: Number(r.created_at),
      itemCount: Number(r.item_count),
      previewImages: previews,
    });
  }
  return result;
}

export async function createCollection(userId: string, name: string, emoji: string): Promise<Collection> {
  const db = sql();
  const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  await db`INSERT INTO collections (id, user_id, name, emoji, created_at) VALUES (${id}, ${userId}, ${name}, ${emoji}, ${now})`;
  return { id, userId, name, emoji, createdAt: now, itemCount: 0, previewImages: [] };
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM collections WHERE id = ${id} AND user_id = ${userId}`;
}

export async function addItemToCollection(collectionId: string, itemId: string): Promise<void> {
  const db = sql();
  await db`INSERT INTO collection_items (collection_id, item_id, added_at) VALUES (${collectionId}, ${itemId}, ${Date.now()}) ON CONFLICT (collection_id, item_id) DO NOTHING`;
}

export async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM collection_items WHERE collection_id = ${collectionId} AND item_id = ${itemId}`;
}

export async function getCollectionItems(collectionId: string): Promise<Item[]> {
  const db = sql();
  const rows = await db`
    SELECT i.* FROM items i
    JOIN collection_items ci ON i.id = ci.item_id
    WHERE ci.collection_id = ${collectionId}
    ORDER BY ci.added_at DESC
  `;
  return rows.map(rowToItem);
}

/** Returns the collection IDs that contain a given item (for the current user) */
export async function getItemCollections(userId: string, itemId: string): Promise<string[]> {
  const db = sql();
  const rows = await db`
    SELECT ci.collection_id FROM collection_items ci
    JOIN collections c ON c.id = ci.collection_id
    WHERE c.user_id = ${userId} AND ci.item_id = ${itemId}
  `;
  return rows.map(r => r.collection_id as string);
}

// ─── Undo swipe ───────────────────────────────────────────────────────────────

/** Removes a previously recorded swipe and corrects the like counter. */
export async function undoSwipe(userId: string, itemId: string): Promise<void> {
  const db = sql();
  const existing = await db`SELECT action FROM swipes WHERE user_id = ${userId} AND item_id = ${itemId} LIMIT 1`;
  if (!existing[0]) return;
  const action = existing[0].action as string;
  await db`DELETE FROM swipes WHERE user_id = ${userId} AND item_id = ${itemId}`;
  if (action === 'like' || action === 'superlike') {
    await db`UPDATE items SET likes = GREATEST(0, likes - 1) WHERE id = ${itemId}`;
  }
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

