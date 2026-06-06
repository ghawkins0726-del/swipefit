# Coin Flip Offer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers send sellers a 50/50 coin flip offer — win pays 50% of item price, lose pays 150% — with a 3/month limit, payment guarantee via saved card, and a strike/suspension system for non-payment.

**Architecture:** New `coin_flip_offers` table with a 7-state machine (pending → accepted/declined/expired/cancelled → flipped → completed/payment_failed). Schema migrations added to the existing `initDb()` in `db.ts`. All coin flip DB functions live in a new `src/lib/db-coin-flip.ts` to keep db.ts from growing further. Stripe off-session PaymentIntents charge the buyer's saved card server-side at flip time.

**Tech Stack:** Next.js 16.2.6 (check `node_modules/next/dist/docs/` before writing any page/route), Neon serverless Postgres, Clerk auth, Stripe (server-side SDK `stripe@^22` + new client `@stripe/react-stripe-js`), Framer Motion (already installed), Tailwind CSS 4, TypeScript.

**CRITICAL — Read before every file you create or modify:**
```
cat node_modules/next/dist/docs/01-app-router.md  # or whichever guide matches your file
```
This project uses non-standard Next.js 16.2.6. APIs, file conventions, and route handler exports may differ from what you know.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/types.ts` | Modify | Add `paymentStrikes`, `accountStatus` to `UserProfile` |
| `src/lib/db-types.ts` | Modify | Add `CoinFlipOffer` interface |
| `src/lib/db.ts` | Modify | Add schema migrations; update `getOrCreateUser` to read new user fields |
| `src/lib/db-coin-flip.ts` | Create | All coin flip DB CRUD functions |
| `src/app/api/stripe/setup-intent/route.ts` | Create | Create Stripe SetupIntent for saving card |
| `src/app/api/stripe/payment-methods/route.ts` | Create | List buyer's saved cards |
| `src/app/api/coin-flip/create/route.ts` | Create | Buyer sends coin flip offer |
| `src/app/api/coin-flip/[id]/route.ts` | Create | GET offer state |
| `src/app/api/coin-flip/[id]/respond/route.ts` | Create | Seller accepts or declines |
| `src/app/api/coin-flip/[id]/flip/route.ts` | Create | Buyer triggers the flip + charges card |
| `src/app/api/coin-flip/remaining/route.ts` | Create | Buyer's remaining flips this month |
| `src/components/SaveCardModal.tsx` | Create | Stripe Elements card save bottom sheet |
| `src/components/CoinFlipModal.tsx` | Create | 3-step offer creation bottom sheet |
| `src/app/coin-flip/[id]/page.tsx` | Create | Full-screen flip page |
| `src/app/item/[id]/page.tsx` | Modify | Add "Coin Flip" button alongside Buy/Offer |
| `src/components/SwipeFeed.tsx` | Modify | Add coin flip action button to feed |
| `src/components/MessageThread.tsx` | Modify | Add coin flip action in thread |

---

## Task 1: Install Stripe React + add types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db-types.ts`

- [ ] **Step 1.1: Install Stripe client packages**

```bash
cd /path/to/swipefit
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 1.2: Add `CoinFlipOffer` interface to `src/lib/db-types.ts`**

Append to the end of the file:

```typescript
export type CoinFlipStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'flipped'
  | 'completed'
  | 'payment_failed';

export interface CoinFlipOffer {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  itemPrice: number;
  winAmount: number;   // itemPrice * 0.50
  lossAmount: number;  // itemPrice * 1.50
  status: CoinFlipStatus;
  flipResult: 'win' | 'loss' | null;
  stripePaymentIntentId: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;   // createdAt + 72h
}
```

- [ ] **Step 1.3: Add `paymentStrikes` and `accountStatus` to `UserProfile` in `src/lib/types.ts`**

Locate the `UserProfile` interface (line 31) and add two fields after `preferredSizes`:

```typescript
  /** Number of failed coin flip payments. Three strikes suspends account. */
  paymentStrikes?: number;
  /** 'active' | 'suspended_pending_review' */
  accountStatus?: string;
```

- [ ] **Step 1.4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from the type additions.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/types.ts src/lib/db-types.ts package.json package-lock.json
git commit -m "feat(coin-flip): add types and Stripe React dependency"
```

---

## Task 2: DB schema migrations

**Files:**
- Modify: `src/lib/db.ts` (lines ~49–340, the `_runInitDb` function)

- [ ] **Step 2.1: Add coin_flip_offers table + user columns to `_runInitDb`**

Open `src/lib/db.ts` and locate the bottom of the `_runInitDb` function (currently ends around line 340 with the last `ALTER TABLE` statements). Add the following **before** the closing `}` of `_runInitDb`:

```typescript
  // ── Coin flip ────────────────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS coin_flip_offers (
      id                        TEXT PRIMARY KEY,
      buyer_id                  TEXT NOT NULL,
      seller_id                 TEXT NOT NULL,
      item_id                   TEXT NOT NULL,
      item_price                NUMERIC(10,2) NOT NULL,
      win_amount                NUMERIC(10,2) NOT NULL,
      loss_amount               NUMERIC(10,2) NOT NULL,
      status                    TEXT NOT NULL DEFAULT 'pending',
      flip_result               TEXT,
      stripe_payment_intent_id  TEXT,
      created_at                BIGINT NOT NULL,
      updated_at                BIGINT NOT NULL,
      expires_at                BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_coin_flip_buyer  ON coin_flip_offers(buyer_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_coin_flip_seller ON coin_flip_offers(seller_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_coin_flip_item   ON coin_flip_offers(item_id)`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_strikes INT NOT NULL DEFAULT 0`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status  TEXT NOT NULL DEFAULT 'active'`;
```

- [ ] **Step 2.2: Update `getOrCreateUser` to read new fields**

Find the `getOrCreateUser` function (around line 511). In the `if (rows[0])` branch, the return object currently ends with `stripeAccountReady`. Add the two new fields:

```typescript
      paymentStrikes: (r.payment_strikes as number) ?? 0,
      accountStatus: (r.account_status as string) ?? 'active',
```

Also update the `SELECT` return shape so callers can read them. The existing `SELECT * FROM users` already fetches all columns, so just adding the fields to the returned object is sufficient.

- [ ] **Step 2.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(coin-flip): add coin_flip_offers schema migration + user strike columns"
```

---

## Task 3: DB functions — `src/lib/db-coin-flip.ts`

**Files:**
- Create: `src/lib/db-coin-flip.ts`

- [ ] **Step 3.1: Create the file with all coin flip DB functions**

```typescript
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
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/db-coin-flip.ts
git commit -m "feat(coin-flip): add DB functions in db-coin-flip.ts"
```

---

## Task 4: Stripe setup-intent and payment-methods routes

**Files:**
- Create: `src/app/api/stripe/setup-intent/route.ts`
- Create: `src/app/api/stripe/payment-methods/route.ts`

**Before writing:** Read `node_modules/next/dist/docs/` to confirm the route handler export pattern for this version.

- [ ] **Step 4.1: Create `src/app/api/stripe/setup-intent/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';
import { setUserStripeCustomerId } from '@/lib/db-coin-flip';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  const user = await getOrCreateUser(userId);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const customer = await stripe.customers.create({ email: email ?? undefined });
    customerId = customer.id;
    await setUserStripeCustomerId(userId, customerId);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
```

- [ ] **Step 4.2: Create `src/app/api/stripe/payment-methods/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!user.stripeCustomerId) return NextResponse.json({ paymentMethods: [] });

  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: 'card',
  });

  return NextResponse.json({
    paymentMethods: pms.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '????',
    })),
  });
}
```

- [ ] **Step 4.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4.4: Manual smoke test (dev server must be running)**

```bash
# Start dev server in another terminal: npm run dev
curl -s -X POST http://localhost:3000/api/stripe/setup-intent \
  -H "Cookie: <your-dev-session-cookie>" | jq .
# Expected: { "clientSecret": "seti_..." }

curl -s http://localhost:3000/api/stripe/payment-methods \
  -H "Cookie: <your-dev-session-cookie>" | jq .
# Expected: { "paymentMethods": [...] }
```

- [ ] **Step 4.5: Commit**

```bash
git add src/app/api/stripe/setup-intent/route.ts src/app/api/stripe/payment-methods/route.ts
git commit -m "feat(coin-flip): add setup-intent and payment-methods Stripe routes"
```

---

## Task 5: `POST /api/coin-flip/create`

**Files:**
- Create: `src/app/api/coin-flip/create/route.ts`

**Before writing:** Read `node_modules/next/dist/docs/` for route handler conventions.

- [ ] **Step 5.1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, getOrCreateUser, sendMessage, createNotification } from '@/lib/db';
import {
  createCoinFlipOffer,
  getCoinFlipMonthCount,
} from '@/lib/db-coin-flip';
import { getStripe } from '@/lib/stripe';

const MONTHLY_LIMIT = 3;
const EXPIRE_MS = 72 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const buyer = await getOrCreateUser(buyerId);
  if (buyer.accountStatus === 'suspended_pending_review') {
    return NextResponse.json({ error: 'Your account is suspended pending review.' }, { status: 403 });
  }

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

  const item = await getItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (item.sellerId === buyerId) return NextResponse.json({ error: 'Cannot coin flip your own item' }, { status: 400 });

  const seller = await getOrCreateUser(item.sellerId);
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({ error: 'Seller has not set up payouts yet', code: 'seller_not_onboarded' }, { status: 409 });
  }

  // Check buyer has a saved payment method
  if (!buyer.stripeCustomerId) {
    return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  }
  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({ customer: buyer.stripeCustomerId, type: 'card' });
  if (!pms.data.length) {
    return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  }

  // Check monthly limit
  const used = await getCoinFlipMonthCount(buyerId);
  if (used >= MONTHLY_LIMIT) {
    return NextResponse.json({ error: 'Monthly coin flip limit reached (3/month)', code: 'limit_reached' }, { status: 429 });
  }

  const clerkUser = await currentUser();
  const buyerName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Wove User';

  const now = Date.now();
  const offerId = uuid();
  const winAmount  = Math.round(item.price * 0.50 * 100) / 100;
  const lossAmount = Math.round(item.price * 1.50 * 100) / 100;

  await createCoinFlipOffer({
    id: offerId,
    buyerId,
    sellerId: item.sellerId,
    itemId,
    itemPrice: item.price,
    winAmount,
    lossAmount,
    status: 'pending',
    flipResult: null,
    stripePaymentIntentId: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + EXPIRE_MS,
  });

  await sendMessage({
    id: uuid(),
    senderId: buyerId,
    senderName: buyerName,
    receiverId: item.sellerId,
    itemId,
    text: `🪙 ${buyerName} sent you a Coin Flip offer on "${item.title}" — if they win: $${winAmount}, if they lose: $${lossAmount}. You have 72h to respond.`,
    read: false,
    createdAt: now,
    replyToId: null,
    replyToText: null,
    replyToSender: null,
    reactions: {},
  });

  await createNotification({
    id: `notif_${now}_${uuid().slice(0, 8)}`,
    userId: item.sellerId,
    type: 'coin_flip_received',
    title: `Coin Flip offer on "${item.title}"`,
    body: `${buyerName} wants to flip — they pay $${winAmount} or $${lossAmount}`,
    payload: JSON.stringify({ coinFlipId: offerId, itemId, buyerId, winAmount, lossAmount }),
    createdAt: now,
  });

  return NextResponse.json({ coinFlipId: offerId });
}
```

- [ ] **Step 5.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5.3: Commit**

```bash
git add src/app/api/coin-flip/create/route.ts
git commit -m "feat(coin-flip): add POST /api/coin-flip/create route"
```

---

## Task 6: `POST /api/coin-flip/[id]/respond` and `GET /api/coin-flip/[id]`

**Files:**
- Create: `src/app/api/coin-flip/[id]/respond/route.ts`
- Create: `src/app/api/coin-flip/[id]/route.ts`

- [ ] **Step 6.1: Create `src/app/api/coin-flip/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinFlipOfferById } from '@/lib/db-coin-flip';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const offer = await getCoinFlipOfferById(params.id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (offer.buyerId !== userId && offer.sellerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(offer);
}
```

- [ ] **Step 6.2: Create `src/app/api/coin-flip/[id]/respond/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, sendMessage, createNotification } from '@/lib/db';
import { getCoinFlipOfferById, updateCoinFlipOfferStatus } from '@/lib/db-coin-flip';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const offer = await getCoinFlipOfferById(params.id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (offer.sellerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (offer.status !== 'pending') return NextResponse.json({ error: 'Offer already resolved' }, { status: 409 });

  // Auto-expire if the 72h window has passed
  if (Date.now() > offer.expiresAt) {
    await updateCoinFlipOfferStatus(params.id, 'expired');
    return NextResponse.json({ error: 'Offer has expired', expired: true }, { status: 410 });
  }

  const { accepted } = await req.json() as { accepted: boolean };
  const now = Date.now();
  const item = await getItemById(offer.itemId);
  const itemTitle = item?.title ?? 'an item';

  if (accepted) {
    // Guard: item must still be available
    if (item?.sold) {
      await updateCoinFlipOfferStatus(params.id, 'declined');
      return NextResponse.json({ error: 'Item is no longer available', declined: true }, { status: 409 });
    }

    await updateCoinFlipOfferStatus(params.id, 'accepted');

    await sendMessage({
      id: uuid(),
      senderId: userId,
      senderName: 'Seller',
      receiverId: offer.buyerId,
      itemId: offer.itemId,
      text: `✅ Your Coin Flip offer on "${itemTitle}" was accepted! Open the app to flip.`,
      read: false,
      createdAt: now,
      replyToId: null,
      replyToText: null,
      replyToSender: null,
      reactions: {},
    });

    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'coin_flip_accepted',
      title: 'Coin Flip accepted! 🪙',
      body: `Seller accepted your flip on "${itemTitle}". Time to flip!`,
      payload: JSON.stringify({ coinFlipId: params.id, itemId: offer.itemId }),
      createdAt: now,
    });
  } else {
    await updateCoinFlipOfferStatus(params.id, 'declined');

    await sendMessage({
      id: uuid(),
      senderId: userId,
      senderName: 'Seller',
      receiverId: offer.buyerId,
      itemId: offer.itemId,
      text: `❌ Your Coin Flip offer on "${itemTitle}" was declined. Your slot has been returned.`,
      read: false,
      createdAt: now,
      replyToId: null,
      replyToText: null,
      replyToSender: null,
      reactions: {},
    });

    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.buyerId,
      type: 'coin_flip_declined',
      title: 'Coin Flip declined',
      body: `Your flip on "${itemTitle}" was declined. Slot returned.`,
      payload: JSON.stringify({ coinFlipId: params.id }),
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6.4: Commit**

```bash
git add src/app/api/coin-flip/[id]/route.ts src/app/api/coin-flip/[id]/respond/route.ts
git commit -m "feat(coin-flip): add GET offer + POST respond routes"
```

---

## Task 7: `GET /api/coin-flip/remaining` + `POST /api/coin-flip/[id]/flip`

**Files:**
- Create: `src/app/api/coin-flip/remaining/route.ts`
- Create: `src/app/api/coin-flip/[id]/flip/route.ts`

- [ ] **Step 7.1: Create `src/app/api/coin-flip/remaining/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinFlipMonthCount } from '@/lib/db-coin-flip';

const MONTHLY_LIMIT = 3;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const used = await getCoinFlipMonthCount(userId);
  const remaining = Math.max(0, MONTHLY_LIMIT - used);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetsAt = nextMonth.getTime();

  return NextResponse.json({ remaining, used, resetsAt });
}
```

- [ ] **Step 7.2: Create `src/app/api/coin-flip/[id]/flip/route.ts`**

This is the core logic — it generates the result, charges the card, creates the order, and handles payment failure.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuid } from 'uuid';
import { getItemById, getOrCreateUser, createOrder, sendMessage, createNotification } from '@/lib/db';
import {
  getCoinFlipOfferById,
  updateCoinFlipOfferStatus,
  incrementPaymentStrike,
  suspendUser,
} from '@/lib/db-coin-flip';
import { getStripe } from '@/lib/stripe';
import { Order } from '@/lib/db-types';

const PLATFORM_FEE_PCT = 0.10;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId: buyerId } = await auth();
  if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const offer = await getCoinFlipOfferById(params.id);
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (offer.buyerId !== buyerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (offer.status !== 'accepted') return NextResponse.json({ error: 'Offer not in accepted state' }, { status: 409 });

  const [buyer, seller, item] = await Promise.all([
    getOrCreateUser(buyerId),
    getOrCreateUser(offer.sellerId),
    getItemById(offer.itemId),
  ]);

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.sold) return NextResponse.json({ error: 'Item already sold' }, { status: 409 });
  if (!seller.stripeAccountId || !seller.stripeAccountReady) {
    return NextResponse.json({ error: 'Seller payout not ready' }, { status: 409 });
  }

  // Get buyer's saved payment method
  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({ customer: buyer.stripeCustomerId!, type: 'card' });
  if (!pms.data.length) return NextResponse.json({ error: 'No payment method on file', code: 'no_payment_method' }, { status: 422 });
  const pmId = pms.data[0].id;

  // Generate flip result server-side
  const flipResult: 'win' | 'loss' = Math.random() < 0.5 ? 'win' : 'loss';
  const chargeAmount = flipResult === 'win' ? offer.winAmount : offer.lossAmount;
  const amountCents = Math.round(chargeAmount * 100);
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);

  // Mark as flipped (result known, payment in progress)
  await updateCoinFlipOfferStatus(params.id, 'flipped', { flipResult });

  // Attempt off-session charge
  let paymentIntentId: string;
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: buyer.stripeCustomerId!,
      payment_method: pmId,
      confirm: true,
      off_session: true,
      application_fee_amount: feeCents,
      transfer_data: { destination: seller.stripeAccountId },
    });
    paymentIntentId = pi.id;
  } catch (err) {
    // Payment failed — increment strike, potentially suspend
    const strikes = await incrementPaymentStrike(buyerId);
    await updateCoinFlipOfferStatus(params.id, 'payment_failed', { flipResult });

    const now = Date.now();
    const strikeMsg = strikes >= 3
      ? `⚠️ Payment failed. This is strike ${strikes} of 3. Your account has been suspended pending review. Contact support.`
      : `⚠️ Your payment of $${chargeAmount} failed. This is strike ${strikes} of 3. Three strikes results in indefinite account suspension. Update your card and try again.`;

    if (strikes >= 3) await suspendUser(buyerId);

    await sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: buyerId, itemId: offer.itemId,
      text: strikeMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    });
    await createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: buyerId, type: 'coin_flip_payment_failed',
      title: 'Payment failed',
      body: strikeMsg,
      payload: JSON.stringify({ coinFlipId: params.id, strikes }),
      createdAt: now,
    });

    return NextResponse.json({
      error: 'Payment failed',
      code: 'payment_failed',
      flipResult,
      chargeAmount,
      strikes,
    }, { status: 402 });
  }

  // Payment succeeded — create order, mark completed
  const now = Date.now();
  const order: Order = {
    id: uuid(),
    buyerId,
    sellerId: offer.sellerId,
    itemId: offer.itemId,
    amount: chargeAmount,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };
  await createOrder(order);
  await updateCoinFlipOfferStatus(params.id, 'completed', { flipResult, stripePaymentIntentId: paymentIntentId });

  // Notify both parties
  const resultMsg = flipResult === 'win'
    ? `🪙 Coin Flip result: Buyer won! Paid $${offer.winAmount} for "${item.title}".`
    : `💸 Coin Flip result: Buyer lost! Paid $${offer.lossAmount} for "${item.title}".`;

  await Promise.all([
    sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: buyerId, itemId: offer.itemId,
      text: resultMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    }),
    sendMessage({
      id: uuid(), senderId: 'system', senderName: 'Wove',
      receiverId: offer.sellerId, itemId: offer.itemId,
      text: resultMsg, read: false, createdAt: now,
      replyToId: null, replyToText: null, replyToSender: null, reactions: {},
    }),
    createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: buyerId, type: 'coin_flip_result',
      title: flipResult === 'win' ? '🪙 You won the flip!' : '💸 You lost the flip',
      body: flipResult === 'win' ? `Paid $${offer.winAmount} — great deal!` : `Paid $${offer.lossAmount}`,
      payload: JSON.stringify({ coinFlipId: params.id, orderId: order.id, flipResult }),
      createdAt: now,
    }),
    createNotification({
      id: `notif_${now}_${uuid().slice(0, 8)}`,
      userId: offer.sellerId, type: 'coin_flip_result',
      title: 'Coin flip completed',
      body: flipResult === 'win' ? `Buyer paid $${offer.winAmount}` : `Buyer paid $${offer.lossAmount}`,
      payload: JSON.stringify({ coinFlipId: params.id, orderId: order.id, flipResult }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ flipResult, chargeAmount, orderId: order.id });
}
```

- [ ] **Step 7.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7.4: Commit**

```bash
git add src/app/api/coin-flip/remaining/route.ts src/app/api/coin-flip/[id]/flip/route.ts
git commit -m "feat(coin-flip): add remaining + flip routes (core payment logic)"
```

---

## Task 8: `SaveCardModal` component

**Files:**
- Create: `src/components/SaveCardModal.tsx`

- [ ] **Step 8.1: Create the component**

```tsx
'use client';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SaveCardModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function CardForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');

    const res = await fetch('/api/stripe/setup-intent', { method: 'POST' });
    const { clientSecret } = await res.json();

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });

    if (result.error) {
      setError(result.error.message ?? 'Card save failed');
      setSaving(false);
    } else {
      onSaved();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <CardElement options={{
          style: {
            base: { color: '#ffffff', fontSize: '15px', '::placeholder': { color: 'rgba(255,255,255,0.35)' } },
            invalid: { color: '#E63946' },
          },
        }} />
      </div>
      {error && <p className="text-[#E63946] text-xs font-semibold px-1">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Card'}
      </button>
      <button onClick={onClose} className="text-xs text-white/30 font-semibold tracking-wide">
        Cancel
      </button>
    </div>
  );
}

export default function SaveCardModal({ open, onClose, onSaved }: SaveCardModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#151515] border border-white/8 rounded-t-3xl p-6 pb-10">
        <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-5" />
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
          <X size={14} className="text-white/50" />
        </button>
        <h2 className="text-white font-black text-lg mb-1">Add Payment Card</h2>
        <p className="text-white/40 text-xs mb-5">Required to send coin flip offers.</p>
        <Elements stripe={stripePromise}>
          <CardForm onClose={onClose} onSaved={() => { onClose(); onSaved(); }} />
        </Elements>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8.3: Commit**

```bash
git add src/components/SaveCardModal.tsx
git commit -m "feat(coin-flip): add SaveCardModal with Stripe Elements"
```

---

## Task 9: `CoinFlipModal` — 3-step bottom sheet

**Files:**
- Create: `src/components/CoinFlipModal.tsx`

- [ ] **Step 9.1: Create the component**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Item } from '@/lib/types';
import SaveCardModal from './SaveCardModal';

interface CoinFlipModalProps {
  item: Item;
  open: boolean;
  onClose: () => void;
  onSent?: (coinFlipId: string) => void;
}

type Step = 1 | 2 | 3;

export default function CoinFlipModal({ item, open, onClose, onSent }: CoinFlipModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; brand: string; last4: string }[]>([]);
  const [showSaveCard, setShowSaveCard] = useState(false);

  const winAmount  = Math.round(item.price * 0.50 * 100) / 100;
  const lossAmount = Math.round(item.price * 1.50 * 100) / 100;

  useEffect(() => {
    if (!open) { setStep(1); setAcknowledged(false); setError(''); return; }
    Promise.all([
      fetch('/api/coin-flip/remaining').then(r => r.json()),
      fetch('/api/stripe/payment-methods').then(r => r.json()),
    ]).then(([rem, pms]) => {
      setRemaining(rem.remaining ?? 0);
      setPaymentMethods(pms.paymentMethods ?? []);
    });
  }, [open]);

  const handleSend = async () => {
    setSending(true);
    setError('');
    const res = await fetch('/api/coin-flip/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      if (data.code === 'no_payment_method') { setShowSaveCard(true); return; }
      setError(data.error ?? 'Something went wrong');
      return;
    }
    setStep(3);
    onSent?.(data.coinFlipId);
  };

  if (!open) return null;

  const pm = paymentMethods[0];
  const hasPm = !!pm;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              className="relative bg-[#151515] border border-white/8 rounded-t-3xl p-6 pb-10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-5" />
              <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <X size={14} className="text-white/50" />
              </button>

              {/* Step dots */}
              <div className="flex gap-1.5 mb-4">
                {([1, 2, 3] as Step[]).map(s => (
                  <div key={s} className={`flex-1 h-0.5 rounded-full transition-colors ${s <= step ? 'bg-[#FF3B47]' : 'bg-white/10'}`} />
                ))}
              </div>

              {/* ── Step 1: Overview ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-[#FF3B47] mb-1">Step 1 of 3</p>
                    <h2 className="text-white font-black text-xl">Coin Flip Offer</h2>
                    <p className="text-white/40 text-xs mt-0.5">Send @{item.sellerName ?? 'seller'} a 50/50 challenge</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#00C851]/10 border border-[#00C851]/22 rounded-2xl p-3 text-center">
                      <p className="text-[8px] font-black tracking-widest uppercase text-[#00C851] mb-1">🪙 You win</p>
                      <p className="text-white font-black text-xl">${winAmount}</p>
                      <p className="text-white/35 text-[9px] mt-0.5">50% off</p>
                    </div>
                    <div className="flex-1 bg-[#E63946]/10 border border-[#E63946]/22 rounded-2xl p-3 text-center">
                      <p className="text-[8px] font-black tracking-widest uppercase text-[#E63946] mb-1">💸 You lose</p>
                      <p className="text-white font-black text-xl">${lossAmount}</p>
                      <p className="text-white/35 text-[9px] mt-0.5">+50% added</p>
                    </div>
                  </div>

                  {/* Card on file */}
                  <div className="flex items-center gap-3 bg-white/4 border border-white/7 rounded-2xl p-3">
                    <span className="text-lg">💳</span>
                    {hasPm
                      ? <p className="text-white/60 text-xs">Charged to <strong className="text-white">{pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ••••{pm.last4}</strong> if flip resolves</p>
                      : <p className="text-[#FF3B47] text-xs font-semibold">No card on file — <button onClick={() => setShowSaveCard(true)} className="underline">add one</button></p>
                    }
                  </div>

                  {/* Remaining flips */}
                  {remaining !== null && (
                    <div className="flex items-center gap-2 self-center bg-white/4 border border-white/7 rounded-full px-3 py-1.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < (3 - remaining) ? 'bg-white/12' : 'bg-[#FF3B47]'}`} />
                        ))}
                      </div>
                      <span className="text-white/40 text-[10px] font-bold">{remaining} flip{remaining !== 1 ? 's' : ''} remaining this month</span>
                    </div>
                  )}

                  {error && <p className="text-[#E63946] text-xs font-semibold">{error}</p>}

                  <button
                    onClick={() => hasPm ? setStep(2) : setShowSaveCard(true)}
                    disabled={remaining === 0}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-40"
                  >
                    {remaining === 0 ? 'Limit reached (3/month)' : 'Next →'}
                  </button>
                </div>
              )}

              {/* ── Step 2: Payment warning ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-[#E63946] mb-1">⚠ Step 2 of 3 — Payment Obligation</p>
                    <h2 className="text-white font-black text-lg">You must pay if you lose.</h2>
                  </div>

                  <div className="bg-[#E63946]/8 border border-[#E63946]/20 rounded-2xl p-4 text-sm text-white/75 leading-relaxed">
                    If you lose this flip, <strong className="text-white">${lossAmount} will be charged</strong> to your {pm ? `${pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ••••${pm.last4}` : 'card on file'}.
                    Declining payment is a violation of Wove's terms.<br /><br />
                    <span className="text-[#E63946] font-bold">3 non-payment strikes = indefinite account suspension.</span>
                  </div>

                  {/* Acknowledgement checkbox */}
                  <button
                    onClick={() => setAcknowledged(v => !v)}
                    className="flex items-start gap-3 bg-white/3 border border-white/7 rounded-2xl p-3 text-left"
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${acknowledged ? 'bg-[#00C851] border-[#00C851]' : 'border-white/25 bg-white/5'}`}>
                      {acknowledged && <span className="text-white text-xs font-black">✓</span>}
                    </div>
                    <p className="text-white/55 text-xs leading-relaxed">
                      I understand I am obligated to pay <strong className="text-white">${lossAmount}</strong> if I lose this coin flip.
                    </p>
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!acknowledged}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirm & Continue →
                  </button>
                  <button onClick={() => setStep(1)} className="text-xs text-white/30 font-semibold tracking-wide">← Back</button>
                </div>
              )}

              {/* ── Step 3: Send / Pending ── */}
              {step === 3 && !sending && !error && (
                <div className="flex flex-col items-center gap-5 py-4">
                  <p className="text-[9px] font-black tracking-widest uppercase text-[#FF3B47]">Step 3 of 3</p>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#FF3B47] to-[#E63946] flex items-center justify-center text-2xl font-black text-white shadow-[0_0_32px_rgba(255,59,71,0.4)]">
                    🪙
                  </div>
                  <div className="text-center">
                    <h2 className="text-white font-black text-xl mb-1">Send Coin Flip Offer</h2>
                    <p className="text-white/40 text-xs">Seller has 72h to respond</p>
                  </div>
                  {error && <p className="text-[#E63946] text-xs font-semibold">{error}</p>}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest"
                  >
                    Send Offer
                  </button>
                  <button onClick={onClose} className="text-xs text-white/30 font-semibold">Cancel</button>
                </div>
              )}

              {sending && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF3B47]/30 border-t-[#FF3B47] animate-spin" />
                  <p className="text-white/40 text-sm font-semibold">Sending offer…</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveCardModal
        open={showSaveCard}
        onClose={() => setShowSaveCard(false)}
        onSaved={() => {
          setShowSaveCard(false);
          fetch('/api/stripe/payment-methods').then(r => r.json()).then(d => setPaymentMethods(d.paymentMethods ?? []));
        }}
      />
    </>
  );
}
```

- [ ] **Step 9.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9.3: Commit**

```bash
git add src/components/CoinFlipModal.tsx
git commit -m "feat(coin-flip): add CoinFlipModal 3-step bottom sheet"
```

---

## Task 10: `/coin-flip/[id]` flip page

**Files:**
- Create: `src/app/coin-flip/[id]/page.tsx`

**Before writing:** Check `node_modules/next/dist/docs/` for the correct page component signature and `params` typing in this Next.js version.

- [ ] **Step 10.1: Create the flip page**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoinFlipOffer } from '@/lib/db-types';

type FlipState = 'idle' | 'flipping' | 'result';

export default function CoinFlipPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [offer, setOffer] = useState<CoinFlipOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipState, setFlipState] = useState<FlipState>('idle');
  const [result, setResult] = useState<{ flipResult: 'win' | 'loss'; chargeAmount: number; orderId: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/coin-flip/${params.id}`)
      .then(r => r.json())
      .then(d => { setOffer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleFlip = async () => {
    setFlipState('flipping');
    setError('');

    const res = await fetch(`/api/coin-flip/${params.id}/flip`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      setFlipState('idle');
      setError(data.error ?? 'Something went wrong');
      return;
    }

    // Let the animation play for 2.5s then reveal
    setTimeout(() => {
      setResult(data);
      setFlipState('result');
    }, 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF3B47]/30 border-t-[#FF3B47] animate-spin" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">Offer not found.</p>
      </div>
    );
  }

  if (offer.status !== 'accepted' && !result) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white font-black text-lg text-center">
          {offer.status === 'pending' ? 'Waiting for seller to accept…' :
           offer.status === 'completed' ? 'This flip is already completed.' :
           `Offer status: ${offer.status}`}
        </p>
        <button onClick={() => router.back()} className="text-white/40 text-sm font-semibold underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-5 pb-12 pt-14 text-white">
      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 ${result.flipResult === 'win' ? 'bg-[#00C851]/15' : 'bg-[#E63946]/15'}`}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <p className="text-7xl mb-4">{result.flipResult === 'win' ? '🪙' : '💸'}</p>
              <h1 className={`font-black text-4xl mb-2 ${result.flipResult === 'win' ? 'text-[#00C851]' : 'text-[#E63946]'}`}>
                {result.flipResult === 'win' ? 'You Win!' : 'You Lose'}
              </h1>
              <p className="text-white/70 text-lg font-semibold mb-8">
                ${result.chargeAmount} {result.flipResult === 'win' ? 'charged — great deal!' : 'charged to your card'}
              </p>
              <button
                onClick={() => router.push(`/orders/${result.orderId}`)}
                className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest"
              >
                View Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-6">Coin Flip</p>

      {/* Item card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/8 rounded-2xl p-3 flex items-center gap-3 mb-6">
        {offer.itemId && (
          <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center text-xl flex-shrink-0">🛍</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate">Item</p>
          <p className="text-white/40 text-xs">Original price: ${offer.itemPrice}</p>
        </div>
      </div>

      {/* Win / Lose amounts */}
      <div className="flex gap-2 w-full max-w-sm mb-6">
        <div className="flex-1 bg-[#00C851]/10 border border-[#00C851]/22 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black tracking-widest uppercase text-[#00C851] mb-1">🪙 Win</p>
          <p className="text-white font-black text-xl">${offer.winAmount}</p>
          <p className="text-white/35 text-[9px] mt-0.5">50% off</p>
        </div>
        <div className="flex-1 bg-[#E63946]/10 border border-[#E63946]/22 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black tracking-widest uppercase text-[#E63946] mb-1">💸 Lose</p>
          <p className="text-white font-black text-xl">${offer.lossAmount}</p>
          <p className="text-white/35 text-[9px] mt-0.5">+50% added</p>
        </div>
      </div>

      {/* Coin */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-40 h-40 rounded-full bg-[#FF3B47]/15 blur-2xl" />
        <motion.div
          animate={flipState === 'flipping' ? { rotateY: [0, 360, 720, 1080] } : {}}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          className="relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1"
          style={{ background: 'linear-gradient(145deg, #FF3B47 0%, #E63946 55%, #c0392b 100%)', border: '2.5px solid rgba(255,255,255,0.14)', boxShadow: '0 0 0 1px rgba(255,59,71,0.3), inset 0 2px 6px rgba(255,255,255,0.1), 0 6px 28px rgba(230,57,70,0.35)' }}
        >
          <span className="text-3xl font-black text-white leading-none" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>W</span>
          <span className="text-[7px] font-black tracking-widest uppercase text-white/55">Wove</span>
        </motion.div>
      </div>

      {error && <p className="text-[#E63946] text-xs font-semibold mb-4">{error}</p>}

      <button
        onClick={handleFlip}
        disabled={flipState !== 'idle'}
        className="w-full max-w-sm h-14 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(230,57,70,0.4)] disabled:opacity-50 mb-3"
      >
        {flipState === 'flipping' ? 'Flipping…' : 'Flip the Coin'}
      </button>

      <button onClick={() => router.back()} className="text-xs text-white/28 font-semibold tracking-wide">
        Cancel offer
      </button>
    </div>
  );
}
```

- [ ] **Step 10.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 10.3: Visual check in dev server**

Start `npm run dev` and navigate to `/coin-flip/[a-valid-accepted-offer-id]`. Verify:
- Coin renders with red gradient
- "Flip the Coin" button is present and tappable
- Win/lose amount cards show correct values
- Result overlay appears after flip

- [ ] **Step 10.4: Commit**

```bash
git add src/app/coin-flip/[id]/page.tsx
git commit -m "feat(coin-flip): add flip screen page"
```

---

## Task 11: Wire entry points

**Files:**
- Modify: `src/app/item/[id]/page.tsx` (around line 344–365)
- Modify: `src/components/SwipeFeed.tsx` (around line 232–252)
- Modify: `src/components/MessageThread.tsx`

- [ ] **Step 11.1: Add coin flip to item page (`src/app/item/[id]/page.tsx`)**

Add import at top:
```typescript
import CoinFlipModal from '@/components/CoinFlipModal';
```

Add state near the other modal states (around line 51):
```typescript
const [showCoinFlip, setShowCoinFlip] = useState(false);
```

Find the action buttons section (around line 344–365). After the "Buy Now" button, add:
```tsx
{/* Coin Flip */}
{item.sellerId !== userId && (
  <button
    onClick={() => setShowCoinFlip(true)}
    className="w-14 h-14 rounded-2xl border-2 border-[#FF3B47]/40 bg-[#FF3B47]/8 flex items-center justify-center transition-all hover:bg-[#FF3B47]/15"
    title="Coin Flip Offer"
  >
    🪙
  </button>
)}
```

Add the modal somewhere before the closing `</div>` of the page:
```tsx
<CoinFlipModal
  item={item}
  open={showCoinFlip}
  onClose={() => setShowCoinFlip(false)}
/>
```

- [ ] **Step 11.2: Add coin flip button to SwipeFeed (`src/components/SwipeFeed.tsx`)**

Add import at top:
```typescript
import CoinFlipModal from './CoinFlipModal';
```

Add state in the component:
```typescript
const [showCoinFlip, setShowCoinFlip] = useState(false);
```

Locate the action buttons grid (around line 232). It's currently `grid-cols-3`. Change it to `grid-cols-4` and add the coin flip button as the last column (after the like button):

```tsx
<div className="flex justify-center">
  <GlowButton size="sm" glowColor="#FF3B47" variant="dark" onClick={() => setShowCoinFlip(true)}>
    <span style={{ fontSize: 18 }}>🪙</span>
  </GlowButton>
</div>
```

Add the modal (before the closing tag of the component). The current card in SwipeFeed is `stack[0]` (confirmed from source):
```tsx
{stack[0] && (
  <CoinFlipModal
    item={stack[0]}
    open={showCoinFlip}
    onClose={() => setShowCoinFlip(false)}
  />
)}
```

- [ ] **Step 11.3: Add coin flip to MessageThread**

Open `src/components/MessageThread.tsx`. Find the action bar or message input area. Add a 🪙 icon button that opens `CoinFlipModal`. The `item` prop can be derived from the thread's `itemId` — check how item data is passed to MessageThread and use the same pattern.

The exact implementation depends on the current MessageThread structure. Read the full file, identify where action buttons live, and add the coin flip button following the same style as existing actions.

- [ ] **Step 11.4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 11.5: Full manual flow test**

With dev server running:
1. Log in as a buyer (not the item's seller)
2. Navigate to an item — verify 🪙 button appears
3. Click it — verify 3-step modal opens
4. Step 1: shows win/loss amounts and card status
5. Step 2: payment warning with checkbox (confirm button disabled until checked)
6. Step 3: send offer — verify notification appears for seller
7. Log in as seller — accept the offer
8. Log in as buyer — navigate to `/coin-flip/[id]`
9. Click "Flip the Coin" — verify animation plays and result appears
10. Verify order is created and both parties receive messages

- [ ] **Step 11.6: Commit**

```bash
git add src/app/item/[id]/page.tsx src/components/SwipeFeed.tsx src/components/MessageThread.tsx
git commit -m "feat(coin-flip): wire entry points on item page, feed, and message thread"
```

---

## Task 12: Add `.superpowers` to `.gitignore`

- [ ] **Step 12.1**

```bash
echo ".superpowers/" >> /Users/lucaclifton/projects/swipefit/.gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artifacts"
```

---

## Self-Review Checklist (do not skip)

After all tasks, verify:

- [ ] `getCoinFlipMonthCount` correctly counts only non-declined/expired/cancelled offers
- [ ] The flip route guards: status must be `'accepted'` before flipping
- [ ] `suspendUser` is called only on the 3rd strike (strikes >= 3 after increment)
- [ ] All 7 notification events from the spec have a corresponding `createNotification` call
- [ ] `CoinFlipModal` step 3 is only reachable after checkbox on step 2 is ticked
- [ ] `SaveCardModal` is triggered when `code === 'no_payment_method'` from the create route
- [ ] TypeScript compiles with `npx tsc --noEmit` before each commit
