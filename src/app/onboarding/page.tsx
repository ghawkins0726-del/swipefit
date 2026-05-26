'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Sparkles } from 'lucide-react';

const STYLE_OPTIONS = [
  { id: 'streetwear', emoji: '🧢', label: 'Streetwear', desc: 'Supreme, Off-White, Stüssy' },
  { id: 'minimal', emoji: '⬜', label: 'Minimal', desc: 'Clean lines, neutral tones' },
  { id: 'vintage', emoji: '🕶️', label: 'Vintage', desc: "Levi's, thrift, retro" },
  { id: 'preppy', emoji: '🐴', label: 'Preppy', desc: 'Ralph Lauren, loafers, polo' },
  { id: 'techwear', emoji: '⚙️', label: 'Techwear', desc: "Arc'teryx, Gore-Tex, utility" },
  { id: 'y2k', emoji: '💿', label: 'Y2K', desc: 'Low rise, baby tees, chrome' },
  { id: 'luxury', emoji: '💎', label: 'Luxury', desc: 'Designer, high fashion' },
  { id: 'bohemian', emoji: '🌿', label: 'Bohemian', desc: 'Flowy, earthy, Free People' },
  { id: 'athletic', emoji: '🏃', label: 'Athletic', desc: 'Nike, Adidas, sporty' },
  { id: 'workwear', emoji: '🔨', label: 'Workwear', desc: 'Carhartt, utility, durable' },
];

const BUDGET_OPTIONS = [
  { id: '0', label: 'Under $25', sub: 'Thrift scores' },
  { id: '1', label: '$25–$75', sub: 'Mid range' },
  { id: '2', label: '$75–$200', sub: 'Quality pieces' },
  { id: '3', label: '$200–$500', sub: 'Premium' },
  { id: '4', label: '$500+', sub: 'Luxury' },
];

const CAT_OPTIONS = [
  { id: 'tops', emoji: '👕', label: 'Tops' },
  { id: 'bottoms', emoji: '👖', label: 'Bottoms' },
  { id: 'shoes', emoji: '👟', label: 'Shoes' },
  { id: 'outerwear', emoji: '🧥', label: 'Outerwear' },
  { id: 'dresses', emoji: '👗', label: 'Dresses' },
  { id: 'accessories', emoji: '⌚', label: 'Accessories' },
];

const STEPS = ['styles', 'categories', 'budget', 'done'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStepIdx] = useState(0);
  const [styles, setStyles] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('1');

  const stepName = STEPS[step];

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const finish = () => {
    if (user?.id) {
      localStorage.setItem(`swipefit_onboarded_${user.id}`, '1');
    }

    fetch('/api/swipe/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ styles, categories, budget }),
    }).catch(() => {});

    router.push('/feed');
  };

  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-full bg-[#E63946]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-10 pb-8 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {stepName === 'styles' && (
            <motion.div key="styles"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-[#0A0A0A] mb-1">What&apos;s your vibe?</h1>
              <p className="text-[#5A5A5A] text-sm mb-6">Pick everything that fits. The algorithm uses this immediately.</p>
              <div className="grid grid-cols-2 gap-2.5 flex-1">
                {STYLE_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => toggle(styles, setStyles, s.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all relative ${
                      styles.includes(s.id) ? 'border-[#E63946] bg-red-50' : 'border-[#EBEBEB] bg-[#F5F4F0] hover:border-[#CCC]'
                    }`}
                  >
                    <div className="text-xl mb-1">{s.emoji}</div>
                    <div className="font-bold text-sm text-[#0A0A0A]">{s.label}</div>
                    <div className="text-xs text-[#AAAAAA] truncate">{s.desc}</div>
                    {styles.includes(s.id) && (
                      <div className="absolute top-2 right-2">
                        <Check size={14} className="text-[#E63946]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'categories' && (
            <motion.div key="categories"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-[#0A0A0A] mb-1">What do you shop for?</h1>
              <p className="text-[#5A5A5A] text-sm mb-6">We&apos;ll weight your feed toward what you love.</p>
              <div className="grid grid-cols-3 gap-3 flex-1">
                {CAT_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => toggle(categories, setCategories, c.id)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      categories.includes(c.id) ? 'border-[#E63946] bg-red-50' : 'border-[#EBEBEB] bg-[#F5F4F0]'
                    }`}
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <span className="font-semibold text-xs text-[#0A0A0A]">{c.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'budget' && (
            <motion.div key="budget"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-[#0A0A0A] mb-1">Your sweet spot?</h1>
              <p className="text-[#5A5A5A] text-sm mb-6">This shapes what price range shows up most in your feed.</p>
              <div className="flex flex-col gap-2.5">
                {BUDGET_OPTIONS.map(b => (
                  <button key={b.id} onClick={() => setBudget(b.id)}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      budget === b.id ? 'border-[#E63946] bg-red-50' : 'border-[#EBEBEB] bg-[#F5F4F0]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[#0A0A0A]">{b.label}</div>
                      <div className="text-xs text-[#AAAAAA]">{b.sub}</div>
                    </div>
                    {budget === b.id && <Check size={18} className="text-[#E63946]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'done' && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 bg-[#E63946] rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                <Sparkles size={36} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-[#0A0A0A] mb-3">You&apos;re all set!</h1>
              <p className="text-[#5A5A5A] mb-8">Your personalized feed is ready. The algorithm keeps learning as you swipe.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          {stepName !== 'done' ? (
            <button
              onClick={() => setStepIdx(i => i + 1)}
              disabled={stepName === 'styles' && styles.length === 0}
              className="w-full bg-[#0A0A0A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#222] transition-colors active:scale-95"
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="w-full bg-[#E63946] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              Start Discovering <ChevronRight size={18} />
            </button>
          )}
          {step > 0 && stepName !== 'done' && (
            <button onClick={() => setStepIdx(i => i - 1)}
              className="w-full text-center text-sm text-[#AAAAAA] mt-3 py-2">
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
