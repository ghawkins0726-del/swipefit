import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ITEMS } from "../data/woveItems";

type GridMockProps = {
  /** Frame when grid begins scrolling away. */
  exitAt?: number;
  /** Frames over which the grid exits. */
  exitDuration?: number;
};

/**
 * Endless-grid backdrop — the "Depop / Poshmark" feeling we contrast against
 * the swipe stack. Used by Pillar 1's "Stop scrolling" hook.
 */
export const GridMock: React.FC<GridMockProps> = ({
  exitAt = 9999,
  exitDuration = 18,
}) => {
  const frame = useCurrentFrame();

  // Slow continuous scroll while visible
  const scrollY = (frame * 1.2) % 320;

  const exitProgress = interpolate(
    frame,
    [exitAt, exitAt + exitDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitY = exitProgress * -1800;
  const exitOpacity = 1 - exitProgress;

  // Tile the items across a 3-column grid, repeated vertically.
  const rows = 12;
  const cols = 3;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-neutral-100"
      style={{
        transform: `translateY(${exitY}px)`,
        opacity: exitOpacity,
      }}
    >
      <div
        className="grid grid-cols-3 gap-2 p-3"
        style={{ transform: `translateY(-${scrollY}px)` }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const item = ITEMS[i % ITEMS.length];
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden aspect-square relative"
              style={{
                background: `linear-gradient(180deg, ${item.gradient[0]} 0%, ${item.gradient[1]} 100%)`,
              }}
            >
              <Img
                src={staticFile(item.image)}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                }}
              >
                <p
                  className="text-white text-sm font-black truncate"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                >
                  ${item.price}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
