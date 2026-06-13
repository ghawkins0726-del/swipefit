import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type MatchToastProps = {
  from: number;
  to: number;
  sellerName: string;
  itemTitle: string;
};

export const MatchToast: React.FC<MatchToastProps> = ({
  from,
  to,
  sellerName,
  itemTitle,
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
          className="text-9xl font-black text-wove-red leading-none"
          style={{
            textShadow:
              "0 0 60px rgba(255,46,71,0.7), 0 0 120px rgba(255,46,71,0.45)",
            letterSpacing: "-0.04em",
          }}
        >
          IT'S A MATCH
        </div>
        <div className="text-white/90 text-3xl font-semibold text-center px-12">
          {sellerName} liked <span className="italic">{itemTitle}</span> too
        </div>
      </div>
    </AbsoluteFill>
  );
};
