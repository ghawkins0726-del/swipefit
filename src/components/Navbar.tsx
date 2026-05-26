'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, PlusSquare, Search, User, Dna } from 'lucide-react';

const tabs = [
  { href: '/feed',    icon: Flame,      label: 'Feed',    match: '/feed' },
  { href: '/search',  icon: Search,     label: 'Search',  match: '/search' },
  { href: '/dna',     icon: Dna,        label: 'DNA',     match: '/dna',  center: true },
  { href: '/sell',    icon: PlusSquare, label: 'Sell',    match: '/sell' },
  { href: '/profile', icon: User,       label: 'Profile', match: '/profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EBEBEB' }}>
      <div className="flex items-center justify-around px-2">
        {tabs.map(({ href, icon: Icon, label, match, center }) => {
          const active = pathname === match || (match !== '/feed' && pathname.startsWith(match));

          if (center) {
            return (
              <Link key={label} href={href} className="flex flex-col items-center -mt-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                  active
                    ? 'bg-[#E63946] shadow-[#E63946]/40'
                    : 'bg-[#0A0A0A] shadow-black/30'
                }`}>
                  <Icon size={22} strokeWidth={2} className="text-white" />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide mt-1 ${active ? 'text-[#E63946]' : 'text-[#AAAAAA]'}`}>
                  {label}
                </span>
              </Link>
            );
          }

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
