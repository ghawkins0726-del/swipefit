import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* Hero — single centered column, symmetric padding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center text-center w-full max-w-xs gap-0">

          {/* Logo mark — explicitly centered */}
          <div className="flex justify-center mb-5">
            <Logo size={110} className="text-white" />
          </div>

          {/* Wordmark */}
          <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-3">
            Wo<span className="text-[#FF2E47]">ve</span>
          </h1>

          {/* Tagline */}
          <p className="text-[#555] text-base font-medium leading-snug mb-10">
            Unravel your style.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {['Swipe to shop', 'AI style DNA', 'Make offers', 'Sell instantly'].map(f => (
              <span key={f}
                className="text-[11px] font-bold text-[#AAAAAA] border border-[#222] px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="w-full space-y-3">
            <Link href="/feed" className="btn-halo w-full text-base">
              Start Swiping
            </Link>
            <Link href="/sign-up" className="btn-halo-ghost w-full">
              Create Account
            </Link>
            <p className="text-[#2A2A2A] text-[11px]">
              Already have one?{' '}
              <Link href="/sign-in" className="text-[#E63946] font-semibold">Sign in</Link>
            </p>
          </div>

        </div>
      </div>

      {/* Bottom row */}
      <div className="border-t border-[#111] px-6 py-5">
        <div className="flex items-center justify-center gap-6">
          {['Buyer protection', 'Fast shipping', 'Real style AI'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E63946]" />
              <span className="text-[10px] font-bold text-[#333] uppercase tracking-wide">{t}</span>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}
