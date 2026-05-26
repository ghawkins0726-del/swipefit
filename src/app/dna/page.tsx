'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, RefreshCw, ShoppingBag, Loader2, ChevronRight, Dna } from 'lucide-react';
import StyleDnaCard from '@/components/StyleDnaCard';
import { StyleDna } from '@/lib/styleDna';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface DropItem {
  id: string; title: string; brand: string; price: number;
  images: string[]; reason: string; category: string;
}

interface OutfitItem {
  id: string; title: string; brand: string; price: number;
  images: string[]; role: string;
}

type Message =
  | { role: 'user'; text: string }
  | { role: 'ai'; verdict: string; outfit: OutfitItem[] };

const OCCASIONS = [
  { label: 'Date night', emoji: '🌙' },
  { label: 'Job interview', emoji: '💼' },
  { label: 'Beach day', emoji: '🏄' },
  { label: 'Night out', emoji: '🕺' },
  { label: 'Streetwear fit', emoji: '🔥' },
  { label: 'Travel fit', emoji: '✈️' },
  { label: 'Sunday brunch', emoji: '☕' },
  { label: 'Gallery opening', emoji: '🎨' },
];

export default function DnaPage() {
  const [dna, setDna] = useState<StyleDna | null>(null);
  const [dnaLoading, setDnaLoading] = useState(true);
  const [tab, setTab] = useState<'dna' | 'drop' | 'outfit'>('dna');

  // Daily Drop
  const [drop, setDrop] = useState<DropItem[]>([]);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropArchetype, setDropArchetype] = useState('');

  // Outfit Architect
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/style-dna').then(r => r.json()).then(d => { setDna(d); setDnaLoading(false); });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDrop = async () => {
    setDropLoading(true);
    const res = await fetch('/api/ai/daily-drop');
    const data = await res.json();
    setDrop(data.drop || []);
    setDropArchetype(data.archetype || '');
    setDropLoading(false);
  };

  useEffect(() => {
    if (tab === 'drop' && drop.length === 0) loadDrop();
    if (tab === 'outfit' && messages.length === 0) {
      setMessages([{
        role: 'ai',
        verdict: "I'm Fit — your AI stylist. Tell me the occasion and I'll pull a real outfit from your liked items.",
        outfit: [],
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || chatLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    const res = await fetch('/api/ai/outfit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    setMessages(prev => [...prev, { role: 'ai', verdict: data.verdict || '', outfit: data.outfit || [] }]);
    setChatLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F4F0]">

      {/* ── Header ── */}
      <div className="bg-[#0A0A0A] pt-12 px-5 pb-0 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Dna size={18} className="text-[#E63946]" />
          <h1 className="font-black text-white text-xl tracking-tight">Style DNA</h1>
        </div>

        {/* Pill tabs */}
        <div className="flex gap-1 bg-white/8 rounded-2xl p-1 mb-0">
          {([
            { id: 'dna',    label: 'My DNA' },
            { id: 'drop',   label: 'Daily Drop' },
            { id: 'outfit', label: 'Fit' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                tab === t.id
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-white/40'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── DNA TAB ── */}
        {tab === 'dna' && (
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
            {dnaLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dna ? (
              <>
                <StyleDnaCard dna={dna} />
                <div className="bg-white rounded-2xl p-5">
                  <p className="font-black text-[#0A0A0A] text-sm mb-2">How it works</p>
                  <p className="text-[#AAAAAA] text-sm leading-relaxed">
                    Every swipe shapes your DNA. Likes, super-likes, and passes all train the algorithm. The more you swipe, the sharper your recommendations get.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTab('drop')}
                    className="flex-1 bg-[#0A0A0A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                    <Sparkles size={14} />
                    Daily Drop
                  </button>
                  <button onClick={() => setTab('outfit')}
                    className="flex-1 border-2 border-[#0A0A0A] text-[#0A0A0A] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                    <ShoppingBag size={14} />
                    Build Outfit
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4">
                  <Dna size={24} className="text-[#EBEBEB]" />
                </div>
                <p className="font-black text-[#0A0A0A] text-base mb-1">Swipe 5 items to unlock</p>
                <p className="text-[#AAAAAA] text-sm text-center mb-6">Your Style DNA builds with every swipe</p>
                <Link href="/feed" className="bg-[#E63946] text-white px-8 py-3 rounded-2xl font-bold text-sm">
                  Go Swipe
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── DAILY DROP TAB ── */}
        {tab === 'drop' && (
          <div className="flex-1 overflow-y-auto pb-24">
            {/* Drop header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div>
                <p className="font-black text-[#0A0A0A] text-base">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                {dropArchetype && (
                  <p className="text-[#AAAAAA] text-xs mt-0.5">Curated for <span className="font-bold text-[#0A0A0A]">{dropArchetype}</span></p>
                )}
              </div>
              <button onClick={loadDrop} disabled={dropLoading}
                className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center shadow-sm disabled:opacity-40">
                <RefreshCw size={15} className={`text-[#5A5A5A] ${dropLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {dropLoading ? (
              <div className="px-4 space-y-3">
                {/* Skeleton */}
                <div className="bg-white rounded-3xl overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-[#EBEBEB]" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-[#EBEBEB] rounded w-2/3" />
                    <div className="h-3 bg-[#EBEBEB] rounded w-1/3" />
                  </div>
                </div>
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
                ))}
              </div>
            ) : drop.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8">
                <Sparkles size={36} className="text-[#EBEBEB] mb-3" />
                <p className="font-black text-[#0A0A0A] text-base mb-1">Nothing yet</p>
                <p className="text-[#AAAAAA] text-sm text-center">Swipe more items to unlock your Daily Drop</p>
              </div>
            ) : (
              <div className="px-4 space-y-3">
                {/* Hero item */}
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link href={`/item/${drop[0].id}`} className="block bg-white rounded-3xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
                      <div className="relative aspect-[4/3]">
                        <img src={drop[0].images?.[0]} alt={drop[0].title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 bg-[#E63946] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                          #1 Pick
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-black text-lg leading-tight">{drop[0].title}</p>
                          <p className="text-white/60 text-sm">{drop[0].brand}</p>
                          <p className="text-white/80 text-xs mt-1.5 italic leading-snug">&ldquo;{drop[0].reason}&rdquo;</p>
                        </div>
                        <div className="absolute top-3 right-3 bg-black/50 text-white font-black text-sm px-3 py-1 rounded-full">
                          ${drop[0].price}
                        </div>
                      </div>
                    </Link>
                  </motion.div>

                  {/* Remaining items */}
                  {drop.slice(1).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (i + 1) * 0.07 }}
                    >
                      <Link href={`/item/${item.id}`}
                        className="flex items-center gap-3 bg-white rounded-2xl p-3 active:scale-[0.98] transition-transform">
                        <div className="w-8 h-8 bg-[#0A0A0A] rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-xs">#{i + 2}</span>
                        </div>
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                          <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#0A0A0A] text-sm truncate">{item.title}</p>
                          <p className="text-[#AAAAAA] text-xs">{item.brand}</p>
                          <p className="text-[#5A5A5A] text-xs mt-0.5 italic line-clamp-1">&ldquo;{item.reason}&rdquo;</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-[#0A0A0A] text-sm">${item.price}</p>
                          <ChevronRight size={14} className="text-[#EBEBEB] ml-auto mt-1" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ── OUTFIT ARCHITECT TAB ── */}
        {tab === 'outfit' && (
          <>
            {/* Occasion chips */}
            <div className="flex-shrink-0 py-3 px-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {OCCASIONS.map(o => (
                  <button key={o.label} onClick={() => sendMessage(o.label)}
                    disabled={chatLoading}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-[#EBEBEB] rounded-full px-3.5 py-2 text-xs font-bold text-[#0A0A0A] disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                    <span>{o.emoji}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end">
                        <div className="bg-[#0A0A0A] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%] text-sm font-medium">
                          {msg.text}
                        </div>
                      </motion.div>
                    );
                  }

                  // AI message
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5 items-start">
                      {/* Fit avatar */}
                      <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-[#E63946]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Verdict text */}
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm mb-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-1">Fit</p>
                          <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{msg.verdict}</p>
                        </div>

                        {/* Outfit board — horizontal scroll of portrait cards */}
                        {msg.outfit.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                            {msg.outfit.map((item, j) => (
                              <motion.div key={item.id}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: j * 0.1 }}
                              >
                                <Link href={`/item/${item.id}`}
                                  className="flex-shrink-0 w-36 block active:scale-95 transition-transform">
                                  {/* Photo */}
                                  <div className="relative w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-[#0A0A0A]">
                                    <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                                    {/* Role badge */}
                                    <div className="absolute top-2 left-2 bg-[#0A0A0A]/80 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                                      {item.role}
                                    </div>
                                    {/* Price */}
                                    <div className="absolute bottom-2 right-2 bg-[#E63946] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                      ${item.price}
                                    </div>
                                    {/* Gradient */}
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                                  </div>
                                  {/* Item info */}
                                  <div className="mt-2 px-0.5">
                                    <p className="font-bold text-[#0A0A0A] text-xs truncate leading-tight">{item.title}</p>
                                    <p className="text-[#AAAAAA] text-[10px] mt-0.5">{item.brand}</p>
                                  </div>
                                </Link>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Loading state */}
                {chatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 items-start">
                    <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles size={13} className="text-[#E63946]" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="text-[#E63946] animate-spin" />
                        <span className="text-xs text-[#AAAAAA] font-semibold">Building your outfit…</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-[#EBEBEB]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Describe an occasion…"
                  className="flex-1 bg-[#F5F4F0] border border-[#EBEBEB] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading}
                  className="w-12 h-12 bg-[#E63946] rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-sm shadow-[#E63946]/30">
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
}
