/**
 * Database layer — Neon serverless Postgres.
 * Works in Vercel serverless functions and local dev (after `vercel env pull`).
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Item, SwipeRecord, UserProfile } from './types';
import { Offer, Notification } from './db-types';

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
      total_listings INT DEFAULT 0
    )
  `;
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
  // Indexes (IF NOT EXISTS handled via CREATE INDEX … IF NOT EXISTS)
  await db`CREATE INDEX IF NOT EXISTS idx_swipes_user ON swipes(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_swipes_item ON swipes(item_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id)`;
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
export async function getOrCreateUser(userId: string): Promise<UserProfile> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  if (rows[0]) {
    const r = rows[0];
    return { id: r.id as string, name: r.name as string, avatar: r.avatar as string, bio: r.bio as string, createdAt: Number(r.created_at), totalLikes: r.total_likes as number, totalListings: r.total_listings as number };
  }
  const user: UserProfile = {
    id: userId, name: 'Guest',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    bio: '', createdAt: Date.now(), totalLikes: 0, totalListings: 0,
  };
  await db`INSERT INTO users VALUES (${user.id}, ${user.name}, ${user.avatar}, ${user.bio}, ${user.createdAt}, 0, 0) ON CONFLICT (id) DO NOTHING`;
  return user;
}

export async function updateUser(userId: string, data: { name?: string; bio?: string }): Promise<void> {
  const db = sql();
  if (data.name !== undefined) await db`UPDATE users SET name = ${data.name} WHERE id = ${userId}`;
  if (data.bio !== undefined) await db`UPDATE users SET bio = ${data.bio} WHERE id = ${userId}`;
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
  const recentSwipes: { day: string; count: number }[] = [];
  return { items, totalViews, totalLikes, totalSold, totalRevenue, activeListings, recentSwipes, conversionRate };
}

// ─── Offers ───────────────────────────────────────────────────────────────────
export async function createOffer(offer: Offer): Promise<void> {
  const db = sql();
  await db`INSERT INTO offers VALUES (${offer.id}, ${offer.buyerId}, ${offer.sellerId}, ${offer.itemId}, ${offer.amount}, ${offer.message}, ${offer.status}, ${offer.createdAt})`;
  const item = await getItemById(offer.itemId);
  await createNotification({
    id: `notif_${Date.now()}`,
    userId: offer.sellerId,
    type: 'offer',
    title: `New offer on ${item?.title ?? 'your item'}`,
    body: `Someone offered $${offer.amount}`,
    payload: JSON.stringify({ offerId: offer.id, itemId: offer.itemId }),
    createdAt: Date.now(),
  });
}

export async function getOffersByUser(userId: string, role: 'buyer' | 'seller'): Promise<(Offer & { item: Item | null })[]> {
  const db = sql();
  const col = role === 'buyer' ? 'buyer_id' : 'seller_id';
  const rows = role === 'buyer'
    ? await db`SELECT * FROM offers WHERE buyer_id = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM offers WHERE seller_id = ${userId} ORDER BY created_at DESC`;

  return Promise.all(rows.map(async r => ({
    id: r.id as string, buyerId: r.buyer_id as string, sellerId: r.seller_id as string,
    itemId: r.item_id as string, amount: r.amount as number, message: r.message as string,
    status: r.status as Offer['status'], createdAt: Number(r.created_at),
    item: await getItemById(r.item_id as string),
  })));
}

export async function updateOfferStatus(offerId: string, status: 'accepted' | 'declined'): Promise<void> {
  const db = sql();
  await db`UPDATE offers SET status = ${status} WHERE id = ${offerId}`;
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

// ─── DB init (called from seed route) ────────────────────────────────────────
export async function ensureSchema(): Promise<void> {
  await initDb();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
