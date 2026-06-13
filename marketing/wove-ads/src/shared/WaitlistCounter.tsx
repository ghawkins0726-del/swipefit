import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type WaitlistCounterProps = {
  from: number;
  to: number;
  /** Counter starts at this value (and ticks down). */
  startValue: number;
  /** Counter lands on this value. */
  endValue: number;
  /** Total list size (denominator). */
  total: number;
  /** Frame (relative to `from`) when the tick-down begins. */
  tickStartAt?: number;
  /** Frames the tick-down animation lasts. */
  tickDuration?: number;
  /** Optional vertical position offset (px). 0 = vertically centered. */
  yOffset?: number;
};

/**
 * Large counter that ticks DOWN from `startValue` to `endValue` (mimicking
 * waitlist spots filling in real time). Subtle digit flicker every ~6 frames
 * sells the "live data" feel.
 */
export const WaitlistCounter: React.FC<WaitlistCounterProps> = ({
  from,
  to,
  startValue,
  endValue,
  total,
  tickStartAt = 0,
  tickDuration = 60,
  yOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  // Counter enters with a spring scale
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Tick down
  const tickT = Math.max(0, Math.min(1, (local - tickStartAt) / tickDuration));
  const eased = 1 - Math.pow(1 - tickT, 2);
  const currentValue = Math.round(startValue - (startValue - endValue) * eased);

  // Subtle flicker — every few frames, dim slightly
  const flickerPulse = Math.sin((local / 6) * Math.PI * 2);
  const flicker = flickerPulse > 0.85 ? 0.78 : 1;

  // Exit fade
  const exit = interpolate(local, [to - from - 14, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);

  return (
    <AbsoluteFill className="flex items-center justify-center pointer-events-none z-25">
      <div
        className="flex flex-col items-center"
        style={{
          opacity,
          transform: `translateY(${yOffset}px) scale(${interpolate(
            enter,
            [0, 1],
            [0.85, 1]
          )})`,
        }}
      >
        <p className="text-white/55 text-2xl font-bold uppercase tracking-[0.4em] mb-6">
          Spots remaining
        </p>
        <div className="flex items-baseline gap-8">
          <span
            className="font-black text-wove-red leading-none tracking-tighter"
            style={{
              fontSize: 360,
              filter: `brightness(${flicker})`,
              textShadow:
                "0 0 80px rgba(255,46,71,0.65), 0 0 180px rgba(255,46,71,0.35)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {currentValue.toLocaleString()}
          </span>
          <span className="text-white/35 font-black text-7xl tracking-tight">
            /{total.toLocaleString()}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
