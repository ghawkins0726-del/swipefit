'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Item } from '@/lib/types';
import { VerifiedBadge } from '@/components/Badges';
import { isVerified } from '@/lib/badges';
import Link from 'next/link';

interface Props {
  item: Item & { _reason?: string; matchScore?: number };
  onSwipe: (action: 'like' | 'dislike' | 'superlike') => void;
  isTop: boolean;
  onDragUpdate?: (x: number) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New with tags', like_new: 'Like New', good: 'Good', fair: 'Fair',
};

export default function SwipeCard({ item, onSwipe, isTop, onDragUpdate }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);

  // LIKE / NOPE stamp opacity
  const likeOpacity = useTransform(x, [15, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, -15], [1, 0]);

  // Coloured overlay on the image
  const greenOverlay = useTransform(x, [0, 120], [0, 0.45]);
  const redOverlay   = useTransform(x, [-120, 0], [0.45, 0]);

  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (!isTop || !onDragUpdate) return;
    return x.on('change', (latest) => onDragUpdate(latest));
  }, [x, isTop, onDragUpdate]);

  useEffect(() => { setImgIndex(0); }, [item.id]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > 80 || velocity.x > 500)       { onDragUpdate?.(0); onSwipe('like'); }
    else if (offset.x < -80 || velocity.x < -500) { onDragUpdate?.(0); onSwipe('dislike'); }
    else                                           { onDragUpdate?.(0); }
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={{ left: 0.88, right: 0.88, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
    >
      {/* ── Photo ── */}
      <img
        src={item.images[imgIndex]}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />

      {/* ── Green wash (like) ── */}
      <motion.div
        style={{ opacity: greenOverlay }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(0,200,80,0.5) 0%, transparent 60%)' }} />
      </motion.div>

      {/* ── Red wash (nope) ── */}
      <motion.div
        style={{ opacity: redOverlay }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="w-full h-full" style={{ background: 'linear-gradient(225deg, rgba(230,57,70,0.5) 0%, transparent 60%)' }} />
      </motion.div>

      {/* ── Bottom gradient scrim — longer and softer so photo breathes ── */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '80%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.08) 80%, transparent 100%)',
        }}
      />

      {/* ── Top gradient scrim ── */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '35%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
        }}
      />

      {/* ── LIKE stamp ── */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-20 left-5 z-10 pointer-events-none">
        <div className="border-[3px] border-[#00C851] rounded-xl px-4 py-1.5 rotate-[-12deg]">
          <span className="text-[#00C851] font-black text-3xl tracking-widest">LIKE</span>
        </div>
      </motion.div>

      {/* ── NOPE stamp ── */}
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-20 right-5 z-10 pointer-events-none">
        <div className="border-[3px] border-[#E63946] rounded-xl px-4 py-1.5 rotate-[12deg]">
          <span className="text-[#E63946] font-black text-3xl tracking-widest">NOPE</span>
        </div>
      </motion.div>

      {/* ── Match score (only shown when relevant) ── */}
      {item.matchScore != null && item.matchScore > 50 && (
        <div className="absolute right-4 z-10 pointer-events-none" style={{ top: 104 }}>
          <div className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <span className="text-[#00C851] text-[8px]">●</span>
            {item.matchScore}% match
          </div>
        </div>
      )}

      {/* ── Image nav arrows (tap zones) ── */}
      {item.images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }}
            disabled={imgIndex === 0}
            className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center pl-3 disabled:opacity-0"
          >
            <div className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <ChevronLeft size={16} className="text-white" />
            </div>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(item.images.length - 1, i + 1)); }}
            disabled={imgIndex === item.images.length - 1}
            className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-end pr-3 disabled:opacity-0"
          >
            <div className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <ChevronRight size={16} className="text-white" />
            </div>
          </button>

          {/* Progress bar dots */}
          <div className="absolute left-0 right-0 flex gap-1 px-3 z-10 pointer-events-none" style={{ top: 90 }}>
            {item.images.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-0.5 rounded-full transition-all duration-200"
                style={{ background: i === imgIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Bottom info overlay — pb clears floating buttons ── */}
      {/* buttons sit at bottom: safe-area + 88px, row is ~72px tall, add 20px breathing room */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 z-10 pointer-events-none"
        style={{ paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 88px + 72px + 20px)' }}
      >

        {/* Title — up to 2 lines */}
        <h2
          className="text-white font-black text-[22px] leading-tight mb-0.5"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {item.title}
        </h2>

        {/* Price — bold, slightly smaller, separate visual weight */}
        <p className="text-white font-black text-xl mb-2" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>
          ${item.price}
        </p>

        {/* Brand · size · seller — brighter separators */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-white/80 text-[13px] font-semibold">{item.brand}</span>
          <span className="text-white/55 text-xs">·</span>
          <span className="text-white/80 text-[13px]">Size {item.size}</span>
          <span className="text-white/55 text-xs">·</span>
          <Link
            href={`/user/${item.sellerId}`}
            className="text-white/80 text-[13px] pointer-events-auto flex items-center gap-1 active:opacity-60"
            onClick={e => e.stopPropagation()}
          >
            {item.sellerName}
            {isVerified(item.sellerId) && <VerifiedBadge size="xs" />}
          </Link>
        </div>

        {/* Tags row + condition pill on same line */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.styles.slice(0, 3).map(s => (
            <span
              key={s}
              className="text-[11px] font-semibold text-white/85 capitalize px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              {s}
            </span>
          ))}
          {/* Condition pill inline with tags */}
          <span
            className="text-[11px] font-semibold text-white/70 capitalize px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {CONDITION_LABELS[item.condition]}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
