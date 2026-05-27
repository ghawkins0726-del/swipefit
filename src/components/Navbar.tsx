'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flame, PlusSquare, User, Dna, MessageSquare } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

type Tab = { href: string; icon: React.ElementType; label: string; match: string; center?: boolean };

const tabs: Tab[] = [
  { href: '/dna',      icon: Dna,            label: 'DNA',      match: '/dna' },
  { href: '/messages', icon: MessageSquare,  label: 'Messages', match: '/messages' },
  { href: '/feed',     icon: Flame,          label: 'Swipe',    match: '/feed', center: true },
  { href: '/sell',     icon: PlusSquare,     label: 'Sell',     match: '/sell' },
  { href: '/profile',  icon: User,           label: 'Profile',  match: '/profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch('/api/messages?count=true')
      .then(r => r.json())
      .then(d => setUnread(d.count ?? 0));
  }, [pathname, user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EBEBEB' }}>
      <div className="flex items-center justify-around px-2">
        {tabs.map(({ href, icon: Icon, label, match, center }) => {
          const active = pathname === match || (match !== '/feed' && pathname.startsWith(match));
          const isMessages = match === '/messages';

          if (center) {
            return (
              <Link key={label} href={href} className="flex flex-col items-center -mt-5">
                <div className={`relative w-16 h-16 rounded-3xl flex items-center justify-center transition-all border ${
                  active
                    ? 'bg-gradient-to-b from-[#FF3B47] to-[#E63946] border-white/15'
                    : 'bg-gradient-to-b from-[#1a1a1a] to-[#0A0A0A] border-white/10'
                }`}
                style={{
                  boxShadow: active
                    ? '0 0 0 1px rgba(255,46,71,0.4), 0 0 36px 4px rgba(255,46,71,0.4), 0 14px 28px -8px rgba(255,46,71,0.55), inset 0 1px 0 rgba(255,255,255,0.25)'
                    : '0 0 28px 0 rgba(0,0,0,0.35), 0 12px 24px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}>
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${active ? 'text-[#E63946]' : 'text-[#0A0A0A]'}`}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link key={label} href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors relative ${
                active ? 'text-[#0A0A0A]' : 'text-[#AAAAAA] hover:text-[#5A5A5A]'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {isMessages && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-[#E63946] rounded-full text-white text-[9px] font-black flex items-center justify-center">
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
