import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { AnimatedSwipe, SwipeStep } from "../shared/AnimatedSwipe";
import { TasteTag } from "../shared/TasteTag";
import { StyleDnaCard } from "../shared/StyleDnaCard";
import { ITEMS } from "../data/woveItems";

/**
 * Ad 2A — "Your taste, in 10 swipes."
 *
 * Pillar 2 (Style DNA). Shows the recommendation engine learning in real time:
 * each like pops a taste-profile tag, the Style DNA card materializes from the
 * accumulated signal, then the NEXT swipe is freakishly on-target.
 *
 * 15s timeline @ 30fps (450 frames):
 *   0.0–1.5  (0–45)   : Hook "It clocks you in 5 swipes." over first card
 *   1.5–6.5  (45–195) : 5 swipes; on each LIKE a TasteTag flies in & stacks
 *   6.5–9.5  (195–285): TasteTags fade as Style DNA card materializes
 *   9.5–11.0 (285–330): Hook "Calibrated to your taste."
 *   11.0–13.5(330–405): Next swipe shown with 94% match badge — the on-target moment
 *   13.5–15.0(405–450): CTA outro
 */

const leviStack = ITEMS.find((i) => i.id === "i-levis-501")!;
const leatherJacket = ITEMS.find((i) => i.id === "i-leather-jacket")!;
const docMartens = ITEMS.find((i) => i.id === "i-doc-martens")!;
const cargo = ITEMS.find((i) => i.id === "i-cargo-pants")!;
const coachBag = ITEMS.find((i) => i.id === "i-coach-bag")!;
const cropped = ITEMS.find((i) => i.id === "i-cropped-tee")!;

// Five swipes building the taste profile, then a sixth pinned card for the
// "freakishly on-target" reveal at the end.
const SWIPE_STEPS: SwipeStep[] = [
  { item: leviStack, swipeAt: 55, action: "like" },
  { item: docMartens, swipeAt: 90, action: "dislike" },
  { item: leatherJacket, swipeAt: 125, action: "like" },
  { item: cropped, swipeAt: 160, action: "dislike" },
  { item: cargo, swipeAt: 195, action: "like" },
  // The on-target reveal card — never swipes; lands at frame 330 with badge
  { item: coachBag, swipeAt: 9999, action: "like", matchScore: 94 },
];

export const Ad2A_TasteIn10Swipes: React.FC = () => {
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
        {/* Swipe stack runs the whole ad — held card lands at the reveal */}
        <AnimatedSwipe
          steps={SWIPE_STEPS}
          stackEntersAt={0}
          swipeDuration={22}
        />

        {/* Taste tags pop as each LIKE registers; stay until DNA card materializes */}
        <TasteTag
          from={75}
          to={210}
          label="Vintage"
          stackIndex={0}
        />
        <TasteTag
          from={145}
          to={210}
          label="Earth"
          stackIndex={1}
          color="#A0522D"
        />
        <TasteTag
          from={215}
          to={260}
          label="Utility"
          stackIndex={2}
          color="#8B9469"
        />

        {/* Style DNA card materializes from the collected signal */}
        <StyleDnaCard
          from={215}
          to={325}
          archetype="Vintage Streetwear"
          archetypeDesc="Earth tones · soft grunge · 70s touch."
          keywords={["Vintage", "Earth", "Utility"]}
          basedOn={3}
        />
      </WoveFrame>

      {/* Hooks */}
      <HookText
        from={0}
        to={45}
        text="It clocks you in 5 swipes."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />
      <HookText
        from={300}
        to={345}
        text="Calibrated to your taste."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-7xl"
      />

      <CTAOutro from={405} />
    </AbsoluteFill>
  );
};
