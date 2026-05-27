'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Camera, Search, UserPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { VerifiedBadge } from '@/components/Badges';
import { isVerified } from '@/lib/badges';
import { ConversationPreview } from '@/lib/db-types';
import { UserProfile } from '@/lib/types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

type FriendUser = UserProfile & { followedAt: number };

function Avatar({ src, name, size = 54 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#F2F2F2] overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <span className="font-black text-[#0A0A0A]" style={{ fontSize: size * 0.4 }}>{name[0]?.toUpperCase()}</span>}
    </div>
  );
}

export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    Promise.all([
      fetch(`/api/users/${clerkUser.id}/following`).then(r => r.json()).catch(() => []),
      fetch('/api/messages?list=true').then(r => r.json()).catch(() => []),
    ]).then(([f, c]) => {
      setFriends(Array.isArray(f) ? f : []);
      setConversations(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, [isLoaded, clerkUser]);

  const getConvoLink = (c: ConversationPreview) => `/messages/${c.itemId}/${c.otherUserId}`;

  const getFriendChatLink = (friendId: string) => {
    const existing = conversations.find(c => c.otherUserId === friendId);
    return existing ? getConvoLink(existing) : `/messages/dm/${friendId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Top bar ── */}
      <div className="pt-14 pb-2 px-4 flex items-center justify-between bg-white sticky top-0 z-10">
        <Link href="/search?people=1" className="w-10 h-10 flex items-center justify-center">
          <UserPlus size={22} className="text-[#0A0A0A]" />
        </Link>
        <h1 className="font-bold text-[17px] text-[#0A0A0A]">Inbox</h1>
        <Link href="/search?people=1" className="w-10 h-10 flex items-center justify-center">
          <Search size={20} className="text-[#0A0A0A]" />
        </Link>
      </div>

      {/* ── Friends stories row ── */}
      {friends.length > 0 && (
        <div className="pt-3 pb-4 border-b border-[#F2F2F2]">
          <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
            {friends.map(f => (
              <Link key={f.id} href={getFriendChatLink(f.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-[62px] h-[62px] rounded-full overflow-hidden border-[2.5px] border-[#EBEBEB] bg-[#F2F2F2] flex items-center justify-center">
                  {f.avatar
                    ? <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                    : <span className="text-[22px] font-black text-[#0A0A0A]">{f.name[0]?.toUpperCase()}</span>}
                </div>
                <span className="text-[11px] text-[#0A0A0A] font-medium w-[64px] text-center truncate leading-tight">
                  {f.name.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── DM list ── */}
      <div className="flex-1 pb-28">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <p className="text-[#0A0A0A] font-bold text-base mb-1">No messages yet</p>
            <p className="text-[#888] text-sm mt-0.5">Follow people and start chatting</p>
          </div>
        ) : (
          conversations.map(c => (
            <div key={`${c.itemId}-${c.otherUserId}`} className="flex items-center px-4 py-3 active:bg-[#F9F9F9]">

              {/* Avatar → profile */}
              <Link
                href={`/user/${c.otherUserId}`}
                className="flex-shrink-0 mr-3"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <Avatar src={c.otherUserAvatar} name={c.otherUserName} size={54} />
                  {c.unread && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#FF2E47] rounded-full border-2 border-white" />
                  )}
                </div>
              </Link>

              {/* Message preview → chat */}
              <Link href={getConvoLink(c)} className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`text-[15px] leading-snug truncate ${c.unread ? 'font-bold text-[#0A0A0A]' : 'font-semibold text-[#0A0A0A]'}`}>
                      {c.otherUserName}
                    </p>
                    {isVerified(c.otherUserId) && <VerifiedBadge size="xs" />}
                  </div>
                  <p className={`text-[13px] truncate mt-0.5 ${c.unread ? 'text-[#0A0A0A] font-medium' : 'text-[#888888]'}`}>
                    {c.lastMessage} · {timeAgo(c.lastMessageAt)}
                  </p>
                </div>
                <Camera size={20} className="text-[#CCCCCC] flex-shrink-0" />
              </Link>

            </div>
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
