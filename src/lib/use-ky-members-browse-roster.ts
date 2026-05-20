'use client';

import { useEffect, useState } from 'react';
import type { KYLegislator } from '@/types/kentucky';

let sharedRoster: KYLegislator[] | null = null;
let sharedInflight: Promise<KYLegislator[]> | null = null;

function loadMembersBrowseRoster(): Promise<KYLegislator[]> {
  if (sharedRoster) return Promise.resolve(sharedRoster);
  if (!sharedInflight) {
    sharedInflight = fetch('/api/roster/members')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load legislators');
        return r.json();
      })
      .then((body: { roster?: KYLegislator[] }) => {
        const roster = body.roster ?? [];
        sharedRoster = roster;
        return roster;
      })
      .finally(() => {
        sharedInflight = null;
      });
  }
  return sharedInflight;
}

/** Cached members/map roster (slim columns, includes inactive rows for dedupe). */
export function useKyMembersBrowseRoster(): { roster: KYLegislator[]; loading: boolean; error: string | null } {
  const [roster, setRoster] = useState<KYLegislator[]>(sharedRoster ?? []);
  const [loading, setLoading] = useState(!sharedRoster);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMembersBrowseRoster()
      .then((rows) => {
        if (!cancelled) setRoster(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load legislators');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { roster, loading, error };
}
