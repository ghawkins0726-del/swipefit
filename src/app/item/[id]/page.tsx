'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Heart, Share2, Zap, ShoppingBag, MessageCircle,
  ChevronLeft, ChevronRight, Star, Shield, Truck
} from 'lucide-react';
import { Item } from '@/lib/types';

const CONDITION_LABELS = { new: 'New with tags', like_new: 'Like new', good: 'Good', fair: 'Fair' };
const CONDITION_COLORS = { new: 'text-emerald-600 bg-emerald-50', like_new: 'text-blue-600 bg-blue-50', good: 'text-yellow-600 bg-yellow-50', fair: 'text-orange-600 bg-orange-50' };

function getUserId(): string {
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${id}`).then(r => r.json()).then(setItem);
  }, [id]);

  const handleLike = async () => {
    if (!item) return;
    const newLiked = !liked;
    setLiked(newLiked);
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: getUserId(), itemId: item.id, action: newLiked ? 'like' : 'dislike' }),
    });
    if (newLiked) setItem(i => i ? { ...i, likes: i.likes + 1 } : i);
    else setItem(i => i ? { ...i, likes: Math.max(0, i.likes - 1) } : i);
  };

  const handleSuperLike = async () => {
    if (!item) return;
    setLiked(true);
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: getUserId(), itemId: item.id, action: 'superlike' }),
    });
    setItem(i => i ? { ...i, likes: i.likes + 1 } : i);
  };

  const sendOffer = async () => {
    if (!item || !offerAmount) return;
    await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerId: getUserId(), itemId: item.id, amount: offerAmount, message: offerMessage }),
    });
    setOfferSent(true);
    setTimeout(() => { setShowOffer(false); setOfferSent(false); }, 2000);
  };

  const shareItem = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, text: `Check out ${item?.title} for $${item?.price} on SwipeFit`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShare(true);
      setTimeout(() => setShowShare(false), 2000);
    }
  };

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Image viewer */}
      <div className="relative bg-zinc-100" style={{ height: '55vw', maxHeight: 400, minHeight: 300 }}>
        <img
          src={item.images[imgIndex]}
          alt={item.title}
          className="w-full h-full object-cover"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <div className="flex gap-2">
            <button onClick={shareItem}
              className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
              <Share2 size={16} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Share toast */}
        <AnimatePresence>
          {showShare && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full">
              Link copied!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image dots */}
        {item.images.length > 1 && (
          <>
            <button onClick={() => setImgIndex(i => Math.max(0, i - 1))}
              disabled={imgIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setImgIndex(i => Math.min(item.images.length - 1, i + 1))}
              disabled={imgIndex === item.images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {item.images.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-36">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 leading-tight">{item.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{item.brand} · Size {item.size}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-gray-900">${item.price}</div>
            {item.originalPrice && (
              <div className="text-sm text-gray-400 line-through">${item.originalPrice}</div>
            )}
            {discount && <div className="text-xs text-red-500 font-bold">-{discount}%</div>}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex gap-2 flex-wrap mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CONDITION_COLORS[item.condition]}`}>
            {CONDITION_LABELS[item.condition]}
          </span>
          {item.styles.map(s => (
            <span key={s} className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">{s}</span>
          ))}
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-5">
            <h2 className="font-bold text-gray-800 text-sm mb-1.5">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { label: 'Category', value: item.category },
            { label: 'Size', value: item.size },
            { label: 'Colors', value: item.colors.join(', ') || '—' },
            { label: 'Listed', value: new Date(item.createdAt).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-800 capitalize truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Seller */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-black text-sm">
            {item.sellerName[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800">{item.sellerName}</p>
            <div className="flex items-center gap-1">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-gray-500">Trusted seller</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Heart size={12} className="text-pink-400 fill-pink-300" />
            {item.likes} likes
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex gap-3">
          {[
            { icon: <Shield size={14} className="text-green-500" />, text: 'Buyer Protection' },
            { icon: <Truck size={14} className="text-blue-500" />, text: 'Fast Shipping' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
              {icon}
              <span className="text-xs text-gray-600 font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <div className="flex gap-2.5">
          {/* Like */}
          <button onClick={handleLike}
            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
              liked ? 'border-pink-300 bg-pink-50' : 'border-gray-200'
            }`}>
            <Heart size={20} className={liked ? 'text-pink-500 fill-pink-500' : 'text-gray-400'} />
          </button>

          {/* Super like */}
          <button onClick={handleSuperLike}
            className="w-12 h-12 rounded-2xl border-2 border-blue-200 flex items-center justify-center hover:border-blue-400 transition-colors">
            <Zap size={20} className="text-blue-400" />
          </button>

          {/* Make offer */}
          <button onClick={() => setShowOffer(true)}
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:border-violet-400 transition-colors">
            <MessageCircle size={18} />
            Make Offer
          </button>

          {/* Buy now */}
          <button className="flex-1 bg-gradient-to-r from-violet-600 to-pink-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg">
            <ShoppingBag size={18} />
            Buy ${item.price}
          </button>
        </div>
      </div>

      {/* Offer modal */}
      <AnimatePresence>
        {showOffer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setShowOffer(false); }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="w-full bg-white rounded-t-3xl p-6"
            >
              {offerSent ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="font-black text-xl text-gray-900">Offer sent!</h3>
                  <p className="text-gray-500 text-sm mt-1">The seller will reply shortly.</p>
                </div>
              ) : (
                <>
                  <h3 className="font-black text-xl text-gray-900 mb-1">Make an offer</h3>
                  <p className="text-sm text-gray-500 mb-4">Listed at <strong>${item.price}</strong></p>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input type="number" placeholder="Your offer" value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-2xl pl-8 pr-4 py-3.5 text-lg font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <textarea placeholder="Add a note to the seller (optional)" value={offerMessage}
                    onChange={e => setOfferMessage(e.target.value)} rows={2}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 resize-none mb-4"
                  />
                  <button onClick={sendOffer} disabled={!offerAmount}
                    className="w-full bg-violet-600 text-white font-black py-4 rounded-2xl disabled:opacity-40">
                    Send Offer
                  </button>
                  <button onClick={() => setShowOffer(false)}
                    className="w-full text-center text-sm text-gray-400 mt-3 py-2">Cancel</button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
