import { unstable_cache } from 'next/cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';
import { KY_BILL_BROWSE_SELECT } from '@/lib/ky-bills-browse-server';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { parseKyBillSlug } from '@/lib/ky-bill-slug';
import { normalizeKyBillDesignation } from '@/lib/bill-display';

const HIGHLIGHT_LIMIT = 6;
const TRENDING_REVALIDATE_SECONDS = 3600;
const LATEST_ACTION_REVALIDATE_SECONDS = 900;
/** "Recent legislative action" stays honest: hide the section rather than show stale steps. */
const LATEST_ACTION_WINDOW_DAYS = 30;

export type HomeTrendingResult = {
  bills: KYBill[];
  /**
   * 'visitors' — ranked by unique visitors over the past day (PostHog);
   * 'views' — fallback ranking by cumulative page views (`ky_bills.view_count`).
   * The section caption must describe whichever metric actually ranked the list.
   */
  metric: 'visitors' | 'views';
};

function createAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type PathVisitors = { path: string; visitors: number };

/**
 * Unique visitors per bill pathname over the trailing day, from PostHog's query API.
 * Returns null when the server-side PostHog credentials aren't configured or the
 * query fails — callers fall back to `view_count`.
 */
async function fetchPostHogBillPathVisitors(): Promise<PathVisitors[] | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  const host = process.env.POSTHOG_API_HOST || 'https://us.posthog.com';
  const hogql = `
    SELECT properties.$pathname AS path, uniq(distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND timestamp > now() - INTERVAL 1 DAY
      AND properties.$pathname LIKE '/bills/%'
    GROUP BY path
    ORDER BY visitors DESC
    LIMIT 60
  `;
  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: unknown[][] };
    if (!Array.isArray(data.results)) return null;
    return data.results
      .map(row => ({ path: String(row[0] ?? ''), visitors: Number(row[1] ?? 0) }))
      .filter(r => r.path.startsWith('/bills/') && r.visitors > 0);
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve PostHog bill pathnames to DB rows. A bill may appear under several URLs
 * (slug, UUID, bare designation redirect), so visitor counts are summed per bill id.
 */
async function resolveTrendingBills(
  supabase: SupabaseClient,
  pathVisitors: PathVisitors[],
): Promise<KYBill[]> {
  const bySlug = new Map<string, number>();
  const byUuid = new Map<string, number>();
  for (const { path, visitors } of pathVisitors) {
    const seg = path.slice('/bills/'.length).split('/')[0]?.split('?')[0] ?? '';
    if (!seg || seg === 'house' || seg === 'senate') continue;
    const slug = parseKyBillSlug(decodeURIComponent(seg));
    if (slug) {
      const key = `${slug.billNumber}::${slug.session}`;
      bySlug.set(key, (bySlug.get(key) ?? 0) + visitors);
    } else if (UUID_RE.test(seg)) {
      byUuid.set(seg.toLowerCase(), (byUuid.get(seg.toLowerCase()) ?? 0) + visitors);
    }
  }
  if (bySlug.size === 0 && byUuid.size === 0) return [];

  const rows: KYBill[] = [];
  // Slug lookups grouped per session (in practice one session dominates).
  const sessions = new Map<string, string[]>();
  for (const key of bySlug.keys()) {
    const [billNumber, session] = key.split('::') as [string, string];
    const list = sessions.get(session) ?? [];
    list.push(billNumber);
    sessions.set(session, list);
  }
  for (const [session, billNumbers] of sessions) {
    const { data } = await supabase
      .from('ky_bills')
      .select(KY_BILL_BROWSE_SELECT)
      .eq('session', session)
      .in('bill_number', billNumbers);
    if (data) rows.push(...(data as unknown as KYBill[]));
  }
  if (byUuid.size > 0) {
    const { data } = await supabase
      .from('ky_bills')
      .select(KY_BILL_BROWSE_SELECT)
      .in('id', [...byUuid.keys()]);
    if (data) rows.push(...(data as unknown as KYBill[]));
  }

  const visitorTotals = new Map<string, number>();
  const byId = new Map<string, KYBill>();
  for (const bill of rows) {
    if (byId.has(bill.id)) continue;
    byId.set(bill.id, bill);
    const slugKey = `${normalizeKyBillDesignation(bill.bill_number)}::${bill.session ?? ''}`;
    const total = (bySlug.get(slugKey) ?? 0) + (byUuid.get(bill.id.toLowerCase()) ?? 0);
    visitorTotals.set(bill.id, total);
  }
  return [...byId.values()]
    .sort((a, b) => (visitorTotals.get(b.id) ?? 0) - (visitorTotals.get(a.id) ?? 0))
    .slice(0, HIGHLIGHT_LIMIT);
}

async function fetchMostViewedFallback(supabase: SupabaseClient): Promise<KYBill[]> {
  const { data } = await supabase
    .from('ky_bills')
    .select(KY_BILL_BROWSE_SELECT)
    .eq('session', getCivicDataSessionName())
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(HIGHLIGHT_LIMIT);
  return (data as unknown as KYBill[] | null) ?? [];
}

/** Most-viewed bills for the home page: PostHog unique visitors/day, else `view_count`. */
export async function fetchHomeTrendingBills(): Promise<HomeTrendingResult> {
  return unstable_cache(
    async (): Promise<HomeTrendingResult> => {
      const supabase = createAnonClient();
      if (!supabase) return { bills: [], metric: 'views' };
      const pathVisitors = await fetchPostHogBillPathVisitors();
      if (pathVisitors && pathVisitors.length > 0) {
        const bills = await resolveTrendingBills(supabase, pathVisitors);
        if (bills.length >= 3) return { bills, metric: 'visitors' };
      }
      return { bills: await fetchMostViewedFallback(supabase), metric: 'views' };
    },
    ['ky-home-trending-bills'],
    { revalidate: TRENDING_REVALIDATE_SECONDS },
  )();
}

type HistoryEntry = { date?: unknown; action?: unknown; importance?: unknown };

/** Most recent substantive (LegiScan importance=1, i.e. non-clerical) action date, or null. */
function latestSubstantiveActionDate(bill: KYBill): string | null {
  const history = Array.isArray(bill.legiscan_history) ? (bill.legiscan_history as HistoryEntry[]) : [];
  let latest: string | null = null;
  for (const entry of history) {
    if (Number(entry?.importance) !== 1) continue;
    const date = typeof entry?.date === 'string' ? entry.date : null;
    if (!date) continue;
    if (latest == null || date > latest) latest = date;
  }
  return latest;
}

/**
 * Bills with a substantive legislative step in the last {@link LATEST_ACTION_WINDOW_DAYS}
 * days. Empty during quiet stretches (interim) — the home section hides itself then.
 */
export async function fetchHomeLatestActionBills(): Promise<KYBill[]> {
  return unstable_cache(
    async (): Promise<KYBill[]> => {
      const supabase = createAnonClient();
      if (!supabase) return [];
      const { data } = await supabase
        .from('ky_bills')
        .select(`${KY_BILL_BROWSE_SELECT},legiscan_history`)
        .eq('session', getCivicDataSessionName())
        .order('last_action_date', { ascending: false, nullsFirst: false })
        .limit(80);
      const bills = (data as unknown as KYBill[] | null) ?? [];
      const cutoff = new Date(Date.now() - LATEST_ACTION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return bills
        .map(bill => ({ bill, actionDate: latestSubstantiveActionDate(bill) }))
        .filter((x): x is { bill: KYBill; actionDate: string } => x.actionDate != null && x.actionDate >= cutoff)
        .sort((a, b) => (a.actionDate < b.actionDate ? 1 : a.actionDate > b.actionDate ? -1 : 0))
        .slice(0, HIGHLIGHT_LIMIT)
        .map(({ bill, actionDate }) => ({ ...bill, last_action_date: actionDate }));
    },
    ['ky-home-latest-action-bills'],
    { revalidate: LATEST_ACTION_REVALIDATE_SECONDS },
  )();
}
