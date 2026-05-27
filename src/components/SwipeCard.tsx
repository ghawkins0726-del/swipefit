'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Item } from '@/lib/types';
import { VerifiedBadge } from '@/components/Badges';
import { isVerified } from '@/lib/badges';

interface Props {
  item: Item & { _reason?: string; matchScore?: number };
  onSwipe: (action: 'like' | 'dislike' | 'superlike') => void;
  isTop: boolean;
}

const CONDITION_LABELS = {
  new: 'NWT', like_new: 'Like New', good: 'Good', fair: 'Fair',
};

export default function SwipeCard({ item, onSwipe, isTop }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 0, 280], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0]);
  const [imgIndex, setImgIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 110) onSwipe('like');
    else if (info.offset.x < -110) onSwipe('dislike');
    else if (info.offset.y < -130) onSwipe('superlike');
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className="absolute w-full h-full select-none touch-none swipe-card"
    >
      {/* LIKE stamp */}
      <motion.div style={{ opacity: likeOpacity }}
        className="absolute top-6 left-5 z-10 pointer-events-none"
      >
        <div className="border-[3px] border-[#00C851] rounded-sm px-3 py-1 rotate-[-12deg]">
          <span className="text-[#00C851] font-black text-2xl tracking-widest">LIKE</span>
        </div>
      </motion.div>

      {/* NOPE stamp */}
      <motion.div style={{ opacity: nopeOpacity }}
        className="absolute top-6 right-5 z-10 pointer-events-none"
      >
        <div className="border-[3px] border-[#E63946] rounded-sm px-3 py-1 rotate-[12deg]">
          <span className="text-[#E63946] font-black text-2xl tracking-widest">NOPE</span>
        </div>
      </motion.div>

      {/* Card */}
      <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Image */}
        <div className="relative flex-1 bg-[#F0EFEB] min-h-0">
          <img
            src={item.images[imgIndex]}
            alt={item.title}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Top row overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            {/* Condition pill */}
            <div className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              {CONDITION_LABELS[item.condition]}
            </div>

            {/* Match score */}
            {item.matchScore != null && item.matchScore > 50 && (
              <div className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="text-[#00C851]">●</span>
                {item.matchScore}% match
              </div>
            )}
          </div>

          {/* Image nav */}
          {item.images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }}
                disabled={imgIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center disabled:opacity-20">
                <ChevronLeft size={14} />
              </button>
              <button onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(item.images.length - 1, i + 1)); }}
                disabled={imgIndex === item.images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center disabled:opacity-20">
                <ChevronRight size={14} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#0A0A0A] text-base leading-snug truncate">{item.title}</p>
              <p className="text-[11px] text-[#AAAAAA] font-medium mt-0.5 uppercase tracking-wide">
                {item.brand} · {item.size} · {item.sellerName}{isVerified(item.sellerId) && <> <VerifiedBadge size="xs" /></>}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-[#0A0A0A] text-lg leading-none">${item.price}</p>
            </div>
          </div>

          {/* Style tags */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {item.styles.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] font-semibold text-[#5A5A5A] bg-[#F5F4F0] px-2 py-0.5 rounded capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center items-center gap-4 pb-4 pt-0">
          <button onClick={() => onSwipe('dislike')}
            className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center hover:border-[#E63946] hover:bg-[#FDECED] active:scale-95 transition-all shadow-sm">
            <X size={22} className="text-[#E63946]" strokeWidth={2.5} />
          </button>
          <button onClick={() => onSwipe('superlike')}
            className="w-[42px] h-[42px] rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all shadow-sm">
            <Zap size={17} className="text-blue-500" />
          </button>
          <button onClick={() => onSwipe('like')}
            className="w-[52px] h-[52px] rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center hover:border-[#00C851] hover:bg-[#EDFAF1] active:scale-95 transition-all shadow-sm">
            <Heart size={22} className="text-[#00C851]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
