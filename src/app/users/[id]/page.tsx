'use client';

import { useEffect, useState, use } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, ShoppingBag, ArrowLeft, Bell, Share2, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FollowButton from '@/components/FollowButton';
import { VerifiedBadge, CofounderBadge } from '@/components/Badges';
import { isVerified, isCofounder } from '@/lib/badges';
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
  const router = useRouter();
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-[#0A0A0A] font-black text-xl mb-2">User not found</p>
        <Link href="/feed" className="text-[#FF2E47] font-bold text-sm">Back to feed</Link>
      </div>
    );
  }

  if (profile.isSelf && clerkUser) {
    if (typeof window !== 'undefined') window.location.href = '/profile';
    return null;
  }

  const handle = '@' + profile.name.toLowerCase().replace(/\s+/g, '_');
  const verified  = isVerified(profile.id);
  const cofounder = isCofounder(profile.id);

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Top bar ── */}
      <div className="pt-14 pb-2 px-4 flex items-center justify-between bg-white">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={22} className="text-[#0A0A0A]" />
        </button>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center">
            <Bell size={22} className="text-[#0A0A0A]" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center">
            <Share2 size={20} className="text-[#0A0A0A]" />
          </button>
        </div>
      </div>

      {/* ── Profile section ── */}
      <div className="px-5 pt-2 pb-5 flex flex-col items-center text-center">

        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-[#F2F2F2] flex items-center justify-center border-[2px] border-[#EBEBEB]">
          {profile.avatar
            ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            : <span className="text-4xl font-black text-[#0A0A0A]">{profile.name[0]?.toUpperCase()}</span>}
        </div>

        {/* Name + verified */}
        <div className="flex items-center gap-2 mt-3">
          <h1 className="font-black text-[#0A0A0A] text-[22px] tracking-tight leading-tight">{profile.name}</h1>
          {verified && <VerifiedBadge size="md" />}
        </div>

        {/* Handle */}
        <p className="text-[#888] text-[13px] font-medium mt-0.5">{handle}</p>

        {/* Co-founder badge */}
        {cofounder && (
          <div className="mt-2.5">
            <CofounderBadge />
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-[#0A0A0A] text-[14px] leading-relaxed mt-3 max-w-[280px]">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-stretch mt-4 w-full max-w-[280px]">
          {[
            { n: profile.following, label: 'Following' },
            { n: followerCount,     label: 'Followers' },
            { n: profile.totalLikes, label: 'Likes' },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 flex flex-col items-center py-1 ${i > 0 ? 'border-l border-[#E8E8E8]' : ''}`}>
              <span className="font-black text-[#0A0A0A] text-[19px] leading-none">{s.n}</span>
              <span className="text-[#888] text-[11px] font-medium mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {clerkUser && (
          <div className="flex items-center gap-2 mt-4 w-full max-w-[320px]">
            {/* Message */}
            <Link
              href={`/messages/dm/${profile.id}`}
              className="flex items-center justify-center gap-2 h-10 px-5 bg-[#F2F2F2] rounded-full font-semibold text-[14px] text-[#0A0A0A] active:opacity-70 transition-opacity flex-1"
            >
              <Send size={15} />
              Message
            </Link>

            {/* Follow */}
            <FollowButton
              targetUserId={profile.id}
              initialFollowing={profile.viewerFollows}
              onChange={(now) => setFollowerCount(c => now ? c + 1 : Math.max(0, c - 1))}
            />
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#EBEBEB] flex">
        <button className="flex-1 flex flex-col items-center gap-1 py-3 relative">
          <ShoppingBag size={19} strokeWidth={2.2} className="text-[#0A0A0A]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-[#0A0A0A] rounded-full" />
        </button>
        <button className="flex-1 flex flex-col items-center gap-1 py-3">
          <Heart size={19} strokeWidth={2.2} className="text-[#CCCCCC]" />
        </button>
      </div>

      {/* ── Listings grid ── */}
      <div className="flex-1 pb-28">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 px-6">
            <div className="w-14 h-14 bg-[#F2F2F2] rounded-2xl flex items-center justify-center mb-3">
              <ShoppingBag size={24} className="text-[#CCCCCC]" />
            </div>
            <p className="font-bold text-[#0A0A0A] text-[15px]">No listings yet</p>
            <p className="text-[#888] text-[13px] mt-1">
              When {profile.name} lists items, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[1px]">
            {listings.map(item => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="relative aspect-[3/4] bg-[#F2F2F2] overflow-hidden active:opacity-80 transition-opacity"
              >
                {item.images?.[0] && (
                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
                  <span className="text-white font-black text-[13px] leading-none drop-shadow">${item.price}</span>
                  {item.sold && (
                    <span className="bg-white/90 text-[#0A0A0A] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">Sold</span>
                  )}
                </div>
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
