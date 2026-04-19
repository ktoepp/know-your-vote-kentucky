import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';

/**
 * Bills matching a keyword: title / number / description / AI summary (ilike)
 * plus exact match on a `topics[]` entry (for subject/topic chips).
 */
export async function fetchKyBillsMatchingSearch(
  supabase: SupabaseClient,
  q: string,
  limit = 20,
): Promise<KYBill[]> {
  const safe = q.trim();
  if (!safe) return [];

  const [likeRes, topicRes] = await Promise.all([
    supabase
      .from('ky_bills')
      .select('*')
      .or(
        `title.ilike.%${safe}%,bill_number.ilike.%${safe}%,description.ilike.%${safe}%,ai_summary.ilike.%${safe}%`,
      )
      .limit(limit),
    supabase.from('ky_bills').select('*').contains('topics', [safe]).limit(limit),
  ]);

  if (likeRes.error) throw likeRes.error;

  const map = new Map<string, KYBill>();
  for (const row of likeRes.data || []) {
    map.set(row.id, row as KYBill);
  }
  if (!topicRes.error) {
    for (const row of topicRes.data || []) {
      if (!map.has(row.id)) map.set(row.id, row as KYBill);
    }
  }

  return Array.from(map.values()).slice(0, limit);
}
