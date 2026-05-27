'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '@/lib/db-types';
import MessageBubble from './MessageBubble';

interface Props {
  userId: string;
  itemId: string;
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
    const res = await fetch(`/api/messages?itemId=${itemId}&otherId=${otherUserId}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [itemId, otherUserId]);

  useEffect(() => {
    fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: otherUserId, itemId }),
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
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="w-7 h-7 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group messages: show timestamp header every 30 min gap
  const groups: { showTime: boolean; msg: Message }[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const showTime = !prev || msg.createdAt - prev.createdAt > 30 * 60 * 1000;
    groups.push({ showTime, msg });
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white px-3 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full pb-8">
          <p className="text-[#888] text-[13px]">No messages yet — say hi!</p>
        </div>
      ) : (
        groups.map(({ showTime, msg }) => (
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
