import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WoveLogo } from "./WoveLogo";

type CTAOutroProps = {
  /** Frame at which the outro begins. Outro runs for 45 frames (1.5s at 30fps). */
  from: number;
};

const WAITLIST_URL = "woveshop.com/waitlist";

/**
 * Final 1.5-sec card used by EVERY ad. Single source of brand consistency.
 * Black backdrop, animated logo, "Join the waitlist" + URL.
 */
export const CTAOutro: React.FC<CTAOutroProps> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from) return null;

  const local = frame - from;

  const fadeIn = interpolate(local, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const urlSlide = interpolate(local, [10, 22], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(local, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      className="flex flex-col items-center justify-center bg-wove-ink z-50"
      style={{ opacity: fadeIn }}
    >
      <div
        className="text-white"
        style={{ transform: `scale(${logoScale})`, transformOrigin: "center" }}
      >
        <WoveLogo size={320} withWordmark wordmarkSizeClass="text-9xl" />
      </div>

      <div
        className="mt-16 flex flex-col items-center gap-4"
        style={{
          transform: `translateY(${urlSlide}px)`,
          opacity: urlOpacity,
        }}
      >
        <p className="text-white/70 text-3xl font-medium tracking-wide">
          Join the waitlist
        </p>
        <p className="text-wove-red text-6xl font-black tracking-tight">
          {WAITLIST_URL}
        </p>
      </div>
    </AbsoluteFill>
  );
};
