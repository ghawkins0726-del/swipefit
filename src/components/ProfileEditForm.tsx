'use client';

import { useState, useRef } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface Props {
  user: UserProfile;
  onSaved: (updated: UserProfile) => void;
}

export default function ProfileEditForm({ user, onSaved }: Props) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) setAvatarUrl(data.url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const userId = typeof window !== 'undefined' ? localStorage.getItem('swipefit_user_id') : null;
    if (!userId) { setSaving(false); return; }
    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: name.trim(), bio, avatar: avatarUrl }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setSaved(true);
      onSaved(data.user);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-violet-100 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-violet-400">{name[0]?.toUpperCase()}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <p className="text-xs text-gray-400">Tap camera to change photo</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Display Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Tell buyers about your style…"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition resize-none"
        />
        <p className="text-right text-xs text-gray-300 mt-1">{bio.length}/160</p>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : saved ? (
          <><Check size={18} /> Saved!</>
        ) : (
          'Save Profile'
        )}
      </button>
    </div>
  );
}
