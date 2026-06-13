# Batch 01 — Wove waitlist promo ads

**Stack:** Remotion, UI/UX only (no humans, no avatars).
**Distribution:** TikTok organic + Instagram Reels.
**Spec:** 9:16, 1080×1920, 30 fps, 15 sec each, silent (Phase 5 adds music).
**Output:** `marketing/ads/raw/wove_p{N}_v{A|B}.mp4`

## Brand rules (apply to every ad)
- Palette: `wove-ink` `#0A0A0A`, `wove-red` `#FF2E47`, white.
- Type: bold, tight tracking, oversize for thumb-readable captions.
- Every ad ends with the **same** `<CTAOutro>` at the final 1.5s — single source of brand consistency.
- Every ad opens with a `<HookText>` line that lands by frame 8 and is gone by ~frame 45 (1.5s).
- Every UI moment lives inside `<WoveFrame>` — the phone shell never breaks.
- **Discovery = single swipe card, always.** Wove has no discovery grid. Grids only appear as the user's personal Liked section — use that authentically as a closer/payoff if needed, never as a stand-in for browse.
- **No match mechanic.** This is Depop-style, not Tinder-style. Swipe right saves to Liked; from Liked the buyer can buy / send offer / send Coin Flip / keep on wall. Sellers don't see who likes their items and never "match back." Never use match copy in any ad. Celebration moments at deal close = "Offer accepted" / "Order confirmed".

---

## Pillar 1 — The Swipe Mechanic
**Insight:** Wove's defining gesture. Show, don't tell. No grid intros — discovery IS the swipe.

### 1A — "Swipe. Match. Buy." (SHIPPED, 18s)
Note: hook copy includes "Match" rhetorically (rhythm + memorability) but no actual match UI appears in the ad. The "match" moment in ad language = saving an item to Liked + the eventual offer-acceptance close.

| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "Swipe. Match. Buy." over swipe stack drop-in | `<HookText>`, `<AnimatedSwipe>` (entering) |
| 1.5–5.0 | 3 fast swipes — like (saves to Liked), dislike, like | `<AnimatedSwipe>` × 3 |
| 5.0–8.0 | Hook: "The app learns your taste." → Style DNA card materializes ("Vintage Streetwear" + bar chart) | `<HookText>`, `<StyleDnaCard>` |
| 8.0–11.5 | Hook: "Send a Coin Flip 🪙" → coin flips, lands WIN, $34 (was $68) | `<HookText>`, `<CoinFlip>` |
| 11.5–13.5 | Payout chip: "Sellers keep 90% · We take 10%." | `<PayoutChip>` |
| 13.5–15.5 | Offer Accepted: seller accepts the Coin Flip → "Order Confirmed · You pay $34" | `<OfferAcceptedToast>` |
| 15.5–16.5 | Hold | — |
| 16.5–18.0 | CTA outro | `<CTAOutro>` |

### 1B — "Tinder, but for thrift." (NEXT)
Tighter pillar-1 cut focused on swipe → Liked → buy. No Coin Flip / Style DNA — leaner alternative that lets the mechanic breathe.

| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "Tinder, but for thrift." over a mid-rotation card frozen at 12° | `<HookText>`, `<AnimatedSwipe>` (paused) |
| 1.5–4.0 | 3 rapid swipes back to back; small heart-pop toast on each right-swipe ("Saved to Liked") | `<AnimatedSwipe>` × 3, `<SaveToLikedToast>` (new) |
| 4.0–7.0 | Cut to user's Liked grid filling in (authentic grid use) — the 6 swiped items appear | `<LikedGrid>` (new — repurpose `<GridMock>`) |
| 7.0–11.0 | Tap one item → opens detail → tap Buy → Stripe payment sheet slides up | `<SwipeCard>` (held), `<StripeSheet>` (new) |
| 11.0–13.5 | "Order Confirmed · $32" | `<OfferAcceptedToast>` |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

---

## Pillar 2 — Style DNA Learning
**Insight:** AI personalization. The app gets you fast.

### 2A — "Your taste, in 10 swipes."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "We learn what you like." Empty Style DNA bar visible | `<HookText>`, `<StyleDnaCard>` (empty) |
| 1.5–6.0 | Time-lapse: 5–6 swipes, each one popping a taste tag into the sidebar ("vintage", "denim", "earth tones", "Y2K") | `<AnimatedSwipe>` × 6, `<TasteTag>` |
| 6.0–10.0 | Style DNA card fills: "Minimalist Y2K · 87% confidence" | `<StyleDnaCard>` (full) |
| 10.0–12.0 | Next swipe is freakishly on-target. Caption: "Now we get you." | `<AnimatedSwipe>`, `<HookText>` |
| 12.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

### 2B — "Why is this so accurate?"
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "Why is this so accurate?" over a perfect-match card | `<HookText>`, `<SwipeCard>` |
| 1.5–4.0 | Rewind animation showing the last 5 swipes scrubbing backwards | `<AnimatedSwipe>` × 5 (reversed) |
| 4.0–9.0 | Style DNA card pulses; item recommendations cascade into a grid | `<StyleDnaCard>`, `<RecGrid>` |
| 9.0–12.0 | Big number animates in: "Match confidence: 94%" | `<BigNumber>` |
| 12.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

---

## Pillar 3 — Sell in 10 sec
**Insight:** Seller friction is the moat. "You keep 90%" is the killer line.

### 3A — "Sell in 10 seconds."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "Selling on Wove takes 10 seconds." Camera-upload prompt visible | `<HookText>`, `<ListingForm>` (empty) |
| 1.5–4.0 | Listing form auto-fills: title → category → condition → price. Each field pops with a soft bounce | `<ListingForm>` (animated) |
| 4.0–7.0 | "List it" button hits. Listing card flies into the marketplace grid | `<ListingForm>`, `<GridMock>` |
| 7.0–10.0 | Sale notification slides in: "Item sold!" | `<Notification>` |
| 10.0–13.0 | Counter ticks up: "You keep $28.80 (90%)" — old apps style: "You'd keep $25.60 (80%)" struck through | `<PayoutCounter>` |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

### 3B — "Other apps take 20%. Wove takes 10%."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "Most resale apps take 20% of your sale." | `<HookText>` |
| 1.5–3.5 | Side-by-side: Depop-style listing → $32 sale → $25.60 payout. Wove listing → $32 sale → $28.80 payout | `<PayoutCompare>` |
| 3.5–7.0 | Multiplier animation: "+$3.20 per item × 50 sales = $160 more" | `<PayoutCompare>`, `<BigNumber>` |
| 7.0–11.0 | Seller dashboard fills in: payouts list, total balance bigger than competitor screenshot | `<SellerDashboard>` |
| 11.0–13.0 | Caption: "We take 10%. You keep the rest." | `<HookText>` |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

---

## Pillar 4 — Message → Buy (the closed loop)
**Insight:** Negotiate → pay → ship → track. One app, no Venmo dance.

### 4A — "From DM to delivered."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "No more DMs and Venmo links." Split-screen chaos of 3 separate app icons (mocked) | `<HookText>`, `<AppChaos>` |
| 1.5–4.0 | Wove chat thread plays: buyer asks, seller replies, "Send offer" button highlight | `<MessageThread>` |
| 4.0–7.0 | Offer card in chat. Tap accept → Stripe payment sheet slides up | `<MessageThread>`, `<StripeSheet>` |
| 7.0–10.0 | "Payment confirmed" → tracking number appears in the same thread | `<MessageThread>` (update) |
| 10.0–13.0 | Tracking card slides in. "Delivered" stamp | `<OrderTracking>` |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

### 4B — "Negotiate. Buy. Track."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: one word at a time pulsing center screen — "Negotiate." "Buy." "Track." | `<HookText>` (sequence) |
| 1.5–6.0 | Chat thread plays — counter offer → accept → Stripe Connect 90/10 payout split animation | `<MessageThread>`, `<StripeSheet>`, `<PayoutCompare>` |
| 6.0–10.0 | Order tracking card slides in with progress bar | `<OrderTracking>` |
| 10.0–13.0 | Caption: "All in Wove." | `<HookText>` |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

---

## Pillar 5 — Waitlist FOMO (conversion push)
**Insight:** Scarcity + early-access perks. Hardest sell, pure CTA.

### 5A — "Spot #847 of 1,000."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: Giant counter flickering: 847 → 846 → 845. Centered, no phone shell yet | `<WaitlistCounter>` |
| 1.5–4.0 | Reveal: "Spots remaining in the early-access drop: 845". Phone shell fades in behind | `<WaitlistCounter>`, `<WoveFrame>` (fade-in) |
| 4.0–8.0 | Quick mosaic: 6 `<SwipeCard>` thumbnails cascading in (taste showcase) | `<RecGrid>` |
| 8.0–11.0 | Caption: "First 1,000 get free seller upgrades + premium for life." | `<HookText>` |
| 11.0–13.0 | "Reserve your spot." | `<HookText>` |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro (waitlist URL emphasized) | `<CTAOutro>` |

### 5B — "You're early."
| Time (s) | Beat | Primitive |
|---|---|---|
| 0.0–1.5 | Hook: "You're early." white text on black, full screen | `<HookText>` (full-bleed) |
| 1.5–4.0 | Phone fades up. Wove logo with halo pulse | `<WoveFrame>`, `<WoveLogo>` |
| 4.0–8.0 | Highlight reel: 3 swipes → a match → a sale notification | `<AnimatedSwipe>` × 3, `<MatchToast>`, `<Notification>` |
| 8.0–11.0 | Caption: "Get in before everyone else." | `<HookText>` |
| 11.0–13.0 | URL animation: `wove.app/waitlist` typing in | `<HookText>` (typewriter variant) |
| 13.0–13.5 | Hold | — |
| 13.5–15.0 | CTA outro | `<CTAOutro>` |

---

## Primitive inventory

Shipped (Phase 0 + Phase 2 batch 1):
- `<WoveFrame>` ✓
- `<WoveLogo>` ✓
- `<HookText>` ✓ — bold-center / full-bleed / typewriter variants
- `<CTAOutro>` ✓ — final 1.5s card, used by every ad
- `<SwipeCard>` ✓ — real-photo card with full info overlay
- `<AnimatedSwipe>` ✓ — card stack swipe driver
- `<MatchToast>` ✓
- `<StyleDnaCard>` ✓ — animated bar chart + archetype
- `<CoinFlip>` ✓ — spinning coin → win outcome
- `<PayoutChip>` ✓ — floating 90/10 message
- `<GridMock>` — built but currently UNUSED; reserved for authentic Liked-section payoffs (NOT for discovery contrast)

Still to build for the remaining pillars:
1. `<TasteTag>` — small chip that pops into Style DNA sidebar
2. `<RecGrid>` — cascading grid of recommendation thumbnails (Liked-section authentic use)
3. `<BigNumber>` — large counter / percentage animator
4. `<ListingForm>` — auto-filling listing form (Pillar 3)
5. `<Notification>` — slide-in iOS-style notification
6. `<PayoutCounter>` — animated payout counter with strikethrough comparison
7. `<PayoutCompare>` — side-by-side platform fee comparison
8. `<SellerDashboard>` — payouts list view
9. `<MessageThread>` — chat bubble sequencer (Pillar 4)
10. `<StripeSheet>` — bottom-sheet payment UI
11. `<OrderTracking>` — order progress card
12. `<AppChaos>` — split-screen chaotic app icon collage (Pillar 4 contrast)
13. `<WaitlistCounter>` — large flickering counter (Pillar 5)

## Render manifest

Each composition registered in `src/Root.tsx` with id `wove-p{1-5}-v{a|b}`. Manifest entry per ad:

```json
{
  "id": "wove-p1-va",
  "pillar": 1,
  "variant": "A",
  "hook": "Stop scrolling. Start swiping.",
  "duration_s": 15,
  "primitives": ["HookText", "GridMock", "AnimatedSwipe", "MatchToast", "CTAOutro"],
  "output": "marketing/ads/raw/wove_p1_va.mp4",
  "created_at": null,
  "notes": null
}
```

Stored in `marketing/ads/manifest.json` — updated automatically on each render in Phase 3.
