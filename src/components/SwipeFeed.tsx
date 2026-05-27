'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeCard from './SwipeCard';
import { Item } from '@/lib/types';
import Link from 'next/link';
import { Dna, Undo2, BookmarkPlus, X, Check, Plus } from 'lucide-react';

interface Props { userId: string; }

interface CollectionStub { id: string; name: string; emoji: string; }

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

  // Save-to-board state
  const [savingItem, setSavingItem] = useState<Item | null>(null);
  const [collections, setCollections] = useState<CollectionStub[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [savedToIds, setSavedToIds] = useState<Set<string>>(new Set());

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
    setTimeout(() => setLastAction(null), 700);
  };

  const handleUndo = async () => {
    if (!lastSwiped) return;
    setShowUndo(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Put item back on top of stack
    setStack(prev => [lastSwiped.item, ...prev]);
    setSwipeCount(c => Math.max(0, c - 1));
    setLastSwiped(null);
    await fetch('/api/swipe/undo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: lastSwiped.item.id }),
    });
  };

  const openSaveModal = async (item: Item) => {
    setSavingItem(item);
    setSavedToIds(new Set());
    const res = await fetch('/api/collections');
    const data = await res.json();
    setCollections(Array.isArray(data) ? data : []);
  };

  const saveToBoard = async (collectionId: string) => {
    if (!savingItem) return;
    await fetch(`/api/collections/${collectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: savingItem.id }),
    });
    setSavedToIds(prev => new Set([...prev, collectionId]));
  };

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    setCreatingBoard(true);
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBoardName.trim(), emoji: '📌' }),
    });
    const col = await res.json();
    setCollections(prev => [col, ...prev]);
    setNewBoardName('');
    setCreatingBoard(false);
    if (savingItem) await saveToBoard(col.id);
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
            className="bg-[#E63946] text-white px-6 py-2.5 rounded-full font-bold text-sm"
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

      {/* Top bar */}
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

      {/* Swipe action badge */}
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

      {/* Card stack */}
      <div className="relative w-full flex-1 mt-6" style={{ maxWidth: 400 }}>
        <AnimatePresence>
          {stack.slice(0, 3).map((item, index) => (
            <motion.div
              key={item.id}
              style={{ zIndex: 10 - index, scale: 1 - index * 0.035, y: index * 8 }}
              exit={{ x: exitX, opacity: 0, rotate: lastAction === 'like' ? 15 : -15, transition: { duration: 0.22 } }}
              className="absolute inset-0"
            >
              <SwipeCard
                item={item}
                onSwipe={handleSwipe}
                isTop={index === 0}
                onSave={index === 0 ? () => openSaveModal(item) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hint on first load */}
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

      {/* Undo button */}
      <AnimatePresence>
        {showUndo && lastSwiped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 bg-[#0A0A0A] text-white px-4 py-2.5 rounded-full font-bold text-sm shadow-xl"
            >
              <Undo2 size={14} />
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save-to-board modal */}
      <AnimatePresence>
        {savingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setSavingItem(null); }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSavingItem(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-8 z-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-[#E8E8E8] rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-[#0A0A0A] text-[17px]">Save to board</h3>
                <button onClick={() => setSavingItem(null)}>
                  <X size={20} className="text-[#AAAAAA]" />
                </button>
              </div>

              {/* New board input */}
              <div className="flex gap-2 mb-4">
                <input
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createBoard()}
                  placeholder="New board name..."
                  className="flex-1 bg-[#F5F4F0] rounded-xl px-3 py-2.5 text-sm font-medium text-[#0A0A0A] outline-none placeholder:text-[#AAAAAA]"
                />
                <button
                  onClick={createBoard}
                  disabled={creatingBoard || !newBoardName.trim()}
                  className="w-10 h-10 bg-[#E63946] rounded-xl flex items-center justify-center disabled:opacity-40"
                >
                  <Plus size={18} className="text-white" />
                </button>
              </div>

              {/* Existing boards */}
              {collections.length === 0 ? (
                <p className="text-[#AAAAAA] text-sm text-center py-4">No boards yet — create one above</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                  {collections.map(col => {
                    const saved = savedToIds.has(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => !saved && saveToBoard(col.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                          saved ? 'border-[#E63946] bg-red-50' : 'border-[#EBEBEB] bg-[#F5F4F0]'
                        }`}
                      >
                        <span className="text-xl">{col.emoji}</span>
                        <span className="font-bold text-[#0A0A0A] text-sm flex-1">{col.name}</span>
                        {saved && <Check size={16} className="text-[#E63946]" />}
                        {!saved && <BookmarkPlus size={16} className="text-[#AAAAAA]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
