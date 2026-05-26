'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface ConnectStatus {
  connected: boolean;
  ready?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsDue?: string[];
}

export default function ConnectReturnPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);

  useEffect(() => {
    fetch('/api/stripe/connect/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
      <Logo size={80} className="text-white mb-8" />

      {!status ? (
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-sm">Checking your account…</p>
        </div>
      ) : status.ready ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#FF2E47]/30 rounded-full blur-2xl scale-150" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-[#FF2E47] to-[#ff8c42] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#FF2E47]/40">
              <CheckCircle2 size={36} className="text-white" strokeWidth={2} />
            </div>
          </div>
          <h1 className="font-black text-white text-3xl tracking-tight mb-2">
            You&apos;re set up to sell 🎉
          </h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs">
            Your bank is verified. When someone buys from you, 90% drops straight into your Stripe balance — we keep 10%.
          </p>
          <Link href="/sell"
            className="flex items-center justify-center gap-2 bg-[#FF2E47] text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-[#FF2E47]/30">
            List your first item
            <ArrowRight size={16} />
          </Link>
          <Link href="/profile" className="text-white/40 text-xs mt-4 underline">
            Back to profile
          </Link>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white/8 border border-white/10 rounded-3xl flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-white/60" />
          </div>
          <h1 className="font-black text-white text-2xl tracking-tight mb-2">Almost there</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs">
            Stripe still needs a few things before you can accept payouts.
            {status.requirementsDue && status.requirementsDue.length > 0 && (
              <span className="block mt-2 text-white/60">Missing: {status.requirementsDue.join(', ')}</span>
            )}
          </p>
          <Link href="/profile"
            className="bg-white/10 border border-white/10 text-white font-bold px-6 py-3 rounded-2xl text-sm">
            Back to profile
          </Link>
        </motion.div>
      )}
    </div>
  );
}
