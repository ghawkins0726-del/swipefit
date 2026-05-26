'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, RefreshCw, ShoppingBag, Loader, ChevronRight } from 'lucide-react';
import StyleDnaCard from '@/components/StyleDnaCard';
import { StyleDna } from '@/lib/styleDna';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface DropItem {
  id: string; title: string; brand: string; price: number;
  images: string[]; reason: string; category: string;
}

interface Message { role: 'user' | 'ai'; text: string; }

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
    fetch('/api/style-dna')
      .then(r => r.json())
      .then(d => { setDna(d); setDnaLoading(false); });
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
      setMessages([{ role: 'ai', text: "I'm Fit, your AI stylist. Tell me where you're going and I'll build an outfit from your liked items. Try: \"rooftop party in LA\" or \"first day at a startup\"" }]);
    }
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
    setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    setChatLoading(false);
  };

  const OCCASIONS = ['Date night', 'Job interview', 'Beach day', 'Night out', 'Streetwear fit', 'Travel fit'];

  return (
    <div className="flex flex-col h-screen bg-[#F5F4F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#EBEBEB] px-5 pt-12 pb-0">
        <h1 className="font-black text-xl text-[#0A0A0A] mb-3">Style DNA</h1>
        <div className="flex gap-0 border-b border-[#EBEBEB]">
          {[
            { id: 'dna', label: 'My DNA' },
            { id: 'drop', label: 'Daily Drop' },
            { id: 'outfit', label: 'Outfit Architect' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#E63946] text-[#E63946]'
                  : 'border-transparent text-[#AAAAAA]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── DNA TAB ── */}
        {tab === 'dna' && (
          <div className="px-4 pt-4 space-y-4">
            {dnaLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dna ? (
              <>
                <StyleDnaCard dna={dna} />
                <div className="sf-card p-5">
                  <p className="font-black text-[#0A0A0A] text-sm mb-2">How it works</p>
                  <p className="text-[#5A5A5A] text-sm leading-relaxed">
                    Your Style DNA is built from every swipe. Likes, super-likes, and passes all shape your profile.
                    The more you swipe, the more accurate it gets — and the better your Daily Drop becomes.
                  </p>
                </div>
                <button onClick={() => setTab('drop')}
                  className="w-full bg-[#0A0A0A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                  <Sparkles size={16} />
                  See Today&apos;s Drop
                </button>
                <button onClick={() => setTab('outfit')}
                  className="w-full border-2 border-[#0A0A0A] text-[#0A0A0A] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                  <ShoppingBag size={16} />
                  Build an Outfit
                </button>
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-[#AAAAAA] text-sm">Swipe at least 5 items to unlock your DNA</p>
                <Link href="/feed" className="inline-block mt-4 bg-[#E63946] text-white px-6 py-3 rounded-full font-bold text-sm">
                  Go Swipe
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── DAILY DROP TAB ── */}
        {tab === 'drop' && (
          <div className="px-4 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-[#0A0A0A] text-base">Today&apos;s Drop</p>
                {dropArchetype && (
                  <p className="text-[#AAAAAA] text-xs mt-0.5">Curated for {dropArchetype}</p>
                )}
              </div>
              <button onClick={loadDrop} disabled={dropLoading}
                className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm disabled:opacity-50">
                <RefreshCw size={15} className={`text-[#5A5A5A] ${dropLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {dropLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
                ))}
              </div>
            ) : drop.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles size={40} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#AAAAAA] text-sm">Swipe more items to unlock your Daily Drop</p>
              </div>
            ) : (
              <AnimatePresence>
                {drop.map((item, i) => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link href={`/item/${item.id}`}
                      className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-transform block">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-[#E63946] rounded-xl flex items-center justify-center absolute -top-2 -left-2 z-10 shadow-sm">
                          <span className="text-white font-black text-xs">#{i + 1}</span>
                        </div>
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5F4F0]">
                          <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pl-2">
                        <p className="font-bold text-[#0A0A0A] text-sm truncate">{item.title}</p>
                        <p className="text-[#AAAAAA] text-xs">{item.brand} · ${item.price}</p>
                        <p className="text-[#5A5A5A] text-xs mt-1 leading-snug line-clamp-2 italic">&ldquo;{item.reason}&rdquo;</p>
                      </div>
                      <ChevronRight size={16} className="text-[#EBEBEB] flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* ── OUTFIT ARCHITECT TAB ── */}
        {tab === 'outfit' && (
          <div className="flex flex-col h-full">
            {/* Occasion chips */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {OCCASIONS.map(o => (
                  <button key={o} onClick={() => sendMessage(o)}
                    disabled={chatLoading}
                    className="flex-shrink-0 bg-white border border-[#EBEBEB] text-[#0A0A0A] text-xs font-bold px-3 py-1.5 rounded-full hover:border-[#0A0A0A] transition-colors disabled:opacity-50">
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'ai' && (
                      <div className="w-7 h-7 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                        <Sparkles size={12} className="text-[#E63946]" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0A0A0A] text-white rounded-tr-sm'
                        : 'bg-white text-[#0A0A0A] rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#0A0A0A] rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles size={12} className="text-[#E63946]" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <Loader size={14} className="text-[#AAAAAA] animate-spin" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 bg-[#F5F4F0] border-t border-[#EBEBEB]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Describe an occasion..."
                  className="flex-1 bg-white border border-[#EBEBEB] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A]"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading}
                  className="w-12 h-12 bg-[#E63946] rounded-2xl flex items-center justify-center disabled:opacity-40 transition-opacity">
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
