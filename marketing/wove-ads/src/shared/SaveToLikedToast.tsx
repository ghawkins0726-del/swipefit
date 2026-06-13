import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type SaveToLikedToastProps = {
  from: number;
  to: number;
};

/**
 * Brief "Saved to Liked" toast that pops at the top of the phone screen after
 * each right-swipe. Reinforces what the swipe actually does (saves to Liked,
 * NOT a Tinder match). Heart icon + short label, spring entrance, quick fade out.
 */
export const SaveToLikedToast: React.FC<SaveToLikedToastProps> = ({
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 11, stiffness: 130 },
  });
  const exit = interpolate(local, [to - from - 6, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [-60, 0]);

  // Heart subtle pulse
  const heartPulse = 1 + 0.08 * Math.sin((local / fps) * Math.PI * 4);

  return (
    <AbsoluteFill className="flex items-start justify-center pointer-events-none z-30">
      <div
        className="mt-32 bg-black/85 backdrop-blur-md rounded-full pl-4 pr-7 py-3 flex items-center gap-3"
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          border: "1px solid rgba(255, 46, 71, 0.45)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full bg-wove-red flex items-center justify-center"
          style={{ transform: `scale(${heartPulse})` }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="white"
            width="22"
            height="22"
            aria-hidden
          >
            <path d="M12 21s-7-4.5-9.5-9.2C.8 8.2 2.7 4.5 6 4.5c2 0 3.4 1 4.4 2.6h.2C11.6 5.5 13 4.5 15 4.5c3.3 0 5.2 3.7 3.5 7.3C19 16.5 12 21 12 21z" />
          </svg>
        </div>
        <span className="text-white text-2xl font-black tracking-tight">
          Saved to Liked
        </span>
      </div>
    </AbsoluteFill>
  );
};
