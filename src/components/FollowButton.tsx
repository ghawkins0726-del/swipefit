'use client';

import { useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  size?: 'sm' | 'md';
  onChange?: (following: boolean) => void;
}

/**
 * Toggle follow / unfollow on a target user.
 *
 * Optimistic UI: state flips immediately, reverts on error. The parent can
 * listen for the new state via `onChange`.
 */
export default function FollowButton({
  targetUserId, initialFollowing, size = 'md', onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFollowing(!!data.following);
      onChange?.(!!data.following);
    } catch {
      setFollowing(!next); // revert on error
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-[11px] gap-1.5'
    : 'px-4 py-2.5 text-xs gap-2';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 ${sizeClasses} ${
        following
          ? 'bg-white text-[#0A0A0A] border border-[#EBEBEB]'
          : 'bg-[#0A0A0A] text-white border border-[#0A0A0A] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]'
      }`}
    >
      {loading
        ? <Loader2 size={size === 'sm' ? 11 : 13} className="animate-spin" />
        : following
          ? <><UserCheck size={size === 'sm' ? 11 : 13} /> Following</>
          : <><UserPlus size={size === 'sm' ? 11 : 13} /> Follow</>}
    </button>
  );
}
