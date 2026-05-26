import Link from 'next/link';
import { Flame, Dna } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 pt-20 pb-12">
        {/* Wordmark */}
        <div className="mb-2">
          <div className="inline-flex items-center gap-2 bg-[#E63946]/10 border border-[#E63946]/20 rounded-full px-3 py-1 mb-6">
            <Flame size={12} className="text-[#E63946]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E63946]">New · Resale · Your Taste</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tight leading-none mb-3">
            Swipe<br />
            <span className="text-[#E63946]">Fit.</span>
          </h1>
          <p className="text-[#AAAAAA] text-lg font-medium max-w-xs leading-snug">
            The only fashion marketplace that actually learns your style.
          </p>
        </div>

        {/* Feature list */}
        <div className="mt-8 space-y-3 max-w-xs">
          {[
            { num: '01', title: 'Swipe like Tinder', body: 'Right to like. Left to pass. Up to super-like.' },
            { num: '02', title: 'TikTok-style feed', body: 'Every swipe trains the algorithm. Your feed gets sharper instantly.' },
            { num: '03', title: 'Style DNA', body: 'See your fashion personality broken down. Share it. Compare it.', new: true },
            { num: '04', title: 'Buy & sell anything', body: 'New, vintage, designer. Make offers. No gate-keeping.' },
          ].map(({ num, title, body, new: isNew }) => (
            <div key={num} className="flex gap-4">
              <span className="text-[#E63946] font-black text-xs pt-0.5 flex-shrink-0 w-5">{num}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{title}</p>
                  {isNew && <span className="text-[9px] font-black uppercase tracking-wide text-[#E63946] border border-[#E63946]/40 px-1.5 py-0.5 rounded">New</span>}
                </div>
                <p className="text-[#5A5A5A] text-xs mt-0.5 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12 space-y-3">
        <Link href="/feed"
          className="flex items-center justify-center w-full bg-[#E63946] text-white font-black text-base py-4 rounded-xl hover:bg-[#cc3040] active:scale-95 transition-all">
          Start Swiping
        </Link>
        <Link href="/sell"
          className="flex items-center justify-center w-full border border-[#2A2A2A] text-[#AAAAAA] font-semibold text-sm py-3.5 rounded-xl hover:border-[#5A5A5A] hover:text-white transition-all">
          List an Item
        </Link>
        <p className="text-center text-[#3A3A3A] text-[11px]">
          No account required to start browsing.
        </p>
      </div>
    </main>
  );
}
