'use client';

import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import { Heart, ShoppingBag, Bell, TrendingUp, Edit2, Check, LogOut, Package2, ChevronRight } from 'lucide-react';
import { Item, UserProfile } from '@/lib/types';
import Link from 'next/link';

interface ProfileData {
  user: UserProfile;
  liked: Item[];
  listings: Item[];
  notifications: { id: string; title: string; body: string; read: boolean; createdAt: number; type: string }[];
  unreadCount: number;
  purchaseCount: number;
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [data, setData] = useState<ProfileData | null>(null);
  const [tab, setTab] = useState<'liked' | 'listings' | 'notifications'>('liked');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setData(d); setNameInput(d.user.name); setLoading(false); });
  }, [isLoaded, clerkUser]);

  const saveName = async () => {
    if (!nameInput.trim()) return;
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    setData(d => d ? { ...d, user: { ...d.user, name: nameInput.trim() } } : d);
    setEditingName(false);
  };

  const markRead = async () => {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markNotificationsRead: true }),
    });
    setData(d => d ? { ...d, unreadCount: 0, notifications: d.notifications.map(n => ({ ...n, read: true })) } : d);
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, liked, listings, notifications, unreadCount, purchaseCount } = data!;
  const soldCount = listings.filter(i => i.sold).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* ── Header ── */}
      <div className="bg-[#0A0A0A] pt-12 pb-6 px-5">

        {/* Logo top-left */}
        <Logo size={26} href="/feed" className="text-white mb-4" />

        {/* Top row: avatar + actions */}
        <div className="flex items-start justify-between mb-5">
          {/* Avatar */}
          <button onClick={() => openUserProfile()}
            className="relative w-[72px] h-[72px] rounded-3xl bg-white/10 overflow-hidden flex items-center justify-center group flex-shrink-0">
            {clerkUser?.imageUrl
              ? <img src={clerkUser.imageUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-white">{user.name[0]?.toUpperCase()}</span>
            }
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-[8px] font-black uppercase tracking-widest">Edit</span>
            </div>
          </button>

          {/* Quick actions */}
          <div className="flex gap-2">
            <Link href="/dashboard"
              className="flex items-center gap-1.5 bg-white/10 rounded-2xl px-3 py-2.5 text-white text-xs font-bold">
              <TrendingUp size={12} />
              Stats
            </Link>
            <button onClick={() => signOut({ redirectUrl: '/' })}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white/40 text-xs font-bold">
              <LogOut size={12} />
              Out
            </button>
          </div>
        </div>

        {/* Name + username */}
        <div className="mb-5">
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="bg-white/10 text-white font-black text-xl rounded-xl px-3 py-1 focus:outline-none w-48"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveName()}
              />
              <button onClick={saveName} className="w-8 h-8 bg-[#E63946] rounded-xl flex items-center justify-center">
                <Check size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-2 mb-1">
              <h1 className="text-white font-black text-2xl leading-none">{user.name}</h1>
              <Edit2 size={13} className="text-white/25 mt-0.5" />
            </button>
          )}
          {clerkUser?.username && (
            <p className="text-white/40 text-sm font-medium">@{clerkUser.username}</p>
          )}
          <p className="text-white/20 text-xs mt-0.5">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { value: liked.length,    label: 'Liked' },
            { value: listings.length, label: 'Listed' },
            { value: soldCount,       label: 'Sold' },
            { value: purchaseCount,   label: 'Bought' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/8 border border-white/8 rounded-2xl py-3 text-center">
              <div className="font-black text-[22px] text-white leading-none">{value}</div>
              <div className="text-white/35 text-[10px] font-semibold mt-1 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Orders link */}
        <Link href="/orders"
          className="flex items-center justify-between bg-white/8 border border-white/8 rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/10 rounded-xl flex items-center justify-center">
              <Package2 size={14} className="text-white/70" />
            </div>
            <span className="text-white font-bold text-sm">My Orders</span>
          </div>
          <ChevronRight size={16} className="text-white/30" />
        </Link>
      </div>

      {/* ── Tab Bar ── */}
      <div className="bg-white border-b border-[#EBEBEB] flex sticky top-0 z-10">
        {[
          { id: 'liked',         icon: Heart,    label: 'Saved',    count: liked.length },
          { id: 'listings',      icon: ShoppingBag, label: 'Listings', count: listings.length },
          { id: 'notifications', icon: Bell,     label: 'Activity', count: unreadCount },
        ].map(({ id, icon: Icon, label, count }) => (
          <button key={id}
            onClick={() => { setTab(id as typeof tab); if (id === 'notifications' && unreadCount > 0) markRead(); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors border-b-2 ${
              tab === id ? 'border-[#0A0A0A] text-[#0A0A0A]' : 'border-transparent text-[#BBBBBB]'
            }`}
          >
            <div className="relative">
              <Icon size={18} strokeWidth={tab === id ? 2.5 : 1.8} />
              {count > 0 && (
                <span className={`absolute -top-1.5 -right-2 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center ${
                  tab === id ? 'bg-[#E63946] text-white' : 'bg-[#EBEBEB] text-[#AAAAAA]'
                }`}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${tab === id ? 'text-[#0A0A0A]' : 'text-[#BBBBBB]'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 pb-24">

        {/* Saved / Liked */}
        {tab === 'liked' && (
          liked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <Heart size={24} className="text-[#EBEBEB]" />
              </div>
              <p className="text-[#0A0A0A] font-black text-base mb-1">Nothing saved yet</p>
              <p className="text-[#AAAAAA] text-sm text-center mb-6">Swipe right on pieces you love to save them here</p>
              <Link href="/feed" className="bg-[#0A0A0A] text-white px-8 py-3 rounded-2xl font-bold text-sm">
                Browse Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-[#EBEBEB]">
              {liked.map(item => (
                <Link key={item.id} href={`/item/${item.id}`} className="bg-white">
                  <div className="relative aspect-[3/4] bg-[#F5F4F0]">
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    {item.sold && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-black text-xs uppercase tracking-widest">Sold</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white font-black text-sm leading-none">${item.price}</p>
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="font-bold text-[#0A0A0A] text-sm truncate leading-none">{item.title}</p>
                    <p className="text-[#AAAAAA] text-xs mt-0.5">{item.brand}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div>
            {/* New listing CTA */}
            <Link href="/sell"
              className="flex items-center justify-between mx-4 mt-4 mb-3 bg-[#0A0A0A] rounded-2xl px-5 py-4">
              <div>
                <p className="text-white font-black text-sm">List a new item</p>
                <p className="text-white/40 text-xs mt-0.5">Turn your closet into cash</p>
              </div>
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <ShoppingBag size={16} className="text-white" />
              </div>
            </Link>

            {listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                  <ShoppingBag size={24} className="text-[#EBEBEB]" />
                </div>
                <p className="text-[#0A0A0A] font-black text-base mb-1">No listings yet</p>
                <p className="text-[#AAAAAA] text-sm text-center">Your items will appear here once listed</p>
              </div>
            ) : (
              <div className="px-4 space-y-2">
                {listings.map(item => (
                  <Link key={item.id} href={`/item/${item.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3">
                    <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{item.title}</p>
                      <p className="text-[#AAAAAA] text-xs mt-0.5">{item.brand} · Size {item.size}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Heart size={10} className="text-[#E63946]" />
                          <span className="text-[10px] text-[#AAAAAA] font-semibold">{item.likes}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.sold ? 'bg-green-100 text-green-700' : 'bg-[#F5F4F0] text-[#AAAAAA]'
                        }`}>
                          {item.sold ? 'Sold' : 'Active'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-[#0A0A0A] text-base">${item.price}</p>
                      <ChevronRight size={14} className="text-[#EBEBEB] ml-auto mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity / Notifications */}
        {tab === 'notifications' && (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <Bell size={24} className="text-[#EBEBEB]" />
              </div>
              <p className="text-[#0A0A0A] font-black text-base mb-1">All caught up</p>
              <p className="text-[#AAAAAA] text-sm text-center">Likes, offers, and messages will show here</p>
            </div>
          ) : (
            <div className="px-4 pt-4 space-y-2">
              {notifications.map(n => (
                <div key={n.id}
                  className={`flex items-start gap-3 rounded-2xl p-4 ${n.read ? 'bg-white' : 'bg-[#0A0A0A]'}`}>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-base ${
                    n.read ? 'bg-[#F5F4F0]' : 'bg-white/10'
                  }`}>
                    {n.type === 'offer' ? '💰' : n.type === 'order' ? '📦' : n.type === 'message' ? '💬' : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm leading-snug ${n.read ? 'text-[#0A0A0A]' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${n.read ? 'text-[#AAAAAA]' : 'text-white/50'}`}>
                      {n.body}
                    </p>
                    <p className={`text-[10px] mt-1.5 font-semibold ${n.read ? 'text-[#CCCCCC]' : 'text-white/25'}`}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-[#E63946] rounded-full flex-shrink-0 mt-1.5" />}
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
