'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { Item } from '@/lib/types';

interface Props { userId: string; }

/* ── Glow action button ─────────────────────────────────────────── */
function GlowButton({
  children,
  onClick,
  size = 'md',
  glowColor,
  variant = 'dark',
}: {
  children: React.ReactNode;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  glowColor: string;
  variant?: 'dark' | 'light';
}) {
  const [pressed, setPressed] = useState(false);
  const dim = size === 'sm' ? 48 : size === 'lg' ? 72 : 62;
  const bg = variant === 'light'
    ? (pressed ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.93)')
    : (pressed ? 'rgba(28,28,34,0.92)' : 'rgba(18,18,24,0.82)');
  const border = variant === 'light'
    ? `2px solid ${glowColor}55`
    : '1.5px solid rgba(255,255,255,0.12)';
  const shadow = pressed
    ? `0 0 36px 16px ${glowColor}CC, 0 0 72px 28px ${glowColor}55, 0 8px 24px rgba(0,0,0,0.4)`
    : `0 0 24px 9px ${glowColor}88, 0 0 48px 18px ${glowColor}44, 0 4px 16px rgba(0,0,0,0.3)`;

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: bg,
        backdropFilter: variant === 'dark' ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: variant === 'dark' ? 'blur(16px)' : 'none',
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: shadow,
        transform: pressed ? 'scale(0.91)' : 'scale(1)',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease, background 0.1s ease',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ── SVG icons ──────────────────────────────────────────────────── */
const UndoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(210,210,225,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

const XIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HeartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="#16a34a" stroke="#16a34a" strokeWidth="1">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────
   Main feed
───────────────────────────────────────────────────────────────── */
export default function SwipeFeed({ userId }: Props) {
  const [stack, setStack] = useState<(Item & { _reason?: string; matchScore?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const [lastSwiped, setLastSwiped] = useState<{ item: Item & { _reason?: string; matchScore?: number }; action: string } | null>(null);

  // Background glow on drag
  const cardX = useMotionValue(0);
  const bgGreenOpacity = useTransform(cardX, [0, 5, 200], [0, 0, 0.22]);
  const bgRedOpacity   = useTransform(cardX, [-200, -5, 0], [0.22, 0, 0]);

  const fetchBatch = useCallback(async () => {
    try {
      const res = await fetch('/api/feed?batch=8');
      const data = await res.json();
      if (!data.feed?.length) {
        setEmpty(true);
      } else {
        setStack(prev => {
          const existingIds = new Set(prev.map((i: Item) => i.id));
          const fresh = data.feed.filter((i: Item) => !existingIds.has(i.id));
          return [...prev, ...fresh];
        });
        setEmpty(false);
      }
    } catch { /* network error */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);
  useEffect(() => {
    if (stack.length <= 2 && !loading) fetchBatch();
  }, [stack.length, loading, fetchBatch]);

  const handleSwipe = async (action: 'like' | 'dislike' | 'superlike') => {
    const item = stack[0];
    if (!item) return;
    cardX.set(0);
    setLastSwiped({ item, action });
    setLastAction(action);
    setStack(prev => prev.slice(1));
    setSwipeCount(c => c + 1);
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, action }),
    });
    setTimeout(() => setLastAction(null), 600);
  };

  const handleUndo = async () => {
    if (!lastSwiped) return;
    setStack(prev => [lastSwiped.item, ...prev]);
    setSwipeCount(c => Math.max(0, c - 1));
    setLastSwiped(null);
    await fetch('/api/swipe/undo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: lastSwiped.item.id }),
    });
  };

  const exitX      = lastAction === 'like' ? 600 : -600;
  const exitRotate = lastAction === 'like' ? 22 : -22;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && stack.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (empty && stack.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center px-8">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="font-black text-lg text-white mb-2">You&apos;ve seen everything!</h3>
          <p className="text-white/50 text-sm mb-6">Check back soon — new drops daily.</p>
          <button
            onClick={() => { setStack([]); setEmpty(false); setLoading(true); fetchBatch(); }}
            className="bg-[#E63946] text-white px-6 py-2.5 rounded-full font-bold text-sm"
          >
            Refresh feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>

      {/* ── Background drag glow ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          style={{ opacity: bgGreenOpacity, background: 'radial-gradient(ellipse at 60% 50%, rgba(34,197,94,0.3) 0%, transparent 65%)' }}
          className="absolute inset-0"
        />
        <motion.div
          style={{ opacity: bgRedOpacity, background: 'radial-gradient(ellipse at 40% 50%, rgba(230,57,70,0.3) 0%, transparent 65%)' }}
          className="absolute inset-0"
        />
      </div>

      {/* ── Card stack — fills the ENTIRE container ── */}
      <div className="absolute inset-0 overflow-hidden z-10">
        <AnimatePresence>
          {stack.slice(0, 3).map((item, index) => (
            <motion.div
              key={item.id}
              style={{
                zIndex: 10 - index,
                scale: 1 - index * 0.03,
                y: index * 8,
              }}
              exit={{
                x: exitX,
                opacity: 0,
                rotate: exitRotate,
                transition: { type: 'spring', stiffness: 260, damping: 26, opacity: { duration: 0.15 } },
              }}
              className="absolute inset-0"
            >
              <SwipeCard
                item={item}
                onSwipe={handleSwipe}
                isTop={index === 0}
                onDragUpdate={index === 0 ? (xVal) => cardX.set(xVal) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>

      </div>

      {/* ── Action buttons — 3 equal columns, undo dead-center at 50% ── */}
      <div
        className="absolute left-0 right-0 z-20 grid grid-cols-3 items-center pointer-events-auto"
        style={{ bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 88px)' }}
      >
        <div className="flex justify-center">
          <GlowButton size="lg" glowColor="#E63946" variant="light" onClick={() => handleSwipe('dislike')}>
            <XIcon />
          </GlowButton>
        </div>
        <div className="flex justify-center">
          <GlowButton size="sm" glowColor="#9696AA" variant="dark" onClick={handleUndo}>
            <UndoIcon />
          </GlowButton>
        </div>
        <div className="flex justify-center">
          <GlowButton size="lg" glowColor="#22C55E" variant="light" onClick={() => handleSwipe('like')}>
            <HeartIcon />
          </GlowButton>
        </div>
      </div>


      {/* ── Swipe action badge ── */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction + swipeCount}
            initial={{ opacity: 0, scale: 0.7, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest text-white ${
              lastAction === 'like'
                ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)]'
                : 'bg-[#E63946] shadow-[0_0_30px_rgba(230,57,70,0.7)]'
            }`}
          >
            {lastAction === 'like' ? '❤ Liked' : '✕ Passed'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
