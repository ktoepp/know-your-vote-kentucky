import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYOrdinance, KYSchoolBoardItem } from '@/types/kentucky';
import { effectiveBillChamber } from '@/lib/bill-display';

/** Optional filters (URL: chamber, dateRange, status, committee). */
export type KyBillSearchFilters = {
  chamber?: 'house' | 'senate';
  dateRange?: string;
  /** Exact `ky_bills.status` match; omit or `all` for any. */
  status?: string;
  /** SearchBar committee slug — matched loosely on title / last_action. */
  committee?: string;
};

const COMMITTEE_SLUG_HINTS: Record<string, string> = {
  appropriations: 'appropriation',
  budget: 'budget',
  finance: 'finance',
  'foreign-relations': 'foreign',
  judiciary: 'judiciary',
};

function kyBillsSearchSelect(supabase: SupabaseClient, filters: KyBillSearchFilters) {
  let q = supabase.from('ky_bills').select('*');
  if (filters.chamber === 'house') {
    q = q.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (filters.chamber === 'senate') {
    q = q.or('chamber.eq.senate,bill_number.ilike.S%');
  }
  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status);
  }
  return q;
}

function minDateForRange(key: string): Date | null {
  if (!key) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'today':
      return startOfToday;
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export function filterKyBillsByDateRange(bills: KYBill[], dateRange: string | undefined): KYBill[] {
  const min = minDateForRange(dateRange || '');
  if (!min) return bills;
  return bills.filter((b) => {
    const raw = b.last_action_date || b.introduced_date;
    if (!raw) return false;
    return new Date(raw).getTime() >= min.getTime();
  });
}

function filterKyBillsByCommitteeSlug(bills: KYBill[], committeeSlug: string | undefined): KYBill[] {
  const hint = committeeSlug ? COMMITTEE_SLUG_HINTS[committeeSlug] : undefined;
  if (!hint) return bills;
  const h = hint.toLowerCase();
  return bills.filter(
    (b) =>
      (b.last_action || '').toLowerCase().includes(h) || (b.title || '').toLowerCase().includes(h),
  );
}

/** When DB `chamber` is null, infer from bill number so filters still work. */
export function filterKyBillsByChamberClient(
  bills: KYBill[],
  chamber: 'house' | 'senate' | undefined,
): KYBill[] {
  if (!chamber) return bills;
  return bills.filter((b) => effectiveBillChamber(b) === chamber);
}

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
  filters: KyBillSearchFilters = {},
): Promise<KYBill[]> {
  const safe = q.trim();
  if (!safe) return [];

  /** Was 120 and capped merge results too low; KY session-scale search needs room for 25/50/100 per page. */
  const mergeCap = Math.min(
    1000,
    Math.max(
      limit,
      filters.committee || filters.dateRange ? limit * 4 : limit,
      filters.chamber ? limit * 3 : limit,
    ),
  );

  const likePattern = `%${safe}%`;
  const base = () => kyBillsSearchSelect(supabase, filters);
  const [titleRes, numberRes, descRes, summaryRes, topicRes] = await Promise.all([
    base().ilike('title', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('bill_number', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('description', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('ai_summary', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().contains('topics', [safe]).order('session', { ascending: false }).limit(mergeCap),
  ]);

  for (const res of [titleRes, numberRes, descRes, summaryRes]) {
    if (res.error) throw res.error;
  }

  const topicRows = !topicRes.error ? (topicRes.data as KYBill[] | null) : null;

  let merged = mergeUniqueById<KYBill>(
    mergeCap,
    titleRes.data as KYBill[] | null,
    numberRes.data as KYBill[] | null,
    descRes.data as KYBill[] | null,
    summaryRes.data as KYBill[] | null,
    topicRows,
  );

  merged = filterKyBillsByDateRange(merged, filters.dateRange);
  merged = filterKyBillsByCommitteeSlug(merged, filters.committee);
  if (filters.chamber === 'house' || filters.chamber === 'senate') {
    merged = filterKyBillsByChamberClient(merged, filters.chamber);
  }

  return merged.slice(0, limit);
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
