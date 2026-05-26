'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { TrendingUp, Eye, Heart, ShoppingBag, DollarSign, ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import { Item } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function getUserId(): string {
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

interface Analytics {
  items: Item[];
  totalViews: number;
  totalLikes: number;
  totalSold: number;
  totalRevenue: number;
  activeListings: number;
  recentSwipes: { day: string; count: number }[];
  conversionRate: string;
}

interface OfferWithItem {
  id: string; buyerId: string; sellerId: string; itemId: string;
  amount: number; message: string; status: string; createdAt: number;
  item: Item | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [offers, setOffers] = useState<OfferWithItem[]>([]);
  const [tab, setTab] = useState<'overview' | 'listings' | 'offers'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    Promise.all([
      fetch(`/api/analytics?sellerId=${userId}`).then(r => r.json()),
      fetch(`/api/offers?userId=${userId}&role=seller`).then(r => r.json()),
    ]).then(([a, o]) => {
      setAnalytics(a);
      setOffers(o);
      setLoading(false);
    });
  }, []);

  const handleOfferAction = async (offerId: string, status: 'accepted' | 'declined') => {
    await fetch('/api/offers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId, status }),
    });
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { icon: <Eye size={18} className="text-blue-500" />, label: 'Total Views', value: analytics?.totalViews.toLocaleString() ?? '0', bg: 'bg-blue-50' },
    { icon: <Heart size={18} className="text-pink-500" />, label: 'Total Likes', value: analytics?.totalLikes.toLocaleString() ?? '0', bg: 'bg-pink-50' },
    { icon: <ShoppingBag size={18} className="text-emerald-500" />, label: 'Items Sold', value: analytics?.totalSold ?? 0, bg: 'bg-emerald-50' },
    { icon: <TrendingUp size={18} className="text-violet-500" />, label: 'Conversion', value: `${analytics?.conversionRate}%`, bg: 'bg-violet-50' },
  ];

  const pendingOffers = offers.filter(o => o.status === 'pending');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Seller Dashboard</h1>
          {pendingOffers.length > 0 && (
            <div className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingOffers.length} offers
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['overview', 'listings', 'offers'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t}
              {t === 'offers' && pendingOffers.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingOffers.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pb-24 px-4 pt-4">
        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ icon, label, value, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Revenue card */}
            <div className="bg-gradient-to-br from-violet-600 to-pink-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={18} />
                <span className="font-semibold text-sm text-white/80">Total Revenue</span>
              </div>
              <p className="text-4xl font-black">${analytics?.totalRevenue.toFixed(2) ?? '0.00'}</p>
              <p className="text-white/60 text-xs mt-1">{analytics?.totalSold ?? 0} items sold · {analytics?.activeListings ?? 0} active</p>
            </div>

            {/* 7-day activity */}
            {analytics?.recentSwipes && analytics.recentSwipes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 text-sm mb-3">7-Day Engagement</h3>
                <div className="flex items-end gap-1.5 h-20">
                  {analytics.recentSwipes.map(({ day, count }) => {
                    const max = Math.max(...analytics.recentSwipes.map(r => r.count));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-violet-100 rounded-t-sm" style={{ height: `${Math.max(pct, 4)}%` }}>
                          <div className="w-full h-full bg-violet-500 rounded-t-sm" />
                        </div>
                        <span className="text-xs text-gray-400">{day.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Link href="/sell" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50">
                <ShoppingBag size={18} className="text-violet-500" />
                <span className="flex-1 text-sm font-semibold text-gray-700">List new item</span>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
              <Link href="/trending" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
                <TrendingUp size={18} className="text-orange-400" />
                <span className="flex-1 text-sm font-semibold text-gray-700">See what's trending</span>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            </div>
          </div>
        )}

        {/* Listings tab */}
        {tab === 'listings' && (
          <div className="space-y-2.5">
            {analytics?.items.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No listings yet</p>
                <Link href="/sell"
                  className="inline-block mt-4 bg-violet-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm">
                  List your first item
                </Link>
              </div>
            ) : analytics?.items.map(item => (
              <Link key={item.id} href={`/item/${item.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1"><Eye size={10} className="text-gray-300" /><span className="text-xs text-gray-400">{item.views}</span></div>
                    <div className="flex items-center gap-1"><Heart size={10} className="text-pink-300" /><span className="text-xs text-gray-400">{item.likes}</span></div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} className="text-gray-300" />
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">${item.price}</p>
                  {item.sold ? (
                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">Sold</span>
                  ) : (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">Active</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Offers tab */}
        {tab === 'offers' && (
          <div className="space-y-3">
            {offers.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No offers yet</p>
              </div>
            ) : offers.map(offer => (
              <div key={offer.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex gap-3">
                  {offer.item && (
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                      <img src={offer.item.images[0]} alt={offer.item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{offer.item?.title ?? 'Item'}</p>
                    <p className="text-gray-400 text-xs">Listed at ${offer.item?.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-black text-violet-600">${offer.amount}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        offer.status === 'pending' ? 'bg-yellow-100 text-yellow-600'
                        : offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-red-100 text-red-500'
                      }`}>{offer.status}</span>
                    </div>
                    {offer.message && (
                      <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{offer.message}&rdquo;</p>
                    )}
                  </div>
                </div>

                {offer.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleOfferAction(offer.id, 'declined')}
                      className="flex-1 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                      Decline
                    </button>
                    <button onClick={() => handleOfferAction(offer.id, 'accepted')}
                      className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors">
                      Accept ${offer.amount}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
