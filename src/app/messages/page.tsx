'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, ChevronRight, Bell,
  Check, X, DollarSign, ShoppingCart, Tag, UserPlus, MessageSquare,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useUser } from '@clerk/nextjs';
import { ConversationPreview, Offer } from '@/lib/db-types';
import { UserProfile, Item } from '@/lib/types';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString();
}

type OfferWithItem = Offer & { item: Item | null };

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  type: string;
  payload: string;
}

type FriendUser = UserProfile & { followedAt: number };

/* ─── Activity drawer ───────────────────────────────────────────────────────── */

function ActivityDrawer({
  open,
  onClose,
  sellerOffers,
  buyerOffers,
  notifications,
  onOfferActioned,
}: {
  open: boolean;
  onClose: () => void;
  sellerOffers: OfferWithItem[];
  buyerOffers: OfferWithItem[];
  notifications: NotificationRow[];
  onOfferActioned: () => void;
}) {
  const pendingSellerOffers = sellerOffers.filter(o => o.status === 'pending');
  const actionableBuyerOffers = buyerOffers.filter(
    o => o.status === 'accepted' || o.status === 'countered',
  );

  const [actingOn, setActingOn] = useState<string | null>(null);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterInput, setCounterInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function respondToOffer(
    offerId: string,
    status: 'accepted' | 'declined' | 'countered',
    counterAmount?: number,
  ) {
    setActingOn(offerId);
    try {
      await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, status, counterAmount }),
      });
      onOfferActioned();
    } finally {
      setActingOn(null);
      setCounterOfferId(null);
      setCounterInput('');
    }
  }

  async function startCheckout(offer: OfferWithItem, amount: number) {
    if (!offer.item) return;
    setCheckoutLoading(offer.id);
    try {
      const res = await fetch('/api/stripe/item-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: offer.itemId, sellerId: offer.sellerId, amount }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  const hasAnything =
    pendingSellerOffers.length > 0 ||
    actionableBuyerOffers.length > 0 ||
    notifications.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer — slides down from top */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="bg-[#0A0A0A] pt-14 pb-3 px-4 flex items-center justify-between">
          <p className="text-white font-black text-lg">Activity</p>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="bg-[#F5F4F0] px-4 pt-3 pb-6 space-y-3 min-h-[120px]">
          {!hasAnything && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell size={28} className="text-[#EBEBEB] mb-2" />
              <p className="text-[#AAAAAA] text-sm font-semibold">You&apos;re all caught up</p>
            </div>
          )}

          {/* Offers to respond (seller) */}
          {pendingSellerOffers.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest">
                  Offers to respond
                </p>
              </div>
              {pendingSellerOffers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className={`px-4 py-3 ${idx < pendingSellerOffers.length - 1 ? 'border-b border-[#F5F4F0]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {offer.item?.images?.[0] && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                        <img src={offer.item.images[0]} alt={offer.item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">
                        {offer.item?.title ?? 'Item'}
                      </p>
                      <p className="text-[#AAAAAA] text-xs mt-0.5">
                        Offered{' '}
                        <span className="text-[#0A0A0A] font-bold">${offer.amount}</span>
                        {offer.item?.price && (
                          <span className="text-[#AAAAAA]"> · listed ${offer.item.price}</span>
                        )}
                      </p>
                      {offer.message && (
                        <p className="text-[#AAAAAA] text-xs mt-0.5 italic truncate">
                          &ldquo;{offer.message}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#AAAAAA] flex-shrink-0 mt-0.5">
                      {timeAgo(offer.createdAt)}
                    </span>
                  </div>

                  {counterOfferId === offer.id ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 flex items-center bg-[#F5F4F0] rounded-xl px-3 py-2 gap-1.5">
                        <DollarSign size={13} className="text-[#AAAAAA] flex-shrink-0" />
                        <input
                          type="number"
                          value={counterInput}
                          onChange={e => setCounterInput(e.target.value)}
                          placeholder="Counter amount"
                          className="flex-1 bg-transparent text-sm font-bold text-[#0A0A0A] outline-none w-0 min-w-0"
                          autoFocus
                        />
                      </div>
                      <button
                        disabled={!counterInput || actingOn === offer.id}
                        onClick={() => respondToOffer(offer.id, 'countered', parseFloat(counterInput))}
                        className="bg-[#0A0A0A] text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-40"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => { setCounterOfferId(null); setCounterInput(''); }}
                        className="w-8 h-8 bg-[#F5F4F0] rounded-xl flex items-center justify-center"
                      >
                        <X size={13} className="text-[#AAAAAA]" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => respondToOffer(offer.id, 'accepted')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#E63946] text-white text-xs font-black py-2 rounded-xl disabled:opacity-50"
                      >
                        <Check size={12} /> Accept ${offer.amount}
                      </button>
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => { setCounterOfferId(offer.id); setCounterInput(String(offer.amount)); }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5F4F0] text-[#0A0A0A] text-xs font-black py-2 rounded-xl disabled:opacity-50"
                      >
                        <Tag size={12} /> Counter
                      </button>
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => respondToOffer(offer.id, 'declined')}
                        className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl flex-shrink-0"
                      >
                        <X size={14} className="text-[#AAAAAA]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Buyer's actionable offers */}
          {actionableBuyerOffers.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest">Your offers</p>
              </div>
              {actionableBuyerOffers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className={`px-4 py-3 ${idx < actionableBuyerOffers.length - 1 ? 'border-b border-[#F5F4F0]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {offer.item?.images?.[0] && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                        <img src={offer.item.images[0]} alt={offer.item.title ?? ''} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{offer.item?.title ?? 'Item'}</p>
                      {offer.status === 'accepted' && (
                        <p className="text-green-600 text-xs font-bold mt-0.5">✓ Accepted at ${offer.amount}</p>
                      )}
                      {offer.status === 'countered' && (
                        <p className="text-[#E63946] text-xs font-bold mt-0.5">
                          Counter: ${offer.counterAmount}{' '}
                          <span className="text-[#AAAAAA] font-normal">(you offered ${offer.amount})</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {offer.status === 'accepted' && (
                      <button
                        disabled={checkoutLoading === offer.id}
                        onClick={() => startCheckout(offer, offer.amount)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-50"
                      >
                        <ShoppingCart size={12} />
                        {checkoutLoading === offer.id ? 'Loading…' : `Pay $${offer.amount} →`}
                      </button>
                    )}
                    {offer.status === 'countered' && offer.counterAmount != null && (
                      <>
                        <button
                          disabled={checkoutLoading === offer.id}
                          onClick={() => startCheckout(offer, offer.counterAmount!)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-50"
                        >
                          <Check size={12} />
                          {checkoutLoading === offer.id ? 'Loading…' : `Accept $${offer.counterAmount}`}
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl flex-shrink-0">
                          <X size={14} className="text-[#AAAAAA]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent notifications */}
          {notifications.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest">Recent</p>
              </div>
              {notifications.slice(0, 8).map((n, idx) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    idx < Math.min(notifications.length, 8) - 1 ? 'border-b border-[#F5F4F0]' : ''
                  } ${!n.read ? 'bg-red-50/50' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-[#E63946]' : 'bg-[#EBEBEB]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.read ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[#0A0A0A]'} truncate`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-[#AAAAAA] mt-0.5 truncate">{n.body}</p>
                  </div>
                  <span className="text-[10px] text-[#AAAAAA] flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */

export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [activityOpen, setActivityOpen] = useState(false);

  // Friends (people I follow)
  const [friends, setFriends] = useState<FriendUser[]>([]);

  // Inbox
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Activity
  const [sellerOffers, setSellerOffers] = useState<OfferWithItem[]>([]);
  const [buyerOffers, setBuyerOffers] = useState<OfferWithItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(() => {
    if (!clerkUser) return;
    Promise.all([
      fetch('/api/messages?list=true').then(r => r.json()).catch(() => []),
      fetch('/api/offers?role=seller').then(r => r.json()).catch(() => []),
      fetch('/api/offers?role=buyer').then(r => r.json()).catch(() => []),
      fetch('/api/notifications').then(r => r.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
      fetch(`/api/users/${clerkUser.id}/following`).then(r => r.json()).catch(() => []),
    ]).then(([convos, sOffers, bOffers, notifData, following]) => {
      setConversations(Array.isArray(convos) ? convos : []);
      setSellerOffers(Array.isArray(sOffers) ? sOffers : []);
      setBuyerOffers(Array.isArray(bOffers) ? bOffers : []);
      setNotifications(Array.isArray(notifData.notifications) ? notifData.notifications : []);
      setUnreadCount(notifData.unreadCount ?? 0);
      setFriends(Array.isArray(following) ? following : []);
      setLoading(false);
    });
  }, [clerkUser]);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    loadData();
  }, [isLoaded, clerkUser, loadData]);

  // Mark notifications read when drawer opens
  const prevOpen = useRef(false);
  useEffect(() => {
    if (activityOpen && !prevOpen.current && unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    }
    prevOpen.current = activityOpen;
  }, [activityOpen, unreadCount]);

  const pendingOfferCount =
    sellerOffers.filter(o => o.status === 'pending').length +
    buyerOffers.filter(o => o.status === 'accepted' || o.status === 'countered').length;
  const activityBadge = pendingOfferCount + unreadCount;
  const unreadDMs = conversations.filter(c => c.unread).length;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* Activity drawer */}
      <ActivityDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        sellerOffers={sellerOffers}
        buyerOffers={buyerOffers}
        notifications={notifications}
        onOfferActioned={() => { loadData(); setActivityOpen(false); }}
      />

      {/* Header */}
      <div className="bg-[#0A0A0A] pt-14 pb-4 px-5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-black text-2xl">Inbox</h1>
        <div className="flex items-center gap-2">
          {/* Activity bell */}
          <button
            onClick={() => setActivityOpen(v => !v)}
            className="relative w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell size={17} className="text-white" />
            {activityBadge > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E63946] text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {activityBadge > 9 ? '9+' : activityBadge}
              </span>
            )}
          </button>
          {/* Search */}
          <Link
            href="/search?people=1"
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <Search size={17} className="text-white" />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── Friends stories row ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-[#F0F0F0]">
          <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-none">
            {/* Add friends */}
            <Link href="/search?people=1" className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#F5F4F0] border-2 border-dashed border-[#EBEBEB] flex items-center justify-center">
                <UserPlus size={18} className="text-[#AAAAAA]" />
              </div>
              <span className="text-[10px] text-[#AAAAAA] font-semibold w-14 text-center truncate">Add</span>
            </Link>

            {/* Following */}
            {friends.map(f => (
              <Link key={f.id} href={`/user/${f.id}`} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-[#0A0A0A] overflow-hidden flex items-center justify-center text-white font-black text-xl border-2 border-[#E63946]">
                  {f.avatar
                    ? <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                    : <span>{(f.name || '?')[0].toUpperCase()}</span>}
                </div>
                <span className="text-[10px] text-[#0A0A0A] font-semibold w-14 text-center truncate">{f.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Activity tap row (always visible, opens drawer) ────────────── */}
        <button
          onClick={() => setActivityOpen(v => !v)}
          className="w-full flex items-center gap-3 bg-white border-b border-[#F0F0F0] px-4 py-3.5 active:bg-[#F5F4F0] transition-colors"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E63946, #FF8C00)' }}>
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-[#0A0A0A] text-sm">Activity</p>
            <p className="text-[#AAAAAA] text-xs mt-0.5">
              {activityBadge > 0
                ? `${activityBadge} update${activityBadge === 1 ? '' : 's'}`
                : 'All caught up'}
            </p>
          </div>
          {activityBadge > 0 && (
            <span className="bg-[#E63946] text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {activityBadge}
            </span>
          )}
          <ChevronRight size={16} className="text-[#EBEBEB] flex-shrink-0" />
        </button>

        {/* ── Conversations ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-8">
            <MessageSquare size={40} className="text-[#EBEBEB] mx-auto mb-3" />
            <p className="text-[#0A0A0A] font-black text-base mb-1">No messages yet</p>
            <p className="text-[#AAAAAA] text-sm">When someone makes an offer or messages you, it&apos;ll show up here</p>
            <Link href="/feed" className="inline-block mt-5 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full font-semibold text-sm">
              Browse Feed
            </Link>
          </div>
        ) : (
          <div className="bg-white">
            {conversations.map((c, idx) => (
              <Link
                key={c.otherUserId}
                href={`/messages/dm/${c.otherUserId}`}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F4F0] transition-colors ${
                  idx < conversations.length - 1 ? 'border-b border-[#F5F4F0]' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white font-black text-lg overflow-hidden">
                    {c.otherUserAvatar
                      ? <img src={c.otherUserAvatar} alt="" className="w-full h-full object-cover" />
                      : c.otherUserName[0]?.toUpperCase()}
                  </div>
                  {c.unread && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#E63946] rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <p className={`text-sm truncate ${c.unread ? 'font-black text-[#0A0A0A]' : 'font-semibold text-[#0A0A0A]'}`}>
                      {c.otherUserName}
                    </p>
                    <span className="text-xs text-[#AAAAAA] flex-shrink-0 ml-2">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  {c.itemTitle && (
                    <p className="text-[10px] text-[#E63946] font-semibold truncate mb-0.5">{c.itemTitle}</p>
                  )}
                  <p className={`text-xs truncate ${c.unread ? 'text-[#0A0A0A] font-semibold' : 'text-[#AAAAAA]'}`}>
                    {c.lastMessage}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
