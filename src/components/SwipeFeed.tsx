'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { Item } from '@/lib/types';
import Link from 'next/link';
import { Dna, Undo2 } from 'lucide-react';

interface Props { userId: string; }

export default function SwipeFeed({ userId }: Props) {
  const [stack, setStack] = useState<(Item & { _reason?: string; matchScore?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [dnaUnlocked, setDnaUnlocked] = useState(false);

  // Undo state
  const [lastSwiped, setLastSwiped] = useState<{ item: Item & { _reason?: string; matchScore?: number }; action: string } | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Background glow — updated every drag frame via motion values (no re-renders)
  const cardX = useMotionValue(0);
  const bgGreenOpacity = useTransform(cardX, [0, 5, 200], [0, 0, 0.18]);
  const bgRedOpacity   = useTransform(cardX, [-200, -5, 0], [0.18, 0, 0]);

  // ─── Feed batching ────────────────────────────────────────────────────────
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
        if (data.dna?.confident) setDnaUnlocked(true);
      }
    } catch { /* network error — stay on current stack */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);
  useEffect(() => {
    if (stack.length <= 2 && !loading) fetchBatch();
  }, [stack.length, loading, fetchBatch]);

  // ─── Swipe handler ────────────────────────────────────────────────────────
  const handleSwipe = async (action: 'like' | 'dislike' | 'superlike') => {
    const item = stack[0];
    if (!item) return;

    // Reset background glow immediately
    cardX.set(0);

    // Track for undo
    setLastSwiped({ item, action });
    setShowUndo(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setShowUndo(false), 4000);

    setLastAction(action);
    setStack(prev => prev.slice(1));
    setSwipeCount(c => c + 1);

    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, action }),
    });

    if (swipeCount + 1 === 5) setDnaUnlocked(true);
    setTimeout(() => setLastAction(null), 600);
  };

  // ─── Undo ─────────────────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!lastSwiped) return;
    setShowUndo(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setStack(prev => [lastSwiped.item, ...prev]);
    setSwipeCount(c => Math.max(0, c - 1));
    setLastSwiped(null);
    await fetch('/api/swipe/undo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: lastSwiped.item.id }),
    });
  };

  // ─── Exit animation values ────────────────────────────────────────────────
  const exitX = lastAction === 'like' ? 600 : -600;
  const exitRotate = lastAction === 'like' ? 22 : -22;

  // ─── Loading / empty states ───────────────────────────────────────────────
  if (loading && stack.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#AAAAAA] text-xs font-medium">Loading your feed</p>
        </div>
      </div>
    );
  }

  if (empty && stack.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-8">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="font-black text-lg text-[#0A0A0A] mb-2">You&apos;ve seen everything!</h3>
          <p className="text-[#AAAAAA] text-sm mb-6">Check back soon — new drops daily.</p>
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
    <div className="relative w-full h-full flex flex-col items-center">

      {/* ── Reactive background glow behind the card stack ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Green glow (right drag / like) */}
        <motion.div
          style={{
            opacity: bgGreenOpacity,
            background: 'radial-gradient(ellipse at center, rgba(0,200,80,0.25) 0%, transparent 70%)',
          }}
          className="absolute inset-[-30px] rounded-3xl"
        />
        {/* Red glow (left drag / pass) */}
        <motion.div
          style={{
            opacity: bgRedOpacity,
            background: 'radial-gradient(ellipse at center, rgba(230,57,70,0.25) 0%, transparent 70%)',
          }}
          className="absolute inset-[-30px] rounded-3xl"
        />
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 pointer-events-none px-1 py-0.5">
        {swipeCount > 0 && (
          <div className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wide">
            {swipeCount} swiped
          </div>
        )}
        {dnaUnlocked && (
          <Link href="/dna" className="pointer-events-auto flex items-center gap-1 bg-[#0A0A0A] text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
            <Dna size={9} className="text-[#E63946]" />
            View Style DNA
          </Link>
        )}
      </div>

      {/* ── Swipe action badge ── */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction + swipeCount}
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`absolute top-6 z-30 px-5 py-1.5 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-lg ${
              lastAction === 'like' ? 'bg-[#00C851] shadow-[#00C851]/40' : 'bg-[#E63946] shadow-[#E63946]/40'
            }`}
          >
            {lastAction === 'like' ? '❤ Liked' : '✕ Pass'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Card stack ── */}
      <div className="relative w-full flex-1 mt-6" style={{ maxWidth: 400 }}>
        <AnimatePresence>
          {stack.slice(0, 3).map((item, index) => (
            <motion.div
              key={item.id}
              style={{
                zIndex: 10 - index,
                // Back cards peek behind with scale + vertical offset
                scale: 1 - index * 0.04,
                y: index * 10,
              }}
              exit={{
                x: exitX,
                opacity: 0,
                rotate: exitRotate,
                transition: {
                  type: 'spring',
                  stiffness: 280,
                  damping: 28,
                  opacity: { duration: 0.18 },
                },
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

      {/* ── First-use hint ── */}
      {swipeCount === 0 && stack.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-[10px] text-[#AAAAAA] text-center pb-2 mt-2 uppercase tracking-widest font-bold"
        >
          ← swipe or tap buttons →
        </motion.p>
      )}

      {/* ── Undo pill ── */}
      <AnimatePresence>
        {showUndo && lastSwiped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
            >
              <Undo2 size={14} />
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
