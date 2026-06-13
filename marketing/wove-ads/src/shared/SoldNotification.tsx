import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AdItem } from "../data/woveItems";

type SoldNotificationProps = {
  from: number;
  to: number;
  item: AdItem;
  buyerName: string;
};

/**
 * Seller-side sale moment. iOS-style notification slides in from the top
 * announcing the sale, then a big "+$X" payout counter ticks up below it.
 *
 * Visual: notification at top (~y=200), payout counter centered.
 * Math: payout = round(item.price * 0.9 * 100) / 100 — Wove 90/10 split.
 */
export const SoldNotification: React.FC<SoldNotificationProps> = ({
  from,
  to,
  item,
  buyerName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const payout = Math.round(item.price * 0.9 * 100) / 100;

  // Backdrop dim
  const backdrop = interpolate(local, [0, 10], [0, 0.45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Notification slide in from top
  const notifEnter = spring({
    frame: local,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  const notifY = interpolate(notifEnter, [0, 1], [-200, 0]);

  // Counter — starts at frame 18, counts up to payout
  const counterLocal = Math.max(0, local - 18);
  const counterProgress = spring({
    frame: counterLocal,
    fps,
    config: { damping: 22, stiffness: 60 },
  });
  const counterValue = (payout * counterProgress).toFixed(2);
  const counterScale = spring({
    frame: counterLocal,
    fps,
    config: { damping: 11, stiffness: 100 },
  });

  // Container fade out at end
  const containerFade = interpolate(local, [to - from - 10, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="z-30 pointer-events-none" style={{ opacity: containerFade }}>
      {/* Backdrop dim */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", opacity: backdrop / 0.7 }}
      />

      {/* iOS-style notification at top */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-5 rounded-3xl px-6 py-5 shadow-2xl"
        style={{
          top: 200 + notifY,
          width: 780,
          background: "rgba(20, 20, 22, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Wove app icon — heart in wove-red */}
        <div
          className="flex items-center justify-center rounded-2xl shrink-0"
          style={{
            width: 64,
            height: 64,
            background: "linear-gradient(180deg, #FF3B47 0%, #E63946 100%)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="36" height="36">
            <path d="M12 21s-7-4.5-9.5-9.2C.8 8.2 2.7 4.5 6 4.5c2 0 3.4 1 4.4 2.6h.2C11.6 5.5 13 4.5 15 4.5c3.3 0 5.2 3.7 3.5 7.3C19 16.5 12 21 12 21z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white text-xl font-black tracking-wide uppercase">
              Wove
            </span>
            <span className="text-white/45 text-base">now</span>
          </div>
          <p className="text-white text-2xl font-black leading-tight">
            Sold to {buyerName}.
          </p>
          <p className="text-white/65 text-xl font-semibold mt-1 truncate">
            {item.title} · ${item.price}
          </p>
        </div>
      </div>

      {/* Big payout counter — centered */}
      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{
          top: 720,
          transform: `translateX(-50%) scale(${counterScale})`,
          transformOrigin: "top center",
          opacity: counterScale,
        }}
      >
        <p className="text-white/55 text-2xl font-bold uppercase tracking-[0.3em] mb-3">
          Into your balance
        </p>
        <p
          className="text-[#00C851] font-black leading-none tracking-tight"
          style={{
            fontSize: 200,
            textShadow:
              "0 0 60px rgba(0,200,81,0.55), 0 0 140px rgba(0,200,81,0.35)",
          }}
        >
          +${counterValue}
        </p>
        <p className="text-white/45 text-xl font-semibold mt-4">
          Wove takes 10. You keep ${payout.toFixed(2)}.
        </p>
      </div>
    </AbsoluteFill>
  );
};
