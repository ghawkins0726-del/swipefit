'use client';

/**
 * /messages/item-direct/[userId]
 *
 * Bridge page: messages in SwipeFit are always item-scoped.
 * This page lets you either jump into an existing conversation
 * with the user or pick one of their listings to start a new one.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ShoppingBag } from 'lucide-react';
import { Item } from '@/lib/types';
import { ConversationPreview } from '@/lib/db-types';

interface PublicProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function ItemDirectPage() {
  const { userId: targetId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [existing, setExisting] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser || !targetId) return;

    Promise.all([
      fetch(`/api/users/${targetId}`).then(r => r.json()),
      fetch(`/api/users/${targetId}?listings=1`).then(r => r.json()),
      fetch('/api/messages?list=true').then(r => r.json()).catch(() => []),
    ]).then(([prof, profWithListings, convos]) => {
      setProfile(prof);
      setListings(Array.isArray(profWithListings.listings) ? profWithListings.listings : []);
      const allConvos: ConversationPreview[] = Array.isArray(convos) ? convos : [];
      setExisting(allConvos.filter(c => c.otherUserId === targetId));
      setLoading(false);
    });
  }, [isLoaded, clerkUser, targetId]);

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

      {/* Header */}
      <div className="bg-[#0A0A0A] pt-14 pb-5 px-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-base flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-none truncate">{profile.name}</p>
            <p className="text-white/40 text-xs mt-0.5">Select an item to chat about</p>
          </div>
          <Link href={`/user/${targetId}`} className="text-[#E63946] text-xs font-bold">
            Profile
          </Link>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24 space-y-6">

        {/* Existing conversations */}
        {existing.length > 0 && (
          <div>
            <p className="text-xs font-black text-[#AAAAAA] uppercase tracking-widest mb-2 px-1">
              Recent conversations
            </p>
            <div className="space-y-2">
              {existing.map(c => (
                <Link
                  key={`${c.itemId}-${c.otherUserId}`}
                  href={`/messages/${c.itemId}/${c.otherUserId}`}
                  className={`flex items-center gap-3 rounded-2xl p-3.5 transition-transform active:scale-[0.98] ${
                    c.unread ? 'bg-red-50 border border-red-100' : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    <MessageSquare size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold text-[#0A0A0A] truncate ${c.unread ? 'font-black' : ''}`}>
                      {c.itemTitle}
                    </p>
                    <p className="text-xs text-[#AAAAAA] truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                  <span className="text-[10px] text-[#AAAAAA] flex-shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  {c.unread && <div className="w-2 h-2 bg-[#E63946] rounded-full flex-shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Their listings */}
        <div>
          <p className="text-xs font-black text-[#AAAAAA] uppercase tracking-widest mb-2 px-1">
            {existing.length > 0 ? 'Start a new conversation' : `${profile.name}'s listings`}
          </p>

          {listings.filter(i => !i.sold).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag size={36} className="text-[#EBEBEB] mx-auto mb-3" />
              <p className="text-[#0A0A0A] font-black text-base mb-1">No active listings</p>
              <p className="text-[#AAAAAA] text-sm">
                {profile.name} doesn&apos;t have any items for sale right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.filter(i => !i.sold).map(item => (
                <Link
                  key={item.id}
                  href={`/messages/${item.id}/${targetId}`}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#F5F4F0] overflow-hidden flex-shrink-0">
                    {item.images[0] && (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0A0A0A] text-sm truncate">{item.title}</p>
                    <p className="text-[#AAAAAA] text-xs mt-0.5">{item.brand} · Size {item.size}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-[#0A0A0A] text-sm">${item.price}</p>
                    <div className="flex items-center gap-1 mt-1 bg-[#0A0A0A] rounded-lg px-2 py-1">
                      <MessageSquare size={10} className="text-white" />
                      <span className="text-white text-[10px] font-bold">Chat</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
