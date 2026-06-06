/**
 * Shared "current user's profile" hook.
 *
 * Today, /profile, /feed, /dna, and /messages each fetch /api/profile in their
 * own `useEffect` — no caching, no dedup, no abort. This hook centralizes the
 * fetch and exposes a stable `refresh()` for after-mutation refetches.
 *
 * Returns `null` while loading and on auth-less navigation. Drop-in: pages can
 * adopt incrementally without touching others.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { UserProfile } from '@/lib/types';

const ENDPOINT = '/api/profile';

export interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const acRef = useRef<AbortController | null>(null);

  const fetchProfile = useCallback(async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      const res = await fetch(ENDPOINT, { signal: ac.signal });
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile((data?.user ?? data) as UserProfile);
    } catch {
      // ignore abort / network
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile();
    return () => acRef.current?.abort();
  }, [user, isLoaded, fetchProfile]);

  return { profile, loading, refresh: fetchProfile };
}
