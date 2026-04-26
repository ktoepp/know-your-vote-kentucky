'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { committeeSlugFromName } from '@/lib/ky-committee-utils';

export type KyCommitteeOption = { slug: string; label: string };

/**
 * Distinct `ky_bills.committee_name` values via `ky_distinct_bill_committees` RPC (after migration 013 + sync).
 */
export function useKyBillCommittees(): { committees: KyCommitteeOption[]; loading: boolean } {
  const [committees, setCommittees] = useState<KyCommitteeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc('ky_distinct_bill_committees');
      if (cancelled) return;
      if (error) {
        setCommittees([]);
        setLoading(false);
        return;
      }
      const raw = data as unknown;
      let names: string[] = [];
      if (Array.isArray(raw)) {
        if (raw.length && typeof raw[0] === 'string') {
          names = raw as string[];
        }
      }
      const seen = new Set<string>();
      const out: KyCommitteeOption[] = [];
      for (const n of names) {
        const label = String(n || '').trim();
        if (!label) continue;
        const slug = committeeSlugFromName(label);
        if (seen.has(slug)) continue;
        seen.add(slug);
        out.push({ slug, label });
      }
      out.sort((a, b) => a.label.localeCompare(b.label));
      setCommittees(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { committees, loading };
}
