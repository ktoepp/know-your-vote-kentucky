/**
 * Validation and defaults for `ky_notification_preferences` (digest / topic filters).
 * See docs/specs/follow-bills.md.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';

const TOPIC_SET = new Set<string>(KY_TOPICS);

/** All digest event slugs accepted by the API and DB CHECK-less arrays. */
export const KY_DIGEST_EVENT_TYPES = [
  'introduced',
  'committee_action',
  'hearing_scheduled',
  'committee_meeting_scheduled',
  'floor_vote',
  'passed_chamber',
  'sent_to_governor',
  'signed_or_vetoed',
  'veto_override_attempt',
  'amendment_filed',
  'new_cosponsor',
  'dead',
] as const;

export type KyDigestEventType = (typeof KY_DIGEST_EVENT_TYPES)[number];

/** UI labels aligned with docs/specs/follow-bills.md and Bill Watch checkboxes. */
export const KY_DIGEST_EVENT_LABELS: Record<KyDigestEventType, string> = {
  introduced: 'Introduction',
  committee_action: 'Committee action',
  hearing_scheduled: 'Agenda / hearing scheduled',
  committee_meeting_scheduled: 'Committee meeting scheduled',
  floor_vote: 'Floor action',
  passed_chamber: 'Enrolled / passed chamber',
  sent_to_governor: 'Sent to Governor',
  signed_or_vetoed: 'Signed or vetoed',
  veto_override_attempt: 'Veto override attempt',
  amendment_filed: 'Amendment filed',
  new_cosponsor: 'New cosponsor',
  dead: 'Dead / failed',
};

/** Short help text for notification checkboxes (Bill Watch–aligned). */
export const KY_DIGEST_EVENT_DESCRIPTIONS: Record<KyDigestEventType, string> = {
  introduced: 'Bill is newly introduced in a chamber.',
  committee_action: 'Referred, reported, or amended in committee (LegiScan).',
  hearing_scheduled: 'Listed on an upcoming LRC committee agenda — see Meetings.',
  committee_meeting_scheduled: 'A new meeting is added to the calendar for a committee you follow.',
  floor_vote: 'Roll-call or floor vote recorded.',
  passed_chamber: 'Passed one chamber or enrolled.',
  sent_to_governor: 'Sent to the Governor for action.',
  signed_or_vetoed: 'Signed into law or vetoed.',
  veto_override_attempt: 'Override of a gubernatorial veto attempted.',
  amendment_filed: 'New amendment filed on the bill.',
  new_cosponsor: 'Additional sponsor added.',
  dead: 'Bill failed or is otherwise inactive.',
};

export type KyDigestEventGroupId = 'committee_interim' | 'floor_milestones' | 'other';

export const KY_DIGEST_EVENT_GROUPS: {
  id: KyDigestEventGroupId;
  title: string;
  description: string;
  types: KyDigestEventType[];
}[] = [
  {
    id: 'committee_interim',
    title: 'Committee & interim',
    description: 'Hearings and committee steps — includes Bill Watch “Agenda” and interim activity.',
    types: ['committee_action', 'hearing_scheduled', 'committee_meeting_scheduled'],
  },
  {
    id: 'floor_milestones',
    title: 'Floor & passage',
    description: 'Introduction through enrollment, governor, and final disposition.',
    types: [
      'introduced',
      'floor_vote',
      'passed_chamber',
      'sent_to_governor',
      'signed_or_vetoed',
      'veto_override_attempt',
      'dead',
    ],
  },
  {
    id: 'other',
    title: 'Amendments & sponsors',
    description: 'Optional detail alerts.',
    types: ['amendment_filed', 'new_cosponsor'],
  },
];

/** Spec default — "Major milestones only" (★ in follow-bills.md). */
export const KY_DIGEST_MAJOR_MILESTONES: KyDigestEventType[] = [
  'introduced',
  'committee_action',
  'floor_vote',
  'passed_chamber',
  'sent_to_governor',
  'signed_or_vetoed',
  'dead',
];

/** ★ = included in the “Major milestones only” preset in the spec. */
export const KY_DIGEST_MAJOR_MILESTONE_SET = new Set<KyDigestEventType>(KY_DIGEST_MAJOR_MILESTONES);

const EVENT_SET = new Set<string>(KY_DIGEST_EVENT_TYPES);

export type DigestFrequency = 'daily' | 'weekly' | 'off';

export function isDigestFrequency(v: string): v is DigestFrequency {
  return v === 'daily' || v === 'weekly' || v === 'off';
}

/** Returns normalized list; caller must check `out.length === input.length` for strict validation. */
export function normalizeDigestEventTypes(input: string[]): KyDigestEventType[] {
  const out: KyDigestEventType[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string' || !EVENT_SET.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw as KyDigestEventType);
  }
  return out;
}

export function normalizeTopicFilters(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string' || !TOPIC_SET.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

/**
 * Ensure a preferences row exists (RLS INSERT policy on 020+). Idempotent.
 */
export async function ensureKyNotificationPreferencesRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { data: existing, error: selErr } = await supabase
    .from('ky_notification_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (selErr) {
    return { error: { message: selErr.message, code: selErr.code } };
  }
  if (existing) return { error: null };

  const { error: insErr } = await supabase
    .from('ky_notification_preferences')
    .insert({ user_id: userId });

  if (insErr && insErr.code !== '23505') {
    return { error: { message: insErr.message, code: insErr.code } };
  }
  return { error: null };
}
