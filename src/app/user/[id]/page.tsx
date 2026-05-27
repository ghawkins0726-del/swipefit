'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ShoppingBag, Users } from 'lucide-react';
import { Item } from '@/lib/types';

interface PublicProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  itemCount: number;
  isFollowing: boolean;
  listings: Item[];
}

export default function UserProfilePage() {
  const { id: targetId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = clerkUser?.id === targetId;

  useEffect(() => {
    if (!targetId) return;
    fetch(`/api/users/${targetId}?full=1`)
      .then(r => r.json())
      .then(d => { setProfile(d); setLoading(false); });
  }, [targetId]);

  const toggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const action = profile.isFollowing ? 'unfollow' : 'follow';
    await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: targetId, action }),
    });
    setProfile(p => p ? {
      ...p,
      isFollowing: !p.isFollowing,
      followerCount: p.followerCount + (p.isFollowing ? -1 : 1),
    } : p);
    setFollowLoading(false);
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F4F0] gap-4">
        <p className="text-[#0A0A0A] font-black text-lg">User not found</p>
        <button onClick={() => router.back()} className="text-[#E63946] font-bold text-sm">Go back</button>
      </div>
    );
  }

  const initials = profile.name[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* ── Header ── */}
      <div className="bg-[#0A0A0A] pt-14 pb-6 px-5">
        <div className="flex items-start justify-between mb-5">
          {/* Back + avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div className="w-[64px] h-[64px] rounded-3xl bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
              {profile.avatar && !profile.avatar.includes('dicebear') ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">{initials}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isOwnProfile && clerkUser && (
            <div className="flex gap-2 mt-1">
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                  profile.isFollowing
                    ? 'bg-white/10 text-white/70 border border-white/10'
                    : 'bg-[#E63946] text-white'
                }`}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
              <Link
                href={`/messages/item-direct/${targetId}`}
                className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center"
              >
                <MessageSquare size={16} className="text-white" />
              </Link>
            </div>
          )}
          {isOwnProfile && (
            <Link href="/profile"
              className="px-4 py-2 rounded-2xl font-bold text-sm bg-white/10 text-white/70 border border-white/10">
              My Profile
            </Link>
          )}
        </div>

        {/* Name + bio */}
        <div className="mb-5">
          <h1 className="text-white font-black text-2xl leading-none mb-1">{profile.name}</h1>
          {profile.bio && <p className="text-white/50 text-sm">{profile.bio}</p>}
        </div>

        {/* Social stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: profile.followerCount, label: 'Followers' },
            { value: profile.followingCount, label: 'Following' },
            { value: profile.itemCount, label: 'Items' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/8 border border-white/8 rounded-2xl py-3 text-center">
              <div className="font-black text-[22px] text-white leading-none">{value}</div>
              <div className="text-white/35 text-[10px] font-semibold mt-1 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Listings grid ── */}
      <div className="flex-1 pb-8">
        {profile.listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
              <ShoppingBag size={24} className="text-[#EBEBEB]" />
            </div>
            <p className="text-[#0A0A0A] font-black text-base mb-1">No listings yet</p>
            <p className="text-[#AAAAAA] text-sm text-center">This user hasn&apos;t listed anything yet</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 py-4">
              <Users size={14} className="text-[#AAAAAA]" />
              <span className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wide">
                {profile.listings.length} listing{profile.listings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#EBEBEB]">
              {profile.listings.map(item => (
                <Link key={item.id} href={`/item/${item.id}`} className="bg-white">
                  <div className="relative aspect-[3/4] bg-[#F5F4F0]">
                    {item.images[0] && (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white font-black text-sm leading-none">${item.price}</p>
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="font-bold text-[#0A0A0A] text-sm truncate leading-none">{item.title}</p>
                    <p className="text-[#AAAAAA] text-xs mt-0.5">{item.brand} · Size {item.size}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
