'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import FollowButton from '@/components/FollowButton';
import { Search, SlidersHorizontal, X, Heart, Users, ShoppingBag } from 'lucide-react';
import { Item, UserProfile } from '@/lib/types';
import Link from 'next/link';

const CATEGORIES = ['', 'tops', 'bottoms', 'shoes', 'outerwear', 'dresses', 'accessories'];
const SORTS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low→High' },
  { value: 'price_desc', label: 'Price: High→Low' },
];

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('people') === '1' ? 'people' : 'items';

  const [mode, setMode] = useState<'items' | 'people'>(initialMode);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  // Items
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') ?? '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sort: 'created_at',
  });

  // People
  const [people, setPeople] = useState<(UserProfile & { viewerFollows?: boolean })[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const doItemSearch = useCallback(async (q: string, f: typeof filters) => {
    setItemsLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (f.category) p.set('category', f.category);
    if (f.condition) p.set('condition', f.condition);
    if (f.minPrice) p.set('minPrice', f.minPrice);
    if (f.maxPrice) p.set('maxPrice', f.maxPrice);
    if (f.sort) p.set('sort', f.sort);
    const res = await fetch(`/api/search?${p}`);
    setItems(await res.json());
    setItemsLoading(false);
  }, []);

  const doPeopleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setPeople([]); return; }
    setPeopleLoading(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    setPeople(await res.json());
    setPeopleLoading(false);
  }, []);

  useEffect(() => {
    if (mode === 'items') doItemSearch(query, filters);
  }, [filters, mode]); // eslint-disable-line

  // Debounced people search
  useEffect(() => {
    if (mode !== 'people') return;
    const t = setTimeout(() => doPeopleSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, mode, doPeopleSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'items') doItemSearch(query, filters);
    else doPeopleSearch(query);
  };

  const clearFilters = () => setFilters({ category: '', condition: '', minPrice: '', maxPrice: '', sort: 'created_at' });
  const activeFilterCount = [filters.category, filters.condition, filters.minPrice, filters.maxPrice].filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">
      {/* Header */}
      <div className="bg-white border-b border-[#EBEBEB] px-4 pt-12 pb-3 sticky top-0 z-30">
        <Logo size={26} href="/feed" className="text-[#0A0A0A] mb-3" />

        {/* Mode pills */}
        <div className="flex gap-1 bg-[#F5F4F0] rounded-2xl p-1 mb-3">
          {([
            { id: 'items',  label: 'Items',  icon: ShoppingBag },
            { id: 'people', label: 'People', icon: Users },
          ] as const).map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                mode === m.id
                  ? 'bg-[#0A0A0A] text-white shadow-sm'
                  : 'text-[#AAAAAA]'
              }`}>
              <m.icon size={12} />
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center bg-[#F5F4F0] rounded-xl px-3 gap-2">
            <Search size={16} className="text-[#AAAAAA] flex-shrink-0" />
            <input
              type="text"
              placeholder={mode === 'items' ? 'Search styles, brands, items…' : 'Search people by name…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); if (mode === 'items') doItemSearch('', filters); else setPeople([]); }}>
                <X size={14} className="text-[#AAAAAA]" />
              </button>
            )}
          </div>
          {mode === 'items' && (
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#5A5A5A] border-[#EBEBEB]'
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && <span className="bg-white text-[#E63946] rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>}
            </button>
          )}
        </form>

        {/* Filters panel — items only */}
        {mode === 'items' && showFilters && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button key={c || 'all'}
                  onClick={() => setFilters(f => ({ ...f, category: c }))}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    filters.category === c
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#5A5A5A] border-[#EBEBEB]'
                  }`}
                >
                  {c || 'All'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="Min $" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                className="flex-1 border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/20" />
              <input type="number" placeholder="Max $" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                className="flex-1 border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/20" />
              <select value={filters.sort}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
                className="flex-1 border border-[#EBEBEB] rounded-xl px-2 py-2 text-sm focus:outline-none bg-white">
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

        {mode === 'items' && (
          <>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <Search size={36} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#AAAAAA] text-sm">No results found</p>
                <p className="text-[#EBEBEB] text-xs mt-1">Try a different search or category</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#AAAAAA] mb-3">{items.length} results</p>
                <div className="grid grid-cols-2 gap-3">
                  {items.map(item => (
                    <Link key={item.id} href={`/item/${item.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                      <div className="relative aspect-square bg-zinc-100">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          ${item.price}
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="font-semibold text-[#0A0A0A] text-sm truncate">{item.title}</p>
                        <p className="text-[#AAAAAA] text-xs">{item.brand} · {item.size}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Heart size={10} className="text-[#E63946] fill-[#E63946]/40" />
                          <span className="text-xs text-[#AAAAAA]">{item.likes}</span>
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
          </>
        )}

        {mode === 'people' && (
          <>
            {peopleLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-[#E63946] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : people.length === 0 && query.trim() ? (
              <div className="text-center py-16">
                <Users size={36} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#AAAAAA] text-sm">No people found</p>
                <p className="text-[#EBEBEB] text-xs mt-1">Try a different name</p>
              </div>
            ) : people.length === 0 ? (
              <div className="text-center py-16">
                <Users size={36} className="text-[#EBEBEB] mx-auto mb-3" />
                <p className="text-[#AAAAAA] text-sm">Type a name to find people</p>
              </div>
            ) : (
              <div className="space-y-2">
                {people.map(u => (
                  <div key={u.id}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm">
                    <Link href={`/users/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                        {u.avatar
                          ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                          : <span>{u.name[0]?.toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0A0A0A] text-sm truncate">{u.name}</p>
                        {u.bio
                          ? <p className="text-[#AAAAAA] text-xs truncate mt-0.5">{u.bio}</p>
                          : <p className="text-[#AAAAAA] text-xs mt-0.5">{u.totalListings} listing{u.totalListings === 1 ? '' : 's'}</p>}
                      </div>
                    </Link>
                    <FollowButton size="sm" targetUserId={u.id} initialFollowing={!!u.viewerFollows} />
                  </div>
                ))}
              </div>
            )}
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
      <div className="flex items-center justify-center min-h-screen bg-[#F5F4F0]">
        <div className="w-10 h-10 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchInner />
    </Suspense>
  );
}
