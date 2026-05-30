'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Package2 } from 'lucide-react';

interface ResellItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  condition: string;
}

interface Props {
  orderId: string;
  item: ResellItem;
  onClose: () => void;
}

type Condition = 'new' | 'like_new' | 'good' | 'fair';

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new',      label: 'New'       },
  { value: 'like_new', label: 'Like New'  },
  { value: 'good',     label: 'Good'      },
  { value: 'fair',     label: 'Fair'      },
];

function useCountdown(holdsUntil: number | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!holdsUntil) return;
    const tick = () => {
      const diff = holdsUntil - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdsUntil]);
  return remaining;
}

export default function ResellModal({ orderId, item, onClose }: Props) {
  // Demand signal
  const [demandSignal, setDemandSignal] = useState<{ likes: number; views: number; resellCount: number; avgResellPrice: number } | null>(null);

  // Path A (Relist) state
  const [pathAExpanded, setPathAExpanded] = useState(false);
  const [condition, setCondition] = useState<Condition>('good');
  const [price, setPrice] = useState('');
  const [submittingA, setSubmittingA] = useState(false);
  const [successA, setSuccessA] = useState(false);
  const [errorA, setErrorA] = useState('');

  // Path B (Hold) state
  const [submittingB, setSubmittingB] = useState(false);
  const [holdsUntil, setHoldsUntil] = useState<number | null>(null);
  const [errorB, setErrorB] = useState('');
  const countdown = useCountdown(holdsUntil);

  useEffect(() => {
    fetch(`/api/resell/${item.id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.demandSignal) setDemandSignal(d.demandSignal);
      })
      .catch(() => {});
  }, [item.id]);

  const suggestedMin = demandSignal?.avgResellPrice
    ? Math.round(demandSignal.avgResellPrice * 0.85)
    : Math.round(item.price * 0.7);
  const suggestedMax = demandSignal?.avgResellPrice
    ? Math.round(demandSignal.avgResellPrice * 1.15)
    : Math.round(item.price * 0.9);

  const handleRelist = async () => {
    const numPrice = parseFloat(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setErrorA('Please enter a valid price');
      return;
    }
    setSubmittingA(true);
    setErrorA('');
    try {
      const res = await fetch('/api/resell/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, condition, price: numPrice, images: item.images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create listing');
      setSuccessA(true);
    } catch (err) {
      setErrorA(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmittingA(false);
    }
  };

  const handleHold = async () => {
    setSubmittingB(true);
    setErrorB('');
    try {
      const res = await fetch('/api/resell/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to set hold');
      setHoldsUntil(data.holdsUntil);
    } catch (err) {
      setErrorB(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmittingB(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] rounded-t-3xl max-h-[92vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-white font-black text-lg">What do you want to do?</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Item thumbnail */}
        <div className="flex items-center gap-3 mx-5 mt-2 mb-5 bg-white/6 rounded-2xl p-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
            {item.images?.[0] ? (
              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package2 size={18} className="text-white/30" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{item.title}</p>
            <p className="text-white/40 text-xs">Paid ${item.price}</p>
          </div>
        </div>

        <div className="px-4 pb-10 space-y-3">
          {/* PATH A: Relist & Earn */}
          <div className="bg-white/6 border border-white/10 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xl">🔁</span>
              <div className="flex-1">
                <p className="text-white font-black text-base">Relist & Earn</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Turn it into profit. Set your price and we&apos;ll show it to buyers who&apos;ll love it.
                </p>
                {demandSignal && (
                  <p className="text-[#E63946] text-xs font-bold mt-1.5">
                    Suggested: ${suggestedMin}–${suggestedMax}
                    {demandSignal.resellCount > 0 && ` · ${demandSignal.resellCount} resold`}
                  </p>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {successA ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-2.5"
                >
                  <Check size={16} className="text-emerald-400" />
                  <p className="text-emerald-400 font-bold text-sm">Your listing is live!</p>
                </motion.div>
              ) : !pathAExpanded ? (
                <motion.button
                  key="cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setPathAExpanded(true)}
                  className="w-full btn-halo py-2.5 text-sm font-black uppercase tracking-widest"
                >
                  Set Your Price →
                </motion.button>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  {/* Condition picker */}
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Condition</p>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setCondition(c.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            condition === c.value
                              ? 'bg-[#E63946] border-[#E63946] text-white'
                              : 'bg-white/6 border-white/15 text-white/60'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price input */}
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Your Price</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder={String(suggestedMin)}
                        className="w-full bg-white/8 border border-white/15 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-[#E63946]/60"
                      />
                    </div>
                  </div>

                  {errorA && (
                    <p className="text-[#E63946] text-xs font-bold">{errorA}</p>
                  )}

                  <button
                    onClick={handleRelist}
                    disabled={submittingA}
                    className="w-full btn-halo py-2.5 text-sm font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {submittingA ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Listing...
                      </span>
                    ) : 'List It →'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PATH B: Buy & Hold */}
          <div className="bg-white/6 border border-white/10 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xl">📦</span>
              <div className="flex-1">
                <p className="text-white font-black text-base">Buy & Hold (48 hrs)</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Keep your options open. You have 48 hours to decide before it auto-lists.
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {holdsUntil ? (
                <motion.div
                  key="held"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2.5 text-center"
                >
                  <p className="text-amber-400 font-black text-sm">Hold active</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">Expires in {countdown}</p>
                </motion.div>
              ) : (
                <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {errorB && (
                    <p className="text-[#E63946] text-xs font-bold mb-2">{errorB}</p>
                  )}
                  <button
                    onClick={handleHold}
                    disabled={submittingB}
                    className="w-full bg-white/8 border border-white/15 text-white font-black uppercase tracking-widest text-sm py-2.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {submittingB ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Starting...
                      </span>
                    ) : 'Start Hold →'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
