'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

const UNLOCKED = ['Daily Drop — AI curated picks', 'Outfit Architect — full chat stylist', 'Priority new arrivals', 'Deep Style DNA insights'];

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">

      {/* Crown badge */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full bg-[#E63946]/40 blur-3xl scale-150 animate-pulse" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-[#E63946] to-[#ff8c42] rounded-[32px] flex items-center justify-center shadow-2xl shadow-[#E63946]/50">
          <Crown size={48} className="text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="text-[#E63946] font-black text-xs uppercase tracking-widest mb-2">You&apos;re in</p>
        <h1 className="font-black text-white text-4xl tracking-tight leading-tight mb-3">
          SwipeFit Premium<br />unlocked 🎉
        </h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          Welcome to the drop. Everything&apos;s live — go explore.
        </p>
      </motion.div>

      {/* Unlocked list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-left"
      >
        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-3">Now unlocked</p>
        <div className="space-y-2.5">
          {UNLOCKED.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 bg-[#E63946] rounded-full flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-white" strokeWidth={3} />
              </div>
              <p className="text-white text-sm font-semibold">{item}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="w-full max-w-xs space-y-3"
      >
        <Link href="/dna" className="btn-halo w-full justify-between">
          <span className="flex items-center gap-2">
            <Sparkles size={16} />
            Open Daily Drop
          </span>
          <ArrowRight size={16} />
        </Link>

        <Link href="/feed" className="btn-halo-ghost w-full justify-between">
          <span>Continue swiping</span>
          <ArrowRight size={16} className="text-white/40" />
        </Link>
      </motion.div>

    </div>
  );
}
