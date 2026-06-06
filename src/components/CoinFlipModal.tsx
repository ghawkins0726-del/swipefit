'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Item } from '@/lib/types';
import SaveCardModal from './SaveCardModal';

interface CoinFlipModalProps {
  item: Item;
  open: boolean;
  onClose: () => void;
  onSent?: (coinFlipId: string) => void;
}

type Step = 1 | 2 | 3;

export default function CoinFlipModal({ item, open, onClose, onSent }: CoinFlipModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; brand: string; last4: string }[]>([]);
  const [showSaveCard, setShowSaveCard] = useState(false);

  const winAmount  = Math.round(item.price * 0.50 * 100) / 100;
  const lossAmount = Math.round(item.price * 1.50 * 100) / 100;

  useEffect(() => {
    if (!open) { setStep(1); setAcknowledged(false); setError(''); return; }
    Promise.all([
      fetch('/api/coin-flip/remaining').then(r => r.json()),
      fetch('/api/stripe/payment-methods').then(r => r.json()),
    ]).then(([rem, pms]) => {
      setRemaining(rem.remaining ?? 0);
      setPaymentMethods(pms.paymentMethods ?? []);
    });
  }, [open]);

  const handleSend = async () => {
    setSending(true);
    setError('');
    const res = await fetch('/api/coin-flip/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      if (data.code === 'no_payment_method') { setShowSaveCard(true); return; }
      setError(data.error ?? 'Something went wrong');
      return;
    }
    setStep(3);
    onSent?.(data.coinFlipId);
  };

  if (!open) return null;

  const pm = paymentMethods[0];
  const hasPm = !!pm;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              className="relative bg-[#151515] border border-white/8 rounded-t-3xl p-6 pb-10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-5" />
              <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <X size={14} className="text-white/50" />
              </button>

              {/* Step dots */}
              <div className="flex gap-1.5 mb-4">
                {([1, 2, 3] as Step[]).map(s => (
                  <div key={s} className={`flex-1 h-0.5 rounded-full transition-colors ${s <= step ? 'bg-[#FF3B47]' : 'bg-white/10'}`} />
                ))}
              </div>

              {/* ── Step 1: Overview ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-[#FF3B47] mb-1">Step 1 of 3</p>
                    <h2 className="text-white font-black text-xl">Coin Flip Offer</h2>
                    <p className="text-white/40 text-xs mt-0.5">Send @{item.sellerName ?? 'seller'} a 50/50 challenge</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#00C851]/10 border border-[#00C851]/22 rounded-2xl p-3 text-center">
                      <p className="text-[8px] font-black tracking-widest uppercase text-[#00C851] mb-1">🪙 You win</p>
                      <p className="text-white font-black text-xl">${winAmount}</p>
                      <p className="text-white/35 text-[9px] mt-0.5">50% off</p>
                    </div>
                    <div className="flex-1 bg-[#E63946]/10 border border-[#E63946]/22 rounded-2xl p-3 text-center">
                      <p className="text-[8px] font-black tracking-widest uppercase text-[#E63946] mb-1">💸 You lose</p>
                      <p className="text-white font-black text-xl">${lossAmount}</p>
                      <p className="text-white/35 text-[9px] mt-0.5">+50% added</p>
                    </div>
                  </div>

                  {/* Card on file */}
                  <div className="flex items-center gap-3 bg-white/4 border border-white/7 rounded-2xl p-3">
                    <span className="text-lg">💳</span>
                    {hasPm
                      ? <p className="text-white/60 text-xs">Charged to <strong className="text-white">{pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ••••{pm.last4}</strong> if flip resolves</p>
                      : <p className="text-[#FF3B47] text-xs font-semibold">No card on file — <button onClick={() => setShowSaveCard(true)} className="underline">add one</button></p>
                    }
                  </div>

                  {/* Remaining flips */}
                  {remaining !== null && (
                    <div className="flex items-center gap-2 self-center bg-white/4 border border-white/7 rounded-full px-3 py-1.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < (3 - remaining) ? 'bg-white/12' : 'bg-[#FF3B47]'}`} />
                        ))}
                      </div>
                      <span className="text-white/40 text-[10px] font-bold">{remaining} flip{remaining !== 1 ? 's' : ''} remaining this month</span>
                    </div>
                  )}

                  {error && <p className="text-[#E63946] text-xs font-semibold">{error}</p>}

                  <button
                    onClick={() => hasPm ? setStep(2) : setShowSaveCard(true)}
                    disabled={remaining === 0}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-40"
                  >
                    {remaining === 0 ? 'Limit reached (3/month)' : 'Next →'}
                  </button>
                </div>
              )}

              {/* ── Step 2: Payment warning ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-[#E63946] mb-1">⚠ Step 2 of 3 — Payment Obligation</p>
                    <h2 className="text-white font-black text-lg">You must pay if you lose.</h2>
                  </div>

                  <div className="bg-[#E63946]/8 border border-[#E63946]/20 rounded-2xl p-4 text-sm text-white/75 leading-relaxed">
                    If you lose this flip, <strong className="text-white">${lossAmount} will be charged</strong> to your {pm ? `${pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ••••${pm.last4}` : 'card on file'}.
                    Declining payment is a violation of Wove's terms.<br /><br />
                    <span className="text-[#E63946] font-bold">3 non-payment strikes = indefinite account suspension.</span>
                  </div>

                  {/* Acknowledgement checkbox */}
                  <button
                    onClick={() => setAcknowledged(v => !v)}
                    className="flex items-start gap-3 bg-white/3 border border-white/7 rounded-2xl p-3 text-left"
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${acknowledged ? 'bg-[#00C851] border-[#00C851]' : 'border-white/25 bg-white/5'}`}>
                      {acknowledged && <span className="text-white text-xs font-black">✓</span>}
                    </div>
                    <p className="text-white/55 text-xs leading-relaxed">
                      I understand I am obligated to pay <strong className="text-white">${lossAmount}</strong> if I lose this coin flip.
                    </p>
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!acknowledged}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirm & Continue →
                  </button>
                  <button onClick={() => setStep(1)} className="text-xs text-white/30 font-semibold tracking-wide">← Back</button>
                </div>
              )}

              {/* ── Step 3: Send / Pending ── */}
              {step === 3 && !sending && !error && (
                <div className="flex flex-col items-center gap-5 py-4">
                  <p className="text-[9px] font-black tracking-widest uppercase text-[#FF3B47]">Step 3 of 3</p>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#FF3B47] to-[#E63946] flex items-center justify-center text-2xl font-black text-white shadow-[0_0_32px_rgba(255,59,71,0.4)]">
                    🪙
                  </div>
                  <div className="text-center">
                    <h2 className="text-white font-black text-xl mb-1">Send Coin Flip Offer</h2>
                    <p className="text-white/40 text-xs">Seller has 72h to respond</p>
                  </div>
                  {error && <p className="text-[#E63946] text-xs font-semibold">{error}</p>}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest"
                  >
                    Send Offer
                  </button>
                  <button onClick={onClose} className="text-xs text-white/30 font-semibold">Cancel</button>
                </div>
              )}

              {sending && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF3B47]/30 border-t-[#FF3B47] animate-spin" />
                  <p className="text-white/40 text-sm font-semibold">Sending offer…</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveCardModal
        open={showSaveCard}
        onClose={() => setShowSaveCard(false)}
        onSaved={() => {
          setShowSaveCard(false);
          fetch('/api/stripe/payment-methods').then(r => r.json()).then(d => setPaymentMethods(d.paymentMethods ?? []));
        }}
      />
    </>
  );
}
