import { createClient } from '@supabase/supabase-js';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { memberSlug } from '@/lib/ky-member-utils';

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

/** Bills in the active session, capped to keep sitemap under search-engine limits. */
export async function fetchBillSitemapEntries(limit = 5000): Promise<SitemapEntry[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const session = getCivicDataSessionName();
  const { data, error } = await supabase
    .from('ky_bills')
    .select('id, updated_at')
    .eq('session', session)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as { id: string; updated_at: string | null }[]).map((row) => ({
    slug: row.id,
    lastModified: toDate(row.updated_at),
  }));
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
    const name = leg.name || leg.id;
    if (!name) continue;
    const slug = memberSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    entries.push({ slug });
  }
  return entries;
}
