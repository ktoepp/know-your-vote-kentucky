import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYOrdinance, KYSchoolBoardItem } from '@/types/kentucky';
import {
  billMatchesBrowseStatusFilter,
  effectiveBillChamber,
  kyBillNumericPartEquals,
  normalizeKyBillDesignation,
} from '@/lib/bill-display';
import { billMatchesCommitteeFilter } from '@/lib/ky-committee-utils';

/**
 * Set after PostgREST reports `legiscan_subjects_search` missing (migration 015 not applied or schema stale).
 * Avoids issuing the same doomed filter on every search in this Node/browser process until restart.
 */
let omitLegiscanSubjectSearchFilter = false;

/** Skip RPC when migrations 017/018 not applied or PostgREST cache stale. */
let omitKyBillsPlainSearchRpc = false;

/** PostgREST when `ky_bills_plain_search` is missing from DB or not yet in schema cache. */
function isMissingKyBillsPlainSearchRpc(err: { message?: string; details?: string; code?: string } | null | undefined): boolean {
  const blob = `${err?.message ?? ''} ${err?.details ?? ''}`.toLowerCase();
  if (!blob.includes('ky_bills_plain_search')) return false;
  return (
    blob.includes('does not exist') ||
    blob.includes('could not find') ||
    blob.includes('schema cache') ||
    err?.code === 'PGRST202'
  );
}

/** Optional filters (URL: chamber, dateRange, status, committee). */
export type KyBillSearchFilters = {
  chamber?: 'house' | 'senate';
  dateRange?: string;
  /**
   * Status bucket: `introduced` | `in_committee` | `passed_one_chamber` | `passed` | `signed` | `vetoed` | `all`.
   * Matched in memory (DB stores LegiScan labels, not these keys). Unknown values fall back to `status` equality.
   */
  status?: string;
  /**
   * Committee filter slug (from {@link committeeSlugFromName}); matches `ky_bills.committee_name`
   * when synced, with legacy keyword fallback on title/last_action.
   */
  committee?: string;
};

/**
 * Query params (same as `/search` URL): `chamber`, `dateRange`, `status`, `committee`.
 * `status` values are UI buckets, resolved by {@link billMatchesBrowseStatusFilter}.
 */
export function buildKyBillSearchFiltersFromUrlSearch(
  sp: Readonly<URLSearchParams> | { get(name: string): string | null },
): KyBillSearchFilters {
  const ch = sp.get('chamber');
  const st = sp.get('status');
  return {
    chamber: ch === 'house' || ch === 'senate' ? ch : undefined,
    dateRange: sp.get('dateRange') || undefined,
    status: st && st !== 'all' ? st : undefined,
    committee: sp.get('committee') || undefined,
  };
}

/**
 * Turn bill-style queries into a stable, shareable form (e.g. "hb 23" → "HB23", " SB-5 " → "SB5").
 * Keyword and phrase searches are left as trimmed user text.
 */
export function canonicalizeKyBillSearchInput(raw: string): string {
  const safe = raw.trim();
  if (!safe) return safe;
  const compact = normalizeKyBillDesignation(safe).replace(/%/g, '').replace(/\\/g, '').replace(/_/g, '');
  if (!compact) return safe;
  if (/^\d+$/.test(compact)) return compact;
  if (/^[A-Z]+\d+$/.test(compact)) return compact;
  return safe;
}

/** True when the trimmed query is only digits (matches HB n, SB n, etc. in search). */
export function isDigitsOnlyBillSearchQuery(raw: string): boolean {
  return /^\d+$/.test(canonicalizeKyBillSearchInput(raw));
}

function kyBillsSearchSelect(supabase: SupabaseClient, filters: KyBillSearchFilters) {
  let q = supabase.from('ky_bills').select('*');
  if (filters.chamber === 'house') {
    q = q.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (filters.chamber === 'senate') {
    q = q.or('chamber.eq.senate,bill_number.ilike.S%');
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

/** When DB `chamber` is null, infer from bill number so filters still work. */
export function filterKyBillsByChamberClient(
  bills: KYBill[],
  chamber: 'house' | 'senate' | undefined,
): KYBill[] {
  if (!chamber) return bills;
  return bills.filter((b) => effectiveBillChamber(b) === chamber);
}

/** Merge row lists in order; first occurrence of each `id` wins (earlier chunks rank higher); no cap here. */
function mergeUniqueByIdAllChunks<T extends { id: string }>(
  ...chunks: (readonly T[] | null | undefined)[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const rows of chunks) {
    for (const row of rows || []) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        out.push(row);
      }
    }
  }
  return out;
}

/** Typical Kentucky prefixes for resolving a numeric-only query against `bill_number` (exact ilike rows). */
const KY_BILL_NUMBER_PREFIXES: readonly string[] = [
  'HB',
  'SB',
  'HR',
  'SR',
  'HJR',
  'SJR',
  'HCR',
  'SCR',
];

function sanitizeIlikeFragment(s: string): string {
  return s.replace(/%/g, '').replace(/\\/g, '').replace(/_/g, '');
}

/** PostgREST 400 when `legiscan_subjects_search` is missing from DB or not yet in schema cache. */
function isMissingLegiscanSubjectsSearchColumn(err: { message?: string; details?: string; code?: string } | null | undefined): boolean {
  const blob = `${err?.message ?? ''} ${err?.details ?? ''}`.toLowerCase();
  if (!blob.includes('legiscan_subjects_search')) return false;
  return (
    blob.includes('does not exist') ||
    blob.includes('schema cache') ||
    blob.includes('undefined column') ||
    err?.code === 'PGRST204'
  );
}

function relevanceTokensFromQuery(safe: string): string[] {
  const q = safe.toLowerCase().trim();
  return q
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9']/gi, ''))
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

/** Multi-token overlap across narrative fields + curated topics (natural-language queries). */
function scoreKeywordOverlapTokens(bill: KYBill, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const hay = [
    bill.title || '',
    bill.description || '',
    bill.ai_summary || '',
    bill.last_action || '',
    ...(bill.topics || []),
  ]
    .join(' ')
    .toLowerCase();
  let hits = 0;
  for (const tok of tokens) {
    if (hay.includes(tok)) hits++;
  }
  const allPresent = tokens.every((tok) => hay.includes(tok));
  return hits * 200 + (allPresent && tokens.length >= 2 ? 850 : 0);
}

function scoreTopicTokensPartial(bill: KYBill, tokens: string[]): number {
  if (!bill.topics?.length || tokens.length === 0) return 0;
  let add = 0;
  for (const topic of bill.topics) {
    const tl = topic.toLowerCase();
    for (const tok of tokens) {
      if (tl.includes(tok)) add += 360;
    }
  }
  return add;
}

function relevanceScoreForKyBillSearch(
  bill: KYBill,
  safe: string,
  compactDesignation: string,
  numericOnlyQuery: boolean,
  tokens: string[],
): number {
  const bnCompact = normalizeKyBillDesignation(bill.bill_number);
  let score = 0;

  if (numericOnlyQuery) {
    if (kyBillNumericPartEquals(bill.bill_number, compactDesignation)) score += 6000;
  } else {
    if (bnCompact === compactDesignation) score += 6500;
    else if (
      bnCompact.includes(compactDesignation) ||
      bnCompact.endsWith(compactDesignation)
    ) {
      const extraDigits = bnCompact.length - compactDesignation.length;
      score += Math.max(0, 3800 - extraDigits * 50);
    }
  }

  const qLow = safe.toLowerCase().trim();
  if (bill.title?.toLowerCase().includes(qLow)) score += 800;
  if (bill.description?.toLowerCase().includes(qLow)) score += 450;
  if (bill.ai_summary?.toLowerCase().includes(qLow)) score += 350;
  if (bill.topics?.some((t) => t.toLowerCase() === qLow)) score += 500;

  if (bill.last_action?.toLowerCase().includes(qLow)) score += 320;
  if (bill.session && qLow.length >= 3 && bill.session.toLowerCase().includes(qLow)) score += 180;

  score += scoreLegiscanSubjectSearch(bill.legiscan_subjects_search, qLow);
  score += scoreKeywordOverlapTokens(bill, tokens);
  score += scoreTopicTokensPartial(bill, tokens);

  return score;
}

/** Rank LegiScan subject matches (`legiscan_subjects_search`): full-line phrase match boosts chip clicks. */
function scoreLegiscanSubjectSearch(blob: string | null | undefined, qLow: string): number {
  if (!blob || qLow === '') return 0;
  let best = 0;
  const lines = blob.split('\n');
  for (const line of lines) {
    if (line === qLow) best = Math.max(best, 7600);
    else if (line.includes(qLow)) best = Math.max(best, 6400);
    else if (qLow.length >= 4 && qLow.includes(line) && line.length >= 4) best = Math.max(best, 5600);
  }
  if (best === 0 && blob.includes(qLow)) best = 4800;
  return best;
}

function compareSessionsDescKy(a: KYBill, b: KYBill): number {
  return String(b.session ?? '').localeCompare(String(a.session ?? ''));
}

/**
 * Bills matching a keyword: parallel `ilike` on title / number / description / AI summary
 * (avoids PostgREST `.or()` comma-splitting on queries like "Effective Dates, Emergency"),
 * LegiScan `legiscan_subjects_search` (`ilike`),
 * plus exact match on curated `topics[]` (homepage/chip UX).
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
      filters.committee || (filters.status && filters.status !== 'all') ? limit * 6 : limit,
    ),
  );

  const likePattern = `%${safe}%`;
  const compactDesignation = sanitizeIlikeFragment(normalizeKyBillDesignation(safe));
  /** Digits-only: use exact bill_number rows (HB23 …), not `%23%` (would match HB123). */
  const numericOnlyQuery = /^\d+$/.test(compactDesignation);

  const base = () => kyBillsSearchSelect(supabase, filters);

  const digitBillOrClause = numericOnlyQuery
    ? KY_BILL_NUMBER_PREFIXES.map((p) => `bill_number.ilike.${p}${compactDesignation}`).join(',')
    : '';

  const subjectsFrag = sanitizeIlikeFragment(safe.toLowerCase());
  const queryLegiscanSubjects = subjectsFrag !== '' && !omitLegiscanSubjectSearchFilter;

  const ftsPromise = (async () => {
    if (numericOnlyQuery || safe.length < 2 || omitKyBillsPlainSearchRpc) {
      return { data: [] as KYBill[] | null, error: null };
    }
    const { data, error } = await supabase.rpc('ky_bills_plain_search', {
      search_query: safe,
      max_rows: mergeCap,
    });
    return { data: data as KYBill[] | null, error };
  })();

  const [
    digitsOnlyNumberRes,
    billNumberCompactRes,
    ftsRes,
    legiscanSubjectsRes,
    titleRes,
    descRes,
    summaryRes,
    topicRes,
    lastActionRes,
    sessionRes,
  ] = await Promise.all([
    numericOnlyQuery
      ? base().or(digitBillOrClause).order('session', { ascending: false }).limit(mergeCap)
      : Promise.resolve({ data: [] as KYBill[] | null, error: null }),
    numericOnlyQuery
      ? Promise.resolve({ data: [] as KYBill[] | null, error: null })
      : compactDesignation
        ? base()
            .ilike('bill_number', `%${compactDesignation}%`)
            .order('session', { ascending: false })
            .limit(mergeCap)
        : Promise.resolve({ data: [] as KYBill[] | null, error: null }),
    ftsPromise,
    queryLegiscanSubjects
      ? base()
          .ilike('legiscan_subjects_search', `%${subjectsFrag}%`)
          .order('session', { ascending: false })
          .limit(mergeCap)
      : Promise.resolve({ data: [] as KYBill[] | null, error: null }),
    base().ilike('title', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('description', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('ai_summary', likePattern).order('session', { ascending: false }).limit(mergeCap),
    base().contains('topics', [safe]).order('session', { ascending: false }).limit(mergeCap),
    base().ilike('last_action', likePattern).order('session', { ascending: false }).limit(mergeCap),
    safe.length >= 3
      ? base().ilike('session', likePattern).order('session', { ascending: false }).limit(mergeCap)
      : Promise.resolve({ data: [] as KYBill[] | null, error: null }),
  ]);

  if (
    queryLegiscanSubjects &&
    legiscanSubjectsRes.error &&
    !isMissingLegiscanSubjectsSearchColumn(legiscanSubjectsRes.error)
  ) {
    throw legiscanSubjectsRes.error;
  }

  if (
    queryLegiscanSubjects &&
    legiscanSubjectsRes.error &&
    isMissingLegiscanSubjectsSearchColumn(legiscanSubjectsRes.error)
  ) {
    omitLegiscanSubjectSearchFilter = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[ky-search-bills] legiscan_subjects_search unavailable (run migration 015 or reload PostgREST schema). Skipping LegiScan subject filter on subsequent searches until restart.',
      );
    }
  }

  if (ftsRes.error) {
    if (isMissingKyBillsPlainSearchRpc(ftsRes.error)) {
      omitKyBillsPlainSearchRpc = true;
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[ky-search-bills] ky_bills_plain_search RPC unavailable (run migrations 017+018 or reload schema). Falling back to ilike legs only until restart.',
        );
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[ky-search-bills] ky_bills_plain_search RPC failed (FTS leg skipped); ilike legs still apply.',
        ftsRes.error.message ?? ftsRes.error,
      );
    }
  }

  const legiscanSubjectRows =
    queryLegiscanSubjects && !legiscanSubjectsRes.error
      ? (legiscanSubjectsRes.data as KYBill[] | null)
      : null;

  const ftsRows = !ftsRes.error ? (ftsRes.data as KYBill[] | null) : null;

  const staticResChecks = [
    digitsOnlyNumberRes,
    billNumberCompactRes,
    titleRes,
    descRes,
    summaryRes,
    topicRes,
    lastActionRes,
    sessionRes,
  ];
  for (const res of staticResChecks) {
    if (res.error) throw res.error;
  }

  const topicRows = !topicRes.error ? (topicRes.data as KYBill[] | null) : null;

  /** Bill-number matches must rank ahead of titles so busy keyword sessions do not bury them. */
  let merged = mergeUniqueByIdAllChunks<KYBill>(
    numericOnlyQuery ? (digitsOnlyNumberRes.data as KYBill[] | null) : (billNumberCompactRes.data as KYBill[] | null),
    ftsRows,
    legiscanSubjectRows,
    topicRows,
    titleRes.data as KYBill[] | null,
    descRes.data as KYBill[] | null,
    summaryRes.data as KYBill[] | null,
    lastActionRes.data as KYBill[] | null,
    sessionRes.data as KYBill[] | null,
  );

  merged = filterKyBillsByDateRange(merged, filters.dateRange);
  if (filters.committee) {
    merged = merged.filter((b) => billMatchesCommitteeFilter(b, filters.committee));
  }
  if (filters.chamber === 'house' || filters.chamber === 'senate') {
    merged = filterKyBillsByChamberClient(merged, filters.chamber);
  }
  if (filters.status && filters.status !== 'all') {
    merged = merged.filter((b) => billMatchesBrowseStatusFilter(b, filters.status));
  }

  const rankingTokens = relevanceTokensFromQuery(safe);
  const stable = [...merged];
  stable.sort((a, b) => {
    const ra = relevanceScoreForKyBillSearch(a, safe, compactDesignation, numericOnlyQuery, rankingTokens);
    const rb = relevanceScoreForKyBillSearch(b, safe, compactDesignation, numericOnlyQuery, rankingTokens);
    if (rb !== ra) return rb - ra;
    return compareSessionsDescKy(a, b);
  });

  return stable.slice(0, limit);
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

  return mergeUniqueByIdAllChunks<KYOrdinance>(
    t.data as KYOrdinance[] | null,
    n.data as KYOrdinance[] | null,
    d.data as KYOrdinance[] | null,
  ).slice(0, limit);
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

  return mergeUniqueByIdAllChunks<KYSchoolBoardItem>(
    t.data as KYSchoolBoardItem[] | null,
    d.data as KYSchoolBoardItem[] | null,
  ).slice(0, limit);
}
