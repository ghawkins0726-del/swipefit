import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type PayoutChipProps = {
  from: number;
  to: number;
  /** Headline copy. Default: "Sellers keep 90%". */
  headline?: string;
  /** Subline. Default: "Wove takes 10." */
  subline?: string;
};

/**
 * Floating "Sellers keep 90%" chip. Lands above the phone shell at the bottom,
 * pulses once, and slides away. Used after a sale beat to plant the 90/10 split.
 */
export const PayoutChip: React.FC<PayoutChipProps> = ({
  from,
  to,
  headline = "Sellers keep 90%",
  subline = "Wove takes 10.",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const exit = interpolate(local, [to - from - 10, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [80, 0]);

  return (
    <AbsoluteFill className="flex items-end justify-center pb-32 z-30 pointer-events-none">
      <div
        className="bg-wove-ink rounded-full px-12 py-6 flex items-center gap-6 shadow-2xl"
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          border: "2px solid rgba(255, 46, 71, 0.5)",
          boxShadow:
            "0 0 60px rgba(255, 46, 71, 0.45), 0 12px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Wove-red circular badge with $ glyph — replaces emoji for consistent render */}
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(180deg, #FF3B47 0%, #E63946 100%)",
            boxShadow: "0 4px 16px rgba(255, 46, 71, 0.55)",
          }}
        >
          <span className="text-white font-black text-5xl leading-none">$</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white text-5xl font-black tracking-tight leading-none">
            {headline}
          </span>
          <span className="text-white/55 text-2xl font-semibold mt-1">
            {subline}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
