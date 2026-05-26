import Link from 'next/link';

interface LogoProps {
  /** Height of the logo mark in px. The width auto-scales to match the design's aspect ratio (130:100). Default 30. */
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
 * SwipeFit logo mark — a clothing hanger on the left, plump red heart on the
 * right with a luminous red aura halo behind it.
 *
 * The hanger color follows `currentColor` (use parent's `text-*` to set it).
 * The heart is always vibrant red (#FF2E47) and gets a soft red glow.
 */
export default function Logo({
  size = 30,
  className = '',
  withWordmark = false,
  wordmarkSize = 'lg',
  href,
}: LogoProps) {
  // Aspect ratio 130:100 — width is derived from `size` (the height).
  const height = size;
  const width  = Math.round((size * 130) / 100);

  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 130 100"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SwipeFit"
        role="img"
      >
        <defs>
          {/* Wide soft red aura behind the heart */}
          <radialGradient id="sf-logo-heart-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FF2E47" stopOpacity="0.6"/>
            <stop offset="45%"  stopColor="#FF2E47" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#FF2E47" stopOpacity="0"/>
          </radialGradient>
          {/* Tight bloom on heart edges */}
          <filter id="sf-logo-heart-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b1"/>
            <feMerge>
              <feMergeNode in="b1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Wide red aura halo */}
        <circle cx="92" cy="50" r="40" fill="url(#sf-logo-heart-aura)"/>

        {/* Hanger */}
        <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          {/* Hook */}
          <path d="M 42 50 L 42 28 C 42 20 50 16 58 16 C 66 16 70 22 70 30 C 70 38 64 40 60 36"/>
          {/* Left shoulder */}
          <path d="M 42 50 L 18 82"/>
          {/* Right shoulder */}
          <path d="M 42 50 L 66 82"/>
          {/* Crossbar */}
          <path d="M 18 82 L 66 82"/>
        </g>

        {/* Heart with bloom */}
        <path
          d="M 92 39 C 88 33 76 33 76 45 C 76 55 84 61 92 67 C 100 61 108 55 108 45 C 108 33 96 33 92 39 Z"
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
