'use client';

import { useEffect, useState } from 'react';
import type { KYLegislatorRoster } from '@/types/kentucky';

let sharedInflight: Promise<KYLegislatorRoster[]> | null = null;
let sharedRoster: KYLegislatorRoster[] | null = null;

function loadActiveRoster(): Promise<KYLegislatorRoster[]> {
  if (sharedRoster) return Promise.resolve(sharedRoster);
  if (!sharedInflight) {
    sharedInflight = fetch('/api/roster/active')
      .then((r) => {
        if (!r.ok) throw new Error('Roster fetch failed');
        return r.json();
      })
      .then((body: { roster?: KYLegislatorRoster[] }) => {
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

/** Cached active legislator roster for client browse/search (avoids per-page Supabase `select`). */
export function useKyActiveLegislatorRoster(): KYLegislatorRoster[] {
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>(sharedRoster ?? []);

  useEffect(() => {
    let cancelled = false;
    loadActiveRoster()
      .then((roster) => {
        if (!cancelled) setLegislators(roster);
      })
      .catch(() => {
        if (!cancelled) setLegislators([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return legislators;
}
