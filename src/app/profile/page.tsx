'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import {
  Heart, ShoppingBag, Bell, Edit2, Check, X, LogOut, Package2,
  DollarSign, Loader2, AlertCircle, Settings, Users, MessageSquare,
} from 'lucide-react';
import { Item, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FollowerEntry {
  userId: string;
  name: string;
  avatar: string;
}

interface NotificationRow {
  id: string; title: string; body: string; read: boolean; createdAt: number; type: string;
}

interface ProfileData {
  user: UserProfile;
  liked: Item[];
  listings: Item[];
  notifications: NotificationRow[];
  unreadCount: number;
  purchaseCount: number;
  followers: number;
  following: number;
  ratingAverage: number;
  ratingCount: number;
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

type SheetMode = 'followers' | 'following' | null;

function SocialSheet({
  mode,
  onClose,
}: {
  mode: SheetMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [list, setList] = useState<FollowerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mode) return;
    setLoading(true);
    fetch(`/api/followers?mode=${mode}`)
      .then(r => r.json())
      .then(d => { setList(Array.isArray(d) ? d : []); setLoading(false); });
  }, [mode]);

  if (!mode) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col">
        {/* Handle + title */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EBEBEB]">
          <div className="w-8 h-1 bg-[#EBEBEB] rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="font-black text-[#0A0A0A] text-lg capitalize">{mode}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#F5F4F0] rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-[#0A0A0A]" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={32} className="text-[#EBEBEB] mb-3" />
              <p className="text-[#0A0A0A] font-bold text-sm">No {mode} yet</p>
            </div>
          ) : (
            list.map(person => (
              <div key={person.userId} className="flex items-center gap-3 py-2">
                {/* Left: avatar → profile */}
                <button
                  onClick={() => { onClose(); router.push(`/user/${person.userId}`); }}
                  className="w-11 h-11 rounded-2xl bg-[#0A0A0A] flex items-center justify-center text-white font-black text-base flex-shrink-0 active:opacity-70 transition-opacity"
                  aria-label={`View ${person.name}'s profile`}
                >
                  {person.name[0]?.toUpperCase()}
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0A0A0A] text-sm truncate">{person.name}</p>
                </div>

                {/* Right: Message button */}
                <Link
                  href={`/messages/item-direct/${person.userId}`}
                  onClick={onClose}
                  className="flex items-center gap-1.5 bg-[#0A0A0A] text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  <MessageSquare size={12} />
                  Message
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [data, setData] = useState<ProfileData | null>(null);
  const [tab, setTab] = useState<'listings' | 'liked' | 'activity'>('listings');
  const [loading, setLoading] = useState(true);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);

  // Inline edits
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');

  // Avatar upload with EXIF orientation correction
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  /** Read EXIF orientation tag from raw bytes (no library needed) */
  function readExifOrientation(buffer: ArrayBuffer): number {
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        if (view.getUint32(offset + 2, false) !== 0x45786966) return 1;
        const little = view.getUint16(offset + 8, false) === 0x4949;
        // TIFF header starts at offset+8. IFD0 relative offset is at bytes 4-7
        // of the TIFF header (offset+12). Absolute IFD0 = TIFF base + IFD0 offset.
        const ifdOffset = offset + 8 + view.getUint32(offset + 12, little);
        const tags = view.getUint16(ifdOffset, little);
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(ifdOffset + 2 + i * 12, little) === 0x0112) {
            return view.getUint16(ifdOffset + 2 + i * 12 + 8, little);
          }
        }
        return 1;
      } else if ((marker & 0xFF00) !== 0xFF00) break;
      else offset += view.getUint16(offset, false);
    }
    return 1;
  }

  /** Draw image onto canvas with EXIF orientation corrected, return corrected Blob */
  async function correctOrientation(file: File): Promise<Blob> {
    const buf = await file.arrayBuffer();
    const orientation = readExifOrientation(buf);
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    await new Promise<void>(r => { img.onload = () => r(); img.src = blobUrl; });
    URL.revokeObjectURL(blobUrl);

    const swapped = orientation >= 5;
    const canvas = document.createElement('canvas');
    canvas.width  = swapped ? img.height : img.width;
    canvas.height = swapped ? img.width  : img.height;
    const ctx = canvas.getContext('2d')!;

    // Apply the inverse of the EXIF transform so pixels render correctly
    switch (orientation) {
      case 2: ctx.transform(-1, 0,  0,  1, img.width,  0);           break;
      case 3: ctx.transform(-1, 0,  0, -1, img.width,  img.height);  break;
      case 4: ctx.transform( 1, 0,  0, -1, 0,           img.height); break;
      case 5: ctx.transform( 0, 1,  1,  0, 0,           0);          break;
      case 6: ctx.transform( 0, 1, -1,  0, img.height,  0);          break;
      case 7: ctx.transform( 0,-1, -1,  0, img.height,  img.width);  break;
      case 8: ctx.transform( 0,-1,  1,  0, 0,            img.width); break;
    }
    ctx.drawImage(img, 0, 0);
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))), 'image/jpeg', 0.92)
    );
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clerkUser) return;
    setAvatarLoading(true);
    try {
      const corrected = await correctOrientation(file);
      const correctedFile = new File([corrected], file.name, { type: 'image/jpeg' });
      await clerkUser.setProfileImage({ file: correctedFile });
      // Reload so clerkUser.imageUrl reflects the new photo immediately.
      await clerkUser.reload();
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stripe Connect
  const [connect, setConnect] = useState<{ connected: boolean; ready?: boolean; requirementsDue?: string[] } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const refreshConnect = async () => {
    try {
      const r = await fetch('/api/stripe/connect/status');
      setConnect(await r.json());
    } catch { setConnect({ connected: false }); }
  };
  const startOnboarding = async () => {
    setConnectLoading(true);
    try {
      const j = await (await fetch('/api/stripe/connect/onboard', { method: 'POST' })).json();
      if (j.url) window.location.href = j.url;
      else setConnectLoading(false);
    } catch { setConnectLoading(false); }
  };
  const openDashboard = async () => {
    setConnectLoading(true);
    try {
      const j = await (await fetch('/api/stripe/connect/dashboard', { method: 'POST' })).json();
      if (j.url) window.location.href = j.url;
      else setConnectLoading(false);
    } catch { setConnectLoading(false); }
  };

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    refreshConnect();
    fetch('/api/profile').then(r => r.json()).then(d => {
      setData(d);
      setNameInput(d.user.name);
      setBioInput(d.user.bio ?? '');
      setLoading(false);
    });
  }, [isLoaded, clerkUser]);

  const saveName = async () => {
    if (!nameInput.trim()) return;
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    setData(d => d ? { ...d, user: { ...d.user, name: nameInput.trim() } } : d);
    setEditingName(false);
  };
  const saveBio = async () => {
    const trimmed = bioInput.trim().slice(0, 160);
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: trimmed }),
    });
    setData(d => d ? { ...d, user: { ...d.user, bio: trimmed } } : d);
    setBioInput(trimmed);
    setEditingBio(false);
  };
  const markRead = async () => {
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markNotificationsRead: true }),
    });
    setData(d => d ? { ...d, unreadCount: 0, notifications: d.notifications.map(n => ({ ...n, read: true })) } : d);
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, liked, listings, notifications, unreadCount, followers, following, ratingAverage, ratingCount } = data!;
  const handleAt = clerkUser?.username ? `@${clerkUser.username}` : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A]">

      {/* ── Followers / Following sheet ── */}
      <SocialSheet mode={sheetMode} onClose={() => setSheetMode(null)} />

      {/* ── Top bar ── */}
      <div className="relative pt-12 px-5 pb-2 flex items-center justify-between z-10">
        <Logo size={26} href="/feed" className="text-white" />
        <div className="flex items-center gap-2">
          <button onClick={() => openUserProfile()}
            className="btn-halo-icon w-10 h-10 text-white">
            <Settings size={16} />
          </button>
          <button onClick={() => signOut()}
            className="btn-halo-icon w-10 h-10 text-white">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Profile card (centered, TikTok-style) ── */}
      <div className="relative px-5 pt-2 pb-6">
        {/* Background gradient halo behind avatar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[280px] bg-gradient-to-b from-[#E63946]/15 via-[#E63946]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Avatar with vibrant glow ring */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2E47] to-[#ff8c42] rounded-full blur-2xl opacity-60 scale-110" />
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[#FF2E47] via-[#ff5c68] to-[#ff8c42] shadow-2xl shadow-[#FF2E47]/40">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                {avatarLoading
                  ? <Loader2 size={28} className="text-white animate-spin" />
                  : clerkUser?.imageUrl
                    ? <img
                        src={clerkUser.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ imageOrientation: 'from-image' }}
                      />
                    : <span className="text-4xl font-black text-white">{user.name[0]?.toUpperCase()}</span>
                }
              </div>
              {/* Edit badge */}
              <div className="absolute bottom-0 right-0 w-9 h-9 bg-[#FF2E47] rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center shadow-lg shadow-[#FF2E47]/40">
                {avatarLoading ? <Loader2 size={13} className="text-white animate-spin" /> : <Edit2 size={13} className="text-white" />}
              </div>
            </div>
          </button>

          {/* Name + edit */}
          <div className="mt-4 flex items-center gap-2">
            {editingName ? (
              <div className="flex items-center gap-1 bg-white/8 border border-white/15 rounded-2xl px-3 py-1">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                  className="bg-transparent text-white font-black text-xl tracking-tight w-44 focus:outline-none text-center"
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  maxLength={40} />
                <button onClick={saveName} className="text-[#E63946]"><Check size={16} /></button>
                <button onClick={() => { setNameInput(user.name); setEditingName(false); }} className="text-white/40"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 group">
                <h1 className="font-black text-white text-2xl tracking-tight">{user.name}</h1>
                <Edit2 size={13} className="text-white/30 group-hover:text-white/70 transition-colors" />
              </button>
            )}
          </div>

          {/* Handle (Clerk username) */}
          {handleAt && <p className="text-white/40 text-sm mt-0.5 font-medium">{handleAt}</p>}

          {/* Star rating */}
          <div className="mt-2 bg-white/8 rounded-full px-3 py-1 border border-white/10">
            {ratingCount === 0 ? (
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">New seller</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#E63946" stroke="#E63946" strokeWidth="0.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-white font-black text-xs">{ratingAverage.toFixed(1)}</span>
                <span className="text-white/40 text-xs">· {ratingCount} review{ratingCount === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          {/* Stats row — Following | Followers | Listings (first two are tappable) */}
          <div className="mt-5 flex items-stretch gap-0 w-full max-w-xs">
            {[
              { n: following,       label: 'Following', href: '/profile/following' },
              { n: followers,       label: 'Followers', href: '/profile/followers' },
              { n: listings.length, label: 'Listings',  href: null },
            ].map((s, i) => {
              const inner = (
                <>
                  <span className="text-white font-black text-xl leading-none">{s.n}</span>
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">{s.label}</span>
                </>
              );
              return s.href ? (
                <Link key={s.label} href={s.href}
                  className={`flex-1 flex flex-col items-center active:opacity-60 transition-opacity ${i > 0 ? 'border-l border-white/8' : ''}`}>
                  {inner}
                </Link>
              ) : (
                <div key={s.label} className={`flex-1 flex flex-col items-center ${i > 0 ? 'border-l border-white/8' : ''}`}>
                  {inner}
                </div>
              );
            })}
          </div>

          {/* Bio */}
          <div className="mt-5 w-full max-w-sm">
            {editingBio ? (
              <div className="flex flex-col items-center gap-2">
                <textarea
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value.slice(0, 160))}
                  autoFocus
                  rows={2}
                  placeholder="Add a short bio…"
                  className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E63946] resize-none text-center"
                />
                <div className="flex items-center gap-2">
                  <button onClick={saveBio} className="bg-[#E63946] text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Save</button>
                  <button onClick={() => { setBioInput(user.bio ?? ''); setEditingBio(false); }}
                    className="text-white/40 text-xs font-bold">Cancel</button>
                  <span className="text-white/30 text-[10px] ml-2">{bioInput.length}/160</span>
                </div>
              </div>
            ) : user.bio ? (
              <button onClick={() => setEditingBio(true)} className="text-white/70 text-sm leading-relaxed text-center">
                {user.bio}
                <Edit2 size={11} className="inline ml-1.5 text-white/30 align-text-bottom" />
              </button>
            ) : (
              <button onClick={() => setEditingBio(true)}
                className="text-white/40 text-sm italic flex items-center gap-1.5 mx-auto">
                <Edit2 size={11} /> Add a bio
              </button>
            )}
          </div>

          {/* Action row */}
          <div className="mt-5 flex items-center gap-2 w-full max-w-sm">
            <Link href="/orders" className="btn-halo-ghost flex-1 text-xs">
              <Package2 size={13} /> My Orders
            </Link>

            {/* Stripe Connect — compact halo button */}
            {connect && (
              <button
                onClick={connect.ready ? openDashboard : startOnboarding}
                disabled={connectLoading}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                  connect.ready
                    ? 'bg-white/8 border border-white/14 text-white'
                    : connect.connected
                      ? 'bg-[#E63946]/15 border border-[#E63946]/30 text-[#E63946]'
                      : 'bg-gradient-to-r from-[#E63946] to-[#ff5c68] text-white shadow-[0_0_28px_-4px_rgba(230,57,70,0.55)]'
                }`}
              >
                {connectLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : connect.connected && !connect.ready
                    ? <><AlertCircle size={13} /> Finish</>
                    : connect.ready
                      ? <><DollarSign size={13} /> Payouts</>
                      : <><DollarSign size={13} /> Get Paid</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 bg-[#0A0A0A] border-y border-white/8 flex">
        {[
          { id: 'listings', icon: ShoppingBag, label: 'Listings', count: listings.length },
          { id: 'liked',    icon: Heart,       label: 'Liked',    count: liked.length },
          { id: 'activity', icon: Bell,        label: 'Activity', count: unreadCount },
        ].map(({ id, icon: Icon, label, count }) => (
          <button key={id}
            onClick={() => { setTab(id as typeof tab); if (id === 'activity' && unreadCount > 0) markRead(); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3.5 transition-colors relative ${
              tab === id ? 'text-white' : 'text-white/30'
            }`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
              {id === 'activity' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#E63946] rounded-full text-white text-[8px] font-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            {tab === id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#E63946] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content (light bg from here down) ── */}
      <div className="flex-1 bg-[#F5F4F0] px-3 pt-3 pb-28">

        {/* LISTINGS */}
        {tab === 'listings' && (
          listings.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No listings yet" sub="Items you list will show up here">
              <Link href="/sell" className="btn-halo mt-4 inline-flex">List your first item</Link>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {listings.map(item => (
                <Link key={item.id} href={`/item/${item.id}`}
                  className="relative aspect-[3/4] bg-[#EBEBEB] overflow-hidden active:opacity-80 transition-opacity">
                  <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
                    <span className="text-white font-black text-sm leading-none drop-shadow-lg">${item.price}</span>
                    {item.sold && <span className="bg-white text-[#0A0A0A] text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">Sold</span>}
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <Heart size={8} className="fill-white" />
                    {item.likes}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* LIKED */}
        {tab === 'liked' && (
          liked.length === 0 ? (
            <EmptyState icon={Heart} title="No saved items yet" sub="Swipe right to save items you love">
              <Link href="/feed" className="btn-halo mt-4 inline-flex">Start swiping</Link>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {liked.map(item => (
                <Link key={item.id} href={`/item/${item.id}`}
                  className="relative aspect-[3/4] bg-[#EBEBEB] overflow-hidden active:opacity-80 transition-opacity">
                  <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
                    <span className="text-white font-black text-sm leading-none drop-shadow-lg">${item.price}</span>
                    <span className="text-white/90 text-[9px] font-bold uppercase tracking-widest">{item.brand}</span>
                  </div>
                  <Heart size={12} className="absolute top-1.5 right-1.5 text-[#E63946] fill-[#E63946] drop-shadow-lg" />
                </Link>
              ))}
            </div>
          )
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No activity yet" sub="Likes, offers, and sales will appear here" />
          ) : (
            <div className="space-y-2 px-1">
              {notifications.map(n => (
                <div key={n.id} className={`rounded-2xl p-4 ${n.read ? 'bg-white' : 'bg-[#E63946]/8 border border-[#E63946]/20'} shadow-sm`}>
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-black text-[#0A0A0A]">{n.title}</p>
                    <span className="text-[10px] text-[#AAAAAA] flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#5A5A5A] leading-relaxed">{n.body}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <Navbar />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon, title, sub, children,
}: { icon: React.ElementType; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
        <Icon size={28} className="text-[#EBEBEB]" />
      </div>
      <p className="font-black text-[#0A0A0A] text-base">{title}</p>
      <p className="text-[#AAAAAA] text-sm mt-1 max-w-xs">{sub}</p>
      {children}
    </div>
  );
}
