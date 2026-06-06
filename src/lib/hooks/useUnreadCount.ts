/**
 * Shared "unread message count" hook.
 *
 * Today, Navbar, /feed, and /messages each independently `fetch('/api/...')`
 * and `useState` an unread count. That's 3 fetches and 3 sources of truth for
 * the same value. This hook is a single-source replacement.
 *
 * It is intentionally minimal — no caching, no global store. It refreshes on
 * mount and at the cadence specified by `pollMs` (default 60s). When we add
 * TanStack Query, this becomes a one-line wrapper around `useQuery`.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';

const ENDPOINT = '/api/messages?count=true';

export function useUnreadCount(pollMs = 60_000): number {
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
  }, [user, pollMs]);

  return count;
}
