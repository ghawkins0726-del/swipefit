'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Mic, Send, X, Loader2, Square, Image as ImageIcon } from 'lucide-react';
import { Message } from '@/lib/db-types';

interface Props {
  itemId: string;
  receiverId: string;
  senderName: string;
  onSent: () => void;
  replyTo?: Message | null;
  onClearReply?: () => void;
}

const QUICK_EMOJIS = ['❤️', '😂', '👍', '🔥', '😍'];

function previewText(raw: string) {
  if (raw.startsWith('__img__:'))   return '📷 Photo';
  if (raw.startsWith('__audio__:')) return '🎤 Voice message';
  return raw.length > 55 ? raw.slice(0, 55) + '…' : raw;
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MessageInput({ itemId, receiverId, senderName, onSent, replyTo, onClearReply }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Media sheet
  const [showMediaSheet, setShowMediaSheet] = useState(false);

  // Photo preview
  const [imagePreview, setImagePreview] = useState<{ objectUrl: string; file: File } | null>(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [text]);

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview.objectUrl); };
  }, [imagePreview]);

  // ── Core send ─────────────────────────────────────────────────────────────────
  const sendText = useCallback(async (msg: string) => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId, itemId, text: trimmed, senderName,
        replyToId: replyTo?.id ?? null,
        replyToText: replyTo?.text ?? null,
        replyToSender: replyTo?.senderName ?? null,
      }),
    });
    setSending(false);
    onSent();
  }, [receiverId, itemId, senderName, onSent, replyTo]);

  const handleSend = () => { sendText(text); setText(''); };

  // ── Photo ─────────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview.objectUrl);
    setImagePreview({ objectUrl: URL.createObjectURL(file), file });
    setShowMediaSheet(false);
  };

  const sendPhoto = async () => {
    if (!imagePreview || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('file', imagePreview.file);
      fd.append('folder', 'chat');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.url) throw new Error('Upload failed');
      URL.revokeObjectURL(imagePreview.objectUrl);
      setImagePreview(null);
      await sendText(`__img__:${data.url}`);
    } catch { setSending(false); }
  };

  // ── Voice ─────────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (cancelledRef.current || chunksRef.current.length === 0) return;
        setSending(true);
        try {
          const mime = recorder.mimeType || 'audio/webm';
          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
          const blob = new Blob(chunksRef.current, { type: mime });
          const audioFile = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });
          const fd = new FormData();
          fd.append('file', audioFile);
          const res = await fetch('/api/upload/audio', { method: 'POST', body: fd });
          const data = await res.json();
          if (!data.url) throw new Error('Upload failed');
          await sendText(`__audio__:${data.url}`);
        } catch { setSending(false); }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions and try again.');
    }
  };

  const stopAndSend = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const hasText = text.trim().length > 0;

  return (
    <>
      {/* ── Media source sheet ── */}
      {showMediaSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowMediaSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#161616] rounded-t-3xl px-4 pt-4 pb-10 safe-area-bottom">
            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5" />
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center gap-4 py-4 border-b border-[#2a2a2a] active:bg-[#F9F9F9] rounded-xl px-2"
            >
              <div className="w-11 h-11 bg-[#F2F2F2] rounded-full flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[15px] text-white">Take Photo</p>
                <p className="text-[12px] text-[#888]">Use your camera</p>
              </div>
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex items-center gap-4 py-4 active:bg-[#F9F9F9] rounded-xl px-2"
            >
              <div className="w-11 h-11 bg-[#F2F2F2] rounded-full flex items-center justify-center flex-shrink-0">
                <ImageIcon size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[15px] text-white">Choose from Library</p>
                <p className="text-[12px] text-[#888]">Pick from your photos</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Hidden inputs */}
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <div className="flex-shrink-0 bg-[#161616] border-t border-[#2a2a2a]">

        {/* ── Reply strip ── */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 pt-2.5 pb-1 border-b border-[#F5F5F5]">
            <div className="w-[3px] h-8 bg-[#FF2E47] rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#FF2E47]">{replyTo.senderName}</p>
              <p className="text-[12px] text-[#888] truncate">{previewText(replyTo.text)}</p>
            </div>
            <button onClick={onClearReply} className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <X size={14} className="text-[#888]" />
            </button>
          </div>
        )}

        {/* ── Image preview ── */}
        {imagePreview && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#F2F2F2] flex-shrink-0">
              <img src={imagePreview.objectUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => { URL.revokeObjectURL(imagePreview.objectUrl); setImagePreview(null); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
            <button
              onClick={sendPhoto}
              disabled={sending}
              className="flex-1 h-11 bg-[#FF2E47] rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} />Send Photo</>}
            </button>
          </div>
        )}

        {/* ── Quick emojis ── */}
        {!recording && !imagePreview && (
          <div className="flex items-center gap-3 px-4 pt-2.5 pb-1">
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={() => sendText(e)} disabled={sending}
                className="text-[22px] active:scale-90 transition-transform disabled:opacity-40">
                {e}
              </button>
            ))}
          </div>
        )}

        {/* ── Recording UI ── */}
        {recording && (
          <div className="flex items-center gap-3 px-4 py-3 pb-8">
            <button onClick={cancelRecording} className="text-[#888] text-[14px] font-semibold">Cancel</button>
            <div className="flex-1 flex items-center justify-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#FF2E47] animate-pulse" />
              <span className="font-mono font-bold text-[18px] text-white tabular-nums">{fmt(recordDuration)}</span>
            </div>
            <button onClick={stopAndSend}
              className="w-12 h-12 bg-[#FF2E47] rounded-full flex items-center justify-center shadow-lg shadow-[#FF2E47]/30 active:scale-95 transition-transform">
              {sending
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Square size={16} className="text-white fill-white" />}
            </button>
          </div>
        )}

        {/* ── Normal input row ── */}
        {!recording && !imagePreview && (
          <div className="flex items-end gap-2 px-3 pb-8 pt-1">
            <button onClick={() => setShowMediaSheet(true)} disabled={sending}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 mb-0.5 active:scale-90 transition-transform">
              <Camera size={22} className="text-white" />
            </button>

            <div className="flex-1 bg-[#F2F2F2] rounded-[22px] px-4 py-2 flex items-end">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message..."
                rows={1}
                className="flex-1 bg-transparent text-[15px] text-white placeholder-[#999] focus:outline-none resize-none leading-relaxed"
                style={{ maxHeight: 96 }}
              />
            </div>

            {hasText ? (
              <button onClick={handleSend} disabled={sending}
                className="w-9 h-9 flex items-center justify-center flex-shrink-0 mb-0.5 active:scale-90 transition-transform disabled:opacity-40">
                {sending
                  ? <Loader2 size={18} className="text-[#FF2E47] animate-spin" />
                  : <Send size={20} className="text-[#FF2E47]" strokeWidth={2.5} />}
              </button>
            ) : (
              <button onClick={startRecording} disabled={sending}
                className="w-9 h-9 flex items-center justify-center flex-shrink-0 mb-0.5 active:scale-90 transition-transform disabled:opacity-40">
                <Mic size={22} className="text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
