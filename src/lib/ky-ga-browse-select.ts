/** Committee list cards — explicit columns match {@link KYCommittee}. */
export const KY_COMMITTEE_BROWSE_SELECT =
  'id,lrc_rsn,committee_type,name,chamber,slug,profile_url,created_at,updated_at';

/** Meetings browse list — omit heavy `member_refs` / agenda hash. */
export const KY_MEETING_BROWSE_SELECT = `
  id,
  committee_id,
  meeting_date,
  time_and_location,
  status,
  source_url,
  created_at,
  updated_at,
  ky_committees ( id, name, slug, chamber, profile_url, committee_type )
`;

/** Committee detail meetings — includes `member_refs` for the members section. */
export const KY_COMMITTEE_MEETING_DETAIL_SELECT =
  'id,committee_id,meeting_date,time_and_location,status,member_refs,source_url,scraped_at,created_at,updated_at';

export const KY_COMMITTEE_AGENDA_ITEM_SELECT =
  'id,meeting_id,sort_order,raw_text,item_kind,bill_number,bill_session_label,ky_bill_id,created_at';
