'use client';

import { useEffect, useState, use } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Heart, ShoppingBag, UserCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import FollowButton from '@/components/FollowButton';
import { Item } from '@/lib/types';

interface PublicProfile {
  id: string; name: string; avatar: string; bio: string;
  createdAt: number; totalLikes: number; totalListings: number;
  followers: number; following: number;
  viewerFollows: boolean; isSelf: boolean;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);

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
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex flex-col items-center justify-center px-6">
        <p className="text-[#0A0A0A] font-black text-xl mb-2">User not found</p>
        <Link href="/feed" className="text-[#E63946] font-bold text-sm">Back to feed</Link>
      </div>
    );
  }

  // If viewing your own profile, just bounce to /profile
  if (profile.isSelf && clerkUser) {
    if (typeof window !== 'undefined') window.location.href = '/profile';
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">
      {/* Header */}
      <div className="bg-[#0A0A0A] pt-12 pb-6 px-5">
        <div className="flex items-center justify-between mb-4">
          <Logo size={26} href="/feed" className="text-white" />
          <Link href="/messages" className="text-white/50 text-xs font-medium flex items-center gap-1">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-[72px] h-[72px] rounded-3xl bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
            {profile.avatar
              ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-white">{profile.name[0]?.toUpperCase()}</span>}
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-xl tracking-tight truncate">{profile.name}</h1>
            {profile.bio && <p className="text-white/50 text-xs mt-1 line-clamp-2">{profile.bio}</p>}

            <div className="flex items-center gap-4 mt-3">
              <Stat n={followerCount} label="Followers" />
              <Stat n={profile.following} label="Following" />
              <Stat n={profile.totalListings} label="Listings" />
            </div>
          </div>
        </div>

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

      {/* Listings grid */}
      <div className="flex-1 px-4 pt-4 pb-24">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={14} className="text-[#0A0A0A]" />
          <span className="font-black text-[#0A0A0A] text-sm uppercase tracking-widest">{profile.name}&apos;s Listings</span>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl py-10 text-center">
            <ShoppingBag size={32} className="text-[#EBEBEB] mx-auto mb-2" />
            <p className="text-[#AAAAAA] text-sm">No listings yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map(item => (
              <Link key={item.id} href={`/item/${item.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
                <div className="relative aspect-[3/4]">
                  <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                  {item.sold && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-black text-xs uppercase tracking-widest">Sold</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ${item.price}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-[#0A0A0A] text-xs truncate">{item.title}</p>
                  <p className="text-[#AAAAAA] text-[10px]">{item.brand}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Heart size={9} className="text-[#E63946] fill-[#E63946]/40" />
                    <span className="text-[10px] text-[#AAAAAA]">{item.likes}</span>
                  </div>
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-left">
      <p className="text-white font-black text-base leading-none">{n}</p>
      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
