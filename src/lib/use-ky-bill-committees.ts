'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';
import { committeeSlugFromName, KY_STATIC_COMMITTEES } from '@/lib/ky-committee-utils';

export type KyCommitteeOption = { slug: string; label: string; chamber?: 'house' | 'senate' | 'joint' };

/** Build the base option list from the static KY GA committee registry. */
function staticOptions(): KyCommitteeOption[] {
  const seen = new Set<string>();
  const out: KyCommitteeOption[] = [];
  for (const c of KY_STATIC_COMMITTEES) {
    const slug = committeeSlugFromName(c.name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, label: normalizeKyGaDisplayName(c.name), chamber: c.chamber });
  }
  return out;
}

/**
 * Committee options for the bill search/browse filter dropdown.
 *
 * Starts from the static KY GA standing-committee list so the dropdown is
 * always populated. Merges in any distinct `committee_name` values from the
 * DB (via `ky_distinct_bill_committees` RPC) so real LegiScan names also
 * appear once the sync has run.
 */
export function useKyBillCommittees(): { committees: KyCommitteeOption[]; loading: boolean } {
  const [committees, setCommittees] = useState<KyCommitteeOption[]>(staticOptions);
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

      const base = staticOptions();
      const seen = new Set<string>(base.map((o) => o.slug));

      if (!error && Array.isArray(data)) {
        const dbNames: string[] = data
          .map((r) => (typeof r === 'string' ? r : null))
          .filter((n): n is string => Boolean(n?.trim()));

        for (const name of dbNames) {
          const label = normalizeKyGaDisplayName(name.trim());
          const slug = committeeSlugFromName(label);
          if (seen.has(slug)) continue;
          seen.add(slug);
          base.push({ slug, label });
        }
      }

      // Sort: House first, then Senate, then Joint, then any DB extras (alphabetical within each group)
      const chamberOrder = { house: 0, senate: 1, joint: 2 };
      base.sort((a, b) => {
        const ca = chamberOrder[a.chamber ?? 'joint'] ?? 3;
        const cb = chamberOrder[b.chamber ?? 'joint'] ?? 3;
        if (ca !== cb) return ca - cb;
        return a.label.localeCompare(b.label);
      });

      if (!cancelled) {
        setCommittees(base);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { committees, loading };
}
