'use client';

import { Message } from '@/lib/db-types';

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-black mr-2 flex-shrink-0 self-end mb-4">
          {message.senderName[0]?.toUpperCase()}
        </div>
      )}
      <div className={`max-w-[72%]`}>
        {!isOwn && (
          <p className="text-xs text-gray-400 mb-1 ml-1">{message.senderName}</p>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isOwn
            ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
        }`}>
          {message.text}
        </div>
        <p className={`text-[10px] text-gray-300 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>{time}</p>
      </div>
    </div>
  );
}
