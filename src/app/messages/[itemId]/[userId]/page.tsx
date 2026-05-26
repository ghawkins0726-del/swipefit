'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package2 } from 'lucide-react';
import MessageThread from '@/components/MessageThread';
import MessageInput from '@/components/MessageInput';

function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function ConversationPage() {
  const { itemId, userId: otherUserId } = useParams<{ itemId: string; userId: string }>();
  const router = useRouter();
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const uid = getUserId();
    setMyId(uid);
    Promise.all([
      fetch(`/api/profile?userId=${uid}`).then(r => r.json()),
      fetch(`/api/profile?userId=${otherUserId}`).then(r => r.json()),
      fetch(`/api/items/${itemId}`).then(r => r.json()),
    ]).then(([myProfile, otherProfile, item]) => {
      setMyName(myProfile.user?.name ?? 'Me');
      setOtherName(otherProfile.user?.name ?? 'Seller');
      setItemTitle(item?.title ?? '');
    });
  }, [itemId, otherUserId]);

  if (!myId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-700" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-black flex-shrink-0">
          {(otherName || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-base truncate">{otherName || '…'}</p>
          {itemTitle && (
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
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
        senderId={myId}
        senderName={myName}
        onSent={() => setRefreshSignal(s => s + 1)}
      />
    </div>
  );
}
