'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoinFlipOffer } from '@/lib/db-types';

type FlipState = 'idle' | 'flipping' | 'result';

export default function CoinFlipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [offer, setOffer] = useState<CoinFlipOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipState, setFlipState] = useState<FlipState>('idle');
  const [result, setResult] = useState<{ flipResult: 'win' | 'loss'; chargeAmount: number; orderId: string } | null>(null);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/coin-flip/${id}`)
      .then(r => r.json())
      .then(d => { setOffer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleFlip = async () => {
    if (flipped) return;
    setFlipped(true);
    setFlipState('flipping');
    setError('');

    const res = await fetch(`/api/coin-flip/${id}/flip`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      setFlipState('idle');
      setFlipped(false);
      setError(data.error ?? 'Something went wrong');
      return;
    }

    // Let the animation play for 2.5s then reveal
    setTimeout(() => {
      setResult(data);
      setFlipState('result');
    }, 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF3B47]/30 border-t-[#FF3B47] animate-spin" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">Offer not found.</p>
      </div>
    );
  }

  if (offer.status !== 'accepted' && !result) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white font-black text-lg text-center">
          {offer.status === 'pending' ? 'Waiting for seller to accept…' :
           offer.status === 'completed' ? 'This flip is already completed.' :
           `Offer status: ${offer.status}`}
        </p>
        <button onClick={() => router.back()} className="text-white/40 text-sm font-semibold underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-5 pb-12 pt-14 text-white">
      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 ${result.flipResult === 'win' ? 'bg-[#00C851]/15' : 'bg-[#E63946]/15'}`}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <p className="text-7xl mb-4">{result.flipResult === 'win' ? '🪙' : '💸'}</p>
              <h1 className={`font-black text-4xl mb-2 ${result.flipResult === 'win' ? 'text-[#00C851]' : 'text-[#E63946]'}`}>
                {result.flipResult === 'win' ? 'You Win!' : 'You Lose'}
              </h1>
              <p className="text-white/70 text-lg font-semibold mb-8">
                ${result.chargeAmount.toFixed(2)} {result.flipResult === 'win' ? 'charged — great deal!' : 'charged to your card'}
              </p>
              <button
                onClick={() => router.push(`/orders/${result.orderId}`)}
                className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest"
              >
                View Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-6">Coin Flip</p>

      {/* Item card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/8 rounded-2xl p-3 flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center text-xl flex-shrink-0">🛍</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate">Item</p>
          <p className="text-white/40 text-xs">Original price: ${offer.itemPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Win / Lose amounts */}
      <div className="flex gap-2 w-full max-w-sm mb-6">
        <div className="flex-1 bg-[#00C851]/10 border border-[#00C851]/22 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black tracking-widest uppercase text-[#00C851] mb-1">🪙 Win</p>
          <p className="text-white font-black text-xl">${offer.winAmount.toFixed(2)}</p>
          <p className="text-white/35 text-[9px] mt-0.5">50% off</p>
        </div>
        <div className="flex-1 bg-[#E63946]/10 border border-[#E63946]/22 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black tracking-widest uppercase text-[#E63946] mb-1">💸 Lose</p>
          <p className="text-white font-black text-xl">${offer.lossAmount.toFixed(2)}</p>
          <p className="text-white/35 text-[9px] mt-0.5">+50% added</p>
        </div>
      </div>

      {/* Coin */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-40 h-40 rounded-full bg-[#FF3B47]/15 blur-2xl" />
        <motion.div
          animate={flipState === 'flipping' ? { rotateY: [0, 360, 720, 1080] } : {}}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          className="relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1"
          style={{ background: 'linear-gradient(145deg, #FF3B47 0%, #E63946 55%, #c0392b 100%)', border: '2.5px solid rgba(255,255,255,0.14)', boxShadow: '0 0 0 1px rgba(255,59,71,0.3), inset 0 2px 6px rgba(255,255,255,0.1), 0 6px 28px rgba(230,57,70,0.35)' }}
        >
          <span className="text-3xl font-black text-white leading-none" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>W</span>
          <span className="text-[7px] font-black tracking-widest uppercase text-white/55">Wove</span>
        </motion.div>
      </div>

      {error && <p className="text-[#E63946] text-xs font-semibold mb-4">{error}</p>}

      <button
        onClick={handleFlip}
        disabled={flipState !== 'idle'}
        className="w-full max-w-sm h-14 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(230,57,70,0.4)] disabled:opacity-50 mb-3"
      >
        {flipState === 'flipping' ? 'Flipping…' : 'Flip the Coin'}
      </button>

      <button onClick={() => router.back()} className="text-xs text-white/28 font-semibold tracking-wide">
        Cancel offer
      </button>
    </div>
  );
}
