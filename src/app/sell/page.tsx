'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ImagePlus, CheckCircle, Loader, X, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

const STYLES = [
  'streetwear', 'minimal', 'vintage', 'preppy', 'casual', 'avant garde',
  'y2k', 'techwear', 'workwear', 'bohemian', 'luxury', 'athletic',
];

const CONDITIONS = [
  { value: 'new', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export default function SellPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [sellerName, setSellerName] = useState('Seller');

  useEffect(() => {
    const userId = localStorage.getItem('swipefit_user_id') || 'anonymous';
    fetch(`/api/profile?userId=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.user?.name) setSellerName(d.user.name); })
      .catch(() => {});
  }, []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', price: '', originalPrice: '',
    category: '', subcategory: '', brand: '', size: '', condition: 'good',
    styles: [] as string[], colors: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const urls: string[] = [];
      const count = Math.min(files.length, 4 - images.length);
      for (let i = 0; i < count; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i) / count) * 80));
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
        const data = await res.json();
        urls.push(data.url);
        setUploadProgress(Math.round(((i + 1) / count) * 100));
      }
      setImages(prev => [...prev, ...urls].slice(0, 4));
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Make sure Blob storage is connected in Vercel.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const toggleStyle = (style: string) => {
    setForm(f => ({
      ...f,
      styles: f.styles.includes(style)
        ? f.styles.filter(s => s !== style)
        : [...f.styles, style].slice(0, 4),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category || images.length === 0) return;
    setLoading(true);
    setError('');

    const userId = localStorage.getItem('swipefit_user_id') || 'anonymous';
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerId: userId,
        sellerName,
        title: form.title,
        description: form.description,
        price: form.price,
        originalPrice: form.originalPrice || undefined,
        images,
        category: form.category,
        subcategory: form.subcategory || form.category,
        styles: form.styles,
        colors: form.colors.split(',').map(c => c.trim()).filter(Boolean),
        size: form.size,
        brand: form.brand,
        condition: form.condition,
      }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/feed'), 2000);
    } else {
      setError('Failed to list item. Make sure the database is connected.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col h-screen bg-[#F5F4F0] items-center justify-center">
        <CheckCircle size={56} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-black text-[#0A0A0A]">Listed!</h2>
        <p className="text-[#5A5A5A] mt-1 text-sm">Your item is live on the feed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">
      <header className="bg-white border-b border-[#EBEBEB] px-5 pt-12 pb-4">
        <h1 className="text-2xl font-black text-[#0A0A0A] tracking-tight">List an Item</h1>
        <p className="text-xs text-[#5A5A5A] mt-0.5 uppercase tracking-wide font-medium">Turn your closet into cash</p>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-28 px-5 pt-5 space-y-6">

        {/* ── Photos ── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#0A0A0A] mb-2">
            Photos <span className="text-[#E63946]">*</span>
          </label>

          <div className="grid grid-cols-4 gap-2">
            {images.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#EBEBEB]">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                  uploading ? 'border-[#E63946] bg-red-50' : 'border-[#CCCCCC] bg-white hover:border-[#0A0A0A]'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader size={18} className="text-[#E63946] animate-spin" />
                    <span className="text-[9px] font-bold text-[#E63946]">{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <ImagePlus size={18} className="text-[#5A5A5A]" />
                    <span className="text-[9px] font-bold text-[#5A5A5A] uppercase tracking-wide">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <p className="text-[10px] text-[#999] mt-1.5">Up to 4 photos · Max 10 MB each · JPG, PNG, WEBP</p>
          {error && <p className="text-[11px] text-[#E63946] mt-1 font-medium">{error}</p>}
        </div>

        {/* ── Title ── */}
        <Field label="Title" required>
          <input
            type="text"
            placeholder="e.g., Vintage Levi's 501 Jeans"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="sf-input"
            required
          />
        </Field>

        {/* ── Description ── */}
        <Field label="Description">
          <textarea
            placeholder="Fit, fabric, condition details..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="sf-input resize-none"
          />
        </Field>

        {/* ── Price row ── */}
        <div className="flex gap-3">
          <Field label="Asking Price" required className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] text-sm font-medium">$</span>
              <input
                type="number" min="1" step="0.01" placeholder="0.00"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="sf-input pl-7"
                required
              />
            </div>
          </Field>
          <Field label="Original Price" className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] text-sm font-medium">$</span>
              <input
                type="number" min="1" step="0.01" placeholder="0.00"
                value={form.originalPrice}
                onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                className="sf-input pl-7"
              />
            </div>
          </Field>
        </div>

        {/* ── Category ── */}
        <Field label="Category" required>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  form.category === c.value
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#5A5A5A] border-[#EBEBEB] hover:border-[#0A0A0A]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        {/* ── Brand & Size ── */}
        <div className="flex gap-3">
          <Field label="Brand" className="flex-1">
            <input
              type="text" placeholder="Nike, Zara..."
              value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="sf-input"
            />
          </Field>
          <Field label="Size" className="flex-1">
            <input
              type="text" placeholder="M, 32×30, 10..."
              value={form.size}
              onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
              className="sf-input"
            />
          </Field>
        </div>

        {/* ── Condition ── */}
        <Field label="Condition">
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  form.condition === c.value
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#5A5A5A] border-[#EBEBEB] hover:border-[#0A0A0A]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        {/* ── Styles ── */}
        <Field label="Styles" hint="pick up to 4">
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button
                key={s} type="button"
                onClick={() => toggleStyle(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border capitalize transition-colors ${
                  form.styles.includes(s)
                    ? 'bg-[#E63946] text-white border-[#E63946]'
                    : 'bg-white text-[#5A5A5A] border-[#EBEBEB] hover:border-[#0A0A0A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        {/* ── Colors ── */}
        <Field label="Colors" hint="comma separated">
          <input
            type="text" placeholder="black, white, grey"
            value={form.colors}
            onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}
            className="sf-input"
          />
        </Field>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={loading || uploading || !form.title || !form.price || !form.category || images.length === 0}
          className="w-full bg-[#0A0A0A] text-white font-bold text-sm py-4 rounded-2xl disabled:opacity-40 hover:bg-[#222] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : <ChevronRight size={16} />}
          {loading ? 'Listing...' : 'List for Sale'}
        </button>

      </form>

      <Navbar />
    </div>
  );
}

function Field({
  label, required, hint, children, className,
}: {
  label: string; required?: boolean; hint?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]">
          {label}
          {required && <span className="text-[#E63946] ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-[#999] font-normal">({hint})</span>}
      </div>
      {children}
    </div>
  );
}
