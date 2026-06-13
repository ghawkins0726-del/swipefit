import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { AnimatedSwipe, SwipeStep } from "../shared/AnimatedSwipe";
import { OfferAcceptedToast } from "../shared/OfferAcceptedToast";
import { StyleDnaCard } from "../shared/StyleDnaCard";
import { CoinFlip } from "../shared/CoinFlip";
import { PayoutChip } from "../shared/PayoutChip";
import { ITEMS } from "../data/woveItems";

/**
 * Ad 1A — "Resale, but you have fun."
 *
 * 18s timeline @ 30fps (540 frames). Dense feature reveal, swipe-first:
 *   0.0–1.5  (0–45)   : Hook "Resale, but you have fun." over swipe stack drop-in
 *   1.5–5.0  (45–150) : 3 fast swipes — like, dislike, like
 *   5.0–8.0  (150–240): Hook "5 swipes. Calibrated." + Style DNA card materializes
 *   8.0–11.5 (240–345): Hook "Flip the seller for 50% off." → coin flips, lands WIN
 *   11.5–13.5(345–405): PayoutChip "Sellers keep 90% / Wove takes 10."
 *   13.5–15.5(405–465): OfferAcceptedToast — seller accepts, order confirmed
 *                       (NOT a "match" — Wove has no Tinder-style match mechanic.
 *                       Likes save to Liked; buyer initiates offer/flip/buy.)
 *   15.5–16.5(465–495): Hold
 *   16.5–18.0(495–540): CTAOutro
 *
 * NOTE: Discovery in Wove is swipe-only (one card at a time, Tinder-style).
 * No grid view exists for discovery — grids only appear in the user's personal
 * Liked section. Ad must reflect that.
 */

// Items for this ad — picked for visual diversity
const coachBag = ITEMS.find((i) => i.id === "i-coach-bag")!;
const leviStack = ITEMS.find((i) => i.id === "i-levis-501")!;
const docMartens = ITEMS.find((i) => i.id === "i-doc-martens")!;
const pleatedSkirt = ITEMS.find((i) => i.id === "i-pleated-skirt")!;
const leatherJacket = ITEMS.find((i) => i.id === "i-leather-jacket")!;

const SWIPE_STEPS: SwipeStep[] = [
  { item: leviStack, swipeAt: 55, action: "like" },
  { item: docMartens, swipeAt: 90, action: "dislike" },
  { item: leatherJacket, swipeAt: 125, action: "like" },
  { item: coachBag, swipeAt: 9999, action: "like" }, // never swipes — held for the coin-flip beat
];

export const Ad1A_StopScrolling: React.FC = () => {
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
                opacity: 0.2,
              }}
            />
          </AbsoluteFill>
        }
      >
        {/* Swipe stack — drops in immediately and runs through coin-flip beat */}
        <AnimatedSwipe
          steps={SWIPE_STEPS}
          stackEntersAt={0}
          swipeDuration={22}
        />


        {/* Style DNA card — slides in over the swipe view */}
        <StyleDnaCard
          from={158}
          to={235}
          archetype="Vintage Streetwear"
          archetypeDesc="Earth tones · soft grunge · 70s touch."
          keywords={["Vintage", "Denim", "Earth"]}
          basedOn={3}
        />

        {/* Coin Flip moment on the Coach bag — the held card under it */}
        <CoinFlip from={245} to={345} price={coachBag.price} />

        {/* Payout chip — "Sellers keep 90%" */}
        <PayoutChip from={350} to={400} />

        {/* Seller accepts the Coin Flip — order confirmed */}
        <OfferAcceptedToast
          from={410}
          to={465}
          sellerName={coachBag.sellerName}
          acceptedThing="Coin Flip"
          finalPrice={Math.round(coachBag.price * 0.5 * 100) / 100}
        />
      </WoveFrame>

      {/* Hooks (sit above the phone shell) */}
      <HookText
        from={0}
        to={45}
        text="Resale, but you have fun."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-8xl"
      />
      <HookText
        from={150}
        to={195}
        text="5 swipes. Calibrated."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />
      <HookText
        from={230}
        to={272}
        text="Flip the seller for 50% off."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />

      {/* CTA outro */}
      <CTAOutro from={495} />
    </AbsoluteFill>
  );
};
