// Kentucky civic data types — mirrors Supabase schema

import type { LegiscanBillSubject } from '@/lib/ky-legiscan-subjects';

export interface KYTopic {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
}

export interface KYLegislator {
  id: string;
  legiscan_id: number | null;
  openstates_id: string | null;
  name: string;
  first_name: string | null;
  last_name: string | null;
  party: string | null;
  chamber: 'house' | 'senate' | null;
  /** Open States currentRole.title (e.g. State Senator, Secretary of State). */
  role_title: string | null;
  district: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  /** legislature.ky.gov profile (from Open States links). */
  lrc_profile_url: string | null;
  /** Ballotpedia wiki slug or full URL, populated by LegiScan getPerson enrichment. */
  ballotpedia: string | null;
  /** LegiScan bio photo URL, used as fallback when photo_url is null. */
  legiscan_image_url: string | null;
  /**
   * Committee assignment slugs (migration 017), from Open States roles when available.
   * Tokens align with {@link committeeSlugFromName} / bill committee filters.
   */
  committee_memberships?: string[] | null;
  /**
   * Full-fidelity Open States `links[]` (migration 023). Each entry preserves
   * the canonical URL, original `note`, derived category, and host. Used by
   * the profile view to render grouped Social / Other link sections.
   */
  external_links?: Array<{
    url: string;
    note?: string;
    category: 'official' | 'social' | 'other';
    host: string;
  }> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Subset returned by lightweight `select(...)` for roster matching (photos, names). */
export type KYLegislatorRoster = Pick<
  KYLegislator,
  'id' | 'legiscan_id' | 'name' | 'first_name' | 'last_name' | 'party' | 'chamber' | 'district' | 'photo_url' | 'ballotpedia' | 'legiscan_image_url'
>;

export interface KYBill {
  id: string;
  legiscan_id: number | null;
  openstates_id: string | null;
  bill_number: string;
  title: string;
  description: string | null;
  ai_summary: string | null;
  session: string | null;
  chamber: 'house' | 'senate' | null;
  status: string | null;
  introduced_date: string | null;
  last_action_date: string | null;
  last_action: string | null;
  /** LegiScan getBill primary committee when synced (migration 013). */
  committee_legiscan_id?: number | null;
  committee_name?: string | null;
  bill_text_url: string | null;
  topics: string[] | null;
  sponsors: Record<string, unknown> | null;
  /** LegiScan getBill subjects; mirrors official subject_id / subject_name. */
  legiscan_subjects?: LegiscanBillSubject[] | null;
  /** Sync-only search helper (newline-separated lowercase subject names). */
  legiscan_subjects_search?: string | null;
  /** LegiScan getBill history[] (date/action/chamber/importance), persisted for DB-only bill detail. */
  legiscan_history?: unknown[] | null;
  /** LegiScan getBill texts[] (doc_id/type/mime/date/url/state_link), persisted for DB-only bill detail. */
  legiscan_texts?: unknown[] | null;
  /** Detail page view count; absent in older API responses until column exists. */
  view_count?: number | null;
  /** Editor-verified facts fed into the AI summary prompt + input hash (migration 038). Verified facts only. */
  editor_notes?: string | null;
  /** When editor_notes was last set via scripts/set-bill-editor-note.ts. */
  editor_notes_updated_at?: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
}

export interface KYVote {
  id: string;
  bill_id: string;
  date: string | null;
  chamber: 'house' | 'senate' | null;
  description: string | null;
  yea_count: number;
  nay_count: number;
  absent_count: number;
  passed: boolean | null;
  roll_call: Array<{ legislator_id: string; vote: string }> | null;
  created_at: string;
}

/** LRC committee directory row (migration 024). */
export interface KYCommittee {
  id: string;
  lrc_rsn: number;
  committee_type: string;
  name: string;
  chamber: 'house' | 'senate' | 'joint' | 'unknown';
  slug: string;
  profile_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYCommitteeMeeting {
  id: string;
  committee_id: string;
  meeting_date: string;
  time_and_location: string | null;
  status: 'scheduled' | 'cancelled';
  member_refs: Array<{
    displayName?: string;
    profileUrl?: string | null;
    districtNumber?: number | null;
  }>;
  agenda_content_hash: string | null;
  source_url: string;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface KYCommitteeAgendaItem {
  id: string;
  meeting_id: string;
  sort_order: number;
  raw_text: string;
  item_kind: 'bill' | 'resolution' | 'minutes' | 'report' | 'action_item' | 'other';
  bill_number: string | null;
  bill_session_label: string | null;
  ky_bill_id: string | null;
  /** Nesting depth in the source LRC agenda block; 0 = top-level. */
  depth: number;
  created_at: string;
}

export type KYCommitteeMeetingWithCommittee = KYCommitteeMeeting & {
  ky_committees: Pick<KYCommittee, 'id' | 'name' | 'slug' | 'chamber' | 'profile_url' | 'committee_type'> | null;
};

/** Meetings browse grid — omits heavy `member_refs` / agenda fields. */
export type KYCommitteeMeetingBrowse = Pick<
  KYCommitteeMeeting,
  | 'id'
  | 'committee_id'
  | 'meeting_date'
  | 'time_and_location'
  | 'status'
  | 'source_url'
  | 'created_at'
  | 'updated_at'
> & {
  ky_committees: Pick<KYCommittee, 'id' | 'name' | 'slug' | 'chamber' | 'profile_url' | 'committee_type'> | null;
};

export type KYCommitteeAgendaItemWithMeeting = KYCommitteeAgendaItem & {
  ky_committee_meetings: (KYCommitteeMeeting & {
    ky_committees: Pick<KYCommittee, 'id' | 'name' | 'slug' | 'chamber' | 'profile_url' | 'committee_type'> | null;
  }) | null;
};

export interface KYMeeting {
  id: string;
  jurisdiction: string;
  body: string;
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  agenda_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYOrdinance {
  id: string;
  legistar_id: number | null;
  jurisdiction: 'louisville' | 'lexington';
  ordinance_number: string | null;
  title: string;
  description: string | null;
  ai_summary: string | null;
  status: string | null;
  introduced_date: string | null;
  adopted_date: string | null;
  sponsors: Record<string, unknown> | null;
  topics: string[] | null;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYExecutiveOrder {
  id: string;
  eo_number: string;
  title: string;
  description: string | null;
  ai_summary: string | null;
  signed_date: string | null;
  governor: string | null;
  status: string | null;
  full_text_url: string | null;
  topics: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface KYSchoolBoardItem {
  id: string;
  district: 'jcps' | 'fcps';
  title: string;
  description: string | null;
  ai_summary: string | null;
  meeting_date: string | null;
  category: string | null;
  vote_result: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYCountyAction {
  id: string;
  county: string;
  title: string;
  description: string | null;
  ai_summary: string | null;
  meeting_date: string | null;
  action_type: string | null;
  vote_result: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYSource {
  id: string;
  source_name: string;
  last_sync_at: string | null;
  status: 'success' | 'error' | 'running' | null;
  items_synced: number;
  error_message: string | null;
  created_at: string;
}

