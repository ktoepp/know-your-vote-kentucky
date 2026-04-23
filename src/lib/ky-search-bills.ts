import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYOrdinance, KYSchoolBoardItem } from '@/types/kentucky';

/** Merge row lists in order; first occurrence of each `id` wins; cap at `limit`. */
function mergeUniqueById<T extends { id: string }>(
  limit: number,
  ...chunks: (readonly T[] | null | undefined)[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const rows of chunks) {
    for (const row of rows || []) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        out.push(row);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/**
 * Bills matching a keyword: parallel `ilike` on title / number / description / AI summary
 * (avoids PostgREST `.or()` comma-splitting on queries like "Effective Dates, Emergency"),
 * plus exact match on a `topics[]` entry (for subject/topic chips).
 */
export async function fetchKyBillsMatchingSearch(
  supabase: SupabaseClient,
  q: string,
  limit = 20,
): Promise<KYBill[]> {
  const safe = q.trim();
  if (!safe) return [];

  const likePattern = `%${safe}%`;
  const [titleRes, numberRes, descRes, summaryRes, topicRes] = await Promise.all([
    supabase.from('ky_bills').select('*').ilike('title', likePattern).limit(limit),
    supabase.from('ky_bills').select('*').ilike('bill_number', likePattern).limit(limit),
    supabase.from('ky_bills').select('*').ilike('description', likePattern).limit(limit),
    supabase.from('ky_bills').select('*').ilike('ai_summary', likePattern).limit(limit),
    supabase.from('ky_bills').select('*').contains('topics', [safe]).limit(limit),
  ]);

  for (const res of [titleRes, numberRes, descRes, summaryRes]) {
    if (res.error) throw res.error;
  }

  const topicRows = !topicRes.error ? (topicRes.data as KYBill[] | null) : null;

  return mergeUniqueById<KYBill>(
    limit,
    titleRes.data as KYBill[] | null,
    numberRes.data as KYBill[] | null,
    descRes.data as KYBill[] | null,
    summaryRes.data as KYBill[] | null,
    topicRows,
  );
}

/** Ordinances: parallel ilike on title, number, description (comma-safe). */
export async function fetchKyOrdinancesMatchingSearch(
  supabase: SupabaseClient,
  q: string,
  limit = 20,
  select = '*',
): Promise<KYOrdinance[]> {
  const safe = q.trim();
  if (!safe) return [];

  const likePattern = `%${safe}%`;
  const [t, n, d] = await Promise.all([
    supabase.from('ky_ordinances').select(select).ilike('title', likePattern).limit(limit),
    supabase.from('ky_ordinances').select(select).ilike('ordinance_number', likePattern).limit(limit),
    supabase.from('ky_ordinances').select(select).ilike('description', likePattern).limit(limit),
  ]);

  for (const res of [t, n, d]) {
    if (res.error) throw res.error;
  }

  return mergeUniqueById<KYOrdinance>(
    limit,
    t.data as KYOrdinance[] | null,
    n.data as KYOrdinance[] | null,
    d.data as KYOrdinance[] | null,
  );
}

/** School board items: parallel ilike on title and description (comma-safe). */
export async function fetchKySchoolBoardMatchingSearch(
  supabase: SupabaseClient,
  q: string,
  limit = 20,
  select = '*',
): Promise<KYSchoolBoardItem[]> {
  const safe = q.trim();
  if (!safe) return [];

  const likePattern = `%${safe}%`;
  const [t, d] = await Promise.all([
    supabase.from('ky_school_board_items').select(select).ilike('title', likePattern).limit(limit),
    supabase.from('ky_school_board_items').select(select).ilike('description', likePattern).limit(limit),
  ]);

  for (const res of [t, d]) {
    if (res.error) throw res.error;
  }

  return mergeUniqueById<KYSchoolBoardItem>(
    limit,
    t.data as KYSchoolBoardItem[] | null,
    d.data as KYSchoolBoardItem[] | null,
  );
}
