'use client';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SaveCardModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function CardForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');

    const res = await fetch('/api/stripe/setup-intent', { method: 'POST' });
    const { clientSecret } = await res.json();

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });

    if (result.error) {
      setError(result.error.message ?? 'Card save failed');
      setSaving(false);
    } else {
      onSaved();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <CardElement options={{
          style: {
            base: { color: '#ffffff', fontSize: '15px', '::placeholder': { color: 'rgba(255,255,255,0.35)' } },
            invalid: { color: '#E63946' },
          },
        }} />
      </div>
      {error && <p className="text-[#E63946] text-xs font-semibold px-1">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#FF3B47] to-[#E63946] text-white font-black text-sm uppercase tracking-widest disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Card'}
      </button>
      <button onClick={onClose} className="text-xs text-white/30 font-semibold tracking-wide">
        Cancel
      </button>
    </div>
  );
}

export default function SaveCardModal({ open, onClose, onSaved }: SaveCardModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#151515] border border-white/8 rounded-t-3xl p-6 pb-10">
        <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-5" />
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
          <X size={14} className="text-white/50" />
        </button>
        <h2 className="text-white font-black text-lg mb-1">Add Payment Card</h2>
        <p className="text-white/40 text-xs mb-5">Required to send coin flip offers.</p>
        <Elements stripe={stripePromise}>
          <CardForm onClose={onClose} onSaved={() => { onClose(); onSaved(); }} />
        </Elements>
      </div>
    </div>
  );
}
