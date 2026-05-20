import type { SupabaseClient } from '@supabase/supabase-js';
import type { KYCommitteeAgendaItemWithMeeting } from '@/types/kentucky';

const AGENDA_SEARCH_SELECT = `
  *,
  ky_committee_meetings (
    id,
    meeting_date,
    time_and_location,
    status,
    source_url,
    ky_committees ( id, name, slug, chamber, profile_url )
  )
`;

/** Search committee agenda lines (public RLS). Escapes `%` and `_` for ilike. */
export async function searchKyCommitteeAgendaItems(
  supabase: SupabaseClient,
  query: string,
  { limit = 80 }: { limit?: number } = {},
): Promise<KYCommitteeAgendaItemWithMeeting[]> {
  const q = query.trim();
  if (!q) return [];

  const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

  const { data, error } = await supabase
    .from('ky_committee_agenda_items')
    .select(AGENDA_SEARCH_SELECT)
    .ilike('raw_text', `%${escaped}%`)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as KYCommitteeAgendaItemWithMeeting[];
  return rows.sort((a, b) => {
    const da = a.ky_committee_meetings?.meeting_date ?? '';
    const db = b.ky_committee_meetings?.meeting_date ?? '';
    if (da !== db) return db.localeCompare(da);
    return a.sort_order - b.sort_order;
  });
}
