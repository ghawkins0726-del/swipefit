'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { Item } from '@/lib/types';
import Link from 'next/link';
import { Dna } from 'lucide-react';

interface Props { userId: string; }

export default function SwipeFeed({ userId }: Props) {
  const [stack, setStack] = useState<(Item & { _reason?: string; matchScore?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [dnaUnlocked, setDnaUnlocked] = useState(false);

  const fetchBatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/feed?batch=8`);
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
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);
  useEffect(() => {
    if (stack.length <= 2 && !loading) fetchBatch();
  }, [stack.length, loading, fetchBatch]);

  const handleSwipe = async (action: 'like' | 'dislike' | 'superlike') => {
    const item = stack[0];
    if (!item) return;

    setLastAction(action);
    setStack(prev => prev.slice(1));
    setSwipeCount(c => c + 1);

    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, action }),
    });

    if (swipeCount + 1 === 5) setDnaUnlocked(true);
    setTimeout(() => setLastAction(null), 700);
  };

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
            className="bg-[#E63946] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#cc3040] transition-colors"
          >
            Refresh feed
          </button>
        </div>
      </div>
    );
  }

  const exitX = lastAction === 'like' || lastAction === 'superlike' ? 500 : -500;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 pointer-events-none px-1">
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

      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction + swipeCount}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-6 z-30 px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest text-white ${
              lastAction === 'like' ? 'bg-[#00C851]'
              : lastAction === 'superlike' ? 'bg-blue-500'
              : 'bg-[#E63946]'
            }`}
          >
            {lastAction === 'like' ? '❤ Liked' : lastAction === 'superlike' ? '⚡ Super' : '✕ Pass'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full flex-1 mt-6" style={{ maxWidth: 400 }}>
        <AnimatePresence>
          {stack.slice(0, 3).map((item, index) => (
            <motion.div
              key={item.id}
              style={{ zIndex: 10 - index, scale: 1 - index * 0.035, y: index * 8 }}
              exit={{ x: exitX, opacity: 0, rotate: lastAction === 'like' ? 15 : -15, transition: { duration: 0.22 } }}
              className="absolute inset-0"
            >
              <SwipeCard item={item} onSwipe={handleSwipe} isTop={index === 0} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
    </div>
  );
}
