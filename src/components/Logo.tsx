import Link from 'next/link';

interface LogoProps {
  /** Pixel size of the logo mark (square). Default 30. */
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
 * SwipeFit logo mark — a clothing hanger with a vibrant red heart sitting on the right shoulder.
 *
 * The hanger color follows `currentColor` (use parent's `text-*` to set it).
 * The heart is always vibrant red (#FF2E47) so it pops on both light and dark backgrounds.
 */
export default function Logo({
  size = 30,
  className = '',
  withWordmark = false,
  wordmarkSize = 'lg',
  href,
}: LogoProps) {
  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SwipeFit"
        role="img"
      >
        {/* Hook */}
        <path
          d="M 50 30 C 50 18 56 12 62 12 C 70 12 71 22 64 22"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Hanger triangle */}
        <path
          d="M 50 30 L 16 72 L 84 72 Z"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Vibrant heart sitting on right shoulder */}
        <path
          d="M 62 50 C 61 46 57 43 53 43 C 49 43 46 47 46 52 C 46 57 50 61 62 70 C 74 61 78 57 78 52 C 78 47 75 43 71 43 C 67 43 63 46 62 50 Z"
          fill="#FF2E47"
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
