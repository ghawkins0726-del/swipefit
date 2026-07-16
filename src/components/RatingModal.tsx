'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Check, Loader2 } from 'lucide-react';

interface RatingModalProps {
  orderId: string;
  sellerName: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (stars: number) => void;
}

const STAR_LABELS = ['Terrible', 'Bad', 'Okay', 'Great', 'Amazing'];

/**
 * Bottom-sheet star rating picker. Tap a star (or drag-hover) to pick, add an
 * optional comment, submit. Auto-dismisses after success.
 */
export default function RatingModal({
  orderId, sellerName, open, onClose, onSubmitted,
}: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  // Pre-fill existing rating if any
  useEffect(() => {
    if (!open) return;
    setState('idle');
    setError('');
    fetch(`/api/ratings?orderId=${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (d?.stars) {
          setStars(d.stars);
          setComment(d.comment ?? '');
        } else {
          setStars(0);
          setComment('');
        }
      })
      .catch(() => {});
  }, [orderId, open]);

  const submit = async () => {
    if (stars < 1) { setError('Pick a star rating first'); return; }
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, stars, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setState('done');
      onSubmitted?.(stars);
      setTimeout(() => { onClose(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('idle');
    }
  };

  const display = hover || stars;
  const label = display > 0 ? STAR_LABELS[display - 1] : 'Tap a star';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget && state !== 'loading') onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="w-full bg-[#161616] rounded-t-3xl px-5 pt-5 pb-10"
          >
            {state === 'done' ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gradient-to-br from-[#FF2E47] to-[#ff8c42] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FF2E47]/30">
                  <Check size={24} className="text-white" strokeWidth={3} />
                </div>
                <h3 className="font-black text-xl text-white">Thanks for rating!</h3>
                <p className="text-[#AAAAAA] text-sm mt-1">Your feedback helps other buyers.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-black text-xl text-white">Rate your seller</h3>
                    <p className="text-[#AAAAAA] text-xs mt-0.5">How was your experience with <span className="font-bold text-white">{sellerName}</span>?</p>
                  </div>
                  {state === 'idle' && (
                    <button onClick={onClose} className="w-9 h-9 bg-[#1c1c1c] rounded-xl flex items-center justify-center">
                      <X size={16} className="text-[#B5B5B5]" />
                    </button>
                  )}
                </div>

                {/* Star picker */}
                <div className="flex flex-col items-center py-4 mb-4">
                  <div
                    className="flex gap-2 mb-3"
                    onMouseLeave={() => setHover(0)}
                  >
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onClick={() => setStars(i)}
                        onMouseEnter={() => setHover(i)}
                        className="p-1 transition-transform active:scale-90"
                        type="button"
                      >
                        <Star
                          size={42}
                          strokeWidth={1.5}
                          className={`transition-colors ${
                            i <= display
                              ? 'text-[#FF2E47] fill-[#FF2E47] drop-shadow-[0_0_12px_rgba(255,46,71,0.6)]'
                              : 'text-[#3a3a3a]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className={`text-sm font-black uppercase tracking-widest ${display > 0 ? 'text-[#FF2E47]' : 'text-[#AAAAAA]'}`}>
                    {label}
                  </p>
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value.slice(0, 280))}
                  placeholder="Add a comment (optional)…"
                  rows={3}
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] resize-none mb-4"
                />

                {error && <p className="text-[#FF2E47] text-xs font-semibold mb-3">{error}</p>}

                <button
                  onClick={submit}
                  disabled={state === 'loading' || stars < 1}
                  className="btn-halo w-full"
                >
                  {state === 'loading'
                    ? <Loader2 size={16} className="animate-spin" />
                    : 'Submit Rating'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
