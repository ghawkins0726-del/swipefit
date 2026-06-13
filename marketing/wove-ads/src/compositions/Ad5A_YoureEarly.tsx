import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WoveLogo } from "../shared/WoveLogo";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { WaitlistCounter } from "../shared/WaitlistCounter";

/**
 * Ad 5A — "You're early."
 *
 * Pillar 5 (waitlist FOMO / conversion push). Pure scarcity play, no UI walkthrough.
 * Full-bleed black canvas — no phone shell — because the ad is the brand message.
 *
 * 15s timeline @ 30fps (450 frames):
 *   0.0–1.5  (0–45)   : Hook "You're early." full-bleed black
 *   1.5–3.5  (45–105) : Wove logo pulses on; counter materializes
 *   3.5–7.0  (105–210): Counter ticks down 847 → 843 — "live" feel
 *   7.0–10.5 (210–315): Perks list slides in (3 perks)
 *   10.5–13.0(315–390): Hook "Doors close at 1,000."
 *   13.0–13.5(390–405): Hold
 *   13.5–15.0(405–450): CTA outro
 */

const PERKS = [
  "Premium for life.",
  "Seller fees waived.",
  "First dibs on drops.",
];

export const Ad5A_YoureEarly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo materializes around frame 50, pulses gently
  const logoEnter = spring({
    frame: frame - 50,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const logoPulse = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

  // Background red glow pulse — sells urgency
  const bgPulse = interpolate(
    Math.sin((frame / fps) * Math.PI),
    [-1, 1],
    [0.18, 0.32]
  );

  return (
    <AbsoluteFill className="bg-wove-ink">
      {/* Backdrop red glow */}
      <AbsoluteFill className="flex items-center justify-center">
        <div
          className="rounded-full bg-wove-red"
          style={{
            width: 1400,
            height: 1400,
            filter: "blur(220px)",
            opacity: bgPulse,
          }}
        />
      </AbsoluteFill>

      {/* Wove logo high on screen */}
      <div
        className="absolute left-1/2 text-white"
        style={{
          top: 220,
          transform: `translateX(-50%) scale(${logoEnter * logoPulse})`,
          opacity: logoEnter,
        }}
      >
        <WoveLogo size={140} withWordmark wordmarkSizeClass="text-7xl" />
      </div>

      {/* Counter (drives the ad) */}
      <WaitlistCounter
        from={70}
        to={390}
        startValue={847}
        endValue={843}
        total={1000}
        tickStartAt={40}
        tickDuration={75}
        yOffset={40}
      />

      {/* Perks list */}
      <PerksReveal from={210} to={390} perks={PERKS} />

      {/* Hooks */}
      <HookText
        from={0}
        to={42}
        text="You're early."
        variant="full-bleed"
        color="white"
        bg="#0A0A0A"
        sizeClass="text-9xl"
      />
      <HookText
        from={315}
        to={395}
        text="Doors close at 1,000."
        variant="bold-center"
        color="white"
        yOffset={760}
        sizeClass="text-6xl"
      />

      <CTAOutro from={405} />
    </AbsoluteFill>
  );
};

/**
 * Three perks slide up from the bottom, staggered. Used only by Ad 5A.
 */
const PerksReveal: React.FC<{
  from: number;
  to: number;
  perks: string[];
}> = ({ from, to, perks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  const exit = interpolate(local, [to - from - 14, to - from], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="pointer-events-none z-20">
      <div
        className="absolute left-1/2 flex flex-col items-center gap-5"
        style={{
          top: 1330,
          transform: "translateX(-50%)",
          opacity: exit,
        }}
      >
        {perks.map((perk, i) => {
          const stagger = i * 16;
          const enter = spring({
            frame: local - stagger,
            fps,
            config: { damping: 14, stiffness: 130 },
          });
          const translateY = interpolate(enter, [0, 1], [60, 0]);
          return (
            <div
              key={perk}
              className="flex items-center gap-5 px-10 py-5 rounded-full"
              style={{
                background: "rgba(20,20,22,0.85)",
                border: "1px solid rgba(255,46,71,0.4)",
                boxShadow: "0 0 40px rgba(255,46,71,0.3)",
                opacity: enter,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(180deg, #FF3B47 0%, #E63946 100%)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  width="22"
                  height="22"
                >
                  <path
                    d="M5 12l5 5L20 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-white text-4xl font-black tracking-tight">
                {perk}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
