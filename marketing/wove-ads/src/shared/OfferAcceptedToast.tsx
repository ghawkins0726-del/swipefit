import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type OfferAcceptedToastProps = {
  from: number;
  to: number;
  sellerName: string;
  /** What the seller accepted, e.g., "Coin Flip" or "Offer". */
  acceptedThing?: string;
  /** Final price the buyer pays (after coin-flip win, offer, etc.). */
  finalPrice: number;
  /** Big celebration label. Defaults to "OFFER ACCEPTED" (coin flip / offer).
   *  For direct buys, pass "ORDER PLACED" or similar. */
  headline?: string;
  /** Subline copy. Defaults to "{sellerName} accepted your {acceptedThing}". */
  sublineOverride?: string;
};

/**
 * Celebration toast when the seller accepts an offer / coin flip.
 * Replaces the Tinder-style "match" framing — Wove has no match mechanic.
 * Sellers accept buyer-initiated offers/flips one direction.
 */
export const OfferAcceptedToast: React.FC<OfferAcceptedToastProps> = ({
  from,
  to,
  sellerName,
  acceptedThing = "Coin Flip",
  finalPrice,
  headline = "OFFER ACCEPTED",
  sublineOverride,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 11, stiffness: 90 },
  });

  const exit = interpolate(local, [to - from - 10, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      className="flex items-center justify-center pointer-events-none z-30"
      style={{ background: "rgba(0,0,0,0.55)", opacity: Math.min(enter, exit) }}
    >
      <div
        className="flex flex-col items-center gap-6"
        style={{ transform: `scale(${interpolate(enter, [0, 1], [0.7, 1])})` }}
      >
        <div
          className="text-8xl font-black text-[#00C851] leading-none tracking-tight whitespace-nowrap"
          style={{
            textShadow:
              "0 0 60px rgba(0,200,81,0.65), 0 0 120px rgba(0,200,81,0.4)",
            letterSpacing: "-0.04em",
          }}
        >
          {headline}
        </div>

        <div className="text-white/90 text-3xl font-semibold text-center px-12">
          {sublineOverride ?? `${sellerName} accepted your ${acceptedThing}`}
        </div>

        <div className="bg-wove-ink rounded-3xl px-10 py-5 border-2 border-[#00C851]/40 mt-2">
          <p className="text-white/55 text-xl font-bold uppercase tracking-widest text-center mb-1">
            Order Confirmed
          </p>
          <p className="text-white text-6xl font-black text-center">
            You pay ${finalPrice}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
