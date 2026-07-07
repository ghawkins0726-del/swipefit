'use client';

import { Check, X } from 'lucide-react';
import { Order } from '@/lib/db-types';

const STEPS: { key: Order['status']; label: string; sub: string }[] = [
  { key: 'pending_payment', label: 'Order Placed',    sub: 'Awaiting payment'   },
  { key: 'processing',      label: 'Processing',      sub: 'Seller preparing'   },
  { key: 'shipped',         label: 'Shipped',         sub: 'On its way'         },
  { key: 'delivered',       label: 'Delivered',       sub: 'Order complete'     },
];

const ORDER = ['pending_payment', 'processing', 'shipped', 'delivered'] as const;

interface Props {
  order: Order;
}

export default function OrderTracking({ order }: Props) {
  const cancelled = order.status === 'cancelled';
  const currentIdx = cancelled ? -1 : ORDER.indexOf(order.status as typeof ORDER[number]);

  if (cancelled) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <X size={18} className="text-gray-400" />
        </div>
        <div>
          <p className="font-bold text-gray-700">Order Cancelled</p>
          <p className="text-xs text-gray-400 mt-0.5">This order was cancelled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161616] rounded-2xl p-4 shadow-sm">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const future = i > currentIdx;
        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                done   ? 'bg-[#0A0A0A]'  :
                active ? 'bg-[#E63946]' :
                         'bg-gray-100'
              }`}>
                {done ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`} />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 h-8 mt-0.5 ${done ? 'bg-[#0A0A0A]/30' : 'bg-gray-100'}`} />
              )}
            </div>

            {/* Label */}
            <div className="pb-6">
              <p className={`text-sm font-bold leading-tight ${future ? 'text-gray-300' : 'text-gray-800'}`}>
                {step.label}
              </p>
              <p className={`text-xs mt-0.5 ${active ? 'text-[#E63946] font-semibold' : future ? 'text-gray-200' : 'text-gray-400'}`}>
                {active && order.status === 'shipped' && order.trackingNumber
                  ? `Tracking: ${order.trackingNumber}`
                  : step.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
