import { createClient } from '@supabase/supabase-js';
import type { KYLegislator } from '@/types/kentucky';
import { dedupeKyLegislators, findLegislatorByProfileSlug } from '@/lib/ky-member-utils';

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadLegislatorProfileFromSlug(slug: string): Promise<{ leg: KYLegislator; roster: KYLegislator[] } | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;
  const decoded = decodeURIComponent(slug).trim();
  // Include inactive so bookmarked or sponsor-linked profiles still resolve (see findLegislatorByProfileSlug fallbacks).
  const { data, error } = await supabase.from('ky_legislators').select('*');
  if (error || !data?.length) return null;
  const roster = dedupeKyLegislators(data as KYLegislator[]);
  const leg = findLegislatorByProfileSlug(roster, decoded);
  if (!leg) return null;
  return { leg, roster };
}

/** Server/RSC: resolve a member from the `[slug]` dynamic segment. */
export async function getLegislatorByProfileSlug(slug: string): Promise<KYLegislator | null> {
  const ctx = await loadLegislatorProfileFromSlug(slug);
  return ctx?.leg ?? null;
}

/** Same fetch as `getLegislatorByProfileSlug`, plus deduped roster for seat-safe legislature URLs on the profile card. */
export async function getMemberProfilePageContext(
  slug: string,
): Promise<{ leg: KYLegislator; roster: KYLegislator[] } | null> {
  return loadLegislatorProfileFromSlug(slug);
}
