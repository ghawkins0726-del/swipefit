import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AdItem } from "../data/woveItems";

type LikedGridProps = {
  from: number;
  to: number;
  /** Items the user has liked, in swipe order. */
  items: AdItem[];
  /** Item index to highlight (e.g., the one the user is about to buy). */
  highlightIndex?: number;
  /** Frame (relative to from) when the highlight pulse begins. */
  highlightAt?: number;
};

/**
 * The user's "Liked" section — an authentic grid view of items they've saved.
 * This is the ONLY legitimate grid surface in Wove. Items cascade in with a
 * stagger to mirror the swipes that filled the wall.
 */
export const LikedGrid: React.FC<LikedGridProps> = ({
  from,
  to,
  items,
  highlightIndex,
  highlightAt = 35,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  const titleSpring = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  return (
    <div className="absolute inset-0 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="px-8 pt-10 pb-6 border-b border-black/8"
        style={{ opacity: titleSpring }}
      >
        <p className="text-black/45 text-xl font-bold uppercase tracking-[0.25em] mb-1">
          Your Liked
        </p>
        <div className="flex items-baseline justify-between">
          <h2 className="text-wove-ink text-6xl font-black tracking-tight">
            {items.length} {items.length === 1 ? "item" : "items"}
          </h2>
          <div className="flex items-center gap-2 bg-wove-red/10 px-4 py-2 rounded-full">
            <svg viewBox="0 0 24 24" fill="#FF2E47" width="22" height="22">
              <path d="M12 21s-7-4.5-9.5-9.2C.8 8.2 2.7 4.5 6 4.5c2 0 3.4 1 4.4 2.6h.2C11.6 5.5 13 4.5 15 4.5c3.3 0 5.2 3.7 3.5 7.3C19 16.5 12 21 12 21z" />
            </svg>
            <span className="text-wove-red font-black text-xl">Saved</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 p-6">
        {items.map((item, i) => {
          const tileEnter = spring({
            frame: local - 8 - i * 9,
            fps,
            config: { damping: 14, stiffness: 110 },
          });
          const tileScale = interpolate(tileEnter, [0, 1], [0.85, 1]);
          const tileY = interpolate(tileEnter, [0, 1], [60, 0]);

          // Optional highlight pulse on the chosen tile
          const isHighlighted = i === highlightIndex;
          const pulseT = isHighlighted
            ? Math.max(0, local - highlightAt)
            : 0;
          const pulse =
            isHighlighted && pulseT > 0
              ? 1 + 0.04 * Math.sin((pulseT / fps) * Math.PI * 3)
              : 1;
          const haloOpacity =
            isHighlighted && pulseT > 0
              ? 0.5 + 0.3 * Math.sin((pulseT / fps) * Math.PI * 3)
              : 0;

          return (
            <div
              key={item.id}
              className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-lg"
              style={{
                opacity: tileEnter,
                transform: `translateY(${tileY}px) scale(${tileScale * pulse})`,
                background: `linear-gradient(180deg, ${item.gradient[0]} 0%, ${item.gradient[1]} 100%)`,
                outline: isHighlighted
                  ? `4px solid rgba(255, 46, 71, ${haloOpacity})`
                  : "none",
                outlineOffset: 2,
              }}
            >
              <Img
                src={staticFile(item.image)}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Heart badge */}
              <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-wove-red flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                  <path d="M12 21s-7-4.5-9.5-9.2C.8 8.2 2.7 4.5 6 4.5c2 0 3.4 1 4.4 2.6h.2C11.6 5.5 13 4.5 15 4.5c3.3 0 5.2 3.7 3.5 7.3C19 16.5 12 21 12 21z" />
                </svg>
              </div>

              {/* Bottom info */}
              <div
                className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)",
                }}
              >
                <p
                  className="text-white text-2xl font-black truncate leading-tight"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
                >
                  ${item.price}
                </p>
                <p
                  className="text-white/75 text-base font-semibold truncate"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                >
                  {item.brand}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
