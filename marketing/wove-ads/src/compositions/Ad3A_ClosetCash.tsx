import React from "react";
import { AbsoluteFill } from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { SwipeCard } from "../shared/SwipeCard";
import { SoldNotification } from "../shared/SoldNotification";
import { PayoutChip } from "../shared/PayoutChip";
import { ITEMS } from "../data/woveItems";

/**
 * Ad 3A — "Your closet is sitting on cash."
 *
 * Pillar 3 (seller acquisition). New audience angle — the seller side.
 * Shows: your listing → SOLD notification → +$28.80 to balance → 90/10 split.
 *
 * 15s timeline @ 30fps (450 frames):
 *   0.0–1.5  (0–45)   : Hook "Your closet is sitting on cash." over the listing
 *   1.5–4.0  (45–120) : Hold on the listing card — "$32 · Vintage Levi's"
 *   4.0–4.5  (120–135): Hook "Sold in 4 hours."
 *   4.5–11.0 (135–330): SoldNotification + payout counter ticks up
 *   11.0–13.5(330–405): PayoutChip lands at the bottom
 *   13.5–15.0(405–450): CTA outro
 */

// Seller's listing — same Vintage Levi's the Ad 1B buyer purchased
const listing = ITEMS.find((i) => i.id === "i-levis-501")!;

export const Ad3A_ClosetCash: React.FC = () => {
  return (
    <AbsoluteFill className="bg-wove-ink">
      <WoveFrame
        backdrop={
          <AbsoluteFill className="flex items-center justify-center">
            <div
              className="rounded-full bg-wove-red"
              style={{
                width: 1100,
                height: 1100,
                filter: "blur(160px)",
                opacity: 0.22,
              }}
            />
          </AbsoluteFill>
        }
      >
        {/* The seller's listing — visible throughout, framed inside the card slot */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative" style={{ width: "82%", height: "72%", maxWidth: 720 }}>
            <SwipeCard item={listing} showStamps={false} />
          </div>
        </div>

        {/* Sale notification + payout counter */}
        <SoldNotification
          from={135}
          to={330}
          item={listing}
          buyerName="@vintage.vault"
        />

        {/* Payout chip — "Sellers keep 90% / Wove takes 10." */}
        <PayoutChip from={330} to={400} />
      </WoveFrame>

      {/* Hooks */}
      <HookText
        from={0}
        to={42}
        text="Your closet is sitting on cash."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />
      <HookText
        from={115}
        to={155}
        text="Sold in 4 hours."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />

      <CTAOutro from={405} />
    </AbsoluteFill>
  );
};
