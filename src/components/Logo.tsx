import Link from 'next/link';

interface LogoProps {
  /** Height of the logo mark in px. Width auto-scales (150:100 aspect ratio). Default 30. */
  size?: number;
  /** Extra Tailwind classes on the wrapper. Hanger uses currentColor — set `text-white` or `text-[#0A0A0A]` on the parent or here. */
  className?: string;
  /** Whether to show the "SwipeFit" wordmark next to the mark. Default false. */
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
 * SwipeFit logo mark — clean "?" hanger hook on the left, plump red heart on
 * the right with a luminous red aura halo.
 *
 * The hanger color follows `currentColor` (use parent's `text-*` to set it).
 * The heart is always vibrant red (#FF2E47) with a soft glow.
 */
export default function Logo({
  size = 30,
  className = '',
  withWordmark = false,
  wordmarkSize = 'lg',
  href,
}: LogoProps) {
  // Aspect ratio 150:100 — width derived from `size` (the height).
  const height = size;
  const width  = Math.round((size * 150) / 100);

  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 150 100"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SwipeFit"
        role="img"
      >
        <defs>
          <radialGradient id="sf-logo-heart-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FF2E47" stopOpacity="0.6"/>
            <stop offset="45%"  stopColor="#FF2E47" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#FF2E47" stopOpacity="0"/>
          </radialGradient>
          <filter id="sf-logo-heart-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b1"/>
            <feMerge>
              <feMergeNode in="b1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Heart aura halo */}
        <circle cx="110" cy="55" r="40" fill="url(#sf-logo-heart-aura)"/>

        {/* Hanger */}
        <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          {/* Hook + stem (stem tip extends past the shoulder junction) */}
          <path d="M 40 58 L 40 28 C 40 23 44 20 50 20 C 58 20 62 23 62 28 L 62 36 C 62 39 60 39 58 37"/>
          {/* Left shoulder */}
          <path d="M 40 52 L 12 85"/>
          {/* Right shoulder */}
          <path d="M 40 52 L 72 85"/>
          {/* Crossbar */}
          <path d="M 12 85 L 72 85"/>
        </g>

        {/* Heart with bloom */}
        <path
          d="M 110 47 C 106 40 95 40 95 52 C 95 62 102 69 110 75 C 118 69 125 62 125 52 C 125 40 114 40 110 47 Z"
          fill="#FF2E47"
          filter="url(#sf-logo-heart-bloom)"
        />
      </svg>

      {withWordmark && (
        <span className={`font-black tracking-tight leading-none ${wordmarkSizeMap[wordmarkSize]}`}>
          Swipe<span className="text-[#FF2E47]">Fit</span>
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
