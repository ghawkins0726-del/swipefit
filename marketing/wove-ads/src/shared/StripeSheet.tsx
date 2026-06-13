import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AdItem } from "../data/woveItems";

type StripeSheetProps = {
  from: number;
  to: number;
  item: AdItem;
  /** Last 4 of the card on file. */
  cardLast4?: string;
  cardBrand?: string;
};

/**
 * Bottom-sheet payment UI matching the Stripe Express look. Slides up over the
 * phone screen, shows item summary + payment method, the big "Pay $X" button
 * pulses, and (in the orchestrating composition) the button gets "tapped" by
 * having the sheet fade out into the success state.
 */
export const StripeSheet: React.FC<StripeSheetProps> = ({
  from,
  to,
  item,
  cardLast4 = "4242",
  cardBrand = "Visa",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  // Backdrop fade
  const backdrop = interpolate(local, [0, 14], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sheet slide up
  const sheetSpring = spring({
    frame: local,
    fps,
    config: { damping: 20, stiffness: 160 },
  });
  const sheetY = interpolate(sheetSpring, [0, 1], [900, 0]);

  // Sheet exit (slides down at end)
  const exit = interpolate(local, [to - from - 14, to - from], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sheetYExit = exit * 900;

  // Pay button "tap" highlight ~3/4 through
  const tapAt = (to - from) * 0.78;
  const tapHighlight = interpolate(
    local,
    [tapAt, tapAt + 6, tapAt + 14],
    [1, 0.85, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Button gentle pulse
  const pulse = 1 + 0.015 * Math.sin((local / fps) * Math.PI * 2.5);

  return (
    <AbsoluteFill className="z-30 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)", opacity: backdrop / 0.78 }}
      />

      {/* Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[44px] overflow-hidden"
        style={{
          transform: `translateY(${sheetY + sheetYExit}px)`,
          minHeight: "62%",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Drag handle */}
        <div className="w-20 h-1.5 bg-black/12 rounded-full mx-auto mt-5" />

        {/* Header */}
        <div className="px-8 pt-6 pb-4">
          <p className="text-black/45 text-xl font-bold uppercase tracking-widest">
            Pay with Stripe
          </p>
        </div>

        {/* Item row */}
        <div className="mx-8 bg-black/4 rounded-3xl p-4 flex items-center gap-5 mb-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
            <Img
              src={staticFile(item.image)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-wove-ink text-3xl font-black truncate leading-tight">
              {item.title}
            </p>
            <p className="text-black/55 text-xl font-semibold mt-1">
              {item.brand} · Size {item.size}
            </p>
          </div>
        </div>

        {/* Card on file */}
        <div className="mx-8 bg-black/4 rounded-3xl p-5 flex items-center gap-5 mb-6">
          <div className="w-16 h-11 rounded-lg bg-[#1A1F71] flex items-center justify-center">
            <span className="text-white font-black text-xl italic tracking-tight">
              VISA
            </span>
          </div>
          <div className="flex-1">
            <p className="text-wove-ink text-2xl font-black">
              {cardBrand} ····{cardLast4}
            </p>
            <p className="text-black/45 text-lg">Card on file</p>
          </div>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00C851"
            strokeWidth="3"
            width="36"
            height="36"
          >
            <path
              d="M5 12l5 5L20 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Total */}
        <div className="mx-8 flex items-center justify-between mb-7">
          <p className="text-wove-ink text-3xl font-black">Total</p>
          <div className="flex items-baseline gap-3">
            {item.originalPrice && (
              <span className="text-black/40 line-through text-2xl font-semibold">
                ${item.originalPrice}
              </span>
            )}
            <span className="text-wove-ink text-5xl font-black">
              ${item.price}
            </span>
          </div>
        </div>

        {/* Pay button */}
        <div className="px-8 pb-12">
          <div
            className="w-full rounded-2xl py-6 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, #635BFF 0%, #4F46E5 100%)",
              transform: `scale(${pulse * tapHighlight})`,
              boxShadow: "0 12px 24px rgba(99,91,255,0.45)",
            }}
          >
            <p className="text-white text-4xl font-black tracking-tight">
              Pay ${item.price}
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
