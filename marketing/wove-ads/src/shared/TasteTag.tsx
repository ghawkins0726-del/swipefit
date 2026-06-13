import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type TasteTagProps = {
  /** Frame this tag flies in. */
  from: number;
  /** Frame this tag fades out (e.g., when StyleDnaCard takes over). */
  to: number;
  /** Tag label, e.g., "Vintage", "Denim", "Earth". */
  label: string;
  /** Tag color — defaults to wove-red. */
  color?: string;
  /** Stack index — drives vertical position. 0 = topmost. */
  stackIndex: number;
};

/**
 * Floating taste-profile chip that appears alongside the swipe stack as the
 * recommendation engine ingests each like. Several stack vertically along the
 * right side of the phone screen. Visually establishes that the AI is learning
 * in real time, before the StyleDnaCard materializes as the payoff.
 */
export const TasteTag: React.FC<TasteTagProps> = ({
  from,
  to,
  label,
  color = "#FF2E47",
  stackIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  // Fly in from the right
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 130 },
  });

  // Fade out near the end
  const exit = interpolate(local, [to - from - 14, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);
  const translateX = interpolate(enter, [0, 1], [120, 0]);

  // Stack position: tag 0 sits at top, each subsequent tag below
  const topOffset = 200 + stackIndex * 84;

  return (
    <AbsoluteFill className="pointer-events-none z-20">
      <div
        className="absolute right-12 flex items-center gap-3 rounded-full pl-3 pr-6 py-3 shadow-2xl"
        style={{
          top: topOffset,
          background: "rgba(10, 10, 10, 0.92)",
          border: `2px solid ${color}55`,
          boxShadow: `0 0 24px ${color}66`,
          opacity,
          transform: `translateX(${translateX}px)`,
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: color }}
        >
          <span className="text-white font-black text-base">+</span>
        </div>
        <span
          className="text-white font-black text-2xl tracking-tight uppercase"
          style={{ letterSpacing: "0.04em" }}
        >
          {label}
        </span>
      </div>
    </AbsoluteFill>
  );
};
