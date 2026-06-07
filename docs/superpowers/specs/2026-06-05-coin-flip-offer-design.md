# Coin Flip Offer — Design Spec
**Date:** 2026-06-05  
**Status:** Approved, ready for implementation

---

## Overview

Buyers can send a seller a "coin flip offer" on any item. If the seller accepts and the buyer triggers the flip:

- **Buyer wins** → pays 50% of the item price
- **Buyer loses** → pays 150% of the item price

Buyers have **3 coin flip opportunities per calendar month**. A slot is consumed when an offer is sent, and returned only if the seller declines, the offer expires, or the buyer cancels before the seller responds. Accepted and completed offers consume a slot permanently.

---

## Data Model

### New table: `coin_flip_offers`

```sql
CREATE TABLE coin_flip_offers (
  id                        TEXT PRIMARY KEY,
  buyer_id                  TEXT NOT NULL,
  seller_id                 TEXT NOT NULL,
  item_id                   TEXT NOT NULL,
  item_price                NUMERIC(10,2) NOT NULL,
  win_amount                NUMERIC(10,2) NOT NULL,   -- item_price * 0.50
  loss_amount               NUMERIC(10,2) NOT NULL,   -- item_price * 1.50
  status                    TEXT NOT NULL DEFAULT 'pending',
  flip_result               TEXT,                     -- 'win' | 'loss' | NULL
  stripe_payment_intent_id  TEXT,
  created_at                BIGINT NOT NULL,
  updated_at                BIGINT NOT NULL,
  expires_at                BIGINT NOT NULL           -- created_at + 72h
);
```

### Status values

| Status | Meaning | Counts against monthly limit? |
|---|---|---|
| `pending` | Sent, awaiting seller response | Yes |
| `accepted` | Seller accepted, awaiting buyer flip | Yes |
| `declined` | Seller declined | No — slot returned |
| `flipped` | Flip happened, payment processing | Yes |
| `completed` | Payment captured, order created | Yes |
| `cancelled` | Buyer withdrew before seller responded | No — slot returned (prevents spam-and-cancel abuse) |
| `expired` | Seller didn't respond within 72h | No — slot returned |
| `payment_failed` | Flip resolved but charge failed | Yes — flip happened, debt is real |

### Monthly limit query

```sql
SELECT COUNT(*) FROM coin_flip_offers
WHERE buyer_id = $1
  AND status NOT IN ('declined', 'expired', 'cancelled')
  AND created_at >= $2  -- unix ms of start of current calendar month
```

### Schema additions to `users` table

```sql
ALTER TABLE users ADD COLUMN payment_strikes INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
-- account_status values: 'active' | 'suspended_pending_review'
```

---

## Payment Flow

The existing checkout uses Stripe Checkout sessions (redirect-based). Coin flip charges happen server-side against a saved card, requiring two new prerequisites:

### Prerequisites (Stripe SetupIntent)

- `POST /api/stripe/setup-intent` — creates a Stripe SetupIntent so buyers can save a card to their `stripeCustomerId`
- `GET /api/stripe/payment-methods` — lists the buyer's saved payment methods
- A `SaveCardModal` component using Stripe Elements collects the card

Buyers must have a saved payment method before sending a coin flip offer. If none exists, the modal prompts them to add one before proceeding.

### Flip payment sequence

1. Server generates flip result: `Math.random() < 0.5` → `'win'` or `'loss'`
2. Server creates a Stripe PaymentIntent for `win_amount` or `loss_amount` against `buyer.stripeCustomerId`
3. PaymentIntent confirmed off-session (server-side charge, no redirect)
4. On success: order created (same schema as normal purchase), item marked sold, offer status → `completed`, Stripe Connect transfer to seller at 90/10 split
5. On failure: offer status → `payment_failed`, buyer's `payment_strikes` incremented, notification sent

### Payment failure policy

- The flip result stands — it is recorded and cannot be voided
- `payment_strikes` increments by 1 on each failed charge
- At `payment_strikes = 3`: `account_status` → `suspended_pending_review`
- Failed charges may be retried; retry logic is handled outside this spec

---

## API Routes

### New coin flip routes

```
POST /api/coin-flip/create           — buyer sends offer
POST /api/coin-flip/[id]/respond     — seller accepts or declines
POST /api/coin-flip/[id]/flip        — buyer triggers the flip
GET  /api/coin-flip/[id]             — fetch offer state (buyer or seller)
GET  /api/coin-flip/remaining        — buyer's remaining flips this month (0–3)
```

### New Stripe routes

```
POST /api/stripe/setup-intent        — create SetupIntent (save card)
GET  /api/stripe/payment-methods     — list buyer's saved cards
```

### Route responsibilities

**`POST /api/coin-flip/create`**
- Auth: buyer only, cannot be own item
- Checks: `account_status = 'active'`, monthly limit < 3, item not sold, seller has Stripe Connect onboarded, buyer has saved payment method
- Creates `coin_flip_offers` row with `expires_at = now + 72h`
- Sends message to seller thread + creates notification

**`POST /api/coin-flip/[id]/respond`**
- Auth: seller only
- Body: `{ accepted: boolean }`
- `accepted = true`: status → `accepted`, notifies buyer
- `accepted = false`: status → `declined`, notifies buyer (slot returned)

**`POST /api/coin-flip/[id]/flip`**
- Auth: buyer only
- Checks: status must be `accepted`
- Generates result, charges card, creates order on success
- Sends result notification + message to both parties

**`GET /api/coin-flip/remaining`**
- Auth: buyer
- Returns `{ remaining: number, used: number, resetsAt: number }` (ms until month end)

---

## UI Components

### Entry points

The coin flip offer can be initiated from three surfaces:
1. **Item detail page** — "Coin Flip" button alongside "Buy Now" and "Make Offer"
2. **Swipe feed card** — coin icon action alongside like/dislike/superlike
3. **Message thread** — action accessible from within an existing conversation

All three open the same `CoinFlipModal` component.

### `CoinFlipModal` — three-step bottom sheet

**Step 1 — Overview**
- Item thumbnail, title, price
- Win amount (green) and loss amount (red) displayed side-by-side
- Card on file shown (e.g. "Visa ••••4242")
- Remaining flips chip (dots: used = dim, available = red)
- "Next →" button

**Step 2 — Payment warning** (acknowledgement required)
- Prominent "⚠ Payment obligation" header in red
- Explicitly states loss amount and card to be charged
- Explains strike policy: "3 non-payment strikes = indefinite account suspension"
- Checkbox: "I understand I am obligated to pay $X if I lose"
- Confirm button disabled until checkbox ticked

**Step 3 — Confirm & pending**
- "Send Coin Flip Offer" button
- After send: pulsing coin icon, "Waiting for seller to respond…" state
- If no saved card: step 1 shows "Add a card" prompt instead, opens `SaveCardModal`

### `/coin-flip/[id]` — Flip screen

Full-screen page in Wove aesthetic (black background, brand red):
- Item glass card (thumbnail, title, size, condition, seller)
- Win/lose amount boxes (green/red)
- Remaining flips chip
- Large animated coin (120px, `#FF3B47 → #E63946` gradient, "W / Wove" face)
- Red ambient glow behind coin
- "Flip the Coin" button (full-width, brand red gradient)
- "Cancel offer" text link below button

**On flip:**
- 2–3s CSS 3D spin animation on the coin
- Result revealed: full-screen green flash ("🪙 You Win — $60 charged") or red flash ("💸 You Lose — $180 charged")
- Auto-navigates to order page on success

### Seller's view

- Coin flip offers appear in the seller's activity inbox and message thread
- Notification card shows item, buyer, win/loss amounts, 72h expiry countdown
- "Accept" (green) and "Decline" (red) action buttons

---

## Notifications & Messaging

All events auto-send a message into the buyer↔seller thread via existing `sendMessage` + `createNotification`.

| Event | Recipient(s) | Message |
|---|---|---|
| Offer sent | Seller | "@buyer wants to coin flip "{item}" — if you win: they pay $X, if they win: they pay $Y. You have 72h to respond." |
| Seller accepts | Buyer | "@seller accepted your coin flip! Open the app to flip." |
| Seller declines | Buyer | "@seller declined your coin flip. Your slot has been returned." |
| Offer expires | Buyer | "Your coin flip offer on "{item}" expired (72h). Your slot has been returned." |
| Buyer wins | Both | "🪙 @buyer won the flip — paying $X for "{item}"." |
| Buyer loses | Both | "💸 @buyer lost the flip — paying $Y for "{item}"." |
| Payment fails | Buyer | "⚠ Your payment of $Y failed. This is strike N of 3. Three strikes results in indefinite account suspension pending review. Update your card and contact support." |
| 3rd strike | Buyer | "Your account has been suspended pending review due to 3 non-payment violations. Contact support." |

---

## Edge Cases & Constraints

- **Buyer cancels pending offer**: status → `cancelled`, slot returned (no charge; buyer initiated the cancellation before seller committed)
- **Item sold while offer is pending**: when seller tries to accept, validate item is still available; if not, auto-decline and return slot
- **Seller not Stripe-onboarded**: blocked at offer creation (same check as normal purchase)
- **No saved card**: blocked at modal step 1, prompted to add card
- **Account suspended**: blocked at offer creation with clear error message
- **Multiple pending offers**: allowed on different items, each consuming a slot (up to the monthly limit)
- **Offer on own item**: blocked at API level

---

## Out of Scope

- Seller-initiated coin flip offers
- Counter-offers or negotiated odds
- Retry logic for failed payments (handled separately)
- Admin review flow for suspended accounts
