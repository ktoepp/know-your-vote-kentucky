import { createClient } from '@supabase/supabase-js';
import { getCivicDataSessionName, KY_BILL_SESSION_OPTIONS } from '@/lib/ky-sessions';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { memberCanonicalSlug } from '@/lib/ky-member-utils';
import { kyBillSlug } from '@/lib/ky-bill-slug';

export interface SitemapEntry {
  slug: string;
  lastModified?: Date;
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** PostgREST caps a single response at ~1000 rows, so bill fetches must paginate with .range(). */
const SITEMAP_FETCH_PAGE_SIZE = 1000;

/**
 * Bills in the current + most recent prior session, capped to keep the sitemap under
 * search-engine limits. The prior session stays included so its bills don't vanish
 * from the sitemap the day a new session starts (people search old bill numbers).
 */
export async function fetchBillSitemapEntries(limit = 5000): Promise<SitemapEntry[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const current = getCivicDataSessionName();
  const currentIdx = KY_BILL_SESSION_OPTIONS.indexOf(current);
  const sessions =
    currentIdx >= 0 ? [...KY_BILL_SESSION_OPTIONS.slice(currentIdx, currentIdx + 2)] : [current];

  const entries: SitemapEntry[] = [];
  for (let offset = 0; entries.length < limit; offset += SITEMAP_FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('ky_bills')
      .select('id, bill_number, session, updated_at')
      .in('session', sessions)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + SITEMAP_FETCH_PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    // Advertise the canonical slug URL (F4) — UUID entries were what Google was ranking.
    // UUID fallback only for rows whose slug can't be derived (those pages self-serve).
    for (const row of data as { id: string; bill_number: string; session: string | null; updated_at: string | null }[]) {
      entries.push({ slug: kyBillSlug(row) ?? row.id, lastModified: toDate(row.updated_at) });
      if (entries.length >= limit) break;
    }
    if (data.length < SITEMAP_FETCH_PAGE_SIZE) break;
  }
  return entries;
}

/**
 * Top current-session bills by view count — pre-rendered at build (`generateStaticParams`)
 * so first crawler hits land on warm pages instead of cold on-demand renders.
 */
export async function fetchTopBillSlugsForPrerender(limit = 100): Promise<string[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const session = getCivicDataSessionName();
  const { data, error } = await supabase
    .from('ky_bills')
    .select('id, bill_number, session, view_count')
    .eq('session', session)
    .order('view_count', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as { id: string; bill_number: string; session: string | null }[])
    .map((row) => kyBillSlug(row))
    .filter((s): s is string => !!s);
}

export async function fetchCommitteeSitemapEntries(): Promise<SitemapEntry[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ky_committees')
    .select('slug, updated_at')
    .order('name', { ascending: true });
  if (error || !data) return [];
  return (data as { slug: string | null; updated_at: string | null }[])
    .filter((r): r is { slug: string; updated_at: string | null } => !!r.slug)
    .map((row) => ({ slug: row.slug, lastModified: toDate(row.updated_at) }));
}

export async function fetchMemberSitemapEntries(): Promise<SitemapEntry[]> {
  const roster = await fetchKyActiveLegislatorRosterSlim();
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const leg of roster) {
    if (!(leg.name || leg.id)) continue;
    const slug = memberCanonicalSlug(leg);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    entries.push({ slug });
  }
  return entries;
}
