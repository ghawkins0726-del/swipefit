/**
 * Database layer — Neon serverless Postgres.
 * Works in Vercel serverless functions and local dev (after `vercel env pull`).
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Item, SwipeRecord, UserProfile } from './types';
import { Offer, Notification, Message, Order, ConversationPreview } from './db-types';

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
      stripe_customer_id TEXT
    )
  `;
  // Migration: add premium columns to existing tables
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until BIGINT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
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
    return { id: r.id as string, name: r.name as string, avatar: r.avatar as string, bio: r.bio as string, createdAt: Number(r.created_at), totalLikes: r.total_likes as number, totalListings: r.total_listings as number, isPremium, premiumUntil };
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
  return { id: r.id as string, name: r.name as string, avatar: r.avatar as string, bio: r.bio as string, createdAt: Number(r.created_at), totalLikes: r.total_likes as number, totalListings: r.total_listings as number, isPremium, premiumUntil };
}

export async function updateUser(userId: string, data: { name?: string; bio?: string; avatar?: string }): Promise<void> {
  const db = sql();
  if (data.name !== undefined) await db`UPDATE users SET name = ${data.name} WHERE id = ${userId}`;
  if (data.bio !== undefined) await db`UPDATE users SET bio = ${data.bio} WHERE id = ${userId}`;
  if (data.avatar !== undefined) await db`UPDATE users SET avatar = ${data.avatar} WHERE id = ${userId}`;
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
