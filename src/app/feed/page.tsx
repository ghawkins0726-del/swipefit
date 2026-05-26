'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import SwipeFeed from '@/components/SwipeFeed';
import Navbar from '@/components/Navbar';
import { Flame, Search, Bell, Dna } from 'lucide-react';
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
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F4F0]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-12 pb-3 bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#E63946]" strokeWidth={2.5} />
          <span className="font-black text-lg text-[#0A0A0A] tracking-tight">SwipeFit</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Link href="/dna"
            className="flex items-center gap-1.5 bg-[#0A0A0A] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg">
            <Dna size={11} />
            Style DNA
          </Link>
          <Link href="/search"
            className="w-8 h-8 flex items-center justify-center bg-[#F5F4F0] rounded-lg">
            <Search size={15} className="text-[#5A5A5A]" />
          </Link>
          <Link href="/profile"
            className="relative w-8 h-8 flex items-center justify-center bg-[#F5F4F0] rounded-lg">
            <Bell size={15} className="text-[#5A5A5A]" />
            {unread > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E63946] rounded-full flex items-center justify-center">
                <span className="text-white text-[8px] font-black">{unread}</span>
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Feed */}
      <div className="flex-1 overflow-hidden px-4 py-3 pb-20">
        {seeded ? (
          <SwipeFeed userId={user.id} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
