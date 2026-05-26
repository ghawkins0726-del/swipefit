'use client';

import Link from 'next/link';
import { Package2, ChevronRight } from 'lucide-react';
import { Order } from '@/lib/db-types';
import { Item } from '@/lib/types';

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'text-amber-600',  bg: 'bg-amber-50'  },
  processing:      { label: 'Processing',      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  shipped:         { label: 'Shipped',         color: 'text-violet-600', bg: 'bg-violet-50' },
  delivered:       { label: 'Delivered',       color: 'text-emerald-600',bg: 'bg-emerald-50'},
  cancelled:       { label: 'Cancelled',       color: 'text-gray-400',   bg: 'bg-gray-100'  },
};

interface Props {
  order: Order & { item: Item | null };
}

export default function OrderCard({ order }: Props) {
  const cfg = STATUS_CONFIG[order.status];
  const date = new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Link href={`/orders/${order.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform"
    >
      {/* Item thumbnail */}
      <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
        {order.item?.images?.[0] ? (
          <img src={order.item.images[0]} alt={order.item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package2 size={24} className="text-zinc-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate">
          {order.item?.title ?? 'Item'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        <span className={`inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Price + arrow */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="font-black text-gray-900">${order.amount}</span>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </Link>
  );
}
