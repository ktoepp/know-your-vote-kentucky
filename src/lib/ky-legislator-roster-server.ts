import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import {
  annotateKyLrcSeatConflicts,
  dedupeKyLegislators,
  findLegislatorByProfileSlug,
} from '@/lib/ky-member-utils';

/** Shared revalidate window for civic roster data (seconds). */
export const KY_ROSTER_REVALIDATE_SECONDS = 3600;

const SLIM_ROSTER_COLUMNS =
  'id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url,ballotpedia,legiscan_image_url,profile_slug';

/**
 * `profile_slug` ships in every explicit select but exists only after migration 042 —
 * PostgREST rejects the whole query (42703) when the column is missing, so selects retry
 * without it until the operator applies the migration. Same pattern as the sync pipeline's
 * missing-column retries.
 */
function isMissingProfileSlugColumn(err: { message?: string } | null): boolean {
  return (err?.message || '').toLowerCase().includes('profile_slug');
}

async function selectKyLegislatorsWithFallback(
  runSelect: (columns: string) => PromiseLike<{
    data: unknown[] | null;
    error: { message?: string } | null;
  }>,
  columns: string,
): Promise<unknown[] | null> {
  let { data, error } = await runSelect(columns);
  if (error && isMissingProfileSlugColumn(error) && columns.includes('profile_slug')) {
    const legacyColumns = columns
      .split(',')
      .filter((c) => c.trim() !== 'profile_slug')
      .join(',');
    ({ data, error } = await runSelect(legacyColumns));
  }
  if (error || !data) return null;
  return data;
}

/** Active legislators — sponsor chips, browse, search (client via `/api/roster/active`). */
export const KY_ACTIVE_SLIM_ROSTER_SELECT = SLIM_ROSTER_COLUMNS;

/** Contact + LRC URL fields MemberCard renders on roster-scale surfaces. */
const MEMBER_CARD_ROSTER_COLUMNS =
  `${SLIM_ROSTER_COLUMNS},openstates_id,role_title,email,phone,website,lrc_profile_url,active`;

/**
 * Active legislators with fields needed for committee member matching + MemberCard.
 * Historical rows stay in DB; only current GA seats load here.
 */
const COMMITTEE_ROSTER_COLUMNS = `${MEMBER_CARD_ROSTER_COLUMNS},committee_memberships`;

/**
 * Members browse + map: fetches the full table (historical rows feed dedupe + LRC URL
 * rules server-side) but the cached result ships ACTIVE rows only, each annotated with
 * `lrc_district_link_unsafe`. Excludes `committee_memberships` — no browse/map surface
 * reads it, and it bloats the SSR payload + `/api/roster/members` response for every row.
 */
export const KY_MEMBERS_BROWSE_ROSTER_SELECT = MEMBER_CARD_ROSTER_COLUMNS;

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const getCachedActiveSlimRoster = unstable_cache(
  async (): Promise<KYLegislatorRoster[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const data = await selectKyLegislatorsWithFallback(
      (columns) =>
        supabase
          .from('ky_legislators')
          .select(columns)
          .eq('active', true)
          .order('last_name', { ascending: true }),
      KY_ACTIVE_SLIM_ROSTER_SELECT,
    );
    if (!data) return [];
    return data as KYLegislatorRoster[];
  },
  ['ky-roster-active-slim'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

const getCachedCommitteeLegislatorRoster = unstable_cache(
  async (): Promise<KYLegislator[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const data = await selectKyLegislatorsWithFallback(
      (columns) =>
        supabase
          .from('ky_legislators')
          .select(columns)
          .eq('active', true)
          .order('last_name', { ascending: true }),
      COMMITTEE_ROSTER_COLUMNS,
    );
    if (!data?.length) return [];
    return dedupeKyLegislators(data as unknown as KYLegislator[]);
  },
  ['ky-roster-committee-active'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

/** Full table for profile slug resolution (includes inactive / historical rows). */
const getCachedFullLegislatorRoster = unstable_cache(
  async (): Promise<KYLegislator[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('ky_legislators').select('*');
    if (error || !data?.length) return [];
    return dedupeKyLegislators(data as KYLegislator[]);
  },
  ['ky-roster-full'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

export async function fetchKyActiveLegislatorRosterSlim(): Promise<KYLegislatorRoster[]> {
  return getCachedActiveSlimRoster();
}

export async function fetchKyLegislatorRosterForCommittees(): Promise<KYLegislator[]> {
  return getCachedCommitteeLegislatorRoster();
}

const getCachedMembersBrowseRoster = unstable_cache(
  async (): Promise<KYLegislator[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const data = await selectKyLegislatorsWithFallback(
      (columns) =>
        supabase.from('ky_legislators').select(columns).order('last_name', { ascending: true }),
      KY_MEMBERS_BROWSE_ROSTER_SELECT,
    );
    if (!data?.length) return [];
    // Dedupe and compute LRC link safety over the FULL table (historical rows drive seat
    // conflicts), then ship active rows only — the payload the browse page and map render.
    const deduped = dedupeKyLegislators(data as unknown as KYLegislator[]);
    return annotateKyLrcSeatConflicts(deduped).filter((l) => l.active);
  },
  ['ky-roster-members-browse'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

/** Active members only; seat-turnover rows carry `lrc_district_link_unsafe: true`. */
export async function fetchKyMembersBrowseRoster(): Promise<KYLegislator[]> {
  return getCachedMembersBrowseRoster();
}

/**
 * Per-request deduped profile lookup (metadata + page share one roster fetch).
 * Historical legislators remain resolvable by slug. The roster is annotated, so the
 * returned `leg` carries `lrc_district_link_unsafe` — profile surfaces need no roster
 * for LRC link rules (and should not ship the full roster to the client).
 */
export const getMemberProfilePageContext = cache(
  async (slug: string): Promise<{ leg: KYLegislator; roster: KYLegislator[] } | null> => {
    const decoded = decodeURIComponent(slug).trim();
    const roster = annotateKyLrcSeatConflicts(await getCachedFullLegislatorRoster());
    const leg = findLegislatorByProfileSlug(roster, decoded);
    if (!leg) return null;
    return { leg, roster };
  },
);

export async function getLegislatorByProfileSlug(slug: string): Promise<KYLegislator | null> {
  const ctx = await getMemberProfilePageContext(slug);
  return ctx?.leg ?? null;
}
