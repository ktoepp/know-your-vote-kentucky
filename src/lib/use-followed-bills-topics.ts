'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/app/lib/UserContext';

type FollowRow = { bill?: { id?: string } | null };

/**
 * Loads the signed-in user's followed bill IDs and topic labels from `/api/me/follows`.
 * When not signed in, returns empty sets and `ready: true` immediately.
 */
export function useFollowedBillsAndTopics(): {
  followedBillIds: ReadonlySet<string>;
  followedTopics: ReadonlySet<string>;
  /** False while the follows request is in flight (only when authed). */
  ready: boolean;
  authed: boolean;
} {
  const { user, session } = useUser();
  const token = session?.access_token ?? null;
  const authed = Boolean(user && token);

  const [followedBillIds, setFollowedBillIds] = useState<ReadonlySet<string>>(new Set());
  const [followedTopics, setFollowedTopics] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(!authed);

  useEffect(() => {
    if (!authed || !token) {
      setFollowedBillIds((prev) => (prev.size === 0 ? prev : new Set()));
      setFollowedTopics((prev) => (prev.size === 0 ? prev : new Set()));
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    fetch('/api/me/follows', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error((body as { error?: string }).error);
        const rows = (body as { bills?: FollowRow[]; topics?: string[] }).bills ?? [];
        const ids = new Set<string>();
        for (const row of rows) {
          const id = row?.bill?.id;
          if (id) ids.add(id);
        }
        const topics = (body as { topics?: string[] }).topics ?? [];
        setFollowedBillIds(ids);
        setFollowedTopics(new Set(topics));
      })
      .catch(() => {
        if (!cancelled) {
          setFollowedBillIds(new Set());
          setFollowedTopics(new Set());
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [authed, token, user?.id]);

  return { followedBillIds, followedTopics, ready, authed };
}
