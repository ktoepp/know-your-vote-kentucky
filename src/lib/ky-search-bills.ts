import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYOrdinance, KYSchoolBoardItem } from '@/types/kentucky';
import {
  billMatchesBrowseStatusFilter,
  effectiveBillChamber,
  isKyJointResolutionBill,
  kyBillNumericPartEquals,
  normalizeKyBillDesignation,
} from '@/lib/bill-display';
import { billMatchesCommitteeFilter } from '@/lib/ky-committee-utils';
import { KY_BILL_SEARCH_SELECT } from '@/lib/ky-bill-search-select';
import { parseKyBillSessionParam } from '@/lib/ky-bills-browse-url';

/**
 * Set after PostgREST reports `legiscan_subjects_search` missing (migration 015 not applied or schema stale).
 * Avoids issuing the same doomed filter on every search in this Node/browser process until restart.
 */
let omitLegiscanSubjectSearchFilter = false;

/** Skip RPC when migrations 017/018 not applied or PostgREST cache stale. */
let omitKyBillsPlainSearchRpc = false;

/** Skip the popular-name RPC when migration 044 isn't applied or PostgREST cache is stale. */
let omitKyBillsPopularNameRpc = false;

/** PostgREST when `ky_bills_popular_name_search` is missing from DB or not yet in schema cache. */
function isMissingKyBillsPopularNameRpc(err: { message?: string; details?: string; code?: string } | null | undefined): boolean {
  const blob = `${err?.message ?? ''} ${err?.details ?? ''}`.toLowerCase();
  if (!blob.includes('ky_bills_popular_name_search')) return false;
  return (
    blob.includes('does not exist') ||
    blob.includes('could not find') ||
    blob.includes('schema cache') ||
    err?.code === 'PGRST202'
  );
}

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

/** Optional filters (URL: chamber, dateRange, status, committee, session). */
export type KyBillSearchFilters = {
  chamber?: 'house' | 'senate' | 'joint';
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
  /** Exact match against `ky_bills.session`; validated against {@link KY_BILL_SESSION_OPTIONS}. */
  session?: string;
};

/** Date-range keys the search UI offers; anything else is treated as unset (see {@link minDateForRange}). */
export const KY_BILL_SEARCH_DATE_RANGE_KEYS = ['today', 'week', 'month', 'quarter', 'year'] as const;

export type KyBillSearchDateRangeKey = (typeof KY_BILL_SEARCH_DATE_RANGE_KEYS)[number];

export function parseKyBillSearchDateRangeParam(value: string | null): KyBillSearchDateRangeKey | '' {
  return (KY_BILL_SEARCH_DATE_RANGE_KEYS as readonly string[]).includes(value ?? '')
    ? (value as KyBillSearchDateRangeKey)
    : '';
}

/**
 * Query params (same as `/search` URL): `chamber`, `dateRange`, `status`, `committee`, `session`.
 * `status` values are UI buckets, resolved by {@link billMatchesBrowseStatusFilter}.
 */
export function buildKyBillSearchFiltersFromUrlSearch(
  sp: Readonly<URLSearchParams> | { get(name: string): string | null },
): KyBillSearchFilters {
  const ch = sp.get('chamber');
  const st = sp.get('status');
  const session = parseKyBillSessionParam(sp.get('session'));
  return {
    chamber: ch === 'house' || ch === 'senate' || ch === 'joint' ? ch : undefined,
    dateRange: parseKyBillSearchDateRangeParam(sp.get('dateRange')) || undefined,
    status: st && st !== 'all' ? st : undefined,
    committee: sp.get('committee') || undefined,
    session: session || undefined,
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
  let q = supabase.from('ky_bills').select(KY_BILL_SEARCH_SELECT);
  if (filters.chamber === 'house') {
    q = q.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (filters.chamber === 'senate') {
    q = q.or('chamber.eq.senate,bill_number.ilike.S%');
  } else if (filters.chamber === 'joint') {
    q = q.or(
      'bill_number.ilike.HJR%,bill_number.ilike.HCR%,bill_number.ilike.SJR%,bill_number.ilike.SCR%',
    );
  }
  if (filters.session) {
    q = q.eq('session', filters.session);
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
  chamber: 'house' | 'senate' | 'joint' | undefined,
): KYBill[] {
  if (!chamber) return bills;
  if (chamber === 'joint') {
    return bills.filter((b) => isKyJointResolutionBill(b));
  }
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

/**
 * Low-substance instruments to demote in topical search: confirmation/appointment
 * resolutions and ceremonial (honoring/recognizing/…) resolutions. These match a
 * topical keyword (e.g. "education") as strongly as a substantive bill via title /
 * LegiScan subject, so without a prior they crowd out real legislation in the top
 * results. Demotion (not exclusion) keeps them discoverable — see the intent guard
 * in {@link shouldPenalizeLowSubstanceResolutions}. Detection rides on LRC's regular
 * title drafting; validated against a full session's resolutions (substantive task
 * forces / policy resolutions are intentionally left untouched).
 */
const SEARCH_RESOLUTION_DESIGNATION_RE = /^(?:HR|SR|HJR|SJR|HCR|SCR)\d/;
const SEARCH_APPOINTMENT_RESOLUTION_RE = /\bconfirming the (?:re)?appointment\b/i;
const SEARCH_CEREMONIAL_RESOLUTION_RE =
  /^a\s+(?:joint\s+|concurrent\s+)?resolution\s+(?:honoring|recognizing|congratulating|commemorating|celebrating|mourning|designating|adjourning|in memory of)\b/i;

/** Score subtracted from a low-substance resolution so substantive matches outrank it (topical queries only). */
const LOW_SUBSTANCE_RESOLUTION_PENALTY = 5000;

/** Query text that signals the user actually wants appointments / honors / resolutions — suppresses the demotion. */
const LOW_SUBSTANCE_INTENT_RE =
  /\b(appoint|reappoint|confirm|nominat|honou?r|recogniz|commemorat|memorial|in memory|resolution)\b/i;

function isLowSubstanceResolutionForSearch(bill: KYBill): boolean {
  const bn = normalizeKyBillDesignation(bill.bill_number);
  if (!SEARCH_RESOLUTION_DESIGNATION_RE.test(bn)) return false;
  const title = (bill.title || '').trim();
  return SEARCH_APPOINTMENT_RESOLUTION_RE.test(title) || SEARCH_CEREMONIAL_RESOLUTION_RE.test(title);
}

/**
 * True for topical/keyword queries where appointment + ceremonial resolutions should be
 * demoted. Suppressed for bill-number / designation queries (`23`, `HB23`) and for queries
 * whose own words ask for those instruments — so explicit intent still surfaces them.
 */
function shouldPenalizeLowSubstanceResolutions(
  safe: string,
  compactDesignation: string,
  numericOnlyQuery: boolean,
): boolean {
  if (numericOnlyQuery) return false;
  if (/^[A-Z]+\d+$/.test(compactDesignation)) return false;
  if (LOW_SUBSTANCE_INTENT_RE.test(safe)) return false;
  return true;
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
  score += scorePopularNames(
    [...(bill.official_short_titles ?? []), ...(bill.editorial_popular_names ?? [])],
    normalizePopularNameForMatch(safe),
  );

  return score;
}

/** Strip to lowercase alphanumerics so punctuation/spacing don't block a name match ("C.R.O.W.N. Act" → "crownact"). */
function normalizePopularNameForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Exact normalized name equals the query — the strongest popular-name signal. */
const POPULAR_NAME_EXACT_SCORE = 5200;
/** Query is a substring of a name (or vice-versa) — strong, below an exact hit. */
const POPULAR_NAME_SUBSTRING_SCORE = 2600;

/**
 * Score a bill by how well the query matches its popular names (official + editorial),
 * comparing on the punctuation/space-insensitive normalized form. Returns the best single
 * match so a bill with many names isn't over-rewarded. Retrieval is handled by the
 * `ky_bills_popular_name_search` RPC; this makes a matched name rank near the top.
 */
function scorePopularNames(names: string[], qNorm: string): number {
  if (names.length === 0 || qNorm.length < 3) return 0;
  let best = 0;
  for (const name of names) {
    const n = normalizePopularNameForMatch(name);
    if (!n) continue;
    if (n === qNorm) best = Math.max(best, POPULAR_NAME_EXACT_SCORE);
    else if (n.includes(qNorm) || qNorm.includes(n)) best = Math.max(best, POPULAR_NAME_SUBSTRING_SCORE);
  }
  return best;
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

  const hasPostFilters = Boolean(
    filters.chamber ||
      filters.dateRange ||
      filters.committee ||
      filters.session ||
      (filters.status && filters.status !== 'all'),
  );

  /**
   * Was 120 and capped merge results too low; KY session-scale search needs room for 25/50/100 per page.
   * The cap must be the same for every filter combination — per-filter multipliers made the fetched pool
   * (and therefore the post-filter count) grow when a user ADDED a narrowing filter, e.g.
   * `session=2025` → 149 results but `session=2025&committee=…` → 156.
   */
  const mergeCap = Math.min(1000, hasPostFilters ? limit * 6 : limit);

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

  let merged: KYBill[] = [];

  if (numericOnlyQuery) {
    const digitsOnlyNumberRes = await base()
      .or(digitBillOrClause)
      .order('session', { ascending: false })
      .limit(mergeCap);
    if (digitsOnlyNumberRes.error) throw digitsOnlyNumberRes.error;
    merged = (digitsOnlyNumberRes.data as KYBill[] | null) ?? [];
  } else {
    let ftsRows: KYBill[] | null = null;
    if (safe.length >= 2 && !omitKyBillsPlainSearchRpc) {
      // Vertical filter keeps the stored `search_vector` column (migration 040) out of the payload.
      const ftsRes = await supabase
        .rpc('ky_bills_plain_search', {
          search_query: safe,
          max_rows: mergeCap,
        })
        .select(KY_BILL_SEARCH_SELECT);
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
      } else {
        ftsRows = (ftsRes.data as KYBill[] | null) ?? null;
      }
    }

    // Popular / colloquial names: punctuation- and space-insensitive + trigram-fuzzy retrieval
    // (migration 044). FTS can't reach names like "C.R.O.W.N. Act" or "J.E. Jones …", so this
    // leg backfills them; the client scorer below then boosts a matched name to the top.
    let popularNameRows: KYBill[] | null = null;
    if (safe.length >= 3 && !omitKyBillsPopularNameRpc) {
      const pnRes = await supabase
        .rpc('ky_bills_popular_name_search', { search_query: safe, max_rows: mergeCap })
        .select(KY_BILL_SEARCH_SELECT);
      if (pnRes.error) {
        if (isMissingKyBillsPopularNameRpc(pnRes.error)) {
          omitKyBillsPopularNameRpc = true;
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[ky-search-bills] ky_bills_popular_name_search RPC unavailable (run migration 044 or reload schema). Skipping popular-name leg until restart.',
            );
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[ky-search-bills] ky_bills_popular_name_search RPC failed (popular-name leg skipped).',
            pnRes.error.message ?? pnRes.error,
          );
        }
      } else {
        popularNameRows = (pnRes.data as KYBill[] | null) ?? null;
      }
    }

    const supplemental: Array<PromiseLike<{ data: KYBill[] | null; error: unknown }>> = [];
    if (compactDesignation) {
      supplemental.push(
        base()
          .ilike('bill_number', `%${compactDesignation}%`)
          .order('session', { ascending: false })
          .limit(mergeCap),
      );
    }
    if (queryLegiscanSubjects) {
      supplemental.push(
        base()
          .ilike('legiscan_subjects_search', `%${subjectsFrag}%`)
          .order('session', { ascending: false })
          .limit(mergeCap),
      );
    }
    supplemental.push(
      base().contains('topics', [safe]).order('session', { ascending: false }).limit(mergeCap),
    );

    const ftsCount = ftsRows?.length ?? 0;
    // FTS rows are not session/chamber-filtered at the DB, so when client-side filters will
    // prune them, always run the ilike legs too — those go through `base()` and are
    // session/chamber-filtered server-side, backfilling matches FTS truncation loses.
    const useIlikeFallback =
      omitKyBillsPlainSearchRpc || hasPostFilters || ftsCount < Math.min(limit, 15);
    if (useIlikeFallback) {
      supplemental.push(
        base().ilike('title', likePattern).order('session', { ascending: false }).limit(mergeCap),
        base().ilike('description', likePattern).order('session', { ascending: false }).limit(mergeCap),
        base().ilike('ai_summary', likePattern).order('session', { ascending: false }).limit(mergeCap),
        base().ilike('last_action', likePattern).order('session', { ascending: false }).limit(mergeCap),
      );
      if (safe.length >= 3) {
        supplemental.push(
          base().ilike('session', likePattern).order('session', { ascending: false }).limit(mergeCap),
        );
      }
    }

    const supplementResults = await Promise.all(supplemental);

    let legiscanSubjectRows: KYBill[] | null = null;
    let topicRows: KYBill[] | null = null;
    let billNumberCompactRows: KYBill[] | null = null;
    const ilikeFallbackRows: (KYBill[] | null)[] = [];

    let idx = 0;
    if (compactDesignation) {
      const res = supplementResults[idx++]!;
      if (res.error) throw res.error;
      billNumberCompactRows = res.data;
    }
    if (queryLegiscanSubjects) {
      const res = supplementResults[idx++]!;
      if (res.error && !isMissingLegiscanSubjectsSearchColumn(res.error)) throw res.error;
      if (res.error && isMissingLegiscanSubjectsSearchColumn(res.error)) {
        omitLegiscanSubjectSearchFilter = true;
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[ky-search-bills] legiscan_subjects_search unavailable (run migration 015 or reload PostgREST schema). Skipping LegiScan subject filter on subsequent searches until restart.',
          );
        }
      } else {
        legiscanSubjectRows = res.data;
      }
    }
    {
      const res = supplementResults[idx++]!;
      if (res.error) throw res.error;
      topicRows = res.data;
    }
    while (idx < supplementResults.length) {
      const res = supplementResults[idx++]!;
      if (res.error) throw res.error;
      ilikeFallbackRows.push(res.data);
    }

    merged = mergeUniqueByIdAllChunks<KYBill>(
      billNumberCompactRows,
      ftsRows,
      popularNameRows,
      legiscanSubjectRows,
      topicRows,
      ...ilikeFallbackRows,
    );
  }

  merged = filterKyBillsByDateRange(merged, filters.dateRange);
  if (filters.committee) {
    merged = merged.filter((b) => billMatchesCommitteeFilter(b, filters.committee));
  }
  if (filters.chamber === 'house' || filters.chamber === 'senate' || filters.chamber === 'joint') {
    merged = filterKyBillsByChamberClient(merged, filters.chamber);
  }
  if (filters.status && filters.status !== 'all') {
    merged = merged.filter((b) => billMatchesBrowseStatusFilter(b, filters.status));
  }
  if (filters.session) {
    merged = merged.filter((b) => b.session === filters.session);
  }

  const rankingTokens = relevanceTokensFromQuery(safe);
  const penalizeLowSubstance = shouldPenalizeLowSubstanceResolutions(safe, compactDesignation, numericOnlyQuery);
  // Score each row once (the comparator runs O(n log n) times — don't re-score there),
  // then apply the low-substance demotion as a ranking-policy step on top of the pure score.
  const scoreById = new Map<string, number>();
  for (const bill of merged) {
    let s = relevanceScoreForKyBillSearch(bill, safe, compactDesignation, numericOnlyQuery, rankingTokens);
    if (penalizeLowSubstance && isLowSubstanceResolutionForSearch(bill)) {
      s -= LOW_SUBSTANCE_RESOLUTION_PENALTY;
    }
    scoreById.set(bill.id, s);
  }
  const stable = [...merged];
  stable.sort((a, b) => {
    const ra = scoreById.get(a.id) ?? 0;
    const rb = scoreById.get(b.id) ?? 0;
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
