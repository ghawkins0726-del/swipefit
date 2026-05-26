'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, RefreshCw, ShoppingBag, ChevronRight, Dna, Crown, Lock } from 'lucide-react';
import StyleDnaCard from '@/components/StyleDnaCard';
import { StyleDna } from '@/lib/styleDna';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

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
  | { role: 'ai'; text: string; outfit: OutfitItem[] };

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

const GENRES = [
  { label: 'Streetwear', emoji: '🔥' },
  { label: 'Minimal', emoji: '🤍' },
  { label: 'Vintage', emoji: '📻' },
  { label: 'Luxury', emoji: '💎' },
  { label: 'Y2K', emoji: '💿' },
  { label: 'Techwear', emoji: '🖤' },
  { label: 'Preppy', emoji: '🎾' },
  { label: 'Boho', emoji: '🌿' },
];

export default function DnaPage() {
  const { user, isLoaded } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoaded, setPremiumLoaded] = useState(false);

  const [dna, setDna] = useState<StyleDna | null>(null);
  const [dnaLoading, setDnaLoading] = useState(true);
  const [tab, setTab] = useState<'dna' | 'drop' | 'outfit'>('dna');

  // Daily Drop
  const [drop, setDrop] = useState<DropItem[]>([]);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropArchetype, setDropArchetype] = useState('');
  const [dropBlocked, setDropBlocked] = useState(false);

  // Outfit Architect
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [genre, setGenre] = useState('');
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load premium status from profile API
  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setIsPremium(!!d.isPremium);
        setPremiumLoaded(true);
      })
      .catch(() => setPremiumLoaded(true));
  }, [isLoaded, user]);

  useEffect(() => {
    fetch('/api/style-dna').then(r => r.json()).then(d => { setDna(d); setDnaLoading(false); });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDrop = async () => {
    setDropLoading(true);
    setDropBlocked(false);
    const res = await fetch('/api/ai/daily-drop');
    if (res.status === 403) {
      setDropBlocked(true);
      setDropLoading(false);
      return;
    }
    const data = await res.json();
    setDrop(data.drop || []);
    setDropArchetype(data.archetype || '');
    setDropLoading(false);
  };

  useEffect(() => {
    if (tab === 'drop' && drop.length === 0 && !dropBlocked && premiumLoaded) {
      if (isPremium) {
        loadDrop();
      } else {
        setDropBlocked(true);
      }
    }
    if (tab === 'outfit' && messages.length === 0) {
      setMessages([{
        role: 'ai',
        text: "hey — I'm Fit. ask me anything about fashion, what to wear, brands you're curious about, whatever. when you want an actual outfit, say the word and I'll pull one from what you've already liked.",
        outfit: [],
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, premiumLoaded]);

  // Build natural multi-turn history for Claude
  const buildHistory = (msgs: Message[]) => {
    return msgs.map(m => {
      if (m.role === 'user') return { role: 'user' as const, content: m.text };
      // Assistant — include text + a note about any outfit shown
      let content = m.text;
      if (m.outfit.length > 0) {
        const summary = m.outfit
          .map(o => `${o.role}: ${o.title} by ${o.brand} (ID:${o.id})`)
          .join(', ');
        content += `\n\n[Showed outfit — ${summary}]`;
      }
      return { role: 'assistant' as const, content };
    });
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || chatLoading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', text: msg }];
    setMessages(newMessages);
    setChatLoading(true);
    setChatError('');

    const history = buildHistory(messages); // history = everything before this message

    try {
      const res = await fetch('/api/ai/outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, genre: genre || undefined, history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply || 'No response', outfit: data.outfit || [] }]);
    } catch (err) {
      setChatError(`Couldn't reach Fit — ${err instanceof Error ? err.message : 'try again'}`);
    }
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
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-white/40'
              }`}>
              {t.id === 'drop' && !isPremium && premiumLoaded && (
                <Lock size={10} className={tab === t.id ? 'text-[#E63946]' : 'text-white/30'} />
              )}
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

            {/* PAYWALL — non-premium */}
            {dropBlocked ? (
              <div className="flex flex-col items-center justify-center py-10 px-6">

                {/* Blurred preview skeleton */}
                <div className="w-full relative mb-8 select-none pointer-events-none" aria-hidden>
                  <div className="blur-sm opacity-60 space-y-3">
                    <div className="bg-white rounded-3xl overflow-hidden">
                      <div className="aspect-[4/3] bg-gradient-to-br from-[#EBEBEB] to-[#D5D5D5] relative">
                        <div className="absolute top-3 left-3 w-16 h-5 bg-[#E63946]/60 rounded-full" />
                        <div className="absolute bottom-4 left-4 space-y-1">
                          <div className="h-4 bg-white/60 rounded w-40" />
                          <div className="h-3 bg-white/40 rounded w-24" />
                        </div>
                      </div>
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3">
                        <div className="w-8 h-8 bg-[#EBEBEB] rounded-xl" />
                        <div className="w-16 h-16 rounded-xl bg-[#EBEBEB]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-[#EBEBEB] rounded w-3/4" />
                          <div className="h-2.5 bg-[#EBEBEB] rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-[#E63946]/30 rounded-full blur-2xl scale-150" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-[#E63946] to-[#ff8c42] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#E63946]/40">
                        <Crown size={32} className="text-white" strokeWidth={1.5} />
                      </div>
                    </motion.div>
                  </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="text-center mb-6">
                  <p className="font-black text-[#0A0A0A] text-2xl tracking-tight mb-2">Daily Drop is Premium</p>
                  <p className="text-[#AAAAAA] text-sm leading-relaxed max-w-xs">
                    Get 5 AI-curated picks matched to your Style DNA, refreshed every day. Only $4.99/month.
                  </p>
                </motion.div>

                {/* Feature list */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                  className="w-full max-w-xs space-y-2 mb-6">
                  {[
                    '⚡ Daily Drop — AI curated fits',
                    '✨ Outfit Architect — full chat',
                    '🔥 Priority new arrivals',
                    '📊 Deep DNA insights',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3">
                      <p className="text-[#0A0A0A] text-sm font-semibold">{f}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="w-full max-w-xs">
                  <Link href="/subscribe"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#E63946] to-[#ff5c68] text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-[#E63946]/30">
                    <Crown size={16} />
                    Unlock Premium · $4.99/mo
                  </Link>
                </motion.div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ── OUTFIT ARCHITECT TAB ── */}
        {tab === 'outfit' && (
          <>
            {/* Genre selector + Occasion chips */}
            <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB]">
              {/* Genre row */}
              <div className="pt-3 px-4 pb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#AAAAAA] mb-2">Aesthetic</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {GENRES.map(g => (
                    <button key={g.label}
                      onClick={() => setGenre(prev => prev === g.label ? '' : g.label)}
                      className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap border ${
                        genre === g.label
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : 'bg-white text-[#0A0A0A] border-[#EBEBEB]'
                      }`}>
                      <span>{g.emoji}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion chips */}
              <div className="px-4 pb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#AAAAAA] mb-2">Occasion</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {OCCASIONS.map(o => (
                    <button key={o.label} onClick={() => sendMessage(o.label)}
                      disabled={chatLoading}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-[#F5F4F0] border border-[#EBEBEB] rounded-full px-3.5 py-1.5 text-xs font-bold text-[#0A0A0A] disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap">
                      <span>{o.emoji}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 pb-2 bg-[#F5F4F0]">
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

                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5 items-start">
                      {/* Fit avatar */}
                      <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-[#E63946]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Reply bubble */}
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm mb-3">
                          {msg.outfit.length > 0 && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-1">Fit · Outfit</p>
                          )}
                          <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        {/* Outfit board */}
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
                                  <div className="relative w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-[#0A0A0A]">
                                    <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 bg-[#0A0A0A]/80 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                                      {item.role}
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-[#E63946] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                      ${item.price}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                                  </div>
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

                {chatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 items-start">
                    <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles size={13} className="text-[#E63946]" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#E63946] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#E63946] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#E63946] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input — sits above the fixed navbar */}
            <div className="flex-shrink-0 px-4 pt-3 pb-[84px] bg-white border-t border-[#EBEBEB]">
              {chatError && (
                <p className="text-[#E63946] text-xs font-medium mb-2">{chatError}</p>
              )}
              {genre && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-[#AAAAAA] font-bold uppercase tracking-widest">Vibe:</span>
                  <span className="bg-[#0A0A0A] text-white text-[10px] font-black px-2.5 py-1 rounded-full">{genre}</span>
                  <button onClick={() => setGenre('')} className="text-[#AAAAAA] text-xs underline">clear</button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask Fit anything…"
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
