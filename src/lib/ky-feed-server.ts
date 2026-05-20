import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';
import { KY_BILL_BROWSE_SELECT } from '@/lib/ky-bills-browse-server';

const FEED_RECENT_LIMIT = 60;
const FEED_REVALIDATE_SECONDS = 120;

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const getCachedFeedRecentHouse = unstable_cache(
  async (): Promise<KYBill[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ky_bills')
      .select(KY_BILL_BROWSE_SELECT)
      .or('chamber.eq.house,bill_number.ilike.H%')
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(FEED_RECENT_LIMIT);
    if (error || !data) return [];
    return data as KYBill[];
  },
  ['ky-feed-recent-house'],
  { revalidate: FEED_REVALIDATE_SECONDS },
);

const getCachedFeedRecentSenate = unstable_cache(
  async (): Promise<KYBill[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ky_bills')
      .select(KY_BILL_BROWSE_SELECT)
      .or('chamber.eq.senate,bill_number.ilike.S%')
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(FEED_RECENT_LIMIT);
    if (error || !data) return [];
    return data as KYBill[];
  },
  ['ky-feed-recent-senate'],
  { revalidate: FEED_REVALIDATE_SECONDS },
);

export async function fetchKyFeedRecentHouseBills(): Promise<KYBill[]> {
  return getCachedFeedRecentHouse();
}

export async function fetchKyFeedRecentSenateBills(): Promise<KYBill[]> {
  return getCachedFeedRecentSenate();
}
