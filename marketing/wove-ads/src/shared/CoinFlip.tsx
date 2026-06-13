import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type CoinFlipProps = {
  /** Frame the moment begins. */
  from: number;
  /** Frame the moment ends. */
  to: number;
  /** Item price (used to compute win/lose amounts). */
  price: number;
};

/**
 * Coin Flip moment — the buyer sends a 50/50 challenge to the seller.
 * Win = 50% off. Lose = +50% added. This ad shows the WIN outcome.
 *
 * Modeled on src/components/CoinFlipModal.tsx — gradient red button styling,
 * "🪙 You win 50% off" outcome card.
 *
 * Timeline (within from..to):
 *   0–10  : Backdrop fades in, coin spawns
 *   10–35 : Coin flips (3D rotation), settles
 *   35–55 : "YOU WIN" outcome card scales in
 *   55–end: Hold
 */
export const CoinFlip: React.FC<CoinFlipProps> = ({ from, to, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  const winAmount = Math.round(price * 0.5 * 100) / 100;
  const youPay = Math.round((price - winAmount) * 100) / 100;

  // Backdrop fade
  const backdropOpacity = interpolate(local, [0, 8], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Coin spawn
  const coinScale = spring({
    frame: local - 4,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  // Coin flip — multiple rotations on the Y axis
  const flipRotation = interpolate(local, [10, 38], [0, 1080], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // After flip, coin shrinks and outcome card appears
  const coinExit = interpolate(local, [38, 50], [1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const coinOpacity = interpolate(local, [38, 55], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Outcome card enters around frame 38
  const outcomeEnter = spring({
    frame: local - 38,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const outcomeOpacity = interpolate(local, [38, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit at the end
  const containerFade = interpolate(local, [to - from - 8, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      className="flex items-center justify-center z-30 pointer-events-none"
      style={{ opacity: containerFade }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0, 0, 0, 0.78)",
          opacity: backdropOpacity / 0.78,
        }}
      />

      {/* The coin */}
      <div
        className="absolute"
        style={{
          transform: `scale(${coinScale * coinExit}) rotateY(${flipRotation}deg)`,
          opacity: coinOpacity,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="rounded-full flex items-center justify-center font-black text-white shadow-[0_0_80px_rgba(255,46,71,0.65)]"
          style={{
            width: 360,
            height: 360,
            fontSize: 200,
            background:
              "linear-gradient(180deg, #FF3B47 0%, #E63946 60%, #B82734 100%)",
            border: "8px solid rgba(255,255,255,0.25)",
          }}
        >
          🪙
        </div>
      </div>

      {/* Outcome card */}
      <div
        className="absolute flex flex-col items-center gap-6"
        style={{
          opacity: outcomeOpacity,
          transform: `scale(${interpolate(outcomeEnter, [0, 1], [0.6, 1])})`,
        }}
      >
        <div
          className="text-9xl font-black text-[#00C851] leading-none tracking-tight"
          style={{
            textShadow:
              "0 0 60px rgba(0,200,81,0.7), 0 0 120px rgba(0,200,81,0.4)",
          }}
        >
          YOU WIN
        </div>
        <div className="bg-wove-ink rounded-3xl px-10 py-6 border-2 border-[#00C851]/40">
          <p className="text-white/55 text-2xl font-bold uppercase tracking-widest text-center mb-2">
            Coin Flip · 50% Off
          </p>
          <div className="flex items-baseline justify-center gap-4">
            <span className="text-7xl font-black text-white">${youPay}</span>
            <span className="text-3xl text-white/40 line-through font-semibold">
              ${price}
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
