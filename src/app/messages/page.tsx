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
  id: string; title: string; body: string; read: boolean;
  createdAt: number; type: string; payload: string;
}

type FriendUser = UserProfile & { followedAt: number };

/* ── Activity Drawer ────────────────────────────────────────────────────────── */
function ActivityDrawer({
  open, onClose, sellerOffers, buyerOffers, notifications, onOfferActioned,
}: {
  open: boolean; onClose: () => void;
  sellerOffers: OfferWithItem[]; buyerOffers: OfferWithItem[];
  notifications: NotificationRow[]; onOfferActioned: () => void;
}) {
  const pendingSellerOffers = sellerOffers.filter(o => o.status === 'pending');
  const actionableBuyerOffers = buyerOffers.filter(o => o.status === 'accepted' || o.status === 'countered');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterInput, setCounterInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function respondToOffer(offerId: string, status: 'accepted' | 'declined' | 'countered', counterAmount?: number) {
    setActingOn(offerId);
    try {
      await fetch('/api/offers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId, status, counterAmount }) });
      onOfferActioned();
    } finally { setActingOn(null); setCounterOfferId(null); setCounterInput(''); }
  }

  async function startCheckout(offer: OfferWithItem, amount: number) {
    if (!offer.item) return;
    setCheckoutLoading(offer.id);
    try {
      const res = await fetch('/api/stripe/item-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: offer.itemId, sellerId: offer.sellerId, amount }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setCheckoutLoading(null); }
  }

  const hasAnything = pendingSellerOffers.length > 0 || actionableBuyerOffers.length > 0 || notifications.length > 0;

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : '-translate-y-full'}`} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.08)' }} className="pt-14 pb-3 px-4 flex items-center justify-between">
          <p className="text-white font-black text-lg">Activity</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-6 space-y-3 min-h-[120px]" style={{ background: '#111111' }}>
          {!hasAnything && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell size={28} className="mb-2" style={{ color: 'rgba(255,255,255,0.52)' }} />
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>You&apos;re all caught up</p>
            </div>
          )}

          {pendingSellerOffers.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.70)' }}>Offers to respond</p>
              </div>
              {pendingSellerOffers.map((offer, idx) => (
                <div key={offer.id} className={`px-4 py-3 ${idx < pendingSellerOffers.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-3">
                    {offer.item?.images?.[0] && <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"><img src={offer.item.images[0]} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{offer.item?.title ?? 'Item'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>Offered <span className="text-white font-bold">${offer.amount}</span>{offer.item?.price && <span> · listed ${offer.item.price}</span>}</p>
                      {offer.message && <p className="text-xs mt-0.5 italic truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>&ldquo;{offer.message}&rdquo;</p>}
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.88)' }}>{timeAgo(offer.createdAt)}</span>
                  </div>
                  {counterOfferId === offer.id ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 flex items-center rounded-xl px-3 py-2 gap-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <DollarSign size={13} style={{ color: 'rgba(255,255,255,0.88)' }} className="flex-shrink-0" />
                        <input type="number" value={counterInput} onChange={e => setCounterInput(e.target.value)} placeholder="Counter amount" className="flex-1 bg-transparent text-sm font-bold text-white outline-none w-0 min-w-0 placeholder:text-white/20" autoFocus />
                      </div>
                      <button disabled={!counterInput || actingOn === offer.id} onClick={() => respondToOffer(offer.id, 'countered', parseFloat(counterInput))} className="text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-40" style={{ background: '#E63946' }}>Send</button>
                      <button onClick={() => { setCounterOfferId(null); setCounterInput(''); }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}><X size={13} style={{ color: 'rgba(255,255,255,0.92)' }} /></button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button disabled={actingOn === offer.id} onClick={() => respondToOffer(offer.id, 'accepted')} className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2 rounded-xl disabled:opacity-50" style={{ background: '#E63946', boxShadow: '0 0 16px 4px rgba(230,57,70,0.35)' }}><Check size={12} /> Accept ${offer.amount}</button>
                      <button disabled={actingOn === offer.id} onClick={() => { setCounterOfferId(offer.id); setCounterInput(String(offer.amount)); }} className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2 rounded-xl disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.08)' }}><Tag size={12} /> Counter</button>
                      <button disabled={actingOn === offer.id} onClick={() => respondToOffer(offer.id, 'declined')} className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}><X size={14} style={{ color: 'rgba(255,255,255,0.92)' }} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {actionableBuyerOffers.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-4 pt-3 pb-1"><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.70)' }}>Your offers</p></div>
              {actionableBuyerOffers.map((offer, idx) => (
                <div key={offer.id} className={`px-4 py-3 ${idx < actionableBuyerOffers.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    {offer.item?.images?.[0] && <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"><img src={offer.item.images[0]} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{offer.item?.title ?? 'Item'}</p>
                      {offer.status === 'accepted' && <p className="text-xs font-bold mt-0.5" style={{ color: '#22c55e' }}>✓ Accepted at ${offer.amount}</p>}
                      {offer.status === 'countered' && <p className="text-xs font-bold mt-0.5" style={{ color: '#E63946' }}>Counter: ${offer.counterAmount} <span className="font-normal" style={{ color: 'rgba(255,255,255,0.70)' }}>(you offered ${offer.amount})</span></p>}
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {offer.status === 'accepted' && <button disabled={checkoutLoading === offer.id} onClick={() => startCheckout(offer, offer.amount)} className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-50" style={{ background: '#E63946', boxShadow: '0 0 16px 4px rgba(230,57,70,0.35)' }}><ShoppingCart size={12} />{checkoutLoading === offer.id ? 'Loading…' : `Pay $${offer.amount} →`}</button>}
                    {offer.status === 'countered' && offer.counterAmount != null && <>
                      <button disabled={checkoutLoading === offer.id} onClick={() => startCheckout(offer, offer.counterAmount!)} className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-50" style={{ background: '#E63946', boxShadow: '0 0 16px 4px rgba(230,57,70,0.35)' }}><Check size={12} />{checkoutLoading === offer.id ? 'Loading…' : `Accept $${offer.counterAmount}`}</button>
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}><X size={14} style={{ color: 'rgba(255,255,255,0.92)' }} /></button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {notifications.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-4 pt-3 pb-1"><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.70)' }}>Recent</p></div>
              {notifications.slice(0, 8).map((n, idx) => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${idx < Math.min(notifications.length, 8) - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.06)', background: !n.read ? 'rgba(230,57,70,0.06)' : 'transparent' }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: !n.read ? '#E63946' : 'rgba(255,255,255,0.15)', boxShadow: !n.read ? '0 0 8px 2px rgba(230,57,70,0.5)' : 'none' }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${!n.read ? 'font-bold text-white' : 'font-medium'}`} style={{ color: !n.read ? '#fff' : 'rgba(255,255,255,0.6)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>{n.body}</p>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.58)' }}>{timeAgo(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [activityOpen, setActivityOpen] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { if (!isLoaded || !clerkUser) return; loadData(); }, [isLoaded, clerkUser, loadData]);

  const prevOpen = useRef(false);
  useEffect(() => {
    if (activityOpen && !prevOpen.current && unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    }
    prevOpen.current = activityOpen;
  }, [activityOpen, unreadCount]);

  const pendingOfferCount = sellerOffers.filter(o => o.status === 'pending').length + buyerOffers.filter(o => o.status === 'accepted' || o.status === 'countered').length;
  const activityBadge = pendingOfferCount + unreadCount;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">

      {/* Ambient red glow top */}
      <div className="fixed top-0 left-0 right-0 h-80 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(230,57,70,0.12) 0%, transparent 70%)' }} />

      <ActivityDrawer
        open={activityOpen} onClose={() => setActivityOpen(false)}
        sellerOffers={sellerOffers} buyerOffers={buyerOffers}
        notifications={notifications}
        onOfferActioned={() => { loadData(); setActivityOpen(false); }}
      />

      {/* ── Header ── */}
      <div className="relative z-10 pt-14 pb-4 px-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-white font-black text-2xl">Inbox</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivityOpen(v => !v)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Bell size={17} className="text-white" />
            {activityBadge > 0 && (
              <span className="absolute -top-1 -right-1 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
                style={{ background: '#E63946', boxShadow: '0 0 8px 3px rgba(230,57,70,0.6)' }}>
                {activityBadge > 9 ? '9+' : activityBadge}
              </span>
            )}
          </button>
          <Link href="/search?people=1"
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={17} className="text-white" />
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto pb-24">

        {/* ── Friends row ── */}
        {friends.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-none">
              <Link href="/search?people=1" className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.15)' }}>
                  <UserPlus size={18} style={{ color: 'rgba(255,255,255,0.70)' }} />
                </div>
                <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>Add</span>
              </Link>
              {friends.map(f => (
                <Link key={f.id} href={`/user/${f.id}`} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-xl"
                    style={{ background: '#1a1a1a', border: '2px solid #E63946', boxShadow: '0 0 12px 3px rgba(230,57,70,0.35)' }}>
                    {f.avatar ? <img src={f.avatar} alt="" className="w-full h-full object-cover" /> : <span>{(f.name || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{f.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity row ── */}
        <button
          onClick={() => setActivityOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-4 active:opacity-80 transition-opacity"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E63946, #FF6B35)', boxShadow: '0 0 20px 6px rgba(230,57,70,0.4), 0 0 40px 12px rgba(230,57,70,0.15)' }}>
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-white text-sm">Activity</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
              {activityBadge > 0 ? `${activityBadge} update${activityBadge === 1 ? '' : 's'}` : 'All caught up'}
            </p>
          </div>
          {activityBadge > 0 && (
            <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center"
              style={{ background: '#E63946', boxShadow: '0 0 10px 3px rgba(230,57,70,0.5)' }}>
              {activityBadge}
            </span>
          )}
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.52)' }} className="flex-shrink-0" />
        </button>

        {/* ── Conversations ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 px-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <MessageSquare size={28} style={{ color: 'rgba(255,255,255,0.52)' }} />
            </div>
            <p className="text-white font-black text-base mb-1">No messages yet</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.70)' }}>When someone makes an offer or messages you, it&apos;ll show up here</p>
            <Link href="/feed" className="inline-block text-white px-6 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: '#E63946', boxShadow: '0 0 20px 6px rgba(230,57,70,0.35)' }}>
              Browse Feed
            </Link>
          </div>
        ) : (
          <div>
            {conversations.map((c, idx) => (
              <Link
                key={c.otherUserId}
                href={`/messages/dm/${c.otherUserId}`}
                className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
                style={{ borderBottom: idx < conversations.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: c.unread ? 'rgba(230,57,70,0.04)' : 'transparent' }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-lg"
                    style={{
                      background: '#1a1a1a',
                      border: c.unread ? '2px solid #E63946' : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: c.unread ? '0 0 14px 4px rgba(230,57,70,0.45)' : 'none',
                    }}>
                    {c.otherUserAvatar
                      ? <img src={c.otherUserAvatar} alt="" className="w-full h-full object-cover" />
                      : c.otherUserName[0]?.toUpperCase()}
                  </div>
                  {c.unread && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black"
                      style={{ background: '#E63946', boxShadow: '0 0 6px 2px rgba(230,57,70,0.7)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <p className={`text-sm truncate ${c.unread ? 'font-black text-white' : 'font-semibold'}`}
                      style={{ color: c.unread ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                      {c.otherUserName}
                    </p>
                    <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.88)' }}>{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  {c.itemTitle && (
                    <p className="text-[10px] font-semibold truncate mb-0.5" style={{ color: '#E63946' }}>{c.itemTitle}</p>
                  )}
                  <p className={`text-xs truncate`}
                    style={{ color: c.unread ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)', fontWeight: c.unread ? 500 : 400 }}>
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
