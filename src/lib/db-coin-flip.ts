import { neon } from '@neondatabase/serverless';
import { CoinFlipOffer, CoinFlipStatus } from './db-types';

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

function rowToOffer(r: Record<string, unknown>): CoinFlipOffer {
  return {
    id: r.id as string,
    buyerId: r.buyer_id as string,
    sellerId: r.seller_id as string,
    itemId: r.item_id as string,
    itemPrice: Number(r.item_price),
    winAmount: Number(r.win_amount),
    lossAmount: Number(r.loss_amount),
    status: r.status as CoinFlipStatus,
    flipResult: (r.flip_result as 'win' | 'loss' | null) ?? null,
    stripePaymentIntentId: (r.stripe_payment_intent_id as string | null) ?? null,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    expiresAt: Number(r.expires_at),
  };
}

export async function createCoinFlipOffer(offer: CoinFlipOffer): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO coin_flip_offers
      (id, buyer_id, seller_id, item_id, item_price, win_amount, loss_amount,
       status, flip_result, stripe_payment_intent_id, created_at, updated_at, expires_at)
    VALUES
      (${offer.id}, ${offer.buyerId}, ${offer.sellerId}, ${offer.itemId},
       ${offer.itemPrice}, ${offer.winAmount}, ${offer.lossAmount},
       ${offer.status}, ${offer.flipResult}, ${offer.stripePaymentIntentId},
       ${offer.createdAt}, ${offer.updatedAt}, ${offer.expiresAt})
  `;
}

export async function getCoinFlipOfferById(id: string): Promise<CoinFlipOffer | null> {
  const db = sql();
  const rows = await db`SELECT * FROM coin_flip_offers WHERE id = ${id}`;
  return rows[0] ? rowToOffer(rows[0]) : null;
}

export async function updateCoinFlipOfferStatus(
  id: string,
  status: CoinFlipStatus,
  extra?: { flipResult?: 'win' | 'loss'; stripePaymentIntentId?: string },
): Promise<void> {
  const db = sql();
  const now = Date.now();
  if (extra?.flipResult !== undefined && extra?.stripePaymentIntentId !== undefined) {
    await db`
      UPDATE coin_flip_offers
      SET status = ${status}, flip_result = ${extra.flipResult},
          stripe_payment_intent_id = ${extra.stripePaymentIntentId}, updated_at = ${now}
      WHERE id = ${id}
    `;
  } else if (extra?.flipResult !== undefined) {
    await db`
      UPDATE coin_flip_offers
      SET status = ${status}, flip_result = ${extra.flipResult}, updated_at = ${now}
      WHERE id = ${id}
    `;
  } else {
    await db`UPDATE coin_flip_offers SET status = ${status}, updated_at = ${now} WHERE id = ${id}`;
  }
}

/** Updates status only if current status matches `fromStatus`. Returns true if updated. */
export async function updateCoinFlipOfferStatusConditional(
  id: string,
  fromStatus: CoinFlipStatus,
  toStatus: CoinFlipStatus,
  extra?: { flipResult?: 'win' | 'loss' },
): Promise<boolean> {
  const db = sql();
  const now = Date.now();
  if (extra?.flipResult !== undefined) {
    const rows = await db`
      UPDATE coin_flip_offers
      SET status = ${toStatus}, flip_result = ${extra.flipResult}, updated_at = ${now}
      WHERE id = ${id} AND status = ${fromStatus}
      RETURNING id
    `;
    return rows.length > 0;
  }
  const rows = await db`
    UPDATE coin_flip_offers
    SET status = ${toStatus}, updated_at = ${now}
    WHERE id = ${id} AND status = ${fromStatus}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Returns the number of active (non-declined, non-expired, non-cancelled) offers this calendar month. */
export async function getCoinFlipMonthCount(buyerId: string): Promise<number> {
  const db = sql();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const rows = await db`
    SELECT COUNT(*) AS c FROM coin_flip_offers
    WHERE buyer_id = ${buyerId}
      AND status NOT IN ('declined', 'expired', 'cancelled')
      AND created_at >= ${monthStart}
  `;
  return Number(rows[0]?.c ?? 0);
}

export async function getCoinFlipOffersByBuyer(buyerId: string): Promise<CoinFlipOffer[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM coin_flip_offers WHERE buyer_id = ${buyerId} ORDER BY created_at DESC LIMIT 20
  `;
  return rows.map(rowToOffer);
}

export async function getCoinFlipOffersBySeller(sellerId: string): Promise<CoinFlipOffer[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM coin_flip_offers WHERE seller_id = ${sellerId} AND status = 'pending' ORDER BY created_at DESC
  `;
  return rows.map(rowToOffer);
}

export async function incrementPaymentStrike(userId: string): Promise<number> {
  const db = sql();
  const rows = await db`
    UPDATE users
    SET payment_strikes = payment_strikes + 1
    WHERE id = ${userId}
    RETURNING payment_strikes
  `;
  return Number(rows[0]?.payment_strikes ?? 1);
}

export async function suspendUser(userId: string): Promise<void> {
  const db = sql();
  await db`UPDATE users SET account_status = 'suspended_pending_review' WHERE id = ${userId}`;
}

export async function setUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
  const db = sql();
  await db`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}`;
}
