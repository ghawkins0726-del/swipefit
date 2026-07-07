'use client';

import { motion } from 'framer-motion';
import { StyleDna } from '@/lib/styleDna';
import { Share2, Dna } from 'lucide-react';

interface Props {
  dna: StyleDna;
  compact?: boolean;
}

const DIM_COLORS: Record<string, string> = {
  Streetwear:  '#E63946',
  Minimal:     '#0A0A0A',
  Vintage:     '#A0522D',
  Luxury:      '#8B6914',
  Outdoor:     '#2E7D32',
  Preppy:      '#1565C0',
  Bohemian:    '#7B1FA2',
  Athletic:    '#E65100',
};

export default function StyleDnaCard({ dna, compact = false }: Props) {
  const sorted = Object.entries(dna.dimensions)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0);

  const share = () => {
    const text = `My Style DNA on Wove: ${dna.archetype}\n${dna.keywords.join(' · ')}\n\nwove.app`;
    if (navigator.share) navigator.share({ title: 'My Style DNA', text });
    else navigator.clipboard.writeText(text);
  };

  if (!dna.confident) {
    return (
      <div className="sf-card p-5 text-center">
        <Dna size={28} className="mx-auto mb-2 text-[#AAAAAA]" />
        <p className="font-bold text-white text-sm mb-1">Style DNA unlocks at 5 swipes</p>
        <p className="text-[#AAAAAA] text-xs">Keep swiping — {dna.basedOn}/5 done</p>
        <div className="h-1 bg-[#262626] rounded-full mt-3">
          <div className="h-full bg-[#E63946] rounded-full transition-all"
            style={{ width: `${(dna.basedOn / 5) * 100}%` }} />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="sf-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="sf-label mb-0.5">Style DNA</p>
            <p className="font-black text-white text-base">{dna.archetype}</p>
          </div>
          <button onClick={share} className="w-8 h-8 flex items-center justify-center bg-[#1c1c1c] rounded-full">
            <Share2 size={14} className="text-[#B5B5B5]" />
          </button>
        </div>

        {/* Mini bar chart */}
        <div className="space-y-1.5">
          {sorted.slice(0, 4).map(([dim, score]) => (
            <div key={dim} className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-[#B5B5B5] w-16 flex-shrink-0">{dim}</p>
              <div className="flex-1 h-1.5 bg-[#1c1c1c] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: DIM_COLORS[dim] ?? '#0A0A0A' }}
                />
              </div>
              <p className="text-[10px] font-bold text-[#AAAAAA] w-7 text-right">{score}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 mt-3">
          {dna.keywords.map(k => (
            <span key={k} className="text-[9px] font-bold uppercase tracking-wide text-[#B5B5B5] bg-[#1c1c1c] px-2 py-0.5 rounded">
              {k}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div className="sf-card overflow-hidden">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-6 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA] mb-1">Your Style DNA</p>
        <h2 className="text-2xl font-black text-white">{dna.archetype}</h2>
        <p className="text-[#AAAAAA] text-sm mt-1 leading-snug">{dna.archetypeDesc}</p>
        <div className="flex gap-2 mt-3">
          {dna.keywords.map(k => (
            <span key={k} className="text-[10px] font-black uppercase tracking-wide text-[#E63946] border border-[#E63946]/30 px-2 py-0.5 rounded">
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="p-5 space-y-3">
        {sorted.map(([dim, score], i) => (
          <div key={dim}>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold text-white">{dim}</p>
              <p className="text-xs font-black text-[#AAAAAA]">{score}</p>
            </div>
            <div className="h-2 bg-[#1c1c1c] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: DIM_COLORS[dim] ?? '#0A0A0A' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 flex items-center justify-between">
        <p className="text-[10px] text-[#AAAAAA]">Based on {dna.basedOn} swipes</p>
        <button onClick={share}
          className="flex items-center gap-1.5 text-xs font-bold text-[#E63946] bg-[#E63946]/15 px-3 py-1.5 rounded-full">
          <Share2 size={11} />
          Share DNA
        </button>
      </div>
    </div>
  );
}
