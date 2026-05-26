'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Users, Search, UserPlus, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import { useUser } from '@clerk/nextjs';
import { ConversationPreview } from '@/lib/db-types';
import { UserProfile } from '@/lib/types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString();
}

type FriendUser = UserProfile & { followedAt: number };

export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [tab, setTab] = useState<'friends' | 'inbox'>('friends');

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Inbox
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    // Friends list = people I follow
    fetch(`/api/users/${clerkUser.id}/following`)
      .then(r => r.json())
      .then(d => { setFriends(Array.isArray(d) ? d : []); setFriendsLoading(false); })
      .catch(() => setFriendsLoading(false));
    fetch('/api/messages?list=true')
      .then(r => r.json())
      .then(d => { setConversations(Array.isArray(d) ? d : []); setInboxLoading(false); })
      .catch(() => setInboxLoading(false));
  }, [isLoaded, clerkUser]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* Header */}
      <div className="bg-[#0A0A0A] pt-12 pb-5 px-5">
        <Logo size={26} href="/feed" className="text-white mb-3" />
        <h1 className="text-white font-black text-2xl">Messages</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {tab === 'friends'
            ? `${friends.length} friend${friends.length === 1 ? '' : 's'}`
            : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
        </p>

        {/* Tab pills */}
        <div className="flex gap-1 bg-white/8 rounded-2xl p-1 mt-4">
          {([
            { id: 'friends', label: 'Friends', icon: Users },
            { id: 'inbox',   label: 'Inbox',   icon: MessageSquare },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                tab === t.id
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-white/40'
              }`}>
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24">

        {tab === 'friends' && (
          <>
            {/* Find friends CTA */}
            <Link href="/search?people=1"
              className="flex items-center gap-3 bg-[#0A0A0A] rounded-2xl px-4 py-3.5 mb-3 active:scale-[0.98] transition-transform">
              <div className="w-9 h-9 bg-[#FF2E47]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Search size={16} className="text-[#FF2E47]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm">Find friends</p>
                <p className="text-white/40 text-xs mt-0.5">Search for people to follow</p>
              </div>
              <ChevronRight size={16} className="text-white/30" />
            </Link>

            {friendsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users size={36} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#0A0A0A] font-black text-base mb-1">No friends yet</p>
                <p className="text-[#AAAAAA] text-sm">Tap &ldquo;Find friends&rdquo; above to discover people</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <Link key={f.id} href={`/users/${f.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 active:scale-[0.98] transition-transform shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      {f.avatar
                        ? <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                        : <span>{f.name[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{f.name}</p>
                      {f.bio
                        ? <p className="text-[#AAAAAA] text-xs truncate mt-0.5">{f.bio}</p>
                        : <p className="text-[#AAAAAA] text-xs mt-0.5">{f.totalListings} listing{f.totalListings === 1 ? '' : 's'}</p>}
                    </div>
                    <ChevronRight size={16} className="text-[#EBEBEB] flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'inbox' && (
          <>
            {inboxLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={40} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#0A0A0A] font-semibold text-base mb-1">No messages yet</p>
                <p className="text-[#AAAAAA] text-sm">Message sellers about items you love</p>
                <Link href="/feed" className="inline-block mt-5 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full font-semibold text-sm">
                  Browse Feed
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map(c => (
                  <Link
                    key={`${c.itemId}-${c.otherUserId}`}
                    href={`/messages/${c.itemId}/${c.otherUserId}`}
                    className={`flex items-center gap-3 rounded-2xl p-4 transition-shadow ${
                      c.unread ? 'bg-red-50 border border-red-100' : 'bg-white shadow-sm'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      {c.otherUserName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <p className={`text-sm truncate ${c.unread ? 'font-black text-[#0A0A0A]' : 'font-bold text-[#0A0A0A]'}`}>
                          {c.otherUserName}
                        </p>
                        <span className="text-xs text-[#AAAAAA] flex-shrink-0 ml-2">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-[#E63946] font-semibold truncate mb-0.5">{c.itemTitle}</p>
                      <p className={`text-xs truncate ${c.unread ? 'text-[#0A0A0A] font-semibold' : 'text-[#AAAAAA]'}`}>
                        {c.lastMessage}
                      </p>
                    </div>
                    {c.unread && <div className="w-2.5 h-2.5 bg-[#E63946] rounded-full flex-shrink-0" />}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
}
