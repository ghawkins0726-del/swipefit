'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flame, TrendingUp, PlusSquare, Search, User, MessageSquare } from 'lucide-react';

const tabs = [
  { href: '/feed', icon: Flame, label: 'Feed', match: '/feed' },
  { href: '/trending', icon: TrendingUp, label: 'Trending', match: '/trending' },
  { href: '/sell', icon: PlusSquare, label: 'Sell', match: '/sell' },
  { href: '/messages', icon: MessageSquare, label: 'Messages', match: '/messages' },
  { href: '/search', icon: Search, label: 'Search', match: '/search' },
  { href: '/profile', icon: User, label: 'Profile', match: '/profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const userId = localStorage.getItem('swipefit_user_id');
    if (!userId) return;
    fetch(`/api/messages?userId=${userId}&count=true`)
      .then(r => r.json())
      .then(d => setUnread(d.count ?? 0));
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EBEBEB' }}>
      <div className="flex items-center justify-around px-1">
        {tabs.map(({ href, icon: Icon, label, match }) => {
          const active = pathname === match || (match !== '/feed' && pathname.startsWith(match));
          const isMessages = match === '/messages';
          return (
            <Link key={label} href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors relative ${
                active ? 'text-[#0A0A0A]' : 'text-[#AAAAAA] hover:text-[#5A5A5A]'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {isMessages && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
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
