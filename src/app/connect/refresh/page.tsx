'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

/**
 * Stripe redirects sellers here if their onboarding Account Link expired
 * (links are one-time-use and time-limited). We just kick off a new
 * onboarding link and bounce them straight back to Stripe.
 */
export default function ConnectRefreshPage() {
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/stripe/connect/onboard', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.url) window.location.href = d.url;
        else setErr(d.error || 'Could not refresh — try again from your profile.');
      })
      .catch(() => setErr('Network error. Open your profile and try again.'));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
      <Logo size={80} className="text-white mb-8" />
      <div className="flex items-center gap-3 text-white/60">
        <Loader2 size={18} className="animate-spin" />
        <p className="text-sm">Reopening your Stripe onboarding…</p>
      </div>
      {err && <p className="text-[#FF2E47] text-sm mt-4">{err}</p>}
    </div>
  );
}
