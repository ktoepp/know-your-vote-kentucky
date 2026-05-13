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

/** UI labels aligned with docs/specs/follow-bills.md event list. */
export const KY_DIGEST_EVENT_LABELS: Record<KyDigestEventType, string> = {
  introduced: 'Introduced',
  committee_action: 'Committee action (referred / reported / amended)',
  hearing_scheduled: 'Hearing scheduled',
  floor_vote: 'Floor vote recorded',
  passed_chamber: 'Passed chamber',
  sent_to_governor: 'Sent to Governor',
  signed_or_vetoed: 'Signed into law / Vetoed',
  veto_override_attempt: 'Veto override attempt',
  amendment_filed: 'Amendment filed',
  new_cosponsor: 'New cosponsor added',
  dead: 'Dead / failed',
};

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
