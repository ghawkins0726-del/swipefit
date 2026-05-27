'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Users, Search, ChevronRight, ChevronDown, ChevronUp,
  Bell, Check, X, DollarSign, ShoppingCart, Tag,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
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

/* ─── Activity box ──────────────────────────────────────────────────────────── */

function ActivityBox({
  sellerOffers,
  buyerOffers,
  notifications,
  unreadCount,
  onOfferActioned,
}: {
  sellerOffers: OfferWithItem[];
  buyerOffers: OfferWithItem[];
  notifications: NotificationRow[];
  unreadCount: number;
  onOfferActioned: () => void;
}) {
  const pendingSellerOffers = sellerOffers.filter(o => o.status === 'pending');
  const actionableBuyerOffers = buyerOffers.filter(
    o => o.status === 'accepted' || o.status === 'countered',
  );

  const totalPending = pendingSellerOffers.length + actionableBuyerOffers.length;
  const totalBadge = totalPending + unreadCount;

  // Auto-expand when there are urgent actions
  const [expanded, setExpanded] = useState(totalPending > 0);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterInput, setCounterInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  if (totalBadge === 0) return null;

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
        body: JSON.stringify({
          itemId: offer.itemId,
          sellerId: offer.sellerId,
          amount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="mb-3">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 bg-[#0A0A0A] rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
      >
        <div className="w-8 h-8 bg-[#E63946]/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell size={14} className="text-[#E63946]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-black text-sm">Activity</p>
          <p className="text-white/40 text-xs">
            {totalPending > 0
              ? `${totalPending} action${totalPending === 1 ? '' : 's'} needed`
              : `${unreadCount} unread`}
          </p>
        </div>
        {totalBadge > 0 && (
          <span className="bg-[#E63946] text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {totalBadge}
          </span>
        )}
        {expanded ? (
          <ChevronUp size={16} className="text-white/40 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">

          {/* ── Pending offers (seller must respond) ─────────────────────── */}
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
                    {/* Item thumbnail */}
                    {offer.item?.images?.[0] && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                        <img
                          src={offer.item.images[0]}
                          alt={offer.item.title}
                          className="w-full h-full object-cover"
                        />
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

                  {/* Counter-offer input (inline) */}
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
                      {/* Accept */}
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => respondToOffer(offer.id, 'accepted')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#E63946] text-white text-xs font-black py-2 rounded-xl disabled:opacity-50"
                      >
                        <Check size={12} />
                        Accept ${offer.amount}
                      </button>
                      {/* Counter */}
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => {
                          setCounterOfferId(offer.id);
                          setCounterInput(String(offer.amount));
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5F4F0] text-[#0A0A0A] text-xs font-black py-2 rounded-xl disabled:opacity-50"
                      >
                        <Tag size={12} />
                        Counter
                      </button>
                      {/* Decline */}
                      <button
                        disabled={actingOn === offer.id}
                        onClick={() => respondToOffer(offer.id, 'declined')}
                        className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl flex-shrink-0 disabled:opacity-50"
                        title="Decline"
                      >
                        <X size={14} className="text-[#AAAAAA]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Buyer's actionable offer updates ─────────────────────────── */}
          {actionableBuyerOffers.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest">
                  Your offers
                </p>
              </div>
              {actionableBuyerOffers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className={`px-4 py-3 ${idx < actionableBuyerOffers.length - 1 ? 'border-b border-[#F5F4F0]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {offer.item?.images?.[0] && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                        <img src={offer.item.images[0]} alt={offer.item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{offer.item?.title ?? 'Item'}</p>
                      {offer.status === 'accepted' && (
                        <p className="text-green-600 text-xs font-bold mt-0.5">✓ Accepted at ${offer.amount}</p>
                      )}
                      {offer.status === 'countered' && (
                        <p className="text-[#E63946] text-xs font-bold mt-0.5">
                          Counter: ${offer.counterAmount} <span className="text-[#AAAAAA] font-normal">(you offered ${offer.amount})</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
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
                        <button
                          className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl flex-shrink-0"
                          title="Pass on counter offer"
                          onClick={async () => {
                            // Buyer declining a counter = no further action needed
                            // We just dismiss it (could optionally mark declined from buyer side)
                          }}
                        >
                          <X size={14} className="text-[#AAAAAA]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Recent notifications ─────────────────────────────────────── */}
          {notifications.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest">
                  Recent
                </p>
              </div>
              {notifications.slice(0, 5).map((n, idx) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    idx < Math.min(notifications.length, 5) - 1 ? 'border-b border-[#F5F4F0]' : ''
                  } ${!n.read ? 'bg-red-50/50' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    !n.read ? 'bg-[#E63946]' : 'bg-[#EBEBEB]'
                  }`} />
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
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */

export default function MessagesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [tab, setTab] = useState<'friends' | 'inbox'>('friends');

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Inbox
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  // Activity
  const [sellerOffers, setSellerOffers] = useState<OfferWithItem[]>([]);
  const [buyerOffers, setBuyerOffers] = useState<OfferWithItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadInboxData = useCallback(() => {
    if (!clerkUser) return;
    Promise.all([
      fetch('/api/messages?list=true').then(r => r.json()).catch(() => []),
      fetch('/api/offers?role=seller').then(r => r.json()).catch(() => []),
      fetch('/api/offers?role=buyer').then(r => r.json()).catch(() => []),
      fetch('/api/notifications').then(r => r.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
    ]).then(([convos, sOffers, bOffers, notifData]) => {
      setConversations(Array.isArray(convos) ? convos : []);
      setSellerOffers(Array.isArray(sOffers) ? sOffers : []);
      setBuyerOffers(Array.isArray(bOffers) ? bOffers : []);
      setNotifications(Array.isArray(notifData.notifications) ? notifData.notifications : []);
      setUnreadCount(notifData.unreadCount ?? 0);
      setInboxLoading(false);
    });
  }, [clerkUser]);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    // Friends list = people I follow
    fetch(`/api/users/${clerkUser.id}/following`)
      .then(r => r.json())
      .then(d => { setFriends(Array.isArray(d) ? d : []); setFriendsLoading(false); })
      .catch(() => setFriendsLoading(false));

    loadInboxData();
  }, [isLoaded, clerkUser, loadInboxData]);

  // Mark notifications read when inbox tab opens
  useEffect(() => {
    if (tab === 'inbox' && unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    }
  }, [tab, unreadCount]);

  const pendingOfferCount = sellerOffers.filter(o => o.status === 'pending').length;
  const actionableBuyerCount = buyerOffers.filter(o => o.status === 'accepted' || o.status === 'countered').length;
  const inboxBadge = conversations.filter(c => c.unread).length + pendingOfferCount + actionableBuyerCount;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* Header */}
      <div className="bg-[#0A0A0A] pt-12 pb-5 px-5">
        <Logo size={26} href="/feed" className="text-white mb-3" />
        <h1 className="text-white font-black text-2xl">Messages</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {tab === 'friends'
            ? `${friends.length} friend${friends.length === 1 ? '' : 's'}`
            : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
        </p>

        {/* Tab pills */}
        <div className="flex gap-1 bg-white/8 rounded-2xl p-1 mt-4">
          {([
            { id: 'friends', label: 'Friends', icon: Users,        badge: 0 },
            { id: 'inbox',   label: 'Inbox',   icon: MessageSquare, badge: inboxBadge },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                tab === t.id
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-white/40'
              }`}>
              <t.icon size={12} />
              {t.label}
              {t.badge > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  tab === t.id ? 'bg-[#E63946] text-white' : 'bg-[#E63946]/80 text-white'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24">

        {/* ── Friends tab ──────────────────────────────────────────────── */}
        {tab === 'friends' && (
          <>
            <Link href="/search?people=1"
              className="flex items-center gap-3 bg-[#0A0A0A] rounded-2xl px-4 py-3.5 mb-3 active:scale-[0.98] transition-transform">
              <div className="w-9 h-9 bg-[#E63946]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Search size={16} className="text-[#E63946]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm">Find friends</p>
                <p className="text-white/40 text-xs mt-0.5">Search for people to follow</p>
              </div>
              <ChevronRight size={16} className="text-white/30" />
            </Link>

            {friendsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users size={36} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#0A0A0A] font-black text-base mb-1">No friends yet</p>
                <p className="text-[#AAAAAA] text-sm">Tap &ldquo;Find friends&rdquo; above to discover people</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <Link key={f.id} href={`/user/${f.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 active:scale-[0.98] transition-transform shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      {f.avatar
                        ? <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                        : <span>{f.name[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{f.name}</p>
                      {f.bio
                        ? <p className="text-[#AAAAAA] text-xs truncate mt-0.5">{f.bio}</p>
                        : <p className="text-[#AAAAAA] text-xs mt-0.5">{f.totalListings} listing{f.totalListings === 1 ? '' : 's'}</p>}
                    </div>
                    <ChevronRight size={16} className="text-[#EBEBEB] flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Inbox tab ────────────────────────────────────────────────── */}
        {tab === 'inbox' && (
          <>
            {inboxLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Activity box (offers + notifications) */}
                <ActivityBox
                  sellerOffers={sellerOffers}
                  buyerOffers={buyerOffers}
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onOfferActioned={loadInboxData}
                />

                {/* Conversations */}
                {conversations.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare size={40} className="text-[#EBEBEB] mx-auto mb-3" />
                    <p className="text-[#0A0A0A] font-semibold text-base mb-1">No messages yet</p>
                    <p className="text-[#AAAAAA] text-sm">Message sellers about items you love</p>
                    <Link href="/feed" className="inline-block mt-5 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full font-semibold text-sm">
                      Browse Feed
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map(c => (
                      <div
                        key={`${c.itemId}-${c.otherUserId}`}
                        className={`flex items-center rounded-2xl overflow-hidden transition-shadow ${
                          c.unread ? 'bg-red-50 border border-red-100' : 'bg-white shadow-sm'
                        }`}
                      >
                        {/* Left: avatar → profile */}
                        <Link
                          href={`/user/${c.otherUserId}`}
                          className="flex-shrink-0 p-4 pr-0"
                          aria-label={`View ${c.otherUserName}'s profile`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] flex items-center justify-center text-white font-black text-lg select-none">
                            {c.otherUserName[0]?.toUpperCase()}
                          </div>
                        </Link>

                        {/* Right: message info → conversation */}
                        <Link
                          href={`/messages/${c.itemId}/${c.otherUserId}`}
                          className="flex-1 min-w-0 flex items-center gap-2 px-4 py-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-0.5">
                              <p className={`text-sm truncate ${c.unread ? 'font-black text-[#0A0A0A]' : 'font-bold text-[#0A0A0A]'}`}>
                                {c.otherUserName}
                              </p>
                              <span className="text-xs text-[#AAAAAA] flex-shrink-0 ml-2">{timeAgo(c.lastMessageAt)}</span>
                            </div>
                            <p className="text-xs text-[#E63946] font-semibold truncate mb-0.5">{c.itemTitle}</p>
                            <p className={`text-xs truncate ${c.unread ? 'text-[#0A0A0A] font-semibold' : 'text-[#AAAAAA]'}`}>
                              {c.lastMessage}
                            </p>
                          </div>
                          {c.unread && <div className="w-2.5 h-2.5 bg-[#E63946] rounded-full flex-shrink-0" />}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
}
