import React from "react";
import { Img, staticFile } from "remotion";
import { AdItem } from "../data/woveItems";

const CONDITION_LABELS: Record<AdItem["condition"], string> = {
  new: "New with tags",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};

type SwipeCardProps = {
  item: AdItem;
  /** Drag offset on the X-axis. Drives rotation + side overlays. */
  x?: number;
  /** Drag offset on the Y-axis. */
  y?: number;
  /** Optional override scale (for stack cards behind the top). */
  scale?: number;
  /** Whether to render the LIKE/NOPE stamps. */
  showStamps?: boolean;
  /** Optional Style-DNA match score (0–100). Renders a glassy chip top-right. */
  matchScore?: number;
};

/**
 * Remotion-friendly replica of the in-app SwipeCard. Visual only — driven
 * entirely by props rather than Framer Motion / pointer events.
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  item,
  x = 0,
  y = 0,
  scale = 1,
  showStamps = true,
  matchScore,
}) => {
  const rotation = Math.max(-18, Math.min(18, (x / 300) * 18));

  const likeOpacity = Math.max(0, Math.min(1, (x - 15) / 65));
  const nopeOpacity = Math.max(0, Math.min(1, (-x - 15) / 65));

  const greenOverlay = Math.max(0, Math.min(0.45, (x / 120) * 0.45));
  const redOverlay = Math.max(0, Math.min(0.45, (-x / 120) * 0.45));

  return (
    <div
      className="absolute inset-0 rounded-[36px] overflow-hidden shadow-2xl"
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "center bottom",
        background: `linear-gradient(180deg, ${item.gradient[0]} 0%, ${item.gradient[1]} 100%)`,
      }}
    >
      {/* Real photograph — full bleed */}
      <Img
        src={staticFile(item.image)}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Green wash (like) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,200,80,1) 0%, transparent 60%)",
          opacity: greenOverlay,
        }}
      />

      {/* Red wash (nope) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(225deg, rgba(230,57,70,1) 0%, transparent 60%)",
          opacity: redOverlay,
        }}
      />

      {/* Bottom scrim — longer + heavier so text reads cleanly over photos */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "65%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      />

      {/* LIKE stamp */}
      {showStamps && (
        <div
          className="absolute top-12 left-8 pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <div className="border-[6px] border-[#00C851] rounded-2xl px-6 py-3 -rotate-12">
            <span className="text-[#00C851] font-black text-6xl tracking-widest">
              LIKE
            </span>
          </div>
        </div>
      )}

      {/* NOPE stamp */}
      {showStamps && (
        <div
          className="absolute top-12 right-8 pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <div className="border-[6px] border-[#E63946] rounded-2xl px-6 py-3 rotate-12">
            <span className="text-[#E63946] font-black text-6xl tracking-widest">
              NOPE
            </span>
          </div>
        </div>
      )}

      {/* Match-score badge (Style-DNA confidence) — appears when set */}
      {matchScore != null && matchScore > 50 && (
        <div className="absolute right-6 pointer-events-none" style={{ top: 28 }}>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <span className="text-[#00C851] text-base leading-none">●</span>
            <span className="text-white text-2xl font-black">
              {matchScore}% match
            </span>
          </div>
        </div>
      )}

      {/* Bottom info overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-8 pb-12 z-10 pointer-events-none">
        <h2
          className="text-white font-black text-5xl leading-tight mb-2"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
        >
          {item.title}
        </h2>

        <p
          className="text-white font-black text-4xl mb-4"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
        >
          ${item.price}
          {item.originalPrice && (
            <span className="text-white/55 line-through ml-3 text-2xl font-semibold">
              ${item.originalPrice}
            </span>
          )}
        </p>

        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-white/85 text-2xl font-semibold">
            {item.brand}
          </span>
          <span className="text-white/50">·</span>
          <span className="text-white/85 text-2xl">Size {item.size}</span>
          <span className="text-white/50">·</span>
          <span className="text-white/85 text-2xl">{item.sellerName}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {item.styles.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-xl font-semibold text-white/90 capitalize px-4 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              {s}
            </span>
          ))}
          <span
            className="text-xl font-semibold text-white/75 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            {CONDITION_LABELS[item.condition]}
          </span>
        </div>
      </div>
    </div>
  );
};
