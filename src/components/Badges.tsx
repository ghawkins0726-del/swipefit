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
      className={`inline-flex items-center justify-center ${ring} rounded-full bg-[#1D9BF0] flex-shrink-0`}
      title="Verified"
    >
      <Check size={icon} strokeWidth={3.5} className="text-white" />
    </span>
  );
}

// ── Co-founder glow badge (profile-level display) ─────────────────────────────
export function CofounderBadge() {
  return (
    <div className="relative inline-flex items-center">
      {/* animated glow halo */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF2E47] via-[#FF8C00] to-[#FFD700] blur-[8px] opacity-75 animate-pulse" />
      {/* pill */}
      <div className="relative flex items-center gap-1 px-3 py-[3px] rounded-full bg-gradient-to-r from-[#FF2E47] via-[#FF8C00] to-[#FFD700] shadow-lg">
        <span className="text-[9.5px] text-white font-black uppercase tracking-[0.18em] drop-shadow">
          ✦ Co-Founder
        </span>
      </div>
    </div>
  );
}

// ── Profile-page badge row (verified + cofounder stacked neatly) ──────────────
export function ProfileBadges({ userId }: { userId: string }) {
  // Import lazily so this client component doesn't bundle server-only code
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
