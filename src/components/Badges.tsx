'use client';

import { Check } from 'lucide-react';

// ── Blue verified checkmark (Instagram style) ─────────────────────────────────
type VSize = 'xs' | 'sm' | 'md' | 'lg';

const V_CFG: Record<VSize, { ring: string; icon: number }> = {
  xs: { ring: 'w-3.5 h-3.5', icon: 7  },
  sm: { ring: 'w-[18px] h-[18px]', icon: 9  },
  md: { ring: 'w-5 h-5',   icon: 11 },
  lg: { ring: 'w-6 h-6',   icon: 13 },
};

export function VerifiedBadge({ size = 'sm' }: { size?: VSize }) {
  const { ring, icon } = V_CFG[size];
  return (
    <span
      className={`inline-flex items-center justify-center ${ring} rounded-full flex-shrink-0`}
      style={{ backgroundColor: '#1D9BF0' }}
      title="Verified"
    >
      <Check size={icon} strokeWidth={3.5} className="text-white" />
    </span>
  );
}

// ── Co-founder glow badge — uses inline styles to guarantee rendering ─────────
const GRADIENT = 'linear-gradient(to right, #FF2E47, #FF8C00, #FFD700)';

export function CofounderBadge() {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* animated glow halo */}
      <div
        style={{
          position: 'absolute',
          inset: '-4px',
          borderRadius: '9999px',
          background: GRADIENT,
          filter: 'blur(8px)',
          opacity: 0.7,
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }}
      />
      {/* pill */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 12px',
          borderRadius: '9999px',
          background: GRADIENT,
          boxShadow: '0 4px 15px rgba(255,46,71,0.4)',
        }}
      >
        <span
          style={{
            fontSize: '9.5px',
            color: 'white',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          ✦ Co-Founder
        </span>
      </div>
    </div>
  );
}

// ── Profile-page badge row ─────────────────────────────────────────────────────
export function ProfileBadges({ userId }: { userId: string }) {
  const { isVerified, isCofounder } = require('@/lib/badges') as typeof import('@/lib/badges');
  const verified   = isVerified(userId);
  const cofounder  = isCofounder(userId);
  if (!verified && !cofounder) return null;
  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      {cofounder && <CofounderBadge />}
    </div>
  );
}
