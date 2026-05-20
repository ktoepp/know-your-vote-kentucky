import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import { dedupeKyLegislators, findLegislatorByProfileSlug } from '@/lib/ky-member-utils';

/** Shared revalidate window for civic roster data (seconds). */
export const KY_ROSTER_REVALIDATE_SECONDS = 3600;

const SLIM_ROSTER_COLUMNS =
  'id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url,ballotpedia,legiscan_image_url';

/** Active legislators — sponsor chips, browse, search (client via `/api/roster/active`). */
export const KY_ACTIVE_SLIM_ROSTER_SELECT = SLIM_ROSTER_COLUMNS;

/**
 * Active legislators with fields needed for committee member matching + MemberCard.
 * Historical rows stay in DB; only current GA seats load here.
 */
const COMMITTEE_ROSTER_COLUMNS =
  `${SLIM_ROSTER_COLUMNS},openstates_id,role_title,email,phone,website,lrc_profile_url,committee_memberships,active`;

/** Members browse + map: active and inactive rows for dedupe / LRC URL rules (no `select *`). */
export const KY_MEMBERS_BROWSE_ROSTER_SELECT = COMMITTEE_ROSTER_COLUMNS;

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
    const { data, error } = await supabase
      .from('ky_legislators')
      .select(KY_ACTIVE_SLIM_ROSTER_SELECT)
      .eq('active', true)
      .order('last_name', { ascending: true });
    if (error || !data) return [];
    return data as KYLegislatorRoster[];
  },
  ['ky-roster-active-slim'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

const getCachedCommitteeLegislatorRoster = unstable_cache(
  async (): Promise<KYLegislator[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ky_legislators')
      .select(COMMITTEE_ROSTER_COLUMNS)
      .eq('active', true)
      .order('last_name', { ascending: true });
    if (error || !data?.length) return [];
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
    const { data, error } = await supabase
      .from('ky_legislators')
      .select(KY_MEMBERS_BROWSE_ROSTER_SELECT)
      .order('last_name', { ascending: true });
    if (error || !data?.length) return [];
    return dedupeKyLegislators(data as unknown as KYLegislator[]);
  },
  ['ky-roster-members-browse'],
  { revalidate: KY_ROSTER_REVALIDATE_SECONDS },
);

export async function fetchKyMembersBrowseRoster(): Promise<KYLegislator[]> {
  return getCachedMembersBrowseRoster();
}

/**
 * Per-request deduped profile lookup (metadata + page share one roster fetch).
 * Historical legislators remain resolvable by slug.
 */
export const getMemberProfilePageContext = cache(
  async (slug: string): Promise<{ leg: KYLegislator; roster: KYLegislator[] } | null> => {
    const decoded = decodeURIComponent(slug).trim();
    const roster = await getCachedFullLegislatorRoster();
    const leg = findLegislatorByProfileSlug(roster, decoded);
    if (!leg) return null;
    return { leg, roster };
  },
);

export async function getLegislatorByProfileSlug(slug: string): Promise<KYLegislator | null> {
  const ctx = await getMemberProfilePageContext(slug);
  return ctx?.leg ?? null;
}
