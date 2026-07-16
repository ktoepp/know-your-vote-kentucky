import {
  KY_DIGEST_EVENT_LABELS,
  type KyDigestEventType,
} from '@/lib/ky-notification-preferences';

/**
 * Human-readable event label, disambiguating the combined `signed_or_vetoed` event
 * into "Signed into law" vs "Vetoed" using the captured `event_payload.kind`.
 * Used by profile activity + digest-history list views (the email shows the raw action instead).
 */
export function formatDigestEventLabel(
  eventType: string,
  eventPayload: Record<string, unknown> | null | undefined,
): string {
  if (eventType === 'signed_or_vetoed') {
    const kind = (eventPayload ?? {}).kind;
    if (kind === 'signed') return 'Signed into law';
    if (kind === 'vetoed') return 'Vetoed';
    if (kind === 'line_item_vetoed') return 'Line items vetoed';
    if (kind === 'signed_without_signature') return 'Became law without signature';
  }
  return KY_DIGEST_EVENT_LABELS[eventType as KyDigestEventType] ?? eventType;
}

/**
 * Human-readable meeting date ("Tuesday, July 22") from a `YYYY-MM-DD` payload
 * string. Parsed as a plain calendar date — no timezone conversion — so the
 * displayed day always matches the LRC calendar. Falls back to the raw string.
 */
export function formatMeetingDate(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return raw.trim();
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return raw.trim();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Human-readable line for digest email / profile activity from a history payload. */
export function formatDigestEventDetail(
  eventType: string,
  eventPayload: Record<string, unknown> | null | undefined,
  billTitle: string | null | undefined,
): string {
  const p = eventPayload ?? {};
  if (typeof p.last_action === 'string' && p.last_action.trim()) {
    return p.last_action.trim();
  }
  if (eventType === 'hearing_scheduled' && p.source === 'lrc-calendar') {
    const committee = typeof p.committee_name === 'string' ? p.committee_name.trim() : '';
    const date = typeof p.meeting_date === 'string' ? formatMeetingDate(p.meeting_date) : '';
    if (committee && date) return `Scheduled for hearing: ${committee}, ${date}`;
    if (committee) return `Scheduled for hearing: ${committee}`;
    if (date) return `Scheduled for hearing: ${date}`;
  }
  return (billTitle ?? '').trim();
}
