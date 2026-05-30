'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import SwipeFeed from '@/components/SwipeFeed';
import Navbar from '@/components/Navbar';
import { Search, Bell } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';

export default function FeedPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [seeded, setSeeded] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const hasOnboarded = localStorage.getItem(`swipefit_onboarded_${user.id}`);
    if (!hasOnboarded) {
      localStorage.setItem(`swipefit_onboarded_${user.id}`, '1');
      router.push('/onboarding');
      return;
    }
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setUnread(d.unreadCount || 0))
      .catch(() => {});
  }, [isLoaded, user, router]);

  useEffect(() => {
    fetch('/api/seed').then(r => r.json()).then(d => {
      if (d.count === 0) {
        fetch('/api/seed', { method: 'POST' }).then(() => setSeeded(true));
      } else {
        setSeeded(true);
      }
    });
  }, []);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    // Fixed inset-0 = unambiguously full viewport, no flex sizing issues
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ touchAction: 'none' }}>

      {/* ── SwipeFeed: fills entire screen, Navbar overlays it via z-index ── */}
      <div className="absolute inset-0">
        {seeded ? (
          <SwipeFeed userId={user.id} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ── Floating header ── */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
      >
        <Logo size={28} withWordmark className="text-white pointer-events-auto" href="/feed" />
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href="/search"
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)' }}>
            <Search size={15} className="text-white" />
          </Link>
          <Link href="/profile"
            className="relative w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)' }}>
            <Bell size={15} className="text-white" />
            {unread > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E63946] rounded-full flex items-center justify-center">
                <span className="text-white text-[8px] font-black">{unread}</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
