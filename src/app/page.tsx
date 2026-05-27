import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">

        {/* Logo */}
        <div className="mb-6">
          <Logo size={140} className="text-white" />
        </div>

        {/* Wordmark */}
        <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-3 text-center">
          Swipe<span className="text-[#FF2E47]">Fit</span>
        </h1>
        <p className="text-[#555] text-base font-medium text-center max-w-xs leading-snug mb-10">
          The only fashion marketplace that learns your style.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-12 max-w-xs">
          {['Swipe to shop','AI style DNA','Make offers','Sell instantly'].map(f => (
            <span key={f}
              className="text-[11px] font-bold text-[#AAAAAA] border border-[#222] px-3 py-1.5 rounded-full">
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full max-w-xs space-y-3">
          <Link href="/feed" className="btn-halo w-full text-base">
            Start Swiping
          </Link>
          <Link href="/sign-up" className="btn-halo-ghost w-full">
            Create Account
          </Link>
          <p className="text-center text-[#2A2A2A] text-[11px]">
            Already have one?{' '}
            <Link href="/sign-in" className="text-[#E63946] font-semibold">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Bottom detail row */}
      <div className="border-t border-[#111] px-6 py-5">
        <div className="flex items-center justify-center gap-6">
          {['Buyer protection','Fast shipping','Real style AI'].map(t => (
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
