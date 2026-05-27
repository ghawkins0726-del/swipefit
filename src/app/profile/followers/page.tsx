'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import FollowButton from '@/components/FollowButton';

interface Person {
  id: string;
  name: string;
  avatar: string;
  followedAt: number;
}

export default function FollowersPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    fetch(`/api/users/${clerkUser.id}/followers`)
      .then(r => r.json())
      .then(d => { setPeople(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isLoaded, clerkUser]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Top bar */}
      <div className="pt-12 px-5 pb-3 flex items-center justify-between">
        <Logo size={26} href="/feed" className="text-white" />
        <Link href="/profile" className="btn-halo-icon w-10 h-10 text-white">
          <ArrowLeft size={16} />
        </Link>
      </div>

      <h1 className="text-white font-black text-xl px-5 pb-4 tracking-tight">Followers</h1>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-[#FF2E47] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : people.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <p className="text-white font-black text-lg">No followers yet</p>
          <p className="text-white/40 text-sm">Share your profile to grow your following.</p>
        </div>
      ) : (
        <div className="flex-1 px-5 space-y-3 pb-10">
          {people.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <Link href={`/users/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                  {p.avatar
                    ? <img src={p.avatar} alt="" className="w-full h-full object-cover" style={{ imageOrientation: 'from-image' }} />
                    : <span className="w-full h-full flex items-center justify-center text-white font-black text-lg">{p.name[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{p.name}</p>
                  <p className="text-white/40 text-xs">@{p.id.slice(-8)}</p>
                </div>
              </Link>
              {clerkUser && p.id !== clerkUser.id && (
                <FollowButton targetUserId={p.id} initialFollowing={false} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
