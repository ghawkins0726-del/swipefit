'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { Message } from '@/lib/db-types';
import MessageBubble from './MessageBubble';

interface Props {
  userId: string;
  itemId: string;
  otherUserId: string;
  refreshSignal?: number;
}

export default function MessageThread({ userId, itemId, otherUserId, refreshSignal = 0 }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/messages?userId=${userId}&itemId=${itemId}&otherId=${otherUserId}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [userId, itemId, otherUserId]);

  useEffect(() => {
    fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, senderId: otherUserId, itemId }),
    });
  }, [userId, otherUserId, itemId]);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
      {messages.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No messages yet — start the conversation!</p>
        </div>
      ) : (
        messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === userId} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
