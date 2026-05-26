'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  itemId: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  onSent: () => void;
}

export default function MessageInput({ itemId, receiverId, senderId, senderName, onSent }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, senderName, receiverId, itemId, text: trimmed }),
    });
    setSending(false);
    setText('');
    onSent();
  };

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400 transition resize-none"
        style={{ maxHeight: 96 }}
      />
      <button
        onClick={send}
        disabled={!text.trim() || sending}
        className="w-10 h-10 bg-gradient-to-br from-violet-600 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform shadow-md"
      >
        {sending
          ? <Loader2 size={16} className="text-white animate-spin" />
          : <Send size={16} className="text-white" />}
      </button>
    </div>
  );
}
