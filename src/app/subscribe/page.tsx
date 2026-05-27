'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, Crown, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const FEATURES = [
  { icon: '⚡', label: 'Daily Drop', desc: 'AI-curated picks matched to your Style DNA every day' },
  { icon: '✨', label: 'Outfit Architect', desc: 'Full conversational AI stylist building outfits from your likes' },
  { icon: '🔥', label: 'Priority feed', desc: 'See the best new items before everyone else' },
  { icon: '❤️', label: 'Unlimited likes', desc: 'No limits — like everything you want' },
  { icon: '📊', label: 'Deep DNA insights', desc: 'Full breakdown of your style archetype and taste profile' },
];

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* Header: Logo + back */}
      <div className="pt-12 px-4 flex items-center justify-between flex-shrink-0">
        <Logo size={26} href="/feed" className="text-white" />
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6 flex-shrink-0">
        {/* Animated crown badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="relative mb-6"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#E63946]/30 blur-2xl scale-150" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-[#E63946] to-[#ff8c42] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#E63946]/40">
            <Crown size={40} className="text-white" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="font-black text-white text-3xl text-center tracking-tight leading-tight">
            Wove<br />
            <span className="text-[#E63946]">Premium</span>
          </h1>
          <p className="text-white/40 text-center text-sm mt-2">
            Unlock your full style potential
          </p>
        </motion.div>
      </div>

      {/* Features */}
      <div className="flex-1 px-4 space-y-2 pb-6">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            className="flex items-start gap-4 bg-white/5 rounded-2xl px-4 py-4 border border-white/8"
          >
            <span className="text-2xl flex-shrink-0">{f.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm">{f.label}</p>
              <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
            <Check size={16} className="text-[#E63946] flex-shrink-0 mt-0.5" />
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex-shrink-0 px-4 pb-10 pt-2"
      >
        {error && (
          <p className="text-[#E63946] text-xs text-center mb-3 font-medium">{error}</p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn-halo w-full text-base"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles size={18} />
              Unlock Premium · $4.99/mo
            </>
          )}
        </button>

        <p className="text-white/20 text-[11px] text-center mt-3 leading-relaxed">
          Billed monthly. Cancel anytime in your account settings.
        </p>
      </motion.div>

    </div>
  );
}
