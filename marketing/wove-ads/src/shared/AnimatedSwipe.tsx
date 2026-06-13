import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AdItem } from "../data/woveItems";
import { SwipeCard } from "./SwipeCard";

export type SwipeAction = "like" | "dislike" | "superlike";

export type SwipeStep = {
  item: AdItem;
  /** Frame at which this card's swipe motion begins. */
  swipeAt: number;
  /** Direction the card exits. */
  action: SwipeAction;
  /** Optional Style-DNA match score (0–100). Shown as a glassy badge top-right. */
  matchScore?: number;
};

type AnimatedSwipeProps = {
  /** Ordered list of cards; each one swipes off at its swipeAt frame. */
  steps: SwipeStep[];
  /** Frame when the card stack first appears. */
  stackEntersAt?: number;
  /** How many frames a swipe motion takes. */
  swipeDuration?: number;
};

/**
 * Card stack that swipes through `steps` programmatically. Each step's card sits
 * on top until `swipeAt`, then animates off in the action's direction. The next
 * step's card is rendered behind, scaled down + offset like a real stack.
 */
export const AnimatedSwipe: React.FC<AnimatedSwipeProps> = ({
  steps,
  stackEntersAt = 0,
  swipeDuration = 24,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stack entry spring (cards drop in)
  const stackEnter = spring({
    frame: frame - stackEntersAt,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Find the active (currently swiping or about-to-swipe) step
  let activeIndex = steps.findIndex(
    (s, i) =>
      frame < s.swipeAt + swipeDuration &&
      (i === steps.length - 1 || frame < steps[i + 1].swipeAt)
  );
  if (activeIndex === -1) activeIndex = steps.length - 1;

  const active = steps[activeIndex];
  const next = steps[activeIndex + 1];

  // Active card transform
  const swipeProgress = interpolate(
    frame,
    [active.swipeAt, active.swipeAt + swipeDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dir =
    active.action === "like"
      ? { x: 1200, y: -80, rot: 1 }
      : active.action === "dislike"
        ? { x: -1200, y: -80, rot: -1 }
        : { x: 0, y: -1600, rot: 0 };

  // Ease the swipe — fast start, soft tail
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const eased = ease(swipeProgress);

  const activeX = dir.x * eased;
  const activeY = dir.y * eased;

  // Next card (behind active) scales up + comes forward as swipe progresses
  const nextScale = interpolate(eased, [0, 1], [0.92, 1]);
  const nextY = interpolate(eased, [0, 1], [40, 0]);

  if (frame < stackEntersAt) return null;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{
        opacity: stackEnter,
        transform: `translateY(${(1 - stackEnter) * 60}px)`,
      }}
    >
      <div
        className="relative"
        style={{ width: "82%", height: "72%", maxWidth: 720 }}
      >
        {/* Card behind */}
        {next && (
          <SwipeCard
            item={next.item}
            scale={nextScale}
            y={nextY}
            showStamps={false}
            matchScore={next.matchScore}
          />
        )}

        {/* Active card */}
        <SwipeCard
          item={active.item}
          x={activeX}
          y={activeY}
          matchScore={active.matchScore}
        />
      </div>
    </div>
  );
};
