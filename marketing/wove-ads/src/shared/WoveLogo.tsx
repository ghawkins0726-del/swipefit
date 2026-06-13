import React from "react";

type WoveLogoProps = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  wordmarkSizeClass?: string;
};

/**
 * Portable Wove logo — visual fidelity mirrors src/components/Logo.tsx in the swipefit app
 * but without next/link so it renders inside Remotion. Hanger color follows currentColor.
 */
export const WoveLogo: React.FC<WoveLogoProps> = ({
  size = 120,
  className = "",
  withWordmark = false,
  wordmarkSizeClass = "text-6xl",
}) => {
  const height = size;
  const width = Math.round((size * 120) / 92);

  return (
    <div className={`inline-flex items-center gap-4 ${className}`}>
      <svg
        viewBox="0 0 120 92"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Wove"
        role="img"
      >
        <defs>
          <radialGradient id="wove-logo-heart-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF2E47" stopOpacity="0.85" />
            <stop offset="44%" stopColor="#FF2E47" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#FF2E47" stopOpacity="0" />
          </radialGradient>
          <filter
            id="wove-logo-heart-bloom"
            x="-70%"
            y="-70%"
            width="240%"
            height="240%"
          >
            <feGaussianBlur stdDeviation="3.5" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="84" cy="46" r="26" fill="url(#wove-logo-heart-aura)" />

        <g
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 30 50 L 30 28 C 30 19 38 13 46 15 C 54 17 57 25 54 31 C 51 37 46 37 44 34" />
          <path d="M 30 50 L 8 78" />
          <path d="M 30 50 L 52 78" />
          <path d="M 8 78 L 52 78" />
        </g>

        <path
          d="M 84 38 C 81 31 62 31 62 44 C 62 55 84 64 84 64 C 84 64 106 55 106 44 C 106 31 87 31 84 38 Z"
          fill="#FF2E47"
          filter="url(#wove-logo-heart-bloom)"
        />
      </svg>

      {withWordmark && (
        <span
          className={`font-black tracking-tight leading-none ${wordmarkSizeClass}`}
        >
          Wo<span className="text-wove-red">ve</span>
        </span>
      )}
    </div>
  );
};
