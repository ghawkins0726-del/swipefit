'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Camera, X, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';

const CATEGORIES = [
  { value: 'tops',        label: 'Tops',        emoji: '👕' },
  { value: 'bottoms',     label: 'Bottoms',      emoji: '👖' },
  { value: 'dresses',     label: 'Dresses',      emoji: '👗' },
  { value: 'outerwear',   label: 'Outerwear',    emoji: '🧥' },
  { value: 'shoes',       label: 'Shoes',        emoji: '👟' },
  { value: 'accessories', label: 'Accessories',  emoji: '🕶️' },
];

const CONDITIONS = [
  { value: 'new',       label: 'New with tags',  sub: 'Never worn, tags on' },
  { value: 'like_new',  label: 'Like new',       sub: 'Worn once or twice' },
  { value: 'good',      label: 'Good',           sub: 'Gently used, no flaws' },
  { value: 'fair',      label: 'Fair',           sub: 'Visible wear, still great' },
];

const STYLES = [
  'streetwear','minimal','vintage','preppy','casual',
  'avant garde','y2k','techwear','workwear','bohemian','luxury','athletic',
];

export default function SellPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', price: '', originalPrice: '',
    category: '', brand: '', size: '', condition: '',
    styles: [] as string[], colors: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category || images.length === 0) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: form.price,
        originalPrice: form.originalPrice || undefined,
        images,
        subcategory: form.category,
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

  const canSubmit = !loading && !uploading && form.title && form.price && form.category && images.length > 0;
  const discount = form.price && form.originalPrice
    ? Math.round((1 - parseFloat(form.price) / parseFloat(form.originalPrice)) * 100)
    : null;

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F4F0] px-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 size={36} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-[#0A0A0A] mb-2">You're live!</h2>
        <p className="text-[#AAAAAA] text-sm text-center">Your item is now on the feed. Taking you to your profile…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#EBEBEB] px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#F5F4F0] rounded-xl flex items-center justify-center flex-shrink-0">
          <ChevronLeft size={18} className="text-[#5A5A5A]" />
        </button>
        <div>
          <h1 className="text-lg font-black text-[#0A0A0A] leading-none">List an Item</h1>
          <p className="text-xs text-[#AAAAAA] mt-0.5 font-medium">Turn your closet into cash</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-32 space-y-3 pt-3 px-4">

        {/* ── Photos ── */}
        <Section label="Photos" required>
          {/* Hero upload / first image */}
          <div className="mb-2">
            {images.length === 0 ? (
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#DDDDDD] bg-white flex flex-col items-center justify-center gap-3 active:bg-[#F5F4F0] transition-colors">
                {uploading ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-[3px] border-[#E63946] border-t-transparent animate-spin" />
                    <span className="text-sm font-bold text-[#E63946]">{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-[#F5F4F0] rounded-2xl flex items-center justify-center">
                      <Camera size={22} className="text-[#AAAAAA]" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-[#0A0A0A] text-sm">Add photos</p>
                      <p className="text-xs text-[#AAAAAA] mt-0.5">Up to 4 · JPG, PNG, WEBP</p>
                    </div>
                  </>
                )}
              </button>
            ) : (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0A]">
                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImages(p => p.filter((_, i) => i !== 0))}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                  Cover photo
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          {images.length > 0 && (
            <div className="flex gap-2">
              {images.slice(1).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F5F4F0] flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(p => p.filter((_, idx) => idx !== i + 1))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <X size={9} className="text-white" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#DDDDDD] bg-white flex items-center justify-center flex-shrink-0">
                  {uploading
                    ? <Loader2 size={16} className="text-[#E63946] animate-spin" />
                    : <Camera size={16} className="text-[#AAAAAA]" />}
                </button>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          {error && <p className="text-xs text-[#E63946] font-semibold mt-1">{error}</p>}
        </Section>

        {/* ── Title & Description ── */}
        <Section label="Details" required>
          <input
            type="text"
            placeholder="Item name, e.g. Vintage Levi's 501"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="sf-input mb-2"
            required
          />
          <textarea
            placeholder="Describe fit, fabric, any flaws… (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="sf-input resize-none"
          />
        </Section>

        {/* ── Price ── */}
        <Section label="Price" required>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-1 block">Asking</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0A0A0A] font-black text-base">$</span>
                <input type="number" min="1" step="0.01" placeholder="0"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="sf-input pl-8 text-lg font-black" required />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-1 block">Original</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] font-bold text-base">$</span>
                <input type="number" min="1" step="0.01" placeholder="0"
                  value={form.originalPrice}
                  onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                  className="sf-input pl-8 text-lg font-black" />
              </div>
            </div>
          </div>
          {discount !== null && discount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-black text-[#E63946] bg-red-50 px-2.5 py-1 rounded-full">-{discount}% off retail</span>
              <span className="text-xs text-[#AAAAAA]">Buyers love a deal</span>
            </div>
          )}
        </Section>

        {/* ── Category ── */}
        <Section label="Category" required>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                  form.category === c.value
                    ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                    : 'bg-white border-[#EBEBEB]'
                }`}>
                <span className="text-xl">{c.emoji}</span>
                <span className={`text-xs font-bold ${form.category === c.value ? 'text-white' : 'text-[#5A5A5A]'}`}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Brand & Size ── */}
        <Section label="Brand & Size">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-1 block">Brand</label>
              <input type="text" placeholder="Nike, Zara, Levi's…"
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="sf-input" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#AAAAAA] font-bold uppercase tracking-wider mb-1 block">Size</label>
              <input type="text" placeholder="M, 32×30, 10…"
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                className="sf-input" />
            </div>
          </div>
        </Section>

        {/* ── Condition ── */}
        <Section label="Condition">
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <button key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  form.condition === c.value
                    ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                    : 'bg-white border-[#EBEBEB]'
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  form.condition === c.value ? 'border-white' : 'border-[#DDDDDD]'
                }`}>
                  {form.condition === c.value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={`text-sm font-black ${form.condition === c.value ? 'text-white' : 'text-[#0A0A0A]'}`}>
                    {c.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${form.condition === c.value ? 'text-white/50' : 'text-[#AAAAAA]'}`}>
                    {c.sub}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Styles ── */}
        <Section label="Style" hint="Pick up to 4">
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s} type="button" onClick={() => toggleStyle(s)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold capitalize transition-all border ${
                  form.styles.includes(s)
                    ? 'bg-[#E63946] text-white border-[#E63946]'
                    : 'bg-white text-[#5A5A5A] border-[#EBEBEB]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Colors ── */}
        <Section label="Colors" hint="Comma separated">
          <input type="text" placeholder="black, white, grey…"
            value={form.colors}
            onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}
            className="sf-input" />
        </Section>

        {/* ── Submit ── */}
        <div className="pt-1">
          <button type="submit" disabled={!canSubmit}
            className="w-full bg-[#E63946] text-white font-black py-[18px] rounded-2xl disabled:opacity-35 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg shadow-[#E63946]/20 flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Listing…</>
              : 'List for Sale'}
          </button>

          {(!form.title || !form.category || images.length === 0) && (
            <p className="text-center text-xs text-[#AAAAAA] mt-2.5">
              {images.length === 0 ? 'Add at least one photo to continue' :
               !form.title ? 'Add a title to continue' :
               'Select a category to continue'}
            </p>
          )}
        </div>

      </form>

      <Navbar />
    </div>
  );
}

function Section({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl px-4 pt-4 pb-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-[#0A0A0A]">
          {label}{required && <span className="text-[#E63946] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-[#AAAAAA]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
