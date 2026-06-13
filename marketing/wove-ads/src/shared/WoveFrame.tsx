import React from "react";
import { AbsoluteFill } from "remotion";

type WoveFrameProps = {
  children: React.ReactNode;
  /** Background behind the phone shell. */
  backdrop?: React.ReactNode;
  /** Status bar time string. Default 9:41 (the Apple classic). */
  time?: string;
};

/**
 * 9:16 phone-shell wrapper. Every UI ad renders inside one of these so the brand
 * frame is consistent across the entire ad file base.
 *
 * Canvas is 1080×1920. The phone shell is centered, ~85% of canvas height,
 * with a dark device bezel, a Dynamic-Island-style notch, and a status bar mock.
 */
export const WoveFrame: React.FC<WoveFrameProps> = ({
  children,
  backdrop,
  time = "9:41",
}) => {
  // Phone shell geometry
  const SHELL_W = 880;
  const SHELL_H = 1760;
  const BEZEL = 18;
  const RADIUS = 96;

  return (
    <AbsoluteFill className="bg-wove-ink">
      {backdrop}

      <AbsoluteFill className="flex items-center justify-center">
        {/* Outer bezel */}
        <div
          className="relative bg-black shadow-2xl"
          style={{
            width: SHELL_W,
            height: SHELL_H,
            borderRadius: RADIUS,
          }}
        >
          {/* Inner screen */}
          <div
            className="absolute overflow-hidden bg-white"
            style={{
              top: BEZEL,
              left: BEZEL,
              width: SHELL_W - BEZEL * 2,
              height: SHELL_H - BEZEL * 2,
              borderRadius: RADIUS - BEZEL,
            }}
          >
            {/* Status bar */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-12 text-black text-2xl font-semibold z-50"
              style={{ height: 70 }}
            >
              <span>{time}</span>
              <div className="flex items-center gap-2">
                {/* Signal */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 h-1 bg-black rounded-sm" />
                  <div className="w-1 h-2 bg-black rounded-sm" />
                  <div className="w-1 h-3 bg-black rounded-sm" />
                  <div className="w-1 h-4 bg-black rounded-sm" />
                </div>
                {/* Battery */}
                <div className="ml-2 w-9 h-4 rounded-sm border-2 border-black relative">
                  <div className="absolute inset-0.5 bg-black rounded-xs" />
                </div>
              </div>
            </div>

            {/* Dynamic island */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-black z-50"
              style={{
                top: 22,
                width: 240,
                height: 40,
                borderRadius: 24,
              }}
            />

            {/* Slot for ad content — sits below status bar */}
            <div className="absolute inset-0 pt-[90px]">{children}</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
