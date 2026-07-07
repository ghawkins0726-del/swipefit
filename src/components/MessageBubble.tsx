'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Reply } from 'lucide-react';
import { Message } from '@/lib/db-types';

interface Props {
  message: Message;
  isOwn: boolean;
  otherAvatar: string | null;
  myUserId: string;
  onReply: (msg: Message) => void;
  onReactionChange: () => void;
}

type MsgKind = { kind: 'text' | 'image' | 'audio'; content: string };

function parse(text: string): MsgKind {
  if (text.startsWith('__img__:'))   return { kind: 'image',  content: text.slice(8)  };
  if (text.startsWith('__audio__:')) return { kind: 'audio',  content: text.slice(10) };
  return                                     { kind: 'text',   content: text           };
}

function previewText(raw: string) {
  if (raw.startsWith('__img__:'))   return '📷 Photo';
  if (raw.startsWith('__audio__:')) return '🎤 Voice message';
  return raw.length > 60 ? raw.slice(0, 60) + '…' : raw;
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢'];

// ── Audio player ──────────────────────────────────────────────────────────────
function AudioBubble({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60)).padStart(2, '0')}`;
  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const displayTime = (playing || current > 0) ? fmt(current) : duration > 0 ? fmt(duration) : '0:00';

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[20px] min-w-[180px] max-w-[240px] bg-[#F2F2F2]">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
      >
        {playing
          ? <Pause size={13} className="text-white fill-white" />
          : <Play  size={13} className="text-white fill-white ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="relative h-[3px] bg-[#D0D0D0] rounded-full overflow-hidden mb-1.5">
          <div className="absolute left-0 top-0 h-full bg-[#0A0A0A] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] text-[#888] font-medium tabular-nums">{displayTime}</span>
      </div>
    </div>
  );
}

// ── Main bubble ───────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, otherAvatar, myUserId, onReply, onReactionChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  // Swipe-to-reply
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const swiping = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swiping.current = false;
    longPressTimer.current = setTimeout(() => { setShowPicker(true); }, 550);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    // Only allow swipe right on other's messages, swipe left on own
    const validSwipe = isOwn ? dx < 0 : dx > 0;
    if (Math.abs(dx) > 8) { clearLongPress(); swiping.current = true; }
    if (validSwipe && Math.abs(dx) < 80) setSwipeX(isOwn ? Math.max(dx, -70) : Math.min(dx, 70));
  };

  const onTouchEnd = () => {
    clearLongPress();
    if (Math.abs(swipeX) >= 50) onReply(message);
    setSwipeX(0);
    swiping.current = false;
  };

  const react = useCallback(async (emoji: string) => {
    setShowPicker(false);
    await fetch('/api/messages/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: message.id, emoji }),
    });
    onReactionChange();
  }, [message.id, onReactionChange]);

  const parsed = parse(message.text);
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  // Flatten reactions into display: [{ emoji, count, iMine }]
  const reactionList = hasReactions
    ? Object.entries(message.reactions!).map(([emoji, users]) => ({
        emoji, count: users.length, iMine: users.includes(myUserId),
      }))
    : [];

  return (
    <>
      {/* Backdrop for emoji picker */}
      {showPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPicker(false)}
        />
      )}

      <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'} relative`}>

        {/* Other user avatar */}
        {!isOwn && (
          <div className="w-7 h-7 rounded-full overflow-hidden bg-[#F2F2F2] flex items-center justify-center flex-shrink-0 mb-0.5">
            {otherAvatar
              ? <img src={otherAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-black text-white">{message.senderName[0]?.toUpperCase()}</span>}
          </div>
        )}

        {/* Bubble + reactions column */}
        <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} relative`}>

          {/* Emoji picker (floats above bubble) */}
          {showPicker && (
            <div className={`absolute bottom-full mb-2 z-50 bg-[#161616] rounded-2xl shadow-2xl border border-[#2a2a2a] px-3 py-2.5 flex gap-3 ${isOwn ? 'right-0' : 'left-0'}`}>
              {REACTION_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => react(e)}
                  className="text-[26px] active:scale-125 transition-transform hover:scale-110"
                >
                  {e}
                </button>
              ))}
              <div className="w-px bg-[#F0F0F0] mx-1" />
              <button
                onClick={() => { setShowPicker(false); onReply(message); }}
                className="flex items-center justify-center active:scale-90 transition-transform"
              >
                <Reply size={18} className="text-[#555]" />
              </button>
            </div>
          )}

          {/* Swipe reply indicator */}
          {Math.abs(swipeX) > 20 && (
            <div className={`absolute ${isOwn ? '-left-8' : '-right-8'} bottom-1 opacity-${Math.min(100, Math.round((Math.abs(swipeX) / 60) * 100))}`}>
              <Reply size={16} className="text-[#888]" style={{ transform: isOwn ? 'scaleX(-1)' : undefined }} />
            </div>
          )}

          {/* Reply quote strip */}
          {message.replyToText && (
            <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-[3px] border-[#AAAAAA] bg-[#F5F5F5] max-w-full`}>
              <p className="text-[11px] font-bold text-[#555] mb-0.5">{message.replyToSender}</p>
              <p className="text-[12px] text-[#888] truncate">{previewText(message.replyToText)}</p>
            </div>
          )}

          {/* Actual bubble — slides on swipe */}
          <div
            style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={() => { longPressTimer.current = setTimeout(() => setShowPicker(true), 550); }}
            onMouseUp={clearLongPress}
            onMouseLeave={clearLongPress}
          >
            {parsed.kind === 'text' && (
              <div className={`px-4 py-2.5 text-[14px] leading-relaxed break-words ${
                isOwn
                  ? 'bg-[#F2F2F2] text-white rounded-[20px] rounded-br-[6px]'
                  : 'bg-[#F2F2F2] text-white rounded-[20px] rounded-bl-[6px]'
              }`}>
                {parsed.content}
              </div>
            )}
            {parsed.kind === 'image' && (
              <div className={`overflow-hidden rounded-[20px] ${isOwn ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'}`}>
                <img
                  src={parsed.content} alt="Photo"
                  className="max-w-[240px] max-h-[320px] object-cover block cursor-pointer"
                  onClick={() => window.open(parsed.content, '_blank')}
                />
              </div>
            )}
            {parsed.kind === 'audio' && <AudioBubble src={parsed.content} />}
          </div>

          {/* Reaction pills */}
          {reactionList.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {reactionList.map(({ emoji, count, iMine }) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] border transition-colors ${
                    iMine
                      ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white'
                      : 'bg-[#161616] border-[#E0E0E0] text-white'
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="font-semibold">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
