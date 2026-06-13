import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { AnimatedSwipe, SwipeStep } from "../shared/AnimatedSwipe";
import { SaveToLikedToast } from "../shared/SaveToLikedToast";
import { LikedGrid } from "../shared/LikedGrid";
import { StripeSheet } from "../shared/StripeSheet";
import { OfferAcceptedToast } from "../shared/OfferAcceptedToast";
import { ITEMS } from "../data/woveItems";

/**
 * Ad 1B — "Tinder, but for thrift."
 *
 * Pillar 1, leaner cut. Shows the authentic value loop end-to-end:
 *   swipe → save to Liked → open Liked wall → tap → Stripe Pay → Order Confirmed
 *
 * 15s timeline @ 30fps (450 frames):
 *   0.0–1.5  (0–45)   : Hook "Tinder, but for thrift." over first card (paused)
 *   1.5–5.5  (45–165) : 3 right-swipes, each with a "Saved to Liked" toast
 *   5.5–8.5  (165–255): Cut to Liked wall — items cascade in (1st highlighted)
 *   8.5–12.5 (255–375): Stripe payment sheet slides up; Pay button tap
 *   12.5–13.5(375–405): Order Confirmed celebration
 *   13.5–15.0(405–450): CTA outro
 */

const leviStack = ITEMS.find((i) => i.id === "i-levis-501")!;
const croppedTee = ITEMS.find((i) => i.id === "i-cropped-tee")!;
const y2kMesh = ITEMS.find((i) => i.id === "i-y2k-mesh")!;
const coachBag = ITEMS.find((i) => i.id === "i-coach-bag")!;

const likedItems = [leviStack, croppedTee, y2kMesh];
const buyItem = leviStack;

const SWIPE_STEPS: SwipeStep[] = [
  { item: leviStack, swipeAt: 60, action: "like" },
  { item: croppedTee, swipeAt: 100, action: "like" },
  { item: y2kMesh, swipeAt: 140, action: "like" },
  { item: coachBag, swipeAt: 9999, action: "like" }, // held; never swipes
];

export const Ad1B_TinderForThrift: React.FC = () => {
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
        {/* Swipe stack — ends when Liked grid takes over */}
        <Sequence from={0} durationInFrames={170}>
          <AnimatedSwipe
            steps={SWIPE_STEPS}
            stackEntersAt={0}
            swipeDuration={22}
          />
        </Sequence>

        {/* "Saved to Liked" toasts — one per right-swipe */}
        <SaveToLikedToast from={75} to={92} />
        <SaveToLikedToast from={115} to={132} />
        <SaveToLikedToast from={155} to={170} />

        {/* The user's Liked wall */}
        <Sequence from={165} durationInFrames={95}>
          <LikedGrid
            from={0}
            to={95}
            items={likedItems}
            highlightIndex={0}
            highlightAt={45}
          />
        </Sequence>

        {/* Stripe payment sheet — buyer taps the highlighted item, sheet slides up */}
        <StripeSheet from={255} to={375} item={buyItem} />

        {/* Order placed — direct buy from Liked wall, no offer involved */}
        <OfferAcceptedToast
          from={375}
          to={405}
          sellerName={buyItem.sellerName}
          finalPrice={buyItem.price}
          headline="ORDER PLACED"
          sublineOverride="Vintage Levi's. Shipping tomorrow."
        />
      </WoveFrame>

      {/* Hooks */}
      <HookText
        from={0}
        to={42}
        text="Tinder, but for thrift."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />
      {/* "Your wall fills" hook removed — the LikedGrid header ("Your Liked · 3 items") is the message itself. */}
      <HookText
        from={258}
        to={300}
        text="One tap. Shipped."
        variant="bold-center"
        color="white"
        yOffset={-820}
        sizeClass="text-6xl"
      />

      {/* CTA outro */}
      <CTAOutro from={405} />
    </AbsoluteFill>
  );
};
