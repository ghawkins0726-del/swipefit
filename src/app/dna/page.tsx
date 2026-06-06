'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, RefreshCw, ShoppingBag, ChevronRight, Dna, Crown } from 'lucide-react';
import StyleDnaCard from '@/components/StyleDnaCard';
import { StyleDna } from '@/lib/styleDna';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
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
    // Daily Drop is free for everyone right now — premium gate temporarily disabled.
    if (tab === 'drop' && drop.length === 0 && !dropBlocked) {
      loadDrop();
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
    <div className="flex flex-col h-[100dvh] bg-[#F5F4F0]">

      {/* ── Header ── */}
      <div className="bg-[#0A0A0A] pt-12 px-5 pb-0 flex-shrink-0">
        <Logo size={26} href="/feed" className="text-white mb-3" />
        <div className="flex items-center gap-2 mb-4">
          <Dna size={18} className="text-[#FF2E47]" />
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
                  : 'text-white/70'
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
                  <button onClick={() => setTab('drop')} className="btn-halo-dark flex-1 text-xs">
                    <Sparkles size={14} />
                    Daily Drop
                  </button>
                  <button onClick={() => setTab('outfit')}
                    className="flex-1 bg-white text-[#0A0A0A] font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest border-2 border-[#0A0A0A] active:scale-[0.97] transition-transform shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]">
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
          <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0a0a0a' }}>

            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-x-0 top-32 h-64 z-0"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(230,57,70,0.18) 0%, transparent 70%)' }} />

            {dropBlocked ? (
              <div className="relative z-10 flex flex-col items-center justify-center py-10 px-6">
                <div className="w-full relative mb-8 select-none pointer-events-none" aria-hidden>
                  <div className="blur-sm opacity-40 space-y-3">
                    <div className="rounded-3xl overflow-hidden" style={{ background: '#1a1a1a' }}>
                      <div className="aspect-[4/3] bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative">
                        <div className="absolute top-3 left-3 w-16 h-5 bg-[#E63946]/60 rounded-full" />
                        <div className="absolute bottom-4 left-4 space-y-1">
                          <div className="h-4 bg-white/20 rounded w-40" /><div className="h-3 bg-white/10 rounded w-24" />
                        </div>
                      </div>
                    </div>
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#1a1a1a' }}>
                        <div className="w-8 h-8 rounded-xl" style={{ background: '#2a2a2a' }} />
                        <div className="w-16 h-16 rounded-xl" style={{ background: '#2a2a2a' }} />
                        <div className="flex-1 space-y-1.5"><div className="h-3 rounded w-3/4" style={{ background: '#2a2a2a' }} /><div className="h-2.5 rounded w-1/2" style={{ background: '#2a2a2a' }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                      <div className="absolute inset-0 bg-[#E63946]/40 rounded-full blur-3xl scale-150" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-[#E63946] to-[#ff8c42] rounded-3xl flex items-center justify-center" style={{ boxShadow: '0 0 48px 16px rgba(230,57,70,0.5)' }}>
                        <Crown size={32} className="text-white" strokeWidth={1.5} />
                      </div>
                    </motion.div>
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-6">
                  <p className="font-black text-white text-2xl tracking-tight mb-2">Daily Drop is Premium</p>
                  <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>5 AI-curated picks matched to your Style DNA, refreshed every day.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="w-full max-w-xs space-y-2 mb-6">
                  {['⚡ Daily Drop — AI curated fits','✨ Outfit Architect — full chat','🔥 Priority new arrivals','📊 Deep DNA insights'].map(f => (
                    <div key={f} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-white text-sm font-semibold">{f}</p>
                    </div>
                  ))}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="w-full max-w-xs">
                  <Link href="/subscribe" className="btn-halo w-full"><Crown size={16} />Unlock Premium · $4.99/mo</Link>
                </motion.div>
              </div>
            ) : (
              <div className="relative z-10">
                {/* Drop header */}
                <div className="flex items-center justify-between px-4 pt-5 pb-4">
                  <div>
                    <p className="font-black text-white text-base">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    {dropArchetype && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Curated for <span className="font-bold text-[#E63946]">{dropArchetype}</span>
                      </p>
                    )}
                  </div>
                  <button onClick={loadDrop} disabled={dropLoading}
                    className="w-9 h-9 rounded-2xl flex items-center justify-center disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <RefreshCw size={15} className={`text-white ${dropLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {dropLoading ? (
                  <div className="px-4 space-y-3">
                    <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: '#1a1a1a' }}>
                      <div className="aspect-[3/4]" style={{ background: '#222' }} />
                    </div>
                    {[1,2,3,4].map(i => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: '#1a1a1a' }} />)}
                  </div>
                ) : drop.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Sparkles size={28} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <p className="font-black text-white text-base mb-1">Nothing yet</p>
                    <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>Swipe more items to unlock your Daily Drop</p>
                  </div>
                ) : (
                  <div className="px-4 space-y-3">
                    <AnimatePresence>
                      {/* ── Hero card ── */}
                      <motion.div key={drop[0].id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Link href={`/item/${drop[0].id}`}
                          className="block rounded-3xl overflow-hidden active:scale-[0.98] transition-transform relative"
                          style={{ boxShadow: '0 0 0 1px rgba(230,57,70,0.3), 0 0 40px 8px rgba(230,57,70,0.25), 0 24px 48px -12px rgba(0,0,0,0.8)' }}>
                          <div className="relative aspect-[3/4]">
                            <img src={drop[0].images?.[0]} alt={drop[0].title} className="w-full h-full object-cover object-center" />
                            {/* Deep cinematic gradient */}
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)' }} />
                            {/* Top gradient for badge readability */}
                            <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />

                            {/* #1 Pick badge with glow */}
                            <div className="absolute top-4 left-4 flex items-center gap-1.5 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest"
                              style={{ background: '#E63946', boxShadow: '0 0 16px 6px rgba(230,57,70,0.55), 0 0 32px 12px rgba(230,57,70,0.2)' }}>
                              ✦ #1 Pick
                            </div>

                            {/* Price badge */}
                            <div className="absolute top-4 right-4 text-white font-black text-sm px-3 py-1.5 rounded-full"
                              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                              ${drop[0].price}
                            </div>

                            {/* Bottom info */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <p className="text-white font-black text-xl leading-tight mb-1">{drop[0].title}</p>
                              <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>{drop[0].brand}</p>
                              <p className="text-xs italic leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>&ldquo;{drop[0].reason}&rdquo;</p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>

                      {/* ── Ranked list items ── */}
                      {drop.slice(1).map((item, i) => (
                        <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.08 }}>
                          <Link href={`/item/${item.id}`}
                            className="flex items-center gap-3 rounded-2xl p-3 active:scale-[0.98] transition-transform"
                            style={{
                              background: '#141414',
                              border: '1px solid rgba(255,255,255,0.07)',
                              boxShadow: i === 0 ? '0 0 20px 4px rgba(230,57,70,0.12)' : '0 4px 16px rgba(0,0,0,0.4)',
                            }}>
                            {/* Rank badge */}
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
                              style={{
                                background: i === 0 ? 'rgba(230,57,70,0.2)' : 'rgba(255,255,255,0.06)',
                                color: i === 0 ? '#E63946' : 'rgba(255,255,255,0.55)',
                                border: i === 0 ? '1px solid rgba(230,57,70,0.35)' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: i === 0 ? '0 0 12px 3px rgba(230,57,70,0.25)' : 'none',
                              }}>
                              #{i + 2}
                            </div>
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                              <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-sm truncate">{item.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.brand}</p>
                              <p className="text-xs mt-1 italic line-clamp-1" style={{ color: 'rgba(255,255,255,0.45)' }}>&ldquo;{item.reason}&rdquo;</p>
                            </div>
                            {/* Price + arrow */}
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-white text-sm">${item.price}</p>
                              <ChevronRight size={14} className="ml-auto mt-1" style={{ color: 'rgba(255,255,255,0.25)' }} />
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── OUTFIT ARCHITECT TAB ── */}
        {tab === 'outfit' && (
          <>
            {/* Aesthetic genre selector */}
            <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB]">
              <div className="pt-3 px-4 pb-3">
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
            </div>

            {/* Chat — scrollable with bottom padding so messages clear the sticky input bar */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 pb-[224px] bg-[#F5F4F0]">
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

            {/* Input — fixed above the navbar, with clearance for the raised Swipe button */}
            <div
              className="fixed left-0 right-0 z-40 bg-white border-t border-[#EBEBEB] shadow-[0_-8px_24px_rgba(0,0,0,0.04)]"
              style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Label header — makes it obvious this is where to type */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={11} className="text-[#E63946]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]">Ask Fit</span>
                </div>
                {genre && (
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#0A0A0A] text-white text-[9px] font-black px-2 py-0.5 rounded-full">{genre}</span>
                    <button onClick={() => setGenre('')} className="text-[#AAAAAA] text-[10px] underline">clear</button>
                  </div>
                )}
              </div>

              {chatError && (
                <p className="text-[#E63946] text-xs font-medium px-4 mb-1.5">{chatError}</p>
              )}

              <div className="flex gap-2 px-4 pb-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type anything — brands, advice, outfit ideas…"
                  className="flex-1 bg-[#F5F4F0] border border-[#EBEBEB] rounded-2xl px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E63946] focus:bg-white transition-colors"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading}
                  className="btn-halo-send w-12 h-12 flex-shrink-0">
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
