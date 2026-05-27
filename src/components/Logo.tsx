import Link from 'next/link';

interface LogoProps {
  /** Height of the logo mark in px. Width auto-scales (120:92 aspect ratio). Default 30. */
  size?: number;
  /** Extra Tailwind classes on the wrapper. Hanger uses currentColor — set `text-white` or `text-[#0A0A0A]` on the parent or here. */
  className?: string;
  /** Whether to show the "Wove" wordmark next to the mark. Default false. */
  withWordmark?: boolean;
  /** Wordmark text size in Tailwind units. Default "lg". */
  wordmarkSize?: 'sm' | 'base' | 'lg' | 'xl';
  /** If set, wraps the logo in a Next/Link to this href. */
  href?: string;
}

const wordmarkSizeMap = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * Wove logo mark.
 *
 * Design principles:
 *  - Hanger shoulder span (x=8→52) = 44px
 *  - Heart width (x=62→106) = 44px  ← identical visual weight, both halves balance
 *  - ViewBox 120×92 frames both elements with equal margins (~6px each side)
 *  - Heart center (84,46) aligns vertically with hanger body center
 *
 * Hanger color follows `currentColor`. Heart is always #FF2E47.
 */
export default function Logo({
  size = 30,
  className = '',
  withWordmark = false,
  wordmarkSize = 'lg',
  href,
}: LogoProps) {
  // Aspect ratio 120:92
  const height = size;
  const width  = Math.round((size * 120) / 92);

  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
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
          <radialGradient id="sf-logo-heart-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FF2E47" stopOpacity="0.85"/>
            <stop offset="44%"  stopColor="#FF2E47" stopOpacity="0.30"/>
            <stop offset="100%" stopColor="#FF2E47" stopOpacity="0"/>
          </radialGradient>
          <filter id="sf-logo-heart-bloom" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.5" result="b1"/>
            <feMerge>
              <feMergeNode in="b1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Heart aura — centered on heart (84,46) */}
        <circle cx="84" cy="46" r="26" fill="url(#sf-logo-heart-aura)"/>

        {/*
          Hanger
          Junction: (30, 50)
          Left shoulder:  (30,50) → (8,78)   span = 22px left
          Right shoulder: (30,50) → (52,78)   span = 22px right
          Crossbar: (8,78) → (52,78)          width = 44px
          Hook loop: stem rises to (30,28), arcs right to peak ~(46,14),
                     curls back to tip ~(44,34)
        */}
        <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 30 50 L 30 28 C 30 19 38 13 46 15 C 54 17 57 25 54 31 C 51 37 46 37 44 34"/>
          <path d="M 30 50 L 8 78"/>
          <path d="M 30 50 L 52 78"/>
          <path d="M 8 78 L 52 78"/>
        </g>

        {/*
          Heart
          Center: (84, 46)
          Width: 106−62 = 44px  ← matches hanger shoulder span exactly
          Height: 64−31 = 33px
          Notch: (84, 38)
          Left extreme: (62, 46)  Right extreme: (106, 46)
          Bottom tip: (84, 64)
        */}
        <path
          d="M 84 38 C 81 31 62 31 62 44 C 62 55 84 64 84 64 C 84 64 106 55 106 44 C 106 31 87 31 84 38 Z"
          fill="#FF2E47"
          filter="url(#sf-logo-heart-bloom)"
        />
      </svg>

      {withWordmark && (
        <span className={`font-black tracking-tight leading-none ${wordmarkSizeMap[wordmarkSize]}`}>
          Wo<span className="text-[#FF2E47]">ve</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="active:scale-95 transition-transform">
        {content}
      </Link>
    );
  }
  return content;
}
