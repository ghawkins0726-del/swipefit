'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, TrendingUp, PlusSquare, Search, User } from 'lucide-react';

const tabs = [
  { href: '/feed', icon: Flame, label: 'Feed', match: '/feed' },
  { href: '/trending', icon: TrendingUp, label: 'Trending', match: '/trending' },
  { href: '/sell', icon: PlusSquare, label: 'Sell', match: '/sell' },
  { href: '/search', icon: Search, label: 'Search', match: '/search' },
  { href: '/profile', icon: User, label: 'Profile', match: '/profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EBEBEB' }}>
      <div className="flex items-center justify-around px-2">
        {tabs.map(({ href, icon: Icon, label, match }) => {
          const active = pathname === match || (match !== '/feed' && pathname.startsWith(match));
          return (
            <Link key={label} href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3 transition-colors ${
                active ? 'text-[#0A0A0A]' : 'text-[#AAAAAA] hover:text-[#5A5A5A]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? 'text-[#0A0A0A]' : 'text-[#AAAAAA]'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
