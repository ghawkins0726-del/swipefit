import { Star } from 'lucide-react';

interface StarRatingProps {
  average: number;       // 0..5
  count?: number;
  size?: number;
  showCount?: boolean;
  showZero?: boolean;    // show "No ratings" instead of "0 ★"
  className?: string;
}

/**
 * Compact star-rating display: `4.8 ★ (12)` style.
 * For a brand-new seller with 0 ratings, shows "New seller" instead.
 */
export default function StarRating({
  average, count = 0, size = 12, showCount = true, showZero = false, className = '',
}: StarRatingProps) {
  if (count === 0 && !showZero) {
    return (
      <span className={`inline-flex items-center gap-1 text-[#AAAAAA] text-xs font-medium ${className}`}>
        <Star size={size} className="opacity-50" />
        New
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Star size={size} className="text-[#FF2E47] fill-[#FF2E47]" />
      <span className="font-black text-[#0A0A0A]">{average.toFixed(1)}</span>
      {showCount && count > 0 && <span className="text-[#AAAAAA] text-xs">({count})</span>}
    </span>
  );
}
