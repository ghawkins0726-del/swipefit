'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import StyleDnaCard from '@/components/StyleDnaCard';
import { StyleDna } from '@/lib/styleDna';

function getUserId() {
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function DnaPage() {
  const router = useRouter();
  const [dna, setDna] = useState<StyleDna | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getUserId();
    fetch(`/api/style-dna?userId=${id}`)
      .then(r => r.json())
      .then(d => { setDna(d); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm">
          <ArrowLeft size={18} className="text-[#0A0A0A]" />
        </button>
        <h1 className="font-black text-xl text-[#0A0A0A]">Your Style DNA</h1>
      </div>

      <div className="px-4 space-y-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dna ? (
          <>
            <StyleDnaCard dna={dna} />

            <div className="sf-card p-5">
              <p className="font-black text-[#0A0A0A] text-base mb-2">How it works</p>
              <p className="text-[#5A5A5A] text-sm leading-relaxed">
                Your Style DNA is built from every swipe you make. Likes, super-likes, and passes
                all shape your profile. The more you swipe, the more accurate it gets.
                It's also what powers the Match % you see on each item.
              </p>
            </div>

            <div className="sf-card p-5">
              <p className="font-black text-[#0A0A0A] text-base mb-3">What Match % means</p>
              <div className="space-y-2">
                {[
                  { range: '80–99%', label: 'Core to your DNA', color: '#00C851' },
                  { range: '50–79%', label: 'Strong alignment', color: '#E63946' },
                  { range: '20–49%', label: 'Some overlap', color: '#F5A623' },
                  { range: '0–19%', label: 'Explore outside your box', color: '#AAAAAA' },
                ].map(({ range, label, color }) => (
                  <div key={range} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-bold text-xs text-[#0A0A0A] w-16">{range}</span>
                    <span className="text-xs text-[#5A5A5A]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[#AAAAAA] text-center py-12">Could not load your Style DNA.</p>
        )}
      </div>
    </div>
  );
}
