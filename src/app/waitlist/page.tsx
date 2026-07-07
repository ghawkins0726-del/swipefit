'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

/* ── Incentive ladder ─────────────────────────────────────────────────────── */
interface Tier {
  cap: number;            // upper position bound for this tier
  emoji: string;
  name: string;
  perks: string[];
}
const TIERS: Tier[] = [
  { cap: 100,  emoji: '🏆', name: 'Premium Member',
    perks: ['Premium-member badge (in-app)', 'Premium free for life', 'Direct line to the founder'] },
  { cap: 1000, emoji: '💸', name: 'Free Seller Fees Forever',
    perks: ['0% seller fees forever (not 10%)', 'Premium free for life', 'First dibs on Daily Drop'] },
  { cap: 5000, emoji: '⭐', name: 'Early Access+',
    perks: ['Premium free for 1 year', 'Early app access'] },
  { cap: Infinity, emoji: '🎟️', name: 'Early Access',
    perks: ['Standard early access'] },
];
function tierFor(position: number): Tier {
  return TIERS.find(t => position <= t.cap) ?? TIERS[TIERS.length - 1];
}

const STORAGE_KEY = 'wove_waitlist_ref';

interface Status {
  referralCode: string;
  position: number;
  referralCount: number;
  total: number;
}

function WaitlistInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const refParam = searchParams.get('ref');

  // Live counter — poll every 20s
  const loadCount = useCallback(async () => {
    try {
      const r = await fetch('/api/waitlist/count');
      const d = await r.json();
      if (typeof d.total === 'number') setTotal(d.total);
    } catch { /* ignore */ }
  }, []);

  // Refresh a known signup's live position
  const refreshStatus = useCallback(async (code: string) => {
    try {
      const r = await fetch(`/api/waitlist?ref=${encodeURIComponent(code)}`);
      if (!r.ok) return;
      const d = await r.json();
      setStatus({ referralCode: d.referralCode, position: d.position, referralCount: d.referralCount, total: d.total });
      setTotal(d.total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadCount();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) refreshStatus(saved);
    const interval = setInterval(loadCount, 20000);
    return () => clearInterval(interval);
  }, [loadCount, refreshStatus]);

  async function handleJoin() {
    setError('');
    if (!email.trim()) { setError('Enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          ref: refParam,
          utm: {
            source:   searchParams.get('utm_source'),
            medium:   searchParams.get('utm_medium'),
            campaign: searchParams.get('utm_campaign'),
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Something went wrong'); return; }
      setStatus({ referralCode: d.referralCode, position: d.position, referralCount: d.referralCount, total: d.total });
      setTotal(d.total);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, d.referralCode);
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = status
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${status.referralCode}`
    : '';

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  const spotsLeft = total != null ? Math.max(0, 1000 - total) : null;

  return (
    <div className="min-h-[100dvh] bg-black text-white relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[140%] h-96"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(230,57,70,0.22) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-80"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(230,57,70,0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-16 pb-20 flex flex-col items-center">

        {/* Logo */}
        <Logo size={34} withWordmark wordmarkSize="xl" className="text-white mb-10" />

        <AnimatePresence mode="wait">
          {!status ? (
            /* ── PRE-SIGNUP ─────────────────────────────────────────────── */
            <motion.div key="pre" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} className="w-full flex flex-col items-center text-center">

              <h1 className="font-black text-[34px] leading-[1.05] tracking-tight mb-3">
                Tinder,<br />but for thrift.
              </h1>
              <p className="text-[15px] mb-6 max-w-xs" style={{ color: 'rgba(255,255,255,0.62)' }}>
                Swipe your way through secondhand fashion that actually fits your taste. Resale, but you have fun.
              </p>

              {/* Live counter + scarcity */}
              <div className="mb-7 flex flex-col items-center">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-3xl" style={{ textShadow: '0 0 24px rgba(230,57,70,0.6)' }}>
                    {total != null ? total.toLocaleString() : '—'}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>already in line</span>
                </div>
                {spotsLeft != null && spotsLeft > 0 && (
                  <p className="text-xs mt-1.5 font-bold uppercase tracking-widest" style={{ color: '#E63946' }}>
                    You&apos;re early — doors close at 1,000
                  </p>
                )}
              </div>

              {/* Email capture */}
              <div className="w-full flex flex-col gap-2.5 mb-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="you@email.com"
                  className="w-full rounded-2xl px-4 py-3.5 text-[15px] font-medium text-white outline-none text-center"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full rounded-2xl py-3.5 font-black text-[15px] uppercase tracking-wide active:scale-[0.98] transition-transform disabled:opacity-50"
                  style={{ background: '#E63946', boxShadow: '0 0 28px 6px rgba(230,57,70,0.45)' }}
                >
                  {loading ? 'Joining…' : 'Claim my spot'}
                </button>
                {error && <p className="text-xs" style={{ color: '#ff6b7d' }}>{error}</p>}
                {refParam && (
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    ✦ Invited by a friend — you&apos;ll both move up
                  </p>
                )}
              </div>

              {/* Tier ladder */}
              <div className="w-full mt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  The earlier you are, the more you get
                </p>
                <div className="flex flex-col gap-2">
                  {TIERS.map(t => (
                    <div key={t.name} className="rounded-2xl px-4 py-3 text-left"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{t.emoji}</span>
                        <span className="font-black text-sm">{t.name}</span>
                        <span className="text-[10px] ml-auto font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {t.cap === 100 ? 'First 100' : t.cap === 1000 ? 'First 1,000' : t.cap === 5000 ? '1,001–5,000' : '5,000+'}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {t.perks.map(p => (
                          <li key={p} className="text-[12px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ color: '#E63946' }}>·</span>{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── POST-SIGNUP ────────────────────────────────────────────── */
            <motion.div key="post" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center text-center">

              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: '#E63946' }}>
                You&apos;re in 🎉
              </p>

              {/* Position */}
              <div className="mb-2 flex flex-col items-center">
                <span className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Your spot in line</span>
                <motion.span key={status.position} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="font-black text-6xl" style={{ textShadow: '0 0 32px rgba(230,57,70,0.6)' }}>
                  #{status.position.toLocaleString()}
                </motion.span>
              </div>

              {/* Current tier */}
              {(() => {
                const t = tierFor(status.position);
                return (
                  <div className="w-full rounded-2xl px-4 py-3 mb-5 mt-3"
                    style={{ background: 'rgba(230,57,70,0.10)', border: '1px solid rgba(230,57,70,0.3)' }}>
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span>{t.emoji}</span>
                      <span className="font-black text-sm">{t.name} unlocked</span>
                    </div>
                    <ul className="space-y-0.5">
                      {t.perks.map(p => (
                        <li key={p} className="text-[12px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Referral mechanic */}
              <div className="w-full rounded-2xl p-4 mb-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-black text-sm mb-1">Skip the line</p>
                <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Every friend who joins with your link moves you up <span className="font-bold text-white">100 spots</span>.
                  {status.referralCount > 0 && (
                    <> You&apos;ve referred <span className="font-bold" style={{ color: '#E63946' }}>{status.referralCount}</span> — that&apos;s {status.referralCount * 100} spots skipped.</>
                  )}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl px-3 py-2.5 text-[12px] font-mono truncate text-left"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                    {shareUrl.replace(/^https?:\/\//, '')}
                  </div>
                  <button onClick={copyLink}
                    className="rounded-xl px-4 font-black text-[12px] uppercase tracking-wide active:scale-95 transition-transform"
                    style={{ background: copied ? '#22c55e' : '#E63946', boxShadow: `0 0 18px 4px ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(230,57,70,0.4)'}` }}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <button onClick={() => refreshStatus(status.referralCode)}
                className="text-[12px] font-semibold underline underline-offset-2"
                style={{ color: 'rgba(255,255,255,0.5)' }}>
                Refresh my position
              </button>

              <p className="text-[11px] mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {total != null ? `${total.toLocaleString()} people waiting · ` : ''}Doors close at 1,000
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-black" />}>
      <WaitlistInner />
    </Suspense>
  );
}
