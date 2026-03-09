// Kentucky civic data types — mirrors Supabase schema

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
  district: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

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
  bill_text_url: string | null;
  topics: string[] | null;
  sponsors: Record<string, unknown> | null;
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

