'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Item } from '@/lib/types';
import { VerifiedBadge } from '@/components/Badges';
import { isVerified } from '@/lib/badges';

interface Props {
  item: Item & { _reason?: string; matchScore?: number };
  onSwipe: (action: 'like' | 'dislike' | 'superlike') => void;
  isTop: boolean;
  /** Called every drag frame so the parent can update a background glow. */
  onDragUpdate?: (x: number) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'NWT', like_new: 'Like New', good: 'Good', fair: 'Fair',
};

export default function SwipeCard({ item, onSwipe, isTop, onDragUpdate }: Props) {
  // ─── Motion values ────────────────────────────────────────────────────────
  const x = useMotionValue(0);

  // Rotation follows horizontal drag (origin at bottom of card = natural pivot)
  const rotate = useTransform(x, [-320, 0, 320], [-22, 0, 22]);

  // Subtle squeeze when dragged far — makes it feel tactile
  const scaleX = useTransform(x, [-320, 0, 320], [0.97, 1, 0.97]);

  // LIKE / NOPE stamp opacity — appears quickly
  const likeOpacity  = useTransform(x, [15,  90],  [0, 1]);
  const nopeOpacity  = useTransform(x, [-90, -15], [1, 0]);
  // Coloured overlay on the image — green for right drag, red for left
  const greenOverlay = useTransform(x, [0,  130], [0, 0.55]);
  const redOverlay   = useTransform(x, [-130, 0], [0.55, 0]);

  // Card border glow intensity
  const greenGlow = useTransform(x, [0,  130], [0, 1]);
  const redGlow   = useTransform(x, [-130, 0], [1, 0]);
  const boxShadow = useTransform(
    [greenGlow, redGlow],
    ([g, r]: number[]) => {
      if (g > 0.05) return `0 0 0 2px rgba(0,200,80,${g * 0.9}), 0 8px 32px rgba(0,200,80,${g * 0.35})`;
      if (r > 0.05) return `0 0 0 2px rgba(230,57,70,${r * 0.9}), 0 8px 32px rgba(230,57,70,${r * 0.35})`;
      return '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)';
    },
  );

  // ─── State ────────────────────────────────────────────────────────────────
  const [imgIndex, setImgIndex] = useState(0);

  // Notify parent on every drag frame (for background glow in SwipeFeed)
  useEffect(() => {
    if (!isTop || !onDragUpdate) return;
    const unsub = x.on('change', (latest) => onDragUpdate(latest));
    return unsub;
  }, [x, isTop, onDragUpdate]);

  // Reset image index when item changes
  useEffect(() => { setImgIndex(0); }, [item.id]);

  // ─── Drag handlers ────────────────────────────────────────────────────────
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    // Velocity-aware thresholds: a fast flick triggers swipe even at small offset
    if (offset.x > 80  || velocity.x >  500) { onDragUpdate?.(0); onSwipe('like'); }
    else if (offset.x < -80 || velocity.x < -500) { onDragUpdate?.(0); onSwipe('dislike'); }
    else { onDragUpdate?.(0); }
  };

  // ─── Button swipe ─────────────────────────────────────────────────────────
  const triggerSwipe = (action: 'like' | 'dislike' | 'superlike') => {
    onDragUpdate?.(0);
    onSwipe(action);
  };

  return (
    <motion.div
      style={{ x, rotate, scaleX, boxShadow }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.92}
      onDragEnd={handleDragEnd}
      className="absolute w-full h-full select-none touch-none swipe-card"
    >
      {/* ── Card shell ─────────────────────────────────────────────────────── */}
      <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col">

        {/* ── Image area ─────────────────────────────────────────────────── */}
        <div className="relative flex-1 bg-[#F0EFEB] min-h-0 overflow-hidden">
          <img
            src={item.images[imgIndex]}
            alt={item.title}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Green colour-wash overlay */}
          <motion.div
            style={{
              opacity: greenOverlay,
              background: 'linear-gradient(135deg, rgba(0,200,80,0.55) 0%, rgba(0,160,60,0.45) 100%)',
            }}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Red colour-wash overlay */}
          <motion.div
            style={{
              opacity: redOverlay,
              background: 'linear-gradient(225deg, rgba(230,57,70,0.55) 0%, rgba(180,20,30,0.45) 100%)',
            }}
            className="absolute inset-0 pointer-events-none"
          />

          {/* ── LIKE stamp ─────────────────────────────────────────────── */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-5 left-4 z-10 pointer-events-none"
          >
            <div className="bg-[#00C851] px-4 py-1.5 rounded-xl rotate-[-12deg] shadow-lg shadow-[#00C851]/50">
              <span className="text-white font-black text-2xl tracking-[0.15em] drop-shadow">LIKE</span>
            </div>
          </motion.div>

          {/* ── NOPE stamp ─────────────────────────────────────────────── */}
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-5 right-4 z-10 pointer-events-none"
          >
            <div className="bg-[#E63946] px-4 py-1.5 rounded-xl rotate-[12deg] shadow-lg shadow-[#E63946]/50">
              <span className="text-white font-black text-2xl tracking-[0.15em] drop-shadow">NOPE</span>
            </div>
          </motion.div>

          {/* ── Top overlay row (condition + match) ─────────────────────── */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="bg-black/55 backdrop-blur-[6px] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              {CONDITION_LABELS[item.condition]}
            </div>
            {item.matchScore != null && item.matchScore > 50 && (
              <div className="bg-black/55 backdrop-blur-[6px] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="text-[#00C851]">●</span>
                {item.matchScore}% match
              </div>
            )}
          </div>

          {/* ── Image navigation ─────────────────────────────────────────── */}
          {item.images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }}
                disabled={imgIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center disabled:opacity-20 active:scale-90 transition-transform"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(item.images.length - 1, i + 1)); }}
                disabled={imgIndex === item.images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center disabled:opacity-20 active:scale-90 transition-transform"
              >
                <ChevronRight size={15} />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {item.images.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-200 ${
                      i === imgIndex ? 'bg-white w-5 h-1' : 'bg-white/50 w-1.5 h-1'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Info section ───────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#0A0A0A] text-base leading-snug truncate">{item.title}</p>
              <p className="text-[11px] text-[#AAAAAA] font-medium mt-0.5 uppercase tracking-wide">
                {item.brand} · {item.size} · {item.sellerName}
                {isVerified(item.sellerId) && <> <VerifiedBadge size="xs" /></>}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-[#0A0A0A] text-xl leading-none">${item.price}</p>
            </div>
          </div>

          {/* Style tags */}
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {item.styles.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] font-semibold text-[#5A5A5A] bg-[#F5F4F0] px-2 py-0.5 rounded capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div className="flex justify-center items-center gap-10 pb-3 pt-1">
          {/* Pass */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => triggerSwipe('dislike')}
            className="w-[58px] h-[58px] rounded-full bg-white border-2 border-[#EBEBEB] flex items-center justify-center shadow-md active:border-[#E63946] active:bg-[#FDECED] transition-colors"
          >
            <X size={26} className="text-[#E63946]" strokeWidth={2.5} />
          </motion.button>

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => triggerSwipe('like')}
            className="w-[58px] h-[58px] rounded-full bg-white border-2 border-[#EBEBEB] flex items-center justify-center shadow-md active:border-[#00C851] active:bg-[#EDFAF1] transition-colors"
          >
            <Heart size={26} className="text-[#00C851]" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
