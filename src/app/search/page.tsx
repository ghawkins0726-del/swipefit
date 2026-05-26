'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Search, SlidersHorizontal, X, Heart } from 'lucide-react';
import { Item } from '@/lib/types';
import Link from 'next/link';

const CATEGORIES = ['', 'tops', 'bottoms', 'shoes', 'outerwear', 'dresses', 'accessories'];
const CONDITIONS = ['', 'new', 'like_new', 'good', 'fair'];
const SORTS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low→High' },
  { value: 'price_desc', label: 'Price: High→Low' },
];

const CONDITION_LABELS: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair',
};

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') ?? '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sort: 'created_at',
  });

  const doSearch = useCallback(async (q: string, f: typeof filters) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (f.category) p.set('category', f.category);
    if (f.condition) p.set('condition', f.condition);
    if (f.minPrice) p.set('minPrice', f.minPrice);
    if (f.maxPrice) p.set('maxPrice', f.maxPrice);
    if (f.sort) p.set('sort', f.sort);
    const res = await fetch(`/api/search?${p}`);
    setResults(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    doSearch(query, filters);
  }, [filters]);  // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, filters);
  };

  const clearFilters = () => setFilters({ category: '', condition: '', minPrice: '', maxPrice: '', sort: 'created_at' });
  const activeFilterCount = [filters.category, filters.condition, filters.minPrice, filters.maxPrice]
    .filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-30">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 gap-2">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text" placeholder="Search styles, brands, items..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); doSearch('', filters); }}>
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && <span className="bg-white text-[#E63946] rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </button>
        </form>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button key={c || 'all'}
                  onClick={() => setFilters(f => ({ ...f, category: c }))}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    filters.category === c
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {c || 'All'}
                </button>
              ))}
            </div>

            {/* Price + Sort row */}
            <div className="flex gap-2">
              <input type="number" placeholder="Min $" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/20" />
              <input type="number" placeholder="Max $" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/20" />
              <select value={filters.sort}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none bg-white">
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-[#E63946] font-medium">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 pb-24 px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Search size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No results found</p>
            <p className="text-gray-300 text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{results.length} results</p>
            <div className="grid grid-cols-2 gap-3">
              {results.map(item => (
                <Link key={item.id} href={`/item/${item.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative aspect-square bg-zinc-100">
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      ${item.price}
                    </div>
                    {item.originalPrice && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                    <p className="text-gray-400 text-xs">{item.brand} · {item.size}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Heart size={10} className="text-[#E63946] fill-[#E63946]/40" />
                      <span className="text-xs text-gray-400">{item.likes}</span>
                      {item.condition === 'new' && (
                        <span className="ml-auto text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">New</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchInner />
    </Suspense>
  );
}
