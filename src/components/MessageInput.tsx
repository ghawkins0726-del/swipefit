'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  itemId: string;
  receiverId: string;
  senderName: string;
  onSent: () => void;
}

export default function MessageInput({ itemId, receiverId, senderName, onSent }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, itemId, text: trimmed, senderName }),
    });
    setSending(false);
    setText('');
    onSent();
  };

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-[#EBEBEB] flex-shrink-0">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 bg-[#F5F4F0] border border-[#EBEBEB] rounded-2xl px-4 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition resize-none"
        style={{ maxHeight: 96 }}
      />
      <button
        onClick={send}
        disabled={!text.trim() || sending}
        className="w-10 h-10 bg-[#E63946] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform shadow-md"
      >
        {sending
          ? <Loader2 size={16} className="text-white animate-spin" />
          : <Send size={16} className="text-white" />}
      </button>
    </div>
  );
}
