import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Variant = "bold-center" | "full-bleed" | "typewriter";

type HookTextProps = {
  /** When this text becomes visible (frame). */
  from: number;
  /** When this text disappears (frame). */
  to: number;
  text: string;
  variant?: Variant;
  /** Optional override for color. Default: white. */
  color?: string;
  /** Optional background — used by full-bleed variant. */
  bg?: string;
  /** Optional vertical position offset from center (0 = center). px. */
  yOffset?: number;
  /** Text size class. */
  sizeClass?: string;
};

/**
 * Hook + caption overlay. All ads use this for top-of-screen hooks and mid-ad
 * captions. Variants:
 *   - bold-center: large centered text with a soft text-shadow
 *   - full-bleed:  fills the whole frame with a colored bg
 *   - typewriter:  characters reveal one-by-one (for URL animations)
 */
export const HookText: React.FC<HookTextProps> = ({
  from,
  to,
  text,
  variant = "bold-center",
  color = "white",
  bg,
  yOffset = 0,
  sizeClass = "text-8xl",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const enterDuration = 10;
  const exitStart = to - from - 8;

  const enter = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const exit = interpolate(local, [exitStart, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);
  const scale = interpolate(enter, [0, 1], [0.92, 1]);

  if (variant === "full-bleed") {
    return (
      <AbsoluteFill
        className="flex items-center justify-center"
        style={{ background: bg ?? "#000", opacity }}
      >
        <h1
          className={`${sizeClass} font-black tracking-tight text-center leading-none px-12`}
          style={{
            color,
            transform: `scale(${scale})`,
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </h1>
      </AbsoluteFill>
    );
  }

  if (variant === "typewriter") {
    const charsRevealed = Math.floor(
      interpolate(local, [0, Math.max(8, (to - from) * 0.6)], [0, text.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    return (
      <AbsoluteFill className="flex items-center justify-center pointer-events-none">
        <h1
          className={`${sizeClass} font-black tracking-tight text-center leading-none px-12`}
          style={{
            color,
            opacity,
            transform: `translateY(${yOffset}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
            fontFamily: "monospace",
          }}
        >
          {text.slice(0, charsRevealed)}
          <span style={{ opacity: Math.sin(local / 3) > 0 ? 1 : 0 }}>|</span>
        </h1>
      </AbsoluteFill>
    );
  }

  // bold-center
  return (
    <AbsoluteFill className="flex items-center justify-center pointer-events-none z-40">
      <h1
        className={`${sizeClass} font-black tracking-tight text-center leading-none px-12`}
        style={{
          color,
          opacity,
          transform: `translateY(${yOffset}px) scale(${scale})`,
          textShadow: "0 6px 32px rgba(0,0,0,0.7), 0 0 80px rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </h1>
    </AbsoluteFill>
  );
};
