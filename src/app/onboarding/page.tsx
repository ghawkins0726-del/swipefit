'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Sparkles } from 'lucide-react';

// ─── Step data ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { id: 'men',   emoji: '👔', label: "Men's",   desc: 'Menswear & unisex' },
  { id: 'women', emoji: '👗', label: "Women's", desc: 'Womenswear & unisex' },
  { id: 'all',   emoji: '✨', label: 'All',     desc: 'Show me everything' },
];

const TOP_SIZES: Record<string, string[]> = {
  men:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  women: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  all:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
};

const BOTTOM_SIZES: Record<string, string[]> = {
  men:   ['28', '30', '32', '34', '36', '38', '40'],
  women: ['0', '2', '4', '6', '8', '10', '12', '14'],
  all:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
};

const SHOE_SIZES: Record<string, string[]> = {
  men:   ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13'],
  women: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
  all:   ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13'],
};

const STYLE_OPTIONS = [
  { id: 'streetwear', emoji: '🧢', label: 'Streetwear', desc: 'Supreme, Off-White, Stüssy' },
  { id: 'minimal',    emoji: '⬜', label: 'Minimal',    desc: 'Clean lines, neutral tones' },
  { id: 'vintage',    emoji: '🕶️', label: 'Vintage',    desc: "Levi's, thrift, retro" },
  { id: 'preppy',     emoji: '🐴', label: 'Preppy',     desc: 'Ralph Lauren, loafers, polo' },
  { id: 'techwear',   emoji: '⚙️', label: 'Techwear',   desc: "Arc'teryx, Gore-Tex, utility" },
  { id: 'y2k',        emoji: '💿', label: 'Y2K',        desc: 'Low rise, baby tees, chrome' },
  { id: 'luxury',     emoji: '💎', label: 'Luxury',     desc: 'Designer, high fashion' },
  { id: 'bohemian',   emoji: '🌿', label: 'Bohemian',   desc: 'Flowy, earthy, Free People' },
  { id: 'athletic',   emoji: '🏃', label: 'Athletic',   desc: 'Nike, Adidas, sporty' },
  { id: 'workwear',   emoji: '🔨', label: 'Workwear',   desc: 'Carhartt, utility, durable' },
];

const BUDGET_OPTIONS = [
  { id: '0', label: 'Under $25',   sub: 'Thrift scores' },
  { id: '1', label: '$25–$75',     sub: 'Mid range' },
  { id: '2', label: '$75–$200',    sub: 'Quality pieces' },
  { id: '3', label: '$200–$500',   sub: 'Premium' },
  { id: '4', label: '$500+',       sub: 'Luxury' },
];

const CAT_OPTIONS = [
  { id: 'tops',        emoji: '👕', label: 'Tops' },
  { id: 'bottoms',     emoji: '👖', label: 'Bottoms' },
  { id: 'shoes',       emoji: '👟', label: 'Shoes' },
  { id: 'outerwear',   emoji: '🧥', label: 'Outerwear' },
  { id: 'dresses',     emoji: '👗', label: 'Dresses' },
  { id: 'accessories', emoji: '⌚', label: 'Accessories' },
];

const STEPS = ['gender', 'sizes', 'styles', 'categories', 'budget', 'done'] as const;
type Step = typeof STEPS[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function SizeChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-3.5 py-2 rounded-xl border-2 font-bold text-sm transition-all relative ${
        selected ? 'border-[#E63946] bg-[#E63946]/10 text-[#E63946]' : 'border-[#2a2a2a] bg-[#1c1c1c] text-white'
      }`}
    >
      {label}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E63946] rounded-full flex items-center justify-center">
          <Check size={9} className="text-white" />
        </span>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [stepIdx, setStepIdx] = useState(0);

  // Gender + sizes
  const [gender, setGender] = useState<string>('all');
  const [topSizes, setTopSizes] = useState<string[]>([]);
  const [bottomSizes, setBottomSizes] = useState<string[]>([]);
  const [shoeSizes, setShoeSizes] = useState<string[]>([]);

  // Style / category / budget
  const [styles, setStyles] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('1');

  const stepName: Step = STEPS[stepIdx];
  const progress = (stepIdx / (STEPS.length - 1)) * 100;

  const canContinue = (): boolean => {
    if (stepName === 'gender') return gender !== '';
    if (stepName === 'styles') return styles.length > 0;
    return true;
  };

  const finish = () => {
    if (user?.id) {
      localStorage.setItem(`swipefit_onboarded_${user.id}`, '1');
      // Store size/gender prefs for client-side filtering
      localStorage.setItem(`swipefit_gender_${user.id}`, gender);
      localStorage.setItem(`swipefit_tops_${user.id}`, topSizes.join(','));
      localStorage.setItem(`swipefit_bottoms_${user.id}`, bottomSizes.join(','));
      localStorage.setItem(`swipefit_shoes_${user.id}`, shoeSizes.join(','));
    }

    fetch('/api/swipe/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ styles, categories, budget, gender, topSizes, bottomSizes, shoeSizes }),
    }).catch(() => {});

    router.push('/feed');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-full bg-[#E63946]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-10 pb-8 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── Gender ── */}
          {stepName === 'gender' && (
            <motion.div key="gender"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-white mb-1">What do you shop for?</h1>
              <p className="text-[#B5B5B5] text-sm mb-6">This shapes the items and sizing shown in your feed.</p>
              <div className="flex flex-col gap-3 flex-1">
                {GENDER_OPTIONS.map(g => (
                  <button key={g.id} onClick={() => setGender(g.id)}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                      gender === g.id ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a2a] bg-[#1c1c1c]'
                    }`}
                  >
                    <span className="text-3xl">{g.emoji}</span>
                    <div className="text-left">
                      <div className="font-bold text-white">{g.label}</div>
                      <div className="text-xs text-[#AAAAAA]">{g.desc}</div>
                    </div>
                    {gender === g.id && <Check size={18} className="text-[#E63946] ml-auto" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Sizes ── */}
          {stepName === 'sizes' && (
            <motion.div key="sizes"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <h1 className="text-2xl font-black text-white mb-1">What sizes do you wear?</h1>
              <p className="text-[#B5B5B5] text-sm mb-5">Select all that apply — we&apos;ll prioritise items in your size.</p>

              {/* Tops */}
              <div className="mb-5">
                <p className="text-xs font-black text-white uppercase tracking-wide mb-2.5">👕 Tops</p>
                <div className="flex flex-wrap gap-2">
                  {TOP_SIZES[gender].map(s => (
                    <SizeChip key={s} label={s} selected={topSizes.includes(s)}
                      onToggle={() => setTopSizes(prev => toggle(prev, s))} />
                  ))}
                </div>
              </div>

              {/* Bottoms */}
              <div className="mb-5">
                <p className="text-xs font-black text-white uppercase tracking-wide mb-2.5">
                  👖 Bottoms {gender === 'men' ? '(waist)' : gender === 'women' ? '(US)' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {BOTTOM_SIZES[gender].map(s => (
                    <SizeChip key={s} label={s} selected={bottomSizes.includes(s)}
                      onToggle={() => setBottomSizes(prev => toggle(prev, s))} />
                  ))}
                </div>
              </div>

              {/* Shoes */}
              <div className="mb-5">
                <p className="text-xs font-black text-white uppercase tracking-wide mb-2.5">👟 Shoes</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES[gender].map(s => (
                    <SizeChip key={s} label={s} selected={shoeSizes.includes(s)}
                      onToggle={() => setShoeSizes(prev => toggle(prev, s))} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Styles ── */}
          {stepName === 'styles' && (
            <motion.div key="styles"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-white mb-1">What&apos;s your vibe?</h1>
              <p className="text-[#B5B5B5] text-sm mb-6">Pick everything that fits. The algorithm uses this immediately.</p>
              <div className="grid grid-cols-2 gap-2.5 flex-1">
                {STYLE_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setStyles(prev => toggle(prev, s.id))}
                    className={`p-3 rounded-2xl border-2 text-left transition-all relative ${
                      styles.includes(s.id) ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a2a] bg-[#1c1c1c] hover:border-[#CCC]'
                    }`}
                  >
                    <div className="text-xl mb-1">{s.emoji}</div>
                    <div className="font-bold text-sm text-white">{s.label}</div>
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

          {/* ── Categories ── */}
          {stepName === 'categories' && (
            <motion.div key="categories"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-white mb-1">What do you shop for?</h1>
              <p className="text-[#B5B5B5] text-sm mb-6">We&apos;ll weight your feed toward what you love.</p>
              <div className="grid grid-cols-3 gap-3 flex-1">
                {CAT_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setCategories(prev => toggle(prev, c.id))}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      categories.includes(c.id) ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a2a] bg-[#1c1c1c]'
                    }`}
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <span className="font-semibold text-xs text-white">{c.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Budget ── */}
          {stepName === 'budget' && (
            <motion.div key="budget"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-black text-white mb-1">Your sweet spot?</h1>
              <p className="text-[#B5B5B5] text-sm mb-6">This shapes what price range shows up most in your feed.</p>
              <div className="flex flex-col gap-2.5">
                {BUDGET_OPTIONS.map(b => (
                  <button key={b.id} onClick={() => setBudget(b.id)}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      budget === b.id ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a2a] bg-[#1c1c1c]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white">{b.label}</div>
                      <div className="text-xs text-[#AAAAAA]">{b.sub}</div>
                    </div>
                    {budget === b.id && <Check size={18} className="text-[#E63946]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Done ── */}
          {stepName === 'done' && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 bg-[#E63946] rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                <Sparkles size={36} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-3">You&apos;re all set!</h1>
              <p className="text-[#B5B5B5] mb-8">Your personalized feed is ready. The algorithm keeps learning as you swipe.</p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Navigation ── */}
        <div className="mt-6">
          {stepName !== 'done' ? (
            <button
              onClick={() => setStepIdx(i => i + 1)}
              disabled={!canContinue()}
              className="w-full bg-[#E63946] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#c92f3c] transition-colors active:scale-95"
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
          {stepIdx > 0 && stepName !== 'done' && (
            <button onClick={() => setStepIdx(i => i - 1)}
              className="w-full text-center text-sm text-[#AAAAAA] mt-3 py-2">
              Back
            </button>
          )}
          {/* Skip sizes — it's optional */}
          {stepName === 'sizes' && (
            <button onClick={() => setStepIdx(i => i + 1)}
              className="w-full text-center text-xs text-[#CCCCCC] mt-1 py-1.5">
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
