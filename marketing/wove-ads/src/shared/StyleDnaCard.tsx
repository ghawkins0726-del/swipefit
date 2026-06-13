import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type StyleDnaCardProps = {
  /** Frame the card slides in. */
  from: number;
  /** Frame the card slides out (or unmount). */
  to: number;
  archetype?: string;
  archetypeDesc?: string;
  keywords?: string[];
  /** Target bar values 0–100. */
  dimensions?: { name: string; value: number; color: string }[];
  basedOn?: number;
};

const DEFAULT_DIMENSIONS = [
  { name: "Vintage", value: 92, color: "#A0522D" },
  { name: "Streetwear", value: 78, color: "#E63946" },
  { name: "Minimal", value: 64, color: "#0A0A0A" },
  { name: "Y2K", value: 58, color: "#FF6B9D" },
  { name: "Preppy", value: 32, color: "#1565C0" },
  { name: "Athletic", value: 18, color: "#E65100" },
];

/**
 * Style DNA card — materializes mid-ad to show the AI taste profile that builds
 * from the user's swipes. Modeled on src/components/StyleDnaCard.tsx in the app.
 */
export const StyleDnaCard: React.FC<StyleDnaCardProps> = ({
  from,
  to,
  archetype = "Vintage Streetwear",
  archetypeDesc = "Earth tones, soft grunge, a touch of 70s.",
  keywords = ["Vintage", "Denim", "Earth"],
  dimensions = DEFAULT_DIMENSIONS,
  basedOn = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  // Card enter — spring up from bottom
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 16, stiffness: 110 },
  });

  // Card exit — fade out
  const exit = interpolate(local, [to - from - 12, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [180, 0]);

  return (
    <AbsoluteFill className="flex items-center justify-center px-12 z-20 pointer-events-none">
      <div
        className="bg-white rounded-[40px] overflow-hidden shadow-2xl"
        style={{
          width: "82%",
          maxWidth: 720,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {/* Header (dark) */}
        <div className="bg-wove-ink px-8 pt-10 pb-7">
          <p className="text-white/45 text-base font-bold tracking-[0.3em] uppercase mb-2">
            Your Style DNA
          </p>
          <h2 className="text-white text-6xl font-black leading-none tracking-tight">
            {archetype}
          </h2>
          <p className="text-white/55 text-2xl mt-3 leading-snug">
            {archetypeDesc}
          </p>
          <div className="flex gap-3 mt-5">
            {keywords.map((k) => (
              <span
                key={k}
                className="text-base font-black uppercase tracking-wider text-wove-red border border-wove-red/40 px-3 py-1 rounded"
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="p-8 space-y-5">
          {dimensions.map((d, i) => {
            // Snappier cascade — first bar starts at local 8, stagger 2 frames
            const barStart = 8 + i * 2;
            const barProgress = spring({
              frame: local - barStart,
              fps,
              config: { damping: 14, stiffness: 130 },
            });
            const widthPct = d.value * barProgress;
            // Hide the numeric value until the bar has actually started growing
            const showValue = local >= barStart;

            return (
              <div key={d.name}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-2xl font-black text-wove-ink">{d.name}</p>
                  <p
                    className="text-2xl font-black text-black/40"
                    style={{ opacity: showValue ? 1 : 0 }}
                  >
                    {Math.round(widthPct)}
                  </p>
                </div>
                <div className="h-3 bg-black/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      background: d.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex items-center justify-between">
          <p className="text-lg text-black/45 font-semibold">
            Based on {basedOn} swipes
          </p>
          <div className="flex items-center gap-2 text-base font-black text-wove-red bg-wove-red/10 px-4 py-2 rounded-full">
            Share DNA
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
