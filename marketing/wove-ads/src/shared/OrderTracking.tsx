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

type OrderTrackingProps = {
  from: number;
  to: number;
  item: AdItem;
  /** Active stage 0-2 → which step pulses with a green check. */
  stage: number;
  /** Optional frame at which the stage progresses (re-pulses on update). */
  stageProgressAt?: number;
};

const STAGES = ["Paid", "Shipped", "Delivered"];

/**
 * Order tracking card. Shows a progress bar with 3 nodes — Paid → Shipped →
 * Delivered. The active node has a green check; completed nodes are filled.
 *
 * When stageProgressAt is set, the bar fills toward the next stage over ~30 frames,
 * giving the illusion of a real-time tracking update.
 */
export const OrderTracking: React.FC<OrderTrackingProps> = ({
  from,
  to,
  item,
  stage,
  stageProgressAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  const cardEnter = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  // Effective stage — animates from `stage` to `stage+1` after stageProgressAt
  let effectiveStage = stage;
  let interStageFill = 0;
  if (stageProgressAt != null && local >= stageProgressAt) {
    const t = Math.min(1, (local - stageProgressAt) / 30);
    interStageFill = t;
    if (t >= 1) effectiveStage = stage + 1;
  }

  return (
    <AbsoluteFill className="flex items-center justify-center px-12 z-20 pointer-events-none">
      <div
        className="bg-white rounded-[40px] overflow-hidden shadow-2xl"
        style={{
          width: "82%",
          maxWidth: 720,
          opacity: cardEnter,
          transform: `translateY(${interpolate(cardEnter, [0, 1], [80, 0])}px)`,
        }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-black/8 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
            <Img
              src={staticFile(item.image)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-black/45 text-base font-bold uppercase tracking-[0.2em]">
              Order
            </p>
            <p className="text-wove-ink text-3xl font-black tracking-tight leading-tight truncate">
              {item.title}
            </p>
            <p className="text-black/55 text-xl font-semibold mt-1">
              {item.brand} · ${item.price}
            </p>
          </div>
        </div>

        {/* Progress bar with 3 stops */}
        <div className="px-7 py-9">
          <div className="relative flex items-center justify-between">
            {/* Track line — gray underlay */}
            <div
              className="absolute bg-black/10"
              style={{ left: 32, right: 32, top: "50%", height: 6, transform: "translateY(-50%)" }}
            />
            {/* Filled portion */}
            <div
              className="absolute bg-[#00C851]"
              style={{
                left: 32,
                top: "50%",
                height: 6,
                transform: "translateY(-50%)",
                width: `calc((100% - 64px) * ${
                  (effectiveStage + interStageFill) / (STAGES.length - 1)
                })`,
                transition: "width 0.1s linear",
              }}
            />

            {STAGES.map((label, i) => {
              const done = i <= effectiveStage;
              const isCurrent = i === effectiveStage;
              const pulseT = Math.max(0, local - (stageProgressAt ?? 0));
              const pulse =
                isCurrent && pulseT > 0
                  ? 1 + 0.08 * Math.sin((pulseT / fps) * Math.PI * 3)
                  : 1;
              return (
                <div key={label} className="relative flex flex-col items-center z-10" style={{ width: 80 }}>
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 64,
                      height: 64,
                      background: done ? "#00C851" : "rgba(0,0,0,0.08)",
                      border: done ? "3px solid #00C851" : "3px solid rgba(0,0,0,0.15)",
                      transform: `scale(${pulse})`,
                      boxShadow: done ? "0 4px 16px rgba(0,200,81,0.4)" : "none",
                    }}
                  >
                    {done && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" width="32" height="32">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p
                    className="absolute text-xl font-black tracking-tight whitespace-nowrap"
                    style={{
                      top: 76,
                      color: done ? "#0A0A0A" : "rgba(0,0,0,0.4)",
                    }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Status copy below */}
          <p
            className="text-center text-black/50 text-xl font-semibold mt-20"
          >
            {effectiveStage === 0 && "Payment confirmed."}
            {effectiveStage === 1 && "Shipping label printed."}
            {effectiveStage === 2 && "Delivered to your door."}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
