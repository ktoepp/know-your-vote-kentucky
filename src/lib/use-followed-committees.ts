'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/app/lib/UserContext';

type CommitteeFollowRow = {
  committee: {
    id: string;
    name: string;
    slug: string;
    chamber: string;
  } | null;
  created_at: string;
};

export type FollowedCommitteeRow = CommitteeFollowRow;

/**
 * Loads the signed-in user's followed committee IDs from `/api/me/follows`.
 * Returns a set of committee UUIDs and a toggle function for follow/unfollow.
 */
export function useFollowedCommittees(): {
  followedCommitteeIds: ReadonlySet<string>;
  rows: FollowedCommitteeRow[];
  ready: boolean;
  authed: boolean;
  toggleFollow: (committeeId: string) => Promise<void>;
  reload: () => void;
} {
  const { user, session } = useUser();
  const token = session?.access_token ?? null;
  const authed = Boolean(user && token);

  const [followedCommitteeIds, setFollowedCommitteeIds] = useState<ReadonlySet<string>>(new Set());
  const [rows, setRows] = useState<FollowedCommitteeRow[]>([]);
  const [ready, setReady] = useState(!authed);

  const load = useCallback(async () => {
    if (!authed || !token) {
      setFollowedCommitteeIds((prev) => (prev.size === 0 ? prev : new Set()));
      setRows([]);
      setReady(true);
      return;
    }

    setReady(false);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const r = await fetch('/api/me/follows', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const body = (await r.json().catch(() => ({}))) as {
        committees?: FollowedCommitteeRow[];
        error?: string;
      };
      const committeeRows = body.committees ?? [];
      const ids = new Set<string>();
      for (const row of committeeRows) {
        const id = row?.committee?.id;
        if (id) ids.add(id);
      }
      setFollowedCommitteeIds(ids);
      setRows(committeeRows);
    } catch {
      setFollowedCommitteeIds(new Set());
      setRows([]);
    } finally {
      window.clearTimeout(timeoutId);
      setReady(true);
    }
  }, [authed, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = useCallback(
    async (committeeId: string) => {
      if (!token) return;
      const isFollowing = followedCommitteeIds.has(committeeId);

      // Optimistic update.
      setFollowedCommitteeIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(committeeId);
        else next.add(committeeId);
        return next;
      });
      setRows((prev) =>
        isFollowing
          ? prev.filter((r) => r.committee?.id !== committeeId)
          : prev,
      );

      try {
        const res = await fetch(`/api/committees/${encodeURIComponent(committeeId)}/follow`, {
          method: isFollowing ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Follow request failed');
        // On POST, reload to pick up the committee metadata row.
        if (!isFollowing) void load();
      } catch {
        // Revert on failure.
        setFollowedCommitteeIds((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.add(committeeId);
          else next.delete(committeeId);
          return next;
        });
      }
    },
    [token, followedCommitteeIds, load],
  );

  return { followedCommitteeIds, rows, ready, authed, toggleFollow, reload: load };
}
