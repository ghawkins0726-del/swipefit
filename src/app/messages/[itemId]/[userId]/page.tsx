'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package2, Check, X, Tag, DollarSign, ShoppingCart } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import MessageThread from '@/components/MessageThread';
import MessageInput from '@/components/MessageInput';
import { Offer } from '@/lib/db-types';
import { Item } from '@/lib/types';

type OfferWithItem = Offer & { item: Item | null };

export default function ConversationPage() {
  const { itemId, userId: otherUserId } = useParams<{ itemId: string; userId: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();

  const [otherName, setOtherName] = useState('');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [replyTo, setReplyTo] = useState<import('@/lib/db-types').Message | null>(null);

  // Offer state
  const [pendingOffer, setPendingOffer] = useState<OfferWithItem | null>(null);
  const [offerActing, setOfferActing] = useState(false);
  const [counterMode, setCounterMode] = useState(false);
  const [counterInput, setCounterInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const myId = clerkUser?.id ?? '';
  const myName = clerkUser?.username
    || `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
    || 'Me';

  useEffect(() => {
    if (!otherUserId || !itemId || !myId) return;

    Promise.all([
      fetch(`/api/users/${otherUserId}`).then(r => r.json()),
      fetch(`/api/items/${itemId}`).then(r => r.json()),
      // Fetch offers relevant to this conversation
      fetch(`/api/offers?role=seller`).then(r => r.json()).catch(() => []),
      fetch(`/api/offers?role=buyer`).then(r => r.json()).catch(() => []),
    ]).then(([otherProfile, item, sellerOffers, buyerOffers]) => {
      setOtherName(otherProfile?.name ?? 'Seller');
      setOtherAvatar(otherProfile?.avatar ?? null);
      setItemTitle(item?.title ?? '');

      // Find a pending offer for this specific item+conversation
      const allOffers: OfferWithItem[] = [
        ...(Array.isArray(sellerOffers) ? sellerOffers : []),
        ...(Array.isArray(buyerOffers) ? buyerOffers : []),
      ];

      const relevant = allOffers.find(
        o => o.itemId === itemId &&
          (
            // I'm the seller and the buyer is otherUserId
            (o.sellerId === myId && o.buyerId === otherUserId) ||
            // I'm the buyer and the seller is otherUserId
            (o.buyerId === myId && o.sellerId === otherUserId)
          ) &&
          (o.status === 'pending' || o.status === 'accepted' || o.status === 'countered'),
      ) ?? null;

      setPendingOffer(relevant);
    });
  }, [itemId, otherUserId, myId]);

  const isSeller = pendingOffer?.sellerId === myId;
  const isBuyer = pendingOffer?.buyerId === myId;

  async function respondToOffer(status: 'accepted' | 'declined' | 'countered', counterAmount?: number) {
    if (!pendingOffer) return;
    setOfferActing(true);
    try {
      await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: pendingOffer.id, status, counterAmount }),
      });
      setPendingOffer(o => o ? { ...o, status, counterAmount: counterAmount ?? o.counterAmount } : o);
      setCounterMode(false);
    } finally {
      setOfferActing(false);
    }
  }

  async function startCheckout(amount: number) {
    if (!pendingOffer) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/item-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: pendingOffer.itemId,
          sellerId: pendingOffer.sellerId,
          amount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!isLoaded || !myId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Offer banner content ──────────────────────────────────────────────── */
  const renderOfferBanner = () => {
    if (!pendingOffer) return null;

    // Offer already actioned — show result pill, not full banner
    if (pendingOffer.status === 'declined') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-[#F5F4F0] rounded-2xl px-4 py-3 flex items-center gap-2">
          <X size={14} className="text-[#AAAAAA] flex-shrink-0" />
          <p className="text-xs text-[#AAAAAA] font-semibold">Offer declined</p>
        </div>
      );
    }

    // Seller sees pending offer → can Accept / Counter / Decline
    if (isSeller && pendingOffer.status === 'pending') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-[#0A0A0A]">Offer received</p>
              <span className="text-xs font-black text-[#E63946]">${pendingOffer.amount}</span>
            </div>
            {pendingOffer.message && (
              <p className="text-xs text-[#AAAAAA] italic mt-0.5 truncate">&ldquo;{pendingOffer.message}&rdquo;</p>
            )}
          </div>

          {counterMode ? (
            <div className="px-4 pb-3 flex items-center gap-2">
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
                disabled={!counterInput || offerActing}
                onClick={() => respondToOffer('countered', parseFloat(counterInput))}
                className="bg-[#0A0A0A] text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-40"
              >
                Send
              </button>
              <button
                onClick={() => { setCounterMode(false); setCounterInput(''); }}
                className="w-8 h-8 bg-[#F5F4F0] rounded-xl flex items-center justify-center"
              >
                <X size={13} className="text-[#AAAAAA]" />
              </button>
            </div>
          ) : (
            <div className="px-4 pb-3 flex gap-2">
              <button
                disabled={offerActing}
                onClick={() => respondToOffer('accepted')}
                className="flex-1 flex items-center justify-center gap-1 bg-[#E63946] text-white text-xs font-black py-2 rounded-xl disabled:opacity-50"
              >
                <Check size={12} /> Accept
              </button>
              <button
                disabled={offerActing}
                onClick={() => {
                  setCounterInput(String(pendingOffer.amount));
                  setCounterMode(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 bg-[#F5F4F0] text-[#0A0A0A] text-xs font-black py-2 rounded-xl disabled:opacity-50"
              >
                <Tag size={12} /> Counter
              </button>
              <button
                disabled={offerActing}
                onClick={() => respondToOffer('declined')}
                className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl flex-shrink-0"
              >
                <X size={14} className="text-[#AAAAAA]" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // Seller already accepted / countered — show status
    if (isSeller && pendingOffer.status === 'accepted') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-2">
          <Check size={14} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 font-semibold">
            You accepted ${pendingOffer.amount} — waiting for buyer to pay
          </p>
        </div>
      );
    }

    if (isSeller && pendingOffer.status === 'countered') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-[#F5F4F0] rounded-2xl px-4 py-3 flex items-center gap-2">
          <Tag size={14} className="text-[#AAAAAA] flex-shrink-0" />
          <p className="text-xs text-[#0A0A0A] font-semibold">
            You countered at ${pendingOffer.counterAmount} — waiting for buyer
          </p>
        </div>
      );
    }

    // Buyer sees offer status
    if (isBuyer && pendingOffer.status === 'accepted') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-green-50 border border-green-100 rounded-2xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="text-xs font-black text-green-700">Offer accepted! 🎉</p>
            <span className="text-xs font-black text-green-600">${pendingOffer.amount}</span>
          </div>
          <div className="px-4 pb-3">
            <button
              disabled={checkoutLoading}
              onClick={() => startCheckout(pendingOffer.amount)}
              className="w-full flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-50"
            >
              <ShoppingCart size={12} />
              {checkoutLoading ? 'Loading…' : `Complete purchase · $${pendingOffer.amount}`}
            </button>
          </div>
        </div>
      );
    }

    if (isBuyer && pendingOffer.status === 'countered' && pendingOffer.counterAmount != null) {
      return (
        <div className="mx-4 mt-2 mb-1 bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-black text-[#0A0A0A]">Counter offer</p>
            <p className="text-xs text-[#AAAAAA] mt-0.5">
              You offered ${pendingOffer.amount} · Seller countered at{' '}
              <span className="text-[#E63946] font-bold">${pendingOffer.counterAmount}</span>
            </p>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button
              disabled={checkoutLoading}
              onClick={() => startCheckout(pendingOffer.counterAmount!)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#0A0A0A] text-white text-xs font-black py-2 rounded-xl disabled:opacity-50"
            >
              <Check size={12} />
              {checkoutLoading ? 'Loading…' : `Accept $${pendingOffer.counterAmount}`}
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center bg-[#F5F4F0] rounded-xl"
              title="Pass on counter offer"
            >
              <X size={14} className="text-[#AAAAAA]" />
            </button>
          </div>
        </div>
      );
    }

    if (isBuyer && pendingOffer.status === 'pending') {
      return (
        <div className="mx-4 mt-2 mb-1 bg-[#F5F4F0] rounded-2xl px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-[#E63946] rounded-full animate-pulse flex-shrink-0" />
          <p className="text-xs text-[#0A0A0A] font-semibold">
            Your offer of ${pendingOffer.amount} is pending
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F4F0]">

      {/* Header */}
      <div className="bg-[#0A0A0A] px-4 pt-12 pb-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Clickable avatar → other user's profile */}
        <Link href={`/user/${otherUserId}`}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black flex-shrink-0 active:opacity-70 transition-opacity"
          aria-label={`View ${otherName}'s profile`}
        >
          {(otherName || '?')[0].toUpperCase()}
        </Link>

        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base truncate">{otherName || '…'}</p>
          {itemTitle && (
            <p className="text-xs text-white/40 flex items-center gap-1 truncate">
              <Package2 size={10} />
              {itemTitle}
            </p>
          )}
        </div>
      </div>

      {/* Offer banner (between header and thread) */}
      {renderOfferBanner()}

      <MessageThread
        userId={myId}
        itemId={itemId}
        otherUserId={otherUserId}
        otherName={otherName}
        otherAvatar={otherAvatar}
        refreshSignal={refreshSignal}
        onReplySelect={setReplyTo}
      />

      <MessageInput
        itemId={itemId}
        receiverId={otherUserId}
        senderName={myName}
        onSent={() => { setRefreshSignal(s => s + 1); setReplyTo(null); }}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
