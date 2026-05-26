'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Store } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OrderCard from '@/components/OrderCard';
import { Order } from '@/lib/db-types';
import { Item } from '@/lib/types';

type OrderWithItem = Order & { item: Item | null };

function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function OrdersPage() {
  const [tab, setTab] = useState<'buying' | 'selling'>('buying');
  const [buyingOrders, setBuyingOrders] = useState<OrderWithItem[]>([]);
  const [sellingOrders, setSellingOrders] = useState<OrderWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    setLoading(true);
    Promise.all([
      fetch(`/api/orders?userId=${userId}&role=buyer`).then(r => r.json()),
      fetch(`/api/orders?userId=${userId}&role=seller`).then(r => r.json()),
    ]).then(([buying, selling]) => {
      setBuyingOrders(Array.isArray(buying) ? buying : []);
      setSellingOrders(Array.isArray(selling) ? selling : []);
      setLoading(false);
    });
  }, []);

  const orders = tab === 'buying' ? buyingOrders : sellingOrders;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-[#EBEBEB] pt-12 pb-5 px-5">
        <h1 className="text-[#0A0A0A] font-black text-2xl tracking-tight">Orders</h1>
        <p className="text-[#5A5A5A] text-sm mt-0.5">
          {buyingOrders.length} purchased · {sellingOrders.length} sold
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex">
        {([
          { id: 'buying',  icon: <ShoppingBag size={14} />, label: 'Buying',  count: buyingOrders.length  },
          { id: 'selling', icon: <Store size={14} />,       label: 'Selling', count: sellingOrders.length },
        ] as const).map(({ id, icon, label, count }) => (
          <button key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === id ? 'border-[#0A0A0A] text-[#0A0A0A]' : 'border-transparent text-gray-400'
            }`}
          >
            {icon}
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 font-bold ${tab === id ? 'bg-red-100 text-[#E63946]' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 px-4 pt-4 pb-24 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            {tab === 'buying' ? (
              <>
                <ShoppingBag size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold mb-1">No purchases yet</p>
                <p className="text-gray-400 text-sm">Items you buy will appear here</p>
              </>
            ) : (
              <>
                <Store size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold mb-1">No sales yet</p>
                <p className="text-gray-400 text-sm">Items you sell will appear here</p>
              </>
            )}
          </div>
        ) : (
          orders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>

      <Navbar />
    </div>
  );
}
