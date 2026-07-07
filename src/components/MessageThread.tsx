'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '@/lib/db-types';
import MessageBubble from './MessageBubble';
import Link from 'next/link';

interface Props {
  userId: string;
  itemId?: string;  // omit to load all messages between the two users
  otherUserId: string;
  otherName: string;
  otherAvatar: string | null;
  refreshSignal?: number;
  onReplySelect: (msg: Message | null) => void;
}

export default function MessageThread({ userId, itemId, otherUserId, otherAvatar, refreshSignal = 0, onReplySelect }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const url = itemId
      ? `/api/messages?itemId=${itemId}&otherId=${otherUserId}`
      : `/api/messages?otherId=${otherUserId}`;
    const res = await fetch(url);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [itemId, otherUserId]);

  useEffect(() => {
    // Mark all messages from this user as read
    fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: otherUserId, ...(itemId ? { itemId } : {}) }),
    });
  }, [otherUserId, itemId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load, refreshSignal]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#161616]">
        <div className="w-7 h-7 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group messages: show timestamp header every 30 min gap, and item context chip when item changes
  type Group = { showTime: boolean; showItemChip: boolean; msg: Message };
  const groups: Group[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const showTime = !prev || msg.createdAt - prev.createdAt > 30 * 60 * 1000;
    // Show item chip when item_id changes and is a real item (not 'dm')
    const showItemChip =
      msg.itemId !== 'dm' &&
      msg.itemTitle != null &&
      (!prev || prev.itemId !== msg.itemId);
    groups.push({ showTime, showItemChip, msg });
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#161616] px-3 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full pb-8">
          <p className="text-[#888] text-[13px]">No messages yet — say hi!</p>
        </div>
      ) : (
        groups.map(({ showTime, showItemChip, msg }) => (
          <div key={msg.id}>
            {showTime && (
              <div className="flex justify-center my-3">
                <span className="text-[11px] text-[#999] font-medium">
                  {new Date(msg.createdAt).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Item context chip — shown when conversation shifts to a new item */}
            {showItemChip && (
              <div className="flex justify-center my-3">
                <Link
                  href={`/item/${msg.itemId}`}
                  className="flex items-center gap-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl px-3 py-2 max-w-[72%] active:opacity-70 transition-opacity"
                >
                  {msg.itemImage && (
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#262626]">
                      <img src={msg.itemImage} alt={msg.itemTitle ?? ''} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{msg.itemTitle}</p>
                    {msg.itemPrice != null && (
                      <p className="text-[10px] text-[#AAAAAA]">${msg.itemPrice} · tap to view</p>
                    )}
                  </div>
                </Link>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOwn={msg.senderId === userId}
              otherAvatar={otherAvatar}
              myUserId={userId}
              onReply={onReplySelect}
              onReactionChange={load}
            />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
