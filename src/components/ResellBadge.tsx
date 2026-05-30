'use client';

export function ResellBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-500 border border-amber-400/30">
      RESELL
    </span>
  );
}

export function PriceHistoryChain({ history }: { history: { price: number; condition: string }[] }) {
  if (history.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {history.map((h, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs text-[#AAAAAA]">${h.price}</span>
          {i < history.length - 1 && (
            <span className="text-[10px] text-[#AAAAAA]">→</span>
          )}
        </span>
      ))}
    </div>
  );
}
