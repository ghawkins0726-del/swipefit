'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import MessageThread from '@/components/MessageThread';
import MessageInput from '@/components/MessageInput';

export default function ConversationPage() {
  const { itemId, userId: otherUserId } = useParams<{ itemId: string; userId: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [otherName, setOtherName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  const myId = clerkUser?.id ?? '';
  const myName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Me';

  useEffect(() => {
    if (!otherUserId || !itemId) return;
    Promise.all([
      fetch(`/api/users/${otherUserId}`).then(r => r.json()),
      fetch(`/api/items/${itemId}`).then(r => r.json()),
    ]).then(([otherProfile, item]) => {
      setOtherName(otherProfile?.name ?? 'Seller');
      setItemTitle(item?.title ?? '');
    });
  }, [itemId, otherUserId]);

  if (!isLoaded || !myId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F4F0]">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-4 pt-12 pb-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black flex-shrink-0">
          {(otherName || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base truncate">{otherName || '…'}</p>
          {itemTitle && (
            <p className="text-xs text-white/40 flex items-center gap-1 truncate">
              <Package2 size={10} />
              {itemTitle}
            </p>
          )}
        </div>
      </div>

      <MessageThread
        userId={myId}
        itemId={itemId}
        otherUserId={otherUserId}
        refreshSignal={refreshSignal}
      />

      <MessageInput
        itemId={itemId}
        receiverId={otherUserId}
        senderName={myName}
        onSent={() => setRefreshSignal(s => s + 1)}
      />
    </div>
  );
}
