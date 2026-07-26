import type { SupabaseClient } from '@supabase/supabase-js';

export interface KyCommitteeSearchResult {
  id: string;
  name: string;
  slug: string;
  chamber: 'house' | 'senate' | 'joint' | 'unknown' | null;
}

/**
 * Committees matching a name query (public RLS on `ky_committees`). Escapes `%`/`_`/`\`
 * for ilike, same as the agenda search. Detail route is `/committees/{slug}`.
 */
export async function fetchKyCommitteesMatchingSearch(
  supabase: SupabaseClient,
  query: string,
  limit = 24,
): Promise<KyCommitteeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data, error } = await supabase
    .from('ky_committees')
    .select('id,name,slug,chamber')
    .ilike('name', `%${escaped}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as KyCommitteeSearchResult[];
}
