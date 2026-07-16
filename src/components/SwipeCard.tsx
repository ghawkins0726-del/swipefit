'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Item } from '@/lib/types';
import { VerifiedBadge } from '@/components/Badges';
import { isVerified } from '@/lib/badges';
import Link from 'next/link';

interface Props {
  item: Item & { _reason?: string; matchScore?: number };
  onSwipe: (action: 'like' | 'dislike' | 'superlike') => void;
  isTop: boolean;
  onDragUpdate?: (x: number) => void;
  imgIndex: number;
  onImgChange: (index: number) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New with tags', like_new: 'Like New', good: 'Good', fair: 'Fair',
};

export default function SwipeCard({ item, onSwipe, isTop, onDragUpdate, imgIndex, onImgChange }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-14, 0, 14]);

  const likeOpacity = useTransform(x, [20, 90], [0, 1]);
  const nopeOpacity = useTransform(x, [-90, -20], [1, 0]);
  const greenOverlay = useTransform(x, [0, 130], [0, 0.4]);
  const redOverlay   = useTransform(x, [-130, 0], [0.4, 0]);

  useEffect(() => {
    if (!isTop || !onDragUpdate) return;
    return x.on('change', onDragUpdate);
  }, [isTop, onDragUpdate, x]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > 80 || velocity.x > 500)       { onDragUpdate?.(0); onSwipe('like'); }
    else if (offset.x < -80 || velocity.x < -500) { onDragUpdate?.(0); onSwipe('dislike'); }
    else                                           { onDragUpdate?.(0); }
  };

  const badge = item.matchScore != null && item.matchScore > 70
    ? 'Top Pick'
    : CONDITION_LABELS[item.condition] ?? 'Good';

  return (
    <motion.div
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={{ left: 0.88, right: 0.88, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
    >
      {/* ── Card shell ── */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col" style={{ background: '#1a1a1a' }}>

        {/* ── Image section ── */}
        <div className="relative flex-1 min-h-0">
          <img
            // Clamp: imgIndex lives in the parent and can briefly exceed this
            // item's photo count during a stack transition — never render a
            // broken image for that frame.
            src={item.images[Math.min(imgIndex, item.images.length - 1)] ?? item.images[0]}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
            draggable={false}
          />

          {/* Color overlays */}
          <motion.div style={{ opacity: greenOverlay }} className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(0,200,80,0.45) 0%, transparent 60%)' }} />
          </motion.div>
          <motion.div style={{ opacity: redOverlay }} className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full" style={{ background: 'linear-gradient(225deg, rgba(230,57,70,0.45) 0%, transparent 60%)' }} />
          </motion.div>

          {/* Gradient blending into info section */}
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #1a1a1a 0%, transparent 100%)' }} />

          {/* LIKE stamp */}
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-5 left-5 z-10 pointer-events-none">
            <div className="border-[3px] border-[#00C851] rounded-xl px-4 py-1.5 rotate-[-12deg]">
              <span className="text-[#00C851] font-black text-3xl tracking-widest">LIKE</span>
            </div>
          </motion.div>

          {/* NOPE stamp */}
          <motion.div style={{ opacity: nopeOpacity }} className="absolute top-5 right-5 z-10 pointer-events-none">
            <div className="border-[3px] border-[#E63946] rounded-xl px-4 py-1.5 rotate-[12deg]">
              <span className="text-[#E63946] font-black text-3xl tracking-widest">NOPE</span>
            </div>
          </motion.div>

          {/* Top Pick / condition badge */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md rounded-full px-3 py-1.5">
              <span className="text-white text-[9px]">★</span>
              <span className="text-white text-[11px] font-bold">{badge}</span>
            </div>
          </div>

          {/* Save / wishlist button */}
          <button
            className="absolute top-3.5 right-3.5 z-10 w-9 h-9 flex items-center justify-center rounded-full pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.stopPropagation()}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Image tap zones */}
          {item.images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onImgChange(Math.max(0, imgIndex - 1)); }}
                disabled={imgIndex === 0}
                className="absolute left-0 top-0 w-1/3 h-full z-10 disabled:pointer-events-none"
              />
              <button
                onClick={e => { e.stopPropagation(); onImgChange(Math.min(item.images.length - 1, imgIndex + 1)); }}
                disabled={imgIndex === item.images.length - 1}
                className="absolute right-0 top-0 w-1/3 h-full z-10 disabled:pointer-events-none"
              />
            </>
          )}
        </div>

        {/* ── Info section ── */}
        <div className="px-4 pt-2 pb-4 flex-shrink-0">
          <p className="text-white/75 text-[13px] font-medium mb-0.5">{item.brand}</p>
          <h2 className="text-white font-black text-[20px] leading-tight mb-0.5"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.title}
          </h2>
          <p className="text-white font-black text-[18px] mb-2.5">${item.price}</p>

          <div className="flex gap-1.5 flex-wrap">
            {item.styles.slice(0, 4).map(s => (
              <span key={s}
                className="text-[11px] font-semibold text-white/70 capitalize px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {s}
              </span>
            ))}
          </div>

          {/* Seller */}
          <div className="mt-2 flex items-center gap-1 text-white/65 text-[12px]">
            <Link
              href={`/user/${item.sellerId}`}
              className="pointer-events-auto flex items-center gap-1 active:opacity-60"
              onClick={e => e.stopPropagation()}
            >
              {item.sellerName}
              {isVerified(item.sellerId) && <VerifiedBadge size="xs" />}
            </Link>
            <span>· Size {item.size}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
