'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { TrendingUp, Flame, Heart, Eye } from 'lucide-react';
import { Item } from '@/lib/types';
import Link from 'next/link';

const CATEGORIES = ['All', 'tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'dresses'];

export default function TrendingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [cat, setCat] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trending?limit=40')
      .then(r => r.json())
      .then(d => { setItems(d); setFiltered(d); setLoading(false); });
  }, []);

  useEffect(() => {
    if (cat === 'All') setFiltered(items);
    else setFiltered(items.filter(i => i.category === cat));
  }, [cat, items]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-[#E63946] rounded-xl flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Trending Now</h1>
        </div>
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button key={c}
              onClick={() => setCat(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                cat === c
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pb-24 px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-400" /> This Week&apos;s Hot
                </h2>
                <div className="flex gap-2.5">
                  {top3.map((item, i) => (
                    <Link key={item.id} href={`/item/${item.id}`}
                      className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-square bg-zinc-100">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white ${
                          i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                        }`}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="font-bold text-xs text-gray-800 truncate">{item.title}</p>
                        <p className="text-[#E63946] font-black text-sm">${item.price}</p>
                        <div className="flex items-center gap-1">
                          <Heart size={9} className="text-pink-400 fill-pink-300" />
                          <span className="text-xs text-gray-400">{item.likes}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rest of the list */}
            {rest.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rising</h2>
                <div className="space-y-2.5">
                  {rest.map((item, i) => (
                    <Link key={item.id} href={`/item/${item.id}`}
                      className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="text-gray-300 font-black text-sm w-6 text-center">{i + 4}</span>
                      <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{item.title}</p>
                        <p className="text-gray-400 text-xs">{item.brand} · {item.size}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Heart size={10} className="text-pink-400 fill-pink-300" />
                            <span className="text-xs text-gray-400">{item.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye size={10} className="text-blue-300" />
                            <span className="text-xs text-gray-400">{item.views}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">${item.price}</p>
                        {item.originalPrice && (
                          <p className="text-xs text-gray-400 line-through">${item.originalPrice}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
}
