/**
 * Shared "unread message count" hook.
 *
 * Today, Navbar, /feed, and /messages each independently `fetch('/api/...')`
 * and `useState` an unread count. That's 3 fetches and 3 sources of truth for
 * the same value. This hook is a single-source replacement.
 *
 * Refresh triggers:
 *  - mount + auth changes
 *  - any change in `refreshKey` (pass e.g. `pathname` to refetch on nav)
 *  - background polling every `pollMs` (default 60s)
 *
 * It is intentionally minimal — no caching, no global store. When we add
 * TanStack Query, this becomes a one-line wrapper around `useQuery`.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';

const ENDPOINT = '/api/messages?count=true';

export interface UseUnreadCountOptions {
  pollMs?: number;
  /** Any value whose change should trigger a refetch (e.g. pathname). */
  refreshKey?: unknown;
}

export function useUnreadCount(opts: UseUnreadCountOptions = {}): number {
  const { pollMs = 60_000, refreshKey } = opts;
  const { user } = useUser();
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      setCount(0);
      return;
    }

    const ac = new AbortController();
    const tick = async () => {
      try {
        const res = await fetch(ENDPOINT, { signal: ac.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (mountedRef.current) setCount(typeof data?.count === 'number' ? data.count : 0);
      } catch {
        // network / abort — ignore silently
      }
    };

    tick();
    const id = setInterval(tick, pollMs);

    return () => {
      mountedRef.current = false;
      ac.abort();
      clearInterval(id);
    };
  }, [user, pollMs, refreshKey]);

  return count;
}
