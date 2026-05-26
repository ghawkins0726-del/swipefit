'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Heart, ShoppingBag, Bell, TrendingUp, Edit2, Check, UserCog, Package2 } from 'lucide-react';
import { Item, UserProfile } from '@/lib/types';
import Link from 'next/link';

function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

interface ProfileData {
  user: UserProfile;
  liked: Item[];
  listings: Item[];
  notifications: { id: string; title: string; body: string; read: boolean; createdAt: number; type: string }[];
  unreadCount: number;
  purchaseCount: number;
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [tab, setTab] = useState<'liked' | 'listings' | 'notifications'>('liked');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(true);

  const userId = typeof window !== 'undefined' ? getUserId() : '';

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setNameInput(d.user.name);
        setLoading(false);
      });
  }, [userId]);

  const saveName = async () => {
    if (!nameInput.trim()) return;
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: nameInput.trim() }),
    });
    setData(d => d ? { ...d, user: { ...d.user, name: nameInput.trim() } } : d);
    setEditingName(false);
  };

  const markRead = async () => {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markNotificationsRead: true }),
    });
    setData(d => d ? {
      ...d,
      unreadCount: 0,
      notifications: d.notifications.map(n => ({ ...n, read: true })),
    } : d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, liked, listings, notifications, unreadCount, purchaseCount } = data!;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-pink-500 pt-12 pb-5 px-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur overflow-hidden flex items-center justify-center">
              <span className="text-2xl font-black text-white">{user.name[0]?.toUpperCase()}</span>
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="bg-white/20 text-white font-bold rounded-lg px-2 py-0.5 text-sm focus:outline-none w-32"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                  />
                  <button onClick={saveName}><Check size={16} className="text-white" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-black text-lg">{user.name}</h1>
                  <button onClick={() => setEditingName(true)}>
                    <Edit2 size={13} className="text-white/60" />
                  </button>
                </div>
              )}
              <p className="text-white/60 text-xs">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile/edit" className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-white text-xs font-semibold flex items-center gap-1.5">
              <UserCog size={13} />
              Edit
            </Link>
            <Link href="/dashboard" className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-white text-xs font-semibold flex items-center gap-1.5">
              <TrendingUp size={13} />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: liked.length, label: 'Liked' },
            { value: listings.length, label: 'Listed' },
            { value: listings.filter(i => i.sold).length, label: 'Sold' },
            { value: purchaseCount, label: 'Bought' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <div className="font-black text-xl text-white">{value}</div>
              <div className="text-white/60 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Orders link */}
        <Link href="/orders" className="mt-3 flex items-center justify-between bg-white/15 backdrop-blur rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Package2 size={15} className="text-white/80" />
            <span className="text-white font-semibold text-sm">My Orders</span>
          </div>
          <span className="text-white/50 text-xs">View all →</span>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex">
        {[
          { id: 'liked', icon: <Heart size={14} />, label: 'Liked', count: liked.length },
          { id: 'listings', icon: <ShoppingBag size={14} />, label: 'Listings', count: listings.length },
          { id: 'notifications', icon: <Bell size={14} />, label: 'Alerts', count: unreadCount },
        ].map(({ id, icon, label, count }) => (
          <button key={id}
            onClick={() => { setTab(id as typeof tab); if (id === 'notifications' && unreadCount > 0) markRead(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === id ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400'
            }`}
          >
            {icon}
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 font-bold ${tab === id ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-24 px-4 pt-4">
        {/* Liked grid */}
        {tab === 'liked' && (
          liked.length === 0 ? (
            <div className="text-center py-16">
              <Heart size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Start swiping to save items you love</p>
              <Link href="/feed" className="inline-block mt-4 bg-violet-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm">
                Go to Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {liked.map(item => (
                <Link key={item.id} href={`/item/${item.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative aspect-square bg-zinc-100">
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">${item.price}</div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                    <p className="text-gray-400 text-xs">{item.brand}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div className="space-y-2.5">
            <Link href="/sell" className="flex items-center justify-center gap-2 w-full bg-violet-600 text-white font-bold py-3.5 rounded-2xl mb-4">
              <ShoppingBag size={18} />
              List a new item
            </Link>
            {listings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Your listings will appear here</p>
              </div>
            ) : listings.map(item => (
              <Link key={item.id} href={`/item/${item.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Heart size={10} className="text-pink-300 fill-pink-200" />
                    <span className="text-xs text-gray-400">{item.likes} likes</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">${item.price}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.sold ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.sold ? 'Sold' : 'Active'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Notifications */}
        {tab === 'notifications' && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 rounded-2xl p-4 ${n.read ? 'bg-white' : 'bg-violet-50 border border-violet-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  n.type === 'offer' ? 'bg-green-100' : 'bg-violet-100'
                }`}>
                  {n.type === 'offer' ? '💰' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>
                  <p className="text-gray-300 text-xs mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
