import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { WoveLogo } from "../shared/WoveLogo";

export const TestLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo spring entrance
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  // Subtle backdrop pulse — wove-red glow behind shell
  const pulse = interpolate(
    Math.sin((frame / fps) * Math.PI),
    [-1, 1],
    [0.25, 0.55]
  );

  const backdrop = (
    <AbsoluteFill className="flex items-center justify-center">
      <div
        className="rounded-full bg-wove-red"
        style={{
          width: 1100,
          height: 1100,
          filter: `blur(160px)`,
          opacity: pulse,
        }}
      />
    </AbsoluteFill>
  );

  return (
    <WoveFrame backdrop={backdrop}>
      <AbsoluteFill className="flex items-center justify-center text-wove-ink">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <WoveLogo size={280} withWordmark wordmarkSizeClass="text-8xl" />
        </div>
      </AbsoluteFill>
    </WoveFrame>
  );
};
