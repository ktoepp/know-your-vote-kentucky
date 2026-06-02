import { unstable_cache } from 'next/cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';
import {
  billMatchesBrowseStatusFilter,
  compareKyBills,
  effectiveBillChamber,
  isKyJointResolutionBill,
  type KyBillSortKey,
} from '@/lib/bill-display';
import { getCivicDataSessionName } from '@/lib/ky-sessions';

export type KyBillsBrowseChamberMode = 'all' | 'house' | 'senate';

/** Empty string = no chamber filter (all bills). */
export type KyBillsBrowseChamberFilter = '' | 'house' | 'senate' | 'joint';

/** Columns needed for browse cards + filters (omit long narrative fields). */
export const KY_BILL_BROWSE_SELECT =
  'id,bill_number,title,status,last_action,last_action_date,introduced_date,session,chamber,sponsors,topics,legiscan_id,committee_name,openstates_id';

// PostgREST caps responses at ~1000 rows by default, so the in-memory path can never
// actually receive more than that. Keep the cap aligned with reality so the `capped`
// flag (rows.length >= cap) is honest and the UI shows the "more may match" caveat.
const IN_MEMORY_FILTER_CAP = 1000;
const BILLS_BROWSE_REVALIDATE_SECONDS = 60;

export type KyBillsBrowseQuery = {
  chamberMode: KyBillsBrowseChamberMode;
  chamberFilter: KyBillsBrowseChamberFilter;
  statusFilter: string;
  topicFilter: string;
  /** Exact match against `ky_bills.session`. Empty string = all sessions. */
  sessionFilter: string;
  followIds: string[];
  sortBy: KyBillSortKey;
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

export type KyBillsBrowseResult = {
  bills: KYBill[];
  total: number;
  capped: boolean;
};

function createAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function effectiveChamber(
  chamberMode: KyBillsBrowseChamberMode,
  chamberFilter: KyBillsBrowseChamberFilter,
): 'all' | 'house' | 'senate' | 'joint' {
  if (chamberMode === 'house' || chamberMode === 'senate') return chamberMode;
  return chamberFilter || 'all';
}

type BillQuery = {
  or: (filter: string) => BillQuery;
  contains: (column: string, value: string[]) => BillQuery;
  order: (column: string, opts: { ascending: boolean; nullsFirst?: boolean }) => BillQuery;
  limit: (n: number) => BillQuery;
  range: (from: number, to: number) => BillQuery;
  select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => BillQuery;
};

/** Cast helper: PostgrestFilterBuilder has `.eq`, but adding it to BillQuery causes deep type instantiation. */
function eqBillSession<T extends BillQuery>(query: T, session: string): T {
  return (query as unknown as { eq: (col: string, val: string) => T }).eq('session', session);
}

function applyChamberToQuery<T extends BillQuery>(
  query: T,
  chamber: 'all' | 'house' | 'senate' | 'joint',
): T {
  if (chamber === 'house') return query.or('chamber.eq.house,bill_number.ilike.H%') as T;
  if (chamber === 'senate') return query.or('chamber.eq.senate,bill_number.ilike.S%') as T;
  if (chamber === 'joint') {
    return query.or(
      'bill_number.ilike.HJR%,bill_number.ilike.HCR%,bill_number.ilike.SJR%,bill_number.ilike.SCR%',
    ) as T;
  }
  return query;
}

function needsInMemoryFiltering(query: KyBillsBrowseQuery): boolean {
  const nonDefaultSort = query.sortBy !== 'last_action_date' || query.sortDir !== 'desc';
  // House/Senate are fully SQL-expressible (chamber column OR bill_number prefix), so a
  // chamber chip can use the exact-count + SQL-pagination path. Only `joint` needs the
  // in-memory path because joint detection (isKyJointResolutionBill) is stricter than the
  // bill_number prefix match.
  return (
    nonDefaultSort ||
    (query.statusFilter !== '' && query.statusFilter !== 'all') ||
    query.followIds.length > 0 ||
    (query.chamberMode === 'all' && query.chamberFilter === 'joint')
  );
}

function filterBrowseRows(bills: KYBill[], query: KyBillsBrowseQuery): KYBill[] {
  const chamber = effectiveChamber(query.chamberMode, query.chamberFilter);
  return bills.filter((bill) => {
    if (query.chamberMode === 'all' && query.chamberFilter) {
      if (query.chamberFilter === 'joint') {
        if (!isKyJointResolutionBill(bill)) return false;
      } else if (effectiveBillChamber(bill) !== query.chamberFilter) {
        return false;
      }
    }
    if (!billMatchesBrowseStatusFilter(bill, query.statusFilter)) return false;
    if (query.topicFilter && !bill.topics?.includes(query.topicFilter)) return false;
    if (query.sessionFilter && bill.session !== query.sessionFilter) return false;
    if (query.followIds.length > 0 && !query.followIds.includes(bill.id)) return false;
    if (chamber !== 'all' && effectiveBillChamber(bill) !== chamber && query.chamberMode !== 'all') {
      return false;
    }
    return true;
  });
}

function sortBrowseRows(bills: KYBill[], query: KyBillsBrowseQuery): KYBill[] {
  const next = [...bills];
  next.sort((a, b) => {
    const c = compareKyBills(a, b, query.sortBy);
    return query.sortDir === 'asc' ? c : -c;
  });
  return next;
}

async function fetchChamberScopedRows(
  supabase: SupabaseClient,
  query: KyBillsBrowseQuery,
  limit: number,
): Promise<{ rows: KYBill[]; capped: boolean }> {
  const chamber = effectiveChamber(query.chamberMode, query.chamberFilter);
  let q = supabase
    .from('ky_bills')
    .select(KY_BILL_BROWSE_SELECT)
    .order('session', { ascending: false })
    .order('last_action_date', { ascending: false, nullsFirst: false });
  q = applyChamberToQuery(q, chamber);
  if (query.topicFilter) {
    q = q.contains('topics', [query.topicFilter]);
  }
  if (query.sessionFilter) {
    q = eqBillSession(q, query.sessionFilter);
  }
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as KYBill[];
  return { rows, capped: rows.length >= limit };
}

async function fetchKyBillsBrowsePageUncached(query: KyBillsBrowseQuery): Promise<KyBillsBrowseResult> {
  const supabase = createAnonClient();
  if (!supabase) return { bills: [], total: 0, capped: false };

  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));

  if (needsInMemoryFiltering(query)) {
    const { rows, capped } = await fetchChamberScopedRows(supabase, query, IN_MEMORY_FILTER_CAP);
    const filtered = sortBrowseRows(filterBrowseRows(rows, query), query);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return {
      bills: filtered.slice(start, start + pageSize),
      total,
      capped,
    };
  }

  const chamber = effectiveChamber(query.chamberMode, query.chamberFilter);
  let countQ = supabase.from('ky_bills').select('id', { count: 'exact', head: true });
  countQ = applyChamberToQuery(countQ, chamber);
  if (query.topicFilter) {
    countQ = countQ.contains('topics', [query.topicFilter]);
  }
  if (query.sessionFilter) {
    countQ = countQ.eq('session', query.sessionFilter);
  }

  let rowQ = supabase
    .from('ky_bills')
    .select(KY_BILL_BROWSE_SELECT)
    .order('session', { ascending: false })
    .order('last_action_date', { ascending: false, nullsFirst: false });
  rowQ = applyChamberToQuery(rowQ, chamber);
  if (query.topicFilter) {
    rowQ = rowQ.contains('topics', [query.topicFilter]);
  }
  if (query.sessionFilter) {
    rowQ = rowQ.eq('session', query.sessionFilter);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [countRes, rowRes] = await Promise.all([countQ, rowQ.range(from, to)]);
  if (countRes.error) throw countRes.error;
  if (rowRes.error) throw rowRes.error;

  const bills = sortBrowseRows((rowRes.data ?? []) as KYBill[], query);
  return {
    bills,
    total: countRes.count ?? bills.length,
    capped: false,
  };
}

function getCachedKyBillsBrowsePage(query: KyBillsBrowseQuery): Promise<KyBillsBrowseResult> {
  return unstable_cache(
    () => fetchKyBillsBrowsePageUncached(query),
    [
      'ky-bills-browse',
      query.chamberMode,
      query.chamberFilter,
      query.statusFilter,
      query.topicFilter,
      query.sessionFilter,
      query.sortBy,
      query.sortDir,
      String(query.page),
      String(query.pageSize),
    ],
    { revalidate: BILLS_BROWSE_REVALIDATE_SECONDS },
  )();
}

export async function fetchKyBillsBrowsePage(query: KyBillsBrowseQuery): Promise<KyBillsBrowseResult> {
  if (needsInMemoryFiltering(query)) {
    return fetchKyBillsBrowsePageUncached(query);
  }
  return getCachedKyBillsBrowsePage(query);
}

/** Exact measure count (bills + resolutions) for the current/most-recent session — for the home card. */
export async function fetchKyCurrentSessionBillCount(): Promise<number> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      if (!supabase) return 0;
      const session = getCivicDataSessionName();
      const { count, error } = await supabase
        .from('ky_bills')
        .select('id', { count: 'exact', head: true })
        .eq('session', session);
      if (error) return 0;
      return count ?? 0;
    },
    ['ky-current-session-bill-count'],
    { revalidate: BILLS_BROWSE_REVALIDATE_SECONDS },
  )();
}
