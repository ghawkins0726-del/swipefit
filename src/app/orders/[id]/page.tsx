'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Package2, Loader2, Check, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Order } from '@/lib/db-types';
import { Item } from '@/lib/types';
import OrderTracking from '@/components/OrderTracking';
import RatingModal from '@/components/RatingModal';
import ResellModal from '@/components/ResellModal';
import { AnimatePresence } from 'framer-motion';

type OrderWithItem = Order & { item: Item | null };

const STATUS_LABELS: Record<Order['status'], string> = {
  pending_payment: 'Pending Payment',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  cancelled:       'Cancelled',
};

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderDetailInner />
    </Suspense>
  );
}

function OrderDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [order, setOrder] = useState<OrderWithItem | null>(null);
  const [tracking, setTracking] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [sellerName, setSellerName] = useState('the seller');

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);

  // Resell modal state
  const [showResellModal, setShowResellModal] = useState(false);

  const myId = clerkUser?.id ?? '';
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  useEffect(() => {
    fetch(`/api/orders?orderId=${id}`)
      .then(r => r.json())
      .then(d => {
        setOrder(d);
        setTracking(d.trackingNumber ?? '');
        if (d?.sellerId) {
          fetch(`/api/users/${d.sellerId}`).then(r => r.json()).then(u => setSellerName(u.name || 'the seller')).catch(() => {});
        }
      });

    // Has the buyer already rated this order?
    fetch(`/api/ratings?orderId=${id}`)
      .then(r => r.json())
      .then(rating => {
        if (rating?.stars) {
          setHasRated(true);
          setRatingStars(rating.stars);
        }
      })
      .catch(() => {});
  }, [id]);

  // Auto-open the rating sheet right after a successful payment,
  // then after rating delay check if we should show resell modal
  useEffect(() => {
    if (!order || !isLoaded || !paymentSuccess) return;
    if (myId !== order.buyerId) return;
    if (order.status === 'pending_payment' || order.status === 'cancelled') return;
    if (hasRated) return;
    const t = setTimeout(() => setShowRating(true), 800);
    return () => clearTimeout(t);
  }, [order, isLoaded, myId, paymentSuccess, hasRated]);

  // After rating modal delay, offer the resell modal
  useEffect(() => {
    if (!order || !isLoaded || !paymentSuccess) return;
    if (myId !== order.buyerId) return;
    if (order.status === 'pending_payment' || order.status === 'cancelled') return;
    // Show resell modal after 1500ms — check if no active resell listing exists
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/resell/${order.itemId}`);
        const data = await res.json();
        const hasActiveListing = Array.isArray(data?.listings) &&
          data.listings.some((l: { originalOrderId: string }) => l.originalOrderId === order.id);
        if (!hasActiveListing) {
          setShowResellModal(true);
        }
      } catch {
        // silently ignore — resell modal is non-critical
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [order, isLoaded, myId, paymentSuccess]);

  const submitTracking = async () => {
    if (!tracking.trim() || !order) return;
    setUpdating(true);
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, trackingNumber: tracking.trim() }),
    });
    setUpdating(false);
    setUpdated(true);
    setOrder(o => o ? { ...o, trackingNumber: tracking.trim(), status: 'shipped' } : o);
    setTimeout(() => setUpdated(false), 2500);
  };

  const updateStatus = async (status: Order['status']) => {
    if (!order) return;
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, status }),
    });
    setOrder(o => o ? { ...o, status } : o);
  };

  if (!order || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSeller = myId === order.sellerId;
  const isBuyer = myId === order.buyerId;
  const otherUserId = isSeller ? order.buyerId : order.sellerId;
  const canShip = isSeller && order.status === 'processing';
  const canDeliver = isSeller && order.status === 'shipped';
  const canConfirmDelivery = isBuyer && order.status === 'shipped';
  const canRate = isBuyer && order.status !== 'pending_payment' && order.status !== 'cancelled';

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <div className="bg-[#0A0A0A] pt-12 pb-5 px-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-white font-black text-xl">Order Detail</h1>
            <p className="text-white/40 text-xs mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Item card */}
        <div className="bg-white/10 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
            {order.item?.images?.[0] ? (
              <img src={order.item.images[0]} alt={order.item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package2 size={20} className="text-white/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm truncate">{order.item?.title ?? 'Item'}</p>
            <p className="text-white/40 text-xs">{order.item?.brand} · Size {order.item?.size}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-black text-lg">${order.amount}</p>
            <p className="text-white/40 text-xs">{STATUS_LABELS[order.status]}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 pb-24 space-y-4">
        {/* Payment success banner */}
        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">Payment confirmed!</p>
              <p className="text-emerald-600 text-xs mt-0.5">The seller has been notified and will ship soon.</p>
            </div>
          </div>
        )}

        {/* Tracking timeline */}
        <OrderTracking order={order} />

        {/* Seller: add tracking */}
        {canShip && (
          <div className="bg-[#161616] rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-white text-sm mb-3">Add Tracking Number</p>
            <div className="flex gap-2">
              <input
                value={tracking}
                onChange={e => setTracking(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                className="sf-input flex-1 text-sm"
              />
              <button
                onClick={submitTracking}
                disabled={!tracking.trim() || updating}
                className="flex items-center gap-1.5 bg-[#E63946] text-white font-bold px-4 rounded-xl text-sm disabled:opacity-40"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : updated ? <Check size={14} /> : 'Ship'}
              </button>
            </div>
          </div>
        )}

        {/* Seller: mark delivered */}
        {canDeliver && (
          <button onClick={() => updateStatus('delivered')}
            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-2xl text-sm">
            Mark as Delivered
          </button>
        )}

        {/* Buyer: confirm delivery */}
        {canConfirmDelivery && (
          <button onClick={() => updateStatus('delivered')}
            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-2xl text-sm">
            Confirm Delivery
          </button>
        )}

        {/* Order meta */}
        <div className="bg-[#161616] rounded-2xl p-4 shadow-sm space-y-3">
          <p className="font-bold text-white text-sm">Order Info</p>
          {[
            { label: 'Order ID',  value: `#${order.id.slice(-8).toUpperCase()}` },
            { label: 'Placed',    value: new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) },
            { label: 'Amount',    value: `$${order.amount}` },
            { label: isSeller ? 'Buyer' : 'Seller', value: isSeller ? order.buyerId.slice(0, 12) + '…' : order.sellerId.slice(0, 12) + '…' },
            ...(order.trackingNumber ? [{ label: 'Tracking', value: order.trackingNumber }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-[#AAAAAA]">{label}</span>
              <span className="text-xs font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>

        {/* Buyer: Rate seller CTA */}
        {canRate && (
          <button
            onClick={() => setShowRating(true)}
            className={`flex items-center justify-center gap-2 w-full font-black py-3.5 rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] ${
              hasRated
                ? 'bg-[#161616] border-2 border-[#2a2a2a] text-white'
                : 'btn-halo'
            }`}
          >
            <Star size={16} className={hasRated ? 'text-[#FF2E47] fill-[#FF2E47]' : 'fill-white'} />
            {hasRated ? `Your rating: ${ratingStars} ★ — Edit` : 'Rate the seller'}
          </button>
        )}

        {/* Message button */}
        {order.itemId && otherUserId && (
          <Link
            href={`/messages/${order.itemId}/${otherUserId}`}
            className="flex items-center justify-center gap-2 w-full bg-[#161616] border-2 border-[#2a2a2a] text-white font-bold py-3.5 rounded-2xl text-sm"
          >
            <MessageSquare size={16} />
            Message {isSeller ? 'Buyer' : 'Seller'}
          </Link>
        )}
      </div>

      {/* Rating modal */}
      <RatingModal
        orderId={order.id}
        sellerName={sellerName}
        open={showRating}
        onClose={() => setShowRating(false)}
        onSubmitted={(stars) => { setHasRated(true); setRatingStars(stars); }}
      />

      {/* Resell modal */}
      <AnimatePresence>
        {showResellModal && order.item && (
          <ResellModal
            orderId={order.id}
            item={{
              id: order.item.id,
              title: order.item.title,
              price: order.amount,
              images: order.item.images,
              condition: order.item.condition,
            }}
            onClose={() => setShowResellModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
