'use client';

import { useEffect, useState, use } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import FollowButton from '@/components/FollowButton';
import { Item } from '@/lib/types';

interface PublicProfile {
  id: string; name: string; avatar: string; bio: string;
  createdAt: number; totalLikes: number; totalListings: number;
  followers: number; following: number;
  ratingAverage: number; ratingCount: number;
  viewerFollows: boolean; isSelf: boolean;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [tab, setTab] = useState<'listings'>('listings');

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const [profRes, itemsRes] = await Promise.all([
        fetch(`/api/users/${id}`).then(r => r.json()),
        fetch(`/api/items?sellerId=${id}`).then(r => r.json()).catch(() => []),
      ]);
      if (cancelled) return;
      setProfile(profRes);
      setFollowerCount(profRes.followers ?? 0);
      setListings(Array.isArray(itemsRes) ? itemsRes : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF2E47] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
        <p className="text-white font-black text-xl mb-2">User not found</p>
        <Link href="/feed" className="text-[#FF2E47] font-bold text-sm">Back to feed</Link>
      </div>
    );
  }

  // If viewing yourself, bounce to your own /profile
  if (profile.isSelf && clerkUser) {
    if (typeof window !== 'undefined') window.location.href = '/profile';
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A]">

      {/* ── Top bar ── */}
      <div className="relative pt-12 px-5 pb-2 flex items-center justify-between z-10">
        <Logo size={26} href="/feed" className="text-white" />
        <Link href="/messages" className="btn-halo-icon w-10 h-10 text-white">
          <ArrowLeft size={16} />
        </Link>
      </div>

      {/* ── Profile card ── */}
      <div className="relative px-5 pt-2 pb-6">
        {/* Background halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[280px] bg-gradient-to-b from-[#FF2E47]/15 via-[#FF2E47]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Avatar with vibrant glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2E47] to-[#ff8c42] rounded-full blur-2xl opacity-60 scale-110" />
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[#FF2E47] via-[#ff5c68] to-[#ff8c42] shadow-2xl shadow-[#FF2E47]/40">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                {profile.avatar
                  ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-4xl font-black text-white">{profile.name[0]?.toUpperCase()}</span>}
              </div>
            </div>
          </div>

          <h1 className="font-black text-white text-2xl tracking-tight mt-4">{profile.name}</h1>
          <p className="text-white/40 text-sm mt-0.5 font-medium">@{profile.id.slice(-8)}</p>

          {/* Rating pill */}
          <div className="mt-2 bg-white/8 rounded-full px-3 py-1 border border-white/10">
            {profile.ratingCount === 0 ? (
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">New seller</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF2E47" stroke="#FF2E47" strokeWidth="0.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-white font-black text-xs">{profile.ratingAverage.toFixed(1)}</span>
                <span className="text-white/40 text-xs">· {profile.ratingCount} review{profile.ratingCount === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="mt-5 flex items-stretch gap-0 w-full max-w-xs">
            {[
              { n: profile.following, label: 'Following' },
              { n: followerCount,     label: 'Followers' },
              { n: listings.length,   label: 'Listings'  },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 flex flex-col items-center ${i > 0 ? 'border-l border-white/8' : ''}`}>
                <span className="text-white font-black text-xl leading-none">{s.n}</span>
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">{s.label}</span>
              </div>
            ))}
          </div>

          {profile.bio && (
            <p className="text-white/70 text-sm leading-relaxed text-center mt-4 max-w-sm">{profile.bio}</p>
          )}

          {/* Follow button */}
          {clerkUser && (
            <div className="mt-5">
              <FollowButton
                targetUserId={profile.id}
                initialFollowing={profile.viewerFollows}
                onChange={(now) => setFollowerCount(c => now ? c + 1 : Math.max(0, c - 1))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-[#0A0A0A] border-y border-white/8 flex">
        <button
          onClick={() => setTab('listings')}
          className="flex-1 flex flex-col items-center gap-1 py-3.5 text-white relative"
        >
          <ShoppingBag size={20} strokeWidth={2.4} />
          <span className="text-[9px] font-black uppercase tracking-widest">Listings</span>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#FF2E47] rounded-full" />
        </button>
      </div>

      {/* Listings grid */}
      <div className="flex-1 bg-[#F5F4F0] px-3 pt-3 pb-28">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
              <ShoppingBag size={28} className="text-[#EBEBEB]" />
            </div>
            <p className="font-black text-[#0A0A0A] text-base">No listings yet</p>
            <p className="text-[#AAAAAA] text-sm mt-1">When {profile.name} lists items, they&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {listings.map(item => (
              <Link key={item.id} href={`/item/${item.id}`}
                className="relative aspect-[3/4] bg-[#EBEBEB] overflow-hidden active:opacity-80 transition-opacity">
                <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
                  <span className="text-white font-black text-sm leading-none drop-shadow-lg">${item.price}</span>
                  {item.sold && <span className="bg-white text-[#0A0A0A] text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">Sold</span>}
                </div>
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  <Heart size={8} className="fill-white" />
                  {item.likes}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
