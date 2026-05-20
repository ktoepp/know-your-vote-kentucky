import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYCommittee, KYCommitteeMeetingBrowse } from '@/types/kentucky';
import { kyTodayIso } from '@/lib/ky-committee-display';
import { KY_COMMITTEE_BROWSE_SELECT, KY_MEETING_BROWSE_SELECT } from '@/lib/ky-ga-browse-select';

const GA_BROWSE_REVALIDATE_SECONDS = 300;

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const getCachedCommitteesBrowseList = unstable_cache(
  async (): Promise<KYCommittee[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ky_committees')
      .select(KY_COMMITTEE_BROWSE_SELECT)
      .order('name', { ascending: true });
    if (error || !data) return [];
    return data as KYCommittee[];
  },
  ['ky-committees-browse'],
  { revalidate: GA_BROWSE_REVALIDATE_SECONDS },
);

const getCachedMeetingsBrowseWindow = unstable_cache(
  async (): Promise<KYCommitteeMeetingBrowse[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];

    const today = kyTodayIso();
    const from = new Date(`${today}T12:00:00`);
    from.setDate(from.getDate() - 30);
    const to = new Date(`${today}T12:00:00`);
    to.setDate(to.getDate() + 120);

    const { data, error } = await supabase
      .from('ky_committee_meetings')
      .select(KY_MEETING_BROWSE_SELECT)
      .gte('meeting_date', from.toISOString().slice(0, 10))
      .lte('meeting_date', to.toISOString().slice(0, 10))
      .order('meeting_date', { ascending: true })
      .limit(100);

    if (error || !data) return [];
    return data as unknown as KYCommitteeMeetingBrowse[];
  },
  ['ky-meetings-browse-window'],
  { revalidate: GA_BROWSE_REVALIDATE_SECONDS },
);

export async function fetchKyCommitteesBrowseList(): Promise<KYCommittee[]> {
  return getCachedCommitteesBrowseList();
}

export async function fetchKyMeetingsBrowseWindow(): Promise<KYCommitteeMeetingBrowse[]> {
  return getCachedMeetingsBrowseWindow();
}
