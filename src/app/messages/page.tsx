'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useUser } from '@clerk/nextjs';
import { ConversationPreview } from '@/lib/db-types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    fetch('/api/messages?list=true')
      .then(r => r.json())
      .then(d => { setConversations(Array.isArray(d) ? d : []); setLoading(false); });
  }, [isLoaded, clerkUser]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">
      <div className="bg-[#0A0A0A] pt-12 pb-5 px-5">
        <h1 className="text-white font-black text-2xl">Messages</h1>
        {conversations.length > 0 && (
          <p className="text-white/40 text-sm mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex-1 px-4 pt-4 pb-24">
        {loading ? (
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
      </div>

      <Navbar />
    </div>
  );
}
