'use client';

/**
 * /messages/dm/[userId]
 *
 * General-purpose DM with a user — not tied to a specific listing.
 * Uses the sentinel itemId "dm" so the existing message infrastructure
 * works without schema changes.
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import MessageThread from '@/components/MessageThread';
import MessageInput from '@/components/MessageInput';
import { Message } from '@/lib/db-types';
import { VerifiedBadge, CofounderBadge } from '@/components/Badges';
import { isVerified, isCofounder } from '@/lib/badges';

interface PublicProfile { id: string; name: string; avatar: string | null; }

export default function DmPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: targetId } = use(params);
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const myId = clerkUser?.id ?? '';
  const myName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Me';

  useEffect(() => {
    fetch(`/api/users/${targetId}`).then(r => r.json()).then(setProfile).catch(() => {});
  }, [targetId]);

  if (!isLoaded || !myId) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const name = profile?.name ?? '…';
  const avatar = profile?.avatar;

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* ── Header ── */}
      <div className="pt-14 pb-3 px-4 flex items-center gap-3 bg-white border-b border-[#F2F2F2] flex-shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center">
          <ArrowLeft size={22} className="text-[#0A0A0A]" />
        </button>

        <Link href={`/user/${targetId}`} className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70 transition-opacity">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#F2F2F2] flex items-center justify-center flex-shrink-0">
            {avatar
              ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
              : <span className="font-black text-sm text-[#0A0A0A]">{name[0]?.toUpperCase()}</span>}
          </div>
          <span className="font-bold text-[16px] text-[#0A0A0A] truncate">{name}</span>
          {isVerified(targetId) && <VerifiedBadge size="xs" />}
          {isCofounder(targetId) && <CofounderBadge />}
        </Link>

        <button className="w-9 h-9 flex items-center justify-center">
          <MoreHorizontal size={22} className="text-[#0A0A0A]" />
        </button>
      </div>

      {/* No itemId → loads all messages between these two users */}
      <MessageThread
        userId={myId}
        otherUserId={targetId}
        otherName={name}
        otherAvatar={avatar ?? null}
        refreshSignal={refreshSignal}
        onReplySelect={setReplyTo}
      />

      <MessageInput
        itemId="dm"
        receiverId={targetId}
        senderName={myName}
        onSent={() => { setRefreshSignal(s => s + 1); setReplyTo(null); }}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
