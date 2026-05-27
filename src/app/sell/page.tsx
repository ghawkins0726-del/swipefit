'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import { Camera, X, Loader2, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react';

/* ─── Catalog data ──────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'tops',        label: 'Tops',         emoji: '👕' },
  { value: 'bottoms',     label: 'Bottoms',      emoji: '👖' },
  { value: 'dresses',     label: 'Dresses',      emoji: '👗' },
  { value: 'outerwear',   label: 'Outerwear',    emoji: '🧥' },
  { value: 'shoes',       label: 'Shoes',        emoji: '👟' },
  { value: 'accessories', label: 'Accessories',  emoji: '🕶️' },
  { value: 'other',       label: 'Other',        emoji: '✨' },
];

// Letter sizes for clothing categories
const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// US shoe sizes (whole + half)
const SHOE_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'];

const CONDITIONS = [
  { value: 'new',       label: 'Brand New',    sub: 'Never worn, tags still on',  group: 'new'  as const },
  { value: 'like_new',  label: 'Like New',     sub: 'Worn once or twice',         group: 'new'  as const },
  { value: 'good',      label: 'Used · Good',  sub: 'Gently used, no flaws',      group: 'used' as const },
  { value: 'fair',      label: 'Used · Worn',  sub: 'Visible wear, still great',  group: 'used' as const },
];

const STYLES = [
  'streetwear', 'minimal', 'vintage', 'preppy', 'casual',
  'avant garde', 'y2k', 'techwear', 'workwear', 'bohemian', 'luxury', 'athletic',
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

/** Pick the right size UI based on the chosen category */
function sizeModeFor(category: string): 'letters' | 'shoes' | 'pants' | 'free' {
  if (category === 'tops' || category === 'dresses' || category === 'outerwear') return 'letters';
  if (category === 'shoes')   return 'shoes';
  if (category === 'bottoms') return 'pants';
  return 'free';
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function SellPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    title: '', description: '', price: '',
    category: '', customType: '', brand: '', size: '', condition: '',
    styles: [] as string[], colors: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const sizeMode = sizeModeFor(form.category);

  /* ── Image upload ───────────────────────────────────────────────────────── */
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const count = Math.min(files.length, 4 - images.length);
      const urls: string[] = [];
      for (let i = 0; i < count; i++) {
        setUploadProgress(Math.round(((i) / count) * 80));
        const fd = new FormData();
        fd.append('file', files[i]);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
        urls.push((await res.json()).url);
        setUploadProgress(Math.round(((i + 1) / count) * 100));
      }
      setImages(prev => [...prev, ...urls].slice(0, 4));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleStyle = (s: string) =>
    setForm(f => ({
      ...f,
      styles: f.styles.includes(s) ? f.styles.filter(x => x !== s) : [...f.styles, s].slice(0, 4),
    }));

  /** When category changes, clear size + customType so stale values don't leak */
  const setCategory = (value: string) => {
    setForm(f => ({ ...f, category: value, size: '', customType: value === 'other' ? f.customType : '' }));
  };

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category || images.length === 0) return;
    if (form.category === 'other' && !form.customType.trim()) return;
    setLoading(true);
    setError('');

    // For 'other', the user's typed item type becomes the subcategory
    const subcategory = form.category === 'other' && form.customType.trim()
      ? form.customType.trim().toLowerCase()
      : form.category;

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: form.price,
        images,
        subcategory,
        colors: form.colors.split(',').map(c => c.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/profile'), 2200);
    } else {
      setError('Something went wrong. Check your connection and try again.');
      setLoading(false);
    }
  };

  const otherTypeMissing = form.category === 'other' && !form.customType.trim();
  const canSubmit = !loading && !uploading && form.title && form.price && form.category && !otherTypeMissing && images.length > 0;

  /* ── Success screen ────────────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-8 relative overflow-hidden">
        {/* Red halo backdrop */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#E63946]/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #FF3B47, #E63946)',
            boxShadow: '0 0 60px 0 rgba(230, 57, 70, 0.6), 0 12px 30px -6px rgba(230, 57, 70, 0.55)',
          }}>
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 relative">You&apos;re live!</h2>
        <p className="text-white/50 text-sm text-center relative">Your item is now on the feed. Taking you to your profile…</p>
      </div>
    );
  }

  /* ── Main render ───────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] relative overflow-x-hidden">

      {/* Ambient red glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#E63946]/20 rounded-full blur-[120px] pointer-events-none -z-0" />

      {/* ── Header ── */}
      <div className="relative pt-12 pb-5 px-5 z-10">
        <Logo size={26} href="/feed" className="text-white mb-3" />
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="btn-halo-icon w-10 h-10 text-white">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">List an Item</h1>
            <p className="text-xs text-white/40 mt-1 font-medium uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={10} className="text-[#E63946]" />
              Turn your closet into cash
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex-1 overflow-y-auto pb-32 space-y-3 pt-1 px-4 z-10">

        {/* ── Photos ── */}
        <Section label="Photos" required>
          <div className="mb-2">
            {images.length === 0 ? (
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative w-full aspect-[4/3] rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform overflow-hidden">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#E63946]/8 via-transparent to-transparent pointer-events-none" />
                {uploading ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-[3px] border-[#E63946] border-t-transparent animate-spin" />
                    <span className="text-sm font-black text-[#E63946]">{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,59,71,0.15), rgba(230,57,70,0.08))',
                        boxShadow: '0 0 24px -4px rgba(230, 57, 70, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}>
                      <Camera size={24} className="text-[#E63946]" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-white text-sm">Add photos</p>
                      <p className="text-xs text-white/40 mt-0.5">Up to 4 · JPG, PNG, WEBP</p>
                    </div>
                  </>
                )}
              </button>
            ) : (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/10">
                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImages(p => p.filter((_, i) => i !== 0))}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/10">
                  Cover
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          {images.length > 0 && (
            <div className="flex gap-2">
              {images.slice(1).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(p => p.filter((_, idx) => idx !== i + 1))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                    <X size={9} className="text-white" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-white/15 bg-white/5 flex items-center justify-center flex-shrink-0">
                  {uploading
                    ? <Loader2 size={16} className="text-[#E63946] animate-spin" />
                    : <Camera size={16} className="text-white/40" />}
                </button>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          {error && <p className="text-xs text-[#E63946] font-semibold mt-2">{error}</p>}
        </Section>

        {/* ── Details ── */}
        <Section label="Details" required>
          <input
            type="text"
            placeholder="Item name, e.g. Vintage Levi's 501"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="sf-input-dark mb-2"
            required
          />
          <textarea
            placeholder="Describe fit, fabric, any flaws… (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="sf-input-dark resize-none"
          />
        </Section>

        {/* ── Price ── */}
        <Section label="Price" required>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#E63946] font-black text-lg leading-none">$</span>
            <input
              type="number" min="1" step="0.01" placeholder="0"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="sf-input-dark pl-11 text-lg font-black"
              required
            />
          </div>
        </Section>

        {/* ── Category ── */}
        <Section label="Category" required>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => {
              const active = form.category === c.value;
              return (
                <button key={c.value} type="button"
                  onClick={() => setCategory(c.value)}
                  className={`relative flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all border ${
                    active
                      ? 'bg-gradient-to-b from-[#FF3B47] to-[#E63946] border-white/20 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 active:scale-[0.97]'
                  }`}
                  style={active ? {
                    boxShadow: '0 0 0 1px rgba(255, 46, 71, 0.4), 0 0 28px 4px rgba(255, 46, 71, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                  } : undefined}>
                  <span className="text-xl">{c.emoji}</span>
                  <span className={`text-xs font-black ${active ? 'text-white' : 'text-white/80'}`}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom item-type field — only when 'Other' is picked */}
          {form.category === 'other' && (
            <div className="mt-3">
              <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 block">
                What kind of item? <span className="text-[#E63946]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Hat, Bag, Belt, Watch…"
                value={form.customType}
                onChange={e => setForm(f => ({ ...f, customType: e.target.value }))}
                className="sf-input-dark"
                maxLength={40}
                autoFocus
              />
            </div>
          )}
        </Section>

        {/* ── Brand & Size (smart per category) ── */}
        <Section label="Brand & Size">
          <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 block">Brand</label>
          <input type="text" placeholder="Nike, Zara, Levi's…"
            value={form.brand}
            onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            className="sf-input-dark mb-3.5" />

          <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 block">Size</label>

          {/* No category yet → prompt user to pick one first */}
          {sizeMode === 'free' && !form.category && (
            <p className="text-xs text-white/40 italic py-2">Pick a category above to see size options.</p>
          )}

          {/* Letter sizes for clothing */}
          {sizeMode === 'letters' && (
            <div className="grid grid-cols-4 gap-2">
              {LETTER_SIZES.map(sz => {
                const active = form.size === sz;
                return (
                  <button key={sz} type="button"
                    onClick={() => setForm(f => ({ ...f, size: sz }))}
                    className={`py-2.5 rounded-xl text-sm font-black transition-all border ${
                      active
                        ? 'bg-gradient-to-b from-[#FF3B47] to-[#E63946] border-white/20 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 active:scale-95'
                    }`}
                    style={active ? {
                      boxShadow: '0 0 0 1px rgba(255, 46, 71, 0.4), 0 0 20px 2px rgba(255, 46, 71, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    } : undefined}>
                    {sz}
                  </button>
                );
              })}
            </div>
          )}

          {/* Shoe sizes */}
          {sizeMode === 'shoes' && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {SHOE_SIZES.map(sz => {
                  const active = form.size === sz;
                  return (
                    <button key={sz} type="button"
                      onClick={() => setForm(f => ({ ...f, size: sz }))}
                      className={`py-2.5 rounded-xl text-sm font-black transition-all border ${
                        active
                          ? 'bg-gradient-to-b from-[#FF3B47] to-[#E63946] border-white/20 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 active:scale-95'
                      }`}
                      style={active ? {
                        boxShadow: '0 0 0 1px rgba(255, 46, 71, 0.4), 0 0 18px 2px rgba(255, 46, 71, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                      } : undefined}>
                      {sz}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 mt-2 font-medium">US sizing</p>
            </>
          )}

          {/* Pants — free text with strong format hint */}
          {sizeMode === 'pants' && (
            <>
              <input type="text" placeholder="e.g. 32×30, 30×32, W34 L32"
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                className="sf-input-dark" />
              <p className="text-[10px] text-white/30 mt-2 font-medium">Waist × Length, or any sizing your brand uses</p>
            </>
          )}

          {/* Accessories / Other / no category — free text */}
          {sizeMode === 'free' && form.category && (
            <>
              <input type="text" placeholder={form.category === 'accessories' ? 'One Size, M, 10mm…' : 'Any size or description'}
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                className="sf-input-dark" />
              <p className="text-[10px] text-white/30 mt-2 font-medium">Type whatever fits</p>
            </>
          )}
        </Section>

        {/* ── Condition (clearly grouped New vs Used) ── */}
        <Section label="Condition">
          {(['new', 'used'] as const).map(group => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                {group === 'new' ? 'New' : 'Used'}
              </p>
              <div className="space-y-2">
                {CONDITIONS.filter(c => c.group === group).map(c => {
                  const active = form.condition === c.value;
                  return (
                    <button key={c.value} type="button"
                      onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left border ${
                        active
                          ? 'bg-gradient-to-r from-[#FF3B47] to-[#E63946] border-white/20'
                          : 'bg-white/5 border-white/10 active:scale-[0.98]'
                      }`}
                      style={active ? {
                        boxShadow: '0 0 0 1px rgba(255, 46, 71, 0.4), 0 0 24px 2px rgba(255, 46, 71, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                      } : undefined}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        active ? 'border-white' : 'border-white/30'
                      }`}>
                        {active && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{c.label}</p>
                        <p className={`text-xs mt-0.5 ${active ? 'text-white/70' : 'text-white/40'}`}>{c.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Section>

        {/* ── Style ── */}
        <Section label="Style" hint="Pick up to 4">
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => {
              const active = form.styles.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleStyle(s)}
                  className={`px-3.5 py-2 rounded-full text-xs font-black capitalize transition-all border ${
                    active
                      ? 'bg-gradient-to-b from-[#FF3B47] to-[#E63946] border-white/20 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 active:scale-95'
                  }`}
                  style={active ? {
                    boxShadow: '0 0 18px -2px rgba(255, 46, 71, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                  } : undefined}>
                  {s}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Colors ── */}
        <Section label="Colors" hint="Comma separated">
          <input type="text" placeholder="black, white, grey…"
            value={form.colors}
            onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}
            className="sf-input-dark" />
        </Section>

        {/* ── Submit ── */}
        <div className="pt-2">
          <button type="submit" disabled={!canSubmit} className="btn-halo w-full text-base">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Listing…</>
              : 'List for Sale'}
          </button>

          {(!form.title || !form.category || otherTypeMissing || images.length === 0) && (
            <p className="text-center text-xs text-white/40 mt-2.5">
              {images.length === 0 ? 'Add at least one photo to continue' :
                !form.title ? 'Add a title to continue' :
                !form.category ? 'Select a category to continue' :
                otherTypeMissing ? 'Tell us what kind of item it is' :
                'Almost there…'}
            </p>
          )}
        </div>

      </form>

      <Navbar />
    </div>
  );
}

/* ─── Section card — dark glass with subtle inner highlight ─────────────── */

function Section({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl px-4 pt-4 pb-4 border border-white/8"
      style={{
        background: 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-white">
          {label}{required && <span className="text-[#E63946] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-white/40 font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
