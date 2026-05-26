'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Heart, Share2, Zap, ShoppingBag, MessageSquare,
  ChevronLeft, ChevronRight, Shield, Truck, X, Check,
  Tag, Ruler, Palette, Calendar, Star, Package2
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Item } from '@/lib/types';

const CONDITION_LABELS: Record<string, string> = {
  new: 'New with tags',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

const CONDITION_DOT: Record<string, string> = {
  new: 'bg-emerald-500',
  like_new: 'bg-blue-500',
  good: 'bg-yellow-500',
  fair: 'bg-orange-500',
};

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const myId = clerkUser?.id ?? '';

  const [item, setItem] = useState<Item | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Offer sheet
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerState, setOfferState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Buy sheet
  const [showBuy, setShowBuy] = useState(false);
  const [buyState, setBuyState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [buyError, setBuyError] = useState('');

  // Share toast
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${id}`).then(r => r.json()).then((d: Item) => {
      setItem(d);
      setLikeCount(d.likes);
    });
  }, [id]);

  const handleLike = useCallback(async () => {
    if (!item || !myId) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, action: next ? 'like' : 'dislike' }),
    });
  }, [item, liked, myId]);

  const handleSuperLike = useCallback(async () => {
    if (!item || !myId) return;
    if (!liked) { setLiked(true); setLikeCount(c => c + 1); }
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, action: 'superlike' }),
    });
  }, [item, liked, myId]);

  const sendOffer = async () => {
    if (!item || !offerAmount) return;
    setOfferState('sending');
    await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, amount: offerAmount, message: offerNote }),
    });
    setOfferState('sent');
    setTimeout(() => { setShowOffer(false); setOfferState('idle'); setOfferAmount(''); setOfferNote(''); }, 1800);
  };

  const handleBuy = async () => {
    if (!item || !myId) return;
    setBuyState('loading');
    setBuyError('');
    const res = await fetch('/api/stripe/item-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, sellerId: item.sellerId, amount: item.price }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // hand off to Stripe checkout
    } else {
      setBuyState('idle');
      if (data.code === 'seller_not_onboarded') {
        setBuyError("This seller hasn't set up payouts yet. We can't process payment until they do.");
      } else {
        setBuyError(data.error || 'Something went wrong. Try again.');
      }
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, text: `${item?.title} — $${item?.price} on SwipeFit`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!item || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F4F0]">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isMine = myId === item.sellerId;
  const isSold = item.sold;
  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : null;
  const daysAgo = Math.floor((Date.now() - item.createdAt) / 86400000);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* ── Image Gallery ── */}
      <div className="relative bg-[#0A0A0A] select-none" style={{ paddingBottom: '112%' }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={imgIndex}
            src={item.images[imgIndex]}
            alt={item.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
        </AnimatePresence>

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-white text-[#0A0A0A] font-black text-2xl tracking-widest uppercase px-8 py-3 rotate-[-8deg]">
              SOLD
            </div>
          </div>
        )}

        {/* Gradient scrim for top bar */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <button onClick={share}
            className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
            <Share2 size={16} className="text-white" />
          </button>
        </div>

        {/* Image navigation */}
        {item.images.length > 1 && (
          <>
            <button onClick={() => setImgIndex(i => Math.max(0, i - 1))}
              disabled={imgIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center disabled:opacity-20 border border-white/10">
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button onClick={() => setImgIndex(i => Math.min(item.images.length - 1, i + 1))}
              disabled={imgIndex === item.images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center disabled:opacity-20 border border-white/10">
              <ChevronRight size={16} className="text-white" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {item.images.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`} />
              ))}
            </div>
          </>
        )}

        {/* Thumbnail strip (if 3+ images) */}
        {item.images.length >= 3 && (
          <div className="absolute bottom-0 right-3 flex flex-col gap-1.5 pb-3">
            {item.images.map((url, i) => (
              <button key={i} onClick={() => setImgIndex(i)}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-white' : 'border-transparent opacity-60'}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Copied toast */}
        <AnimatePresence>
          {copied && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#0A0A0A] text-white text-xs font-bold px-4 py-2 rounded-full">
              Link copied!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 pb-36 px-5 pt-5 space-y-5">

        {/* Title + price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-[#0A0A0A] leading-tight">{item.title}</h1>
            <p className="text-[#AAAAAA] text-sm mt-0.5 font-medium">{item.brand}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-[#0A0A0A]">${item.price}</div>
            {item.originalPrice && (
              <div className="text-sm text-[#AAAAAA] line-through">${item.originalPrice}</div>
            )}
            {discount && (
              <div className="text-xs text-[#E63946] font-black bg-red-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                -{discount}%
              </div>
            )}
          </div>
        </div>

        {/* Condition + styles */}
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold bg-[#0A0A0A] text-white px-3 py-1.5 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_DOT[item.condition]}`} />
            {CONDITION_LABELS[item.condition]}
          </span>
          {item.styles.map(s => (
            <span key={s} className="text-xs text-[#5A5A5A] bg-white border border-[#EBEBEB] px-3 py-1.5 rounded-full font-semibold capitalize">{s}</span>
          ))}
        </div>

        {/* Quick details */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Ruler size={13} />, label: 'Size', value: item.size || '—' },
            { icon: <Tag size={13} />, label: 'Category', value: item.category },
            { icon: <Palette size={13} />, label: 'Colors', value: item.colors.join(', ') || '—' },
            { icon: <Calendar size={13} />, label: 'Listed', value: daysAgo === 0 ? 'Today' : `${daysAgo}d ago` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-3.5 flex items-start gap-2.5">
              <span className="text-[#AAAAAA] mt-0.5">{icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider font-bold">{label}</p>
                <p className="text-sm font-bold text-[#0A0A0A] capitalize truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {item.description && (
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#0A0A0A] mb-2">About this piece</h2>
            <p className="text-[#5A5A5A] text-sm leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Seller */}
        <div className="bg-white rounded-2xl p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#0A0A0A] mb-3">Seller</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#0A0A0A] rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0">
                {item.sellerName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-black text-[#0A0A0A] text-sm">{item.sellerName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={9} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#AAAAAA] font-semibold">Trusted seller</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-[#AAAAAA] bg-[#F5F4F0] rounded-xl px-2.5 py-1.5">
                <Heart size={11} className="text-[#E63946]" />
                <span className="font-bold">{likeCount}</span>
              </div>
              {!isMine && (
                <Link href={`/messages/${item.id}/${item.sellerId}`}
                  className="bg-[#0A0A0A] text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  Message
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield size={14} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-black text-[#0A0A0A]">Buyer Protection</p>
              <p className="text-[10px] text-[#AAAAAA]">Full refund if item not as described</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-black text-[#0A0A0A]">Fast Shipping</p>
              <p className="text-[10px] text-[#AAAAAA]">Most items ship within 2 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBEBEB] px-4 py-3 pb-safe">
        {isSold ? (
          <div className="flex items-center justify-center gap-2 bg-[#F5F4F0] rounded-2xl py-4">
            <Package2 size={18} className="text-[#AAAAAA]" />
            <span className="font-black text-[#AAAAAA] text-sm uppercase tracking-widest">Sold</span>
          </div>
        ) : isMine ? (
          <div className="flex items-center justify-center gap-2 bg-[#F5F4F0] rounded-2xl py-4">
            <span className="font-bold text-[#AAAAAA] text-sm">This is your listing</span>
          </div>
        ) : (
          <div className="flex gap-2.5">
            {/* Like */}
            <button onClick={handleLike}
              className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                liked ? 'border-[#E63946] bg-red-50' : 'border-[#EBEBEB] bg-white'
              }`}>
              <Heart size={19} className={liked ? 'text-[#E63946] fill-[#E63946]' : 'text-[#AAAAAA]'} />
            </button>

            {/* Super like */}
            <button onClick={handleSuperLike}
              className="w-12 h-12 rounded-2xl border-2 border-[#EBEBEB] bg-white flex items-center justify-center hover:border-blue-300 transition-colors">
              <Zap size={19} className="text-blue-400" />
            </button>

            {/* Make Offer */}
            <button onClick={() => setShowOffer(true)}
              className="flex-1 bg-white border-2 border-[#0A0A0A] text-[#0A0A0A] font-black rounded-2xl flex items-center justify-center gap-1.5 text-sm hover:bg-[#F5F4F0] transition-colors">
              Make Offer
            </button>

            {/* Buy Now */}
            <button onClick={() => setShowBuy(true)}
              className="flex-1 bg-[#E63946] text-white font-black rounded-2xl flex items-center justify-center gap-1.5 text-sm shadow-lg shadow-[#E63946]/30 active:scale-95 transition-transform">
              <ShoppingBag size={16} />
              Buy ${item.price}
            </button>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-12 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10">
              <X size={20} className="text-white" />
            </button>
            <motion.img
              src={item.images[imgIndex]}
              alt={item.title}
              initial={{ scale: 0.92 }} animate={{ scale: 1 }}
              className="w-full max-h-screen object-contain"
              onClick={e => e.stopPropagation()}
            />
            {item.images.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
                {item.images.map((url, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-white' : 'border-transparent opacity-50'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Offer Sheet ── */}
      <AnimatePresence>
        {showOffer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setShowOffer(false); }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10"
            >
              {offerState === 'sent' ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h3 className="font-black text-xl text-[#0A0A0A]">Offer sent!</h3>
                  <p className="text-[#AAAAAA] text-sm mt-1">The seller will respond soon.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-black text-xl text-[#0A0A0A]">Make an offer</h3>
                      <p className="text-sm text-[#AAAAAA] mt-0.5">Listed at <span className="font-black text-[#0A0A0A]">${item.price}</span></p>
                    </div>
                    <button onClick={() => setShowOffer(false)} className="w-9 h-9 bg-[#F5F4F0] rounded-xl flex items-center justify-center">
                      <X size={16} className="text-[#5A5A5A]" />
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A0A0A] font-black text-lg">$</span>
                    <input
                      type="number"
                      placeholder="Your offer"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      className="w-full border-2 border-[#EBEBEB] focus:border-[#0A0A0A] rounded-2xl pl-9 pr-4 py-4 text-2xl font-black text-[#0A0A0A] focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>

                  {offerAmount && item.price && (
                    <p className={`text-xs font-bold mb-3 ${
                      parseFloat(offerAmount) >= item.price * 0.85
                        ? 'text-green-600' : parseFloat(offerAmount) >= item.price * 0.70
                        ? 'text-yellow-600' : 'text-[#E63946]'
                    }`}>
                      {parseFloat(offerAmount) >= item.price
                        ? '✓ Full price — likely to be accepted'
                        : parseFloat(offerAmount) >= item.price * 0.85
                        ? '✓ Strong offer — seller will probably accept'
                        : parseFloat(offerAmount) >= item.price * 0.70
                        ? '↗ Fair offer — seller may counter'
                        : '↓ Low offer — seller may decline'}
                    </p>
                  )}

                  <textarea
                    placeholder="Add a note to the seller (optional)"
                    value={offerNote}
                    onChange={e => setOfferNote(e.target.value)}
                    rows={2}
                    className="w-full border-2 border-[#EBEBEB] focus:border-[#0A0A0A] rounded-2xl px-4 py-3 text-sm text-[#0A0A0A] focus:outline-none resize-none mb-4 transition-colors"
                  />

                  <button
                    onClick={sendOffer}
                    disabled={!offerAmount || offerState === 'sending'}
                    className="w-full bg-[#0A0A0A] text-white font-black py-4 rounded-2xl disabled:opacity-40 active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                    {offerState === 'sending' ? 'Sending…' : 'Send Offer'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buy Confirmation Sheet ── */}
      <AnimatePresence>
        {showBuy && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget && buyState === 'idle') setShowBuy(false); }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10"
            >
              {buyState === 'done' ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h3 className="font-black text-xl text-[#0A0A0A]">Order placed!</h3>
                  <p className="text-[#AAAAAA] text-sm mt-1">Taking you to your order…</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-xl text-[#0A0A0A]">Confirm purchase</h3>
                    {buyState === 'idle' && (
                      <button onClick={() => setShowBuy(false)} className="w-9 h-9 bg-[#F5F4F0] rounded-xl flex items-center justify-center">
                        <X size={16} className="text-[#5A5A5A]" />
                      </button>
                    )}
                  </div>

                  {/* Item preview */}
                  <div className="flex items-center gap-4 bg-[#F5F4F0] rounded-2xl p-4 mb-5">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0A0A0A] text-sm truncate">{item.title}</p>
                      <p className="text-[#AAAAAA] text-xs">{item.brand} · Size {item.size}</p>
                      <p className="text-xs text-[#AAAAAA] mt-0.5">{CONDITION_LABELS[item.condition]}</p>
                    </div>
                    <p className="font-black text-[#0A0A0A] text-xl flex-shrink-0">${item.price}</p>
                  </div>

                  {/* Order summary */}
                  <div className="space-y-2.5 mb-5">
                    {[
                      { label: 'Item price', value: `$${item.price}` },
                      { label: 'Buyer protection', value: 'Included' },
                      { label: 'Shipping', value: 'Seller arranges' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-sm text-[#AAAAAA]">{label}</span>
                        <span className="text-sm font-bold text-[#0A0A0A]">{value}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#EBEBEB] pt-2.5 flex items-center justify-between">
                      <span className="font-black text-[#0A0A0A]">Total</span>
                      <span className="font-black text-[#0A0A0A] text-xl">${item.price}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#AAAAAA] text-center mb-4 leading-relaxed">
                    By placing this order you agree to pay the seller directly. SwipeFit buyer protection covers items significantly not as described.
                  </p>

                  {buyError && (
                    <div className="bg-[#FF2E47]/10 border border-[#FF2E47]/30 rounded-xl px-3 py-2.5 mb-3">
                      <p className="text-[#FF2E47] text-xs font-semibold leading-snug">{buyError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleBuy}
                    disabled={buyState === 'loading'}
                    className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl disabled:opacity-60 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg shadow-[#E63946]/30"
                  >
                    {buyState === 'loading' ? 'Placing order…' : `Confirm — $${item.price}`}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
