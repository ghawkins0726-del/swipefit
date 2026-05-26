'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Package2, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { Order } from '@/lib/db-types';
import { Item } from '@/lib/types';
import OrderTracking from '@/components/OrderTracking';

type OrderWithItem = Order & { item: Item | null };

const STATUS_LABELS: Record<Order['status'], string> = {
  pending_payment: 'Pending Payment',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  cancelled:       'Cancelled',
};

function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithItem | null>(null);
  const [myId, setMyId] = useState('');
  const [tracking, setTracking] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const uid = getUserId();
    setMyId(uid);
    fetch(`/api/orders?orderId=${id}`)
      .then(r => r.json())
      .then(d => {
        setOrder(d);
        setTracking(d.trackingNumber ?? '');
      });
  }, [id]);

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

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSeller = myId === order.sellerId;
  const isBuyer = myId === order.buyerId;
  const otherUserId = isSeller ? order.buyerId : order.sellerId;
  const canShip = isSeller && order.status === 'processing';
  const canDeliver = isSeller && order.status === 'shipped';
  const canConfirmDelivery = isBuyer && order.status === 'shipped';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0A0A0A] pt-12 pb-5 px-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-white font-black text-xl">Order Detail</h1>
            <p className="text-white/60 text-xs mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Item card */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/20 overflow-hidden flex-shrink-0">
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
            <p className="text-white/60 text-xs">{order.item?.brand} · Size {order.item?.size}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-black text-lg">${order.amount}</p>
            <p className="text-white/60 text-xs">{STATUS_LABELS[order.status]}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 pb-24 space-y-4">
        {/* Tracking timeline */}
        <OrderTracking order={order} />

        {/* Seller: add tracking */}
        {canShip && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 text-sm mb-3">Add Tracking Number</p>
            <div className="flex gap-2">
              <input
                value={tracking}
                onChange={e => setTracking(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                className="flex-1 bg-[#F5F4F0] border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
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
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm">
            Mark as Delivered
          </button>
        )}

        {/* Buyer: confirm delivery */}
        {canConfirmDelivery && (
          <button onClick={() => updateStatus('delivered')}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm">
            Confirm Delivery
          </button>
        )}

        {/* Order meta */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="font-bold text-gray-800 text-sm">Order Info</p>
          {[
            { label: 'Order ID',  value: `#${order.id.slice(-8).toUpperCase()}` },
            { label: 'Placed',    value: new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) },
            { label: 'Amount',    value: `$${order.amount}` },
            { label: isSeller ? 'Buyer' : 'Seller', value: isSeller ? order.buyerId.slice(0, 12) + '…' : order.sellerId.slice(0, 12) + '…' },
            ...(order.trackingNumber ? [{ label: 'Tracking', value: order.trackingNumber }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-xs font-semibold text-gray-700">{value}</span>
            </div>
          ))}
        </div>

        {/* Message button */}
        {order.itemId && otherUserId && (
          <Link
            href={`/messages/${order.itemId}/${otherUserId}`}
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-[#EBEBEB] text-[#0A0A0A] font-bold py-3.5 rounded-2xl text-sm"
          >
            <MessageSquare size={16} />
            Message {isSeller ? 'Buyer' : 'Seller'}
          </Link>
        )}
      </div>
    </div>
  );
}
