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
    const committee = typeof p.committee_name === 'string' ? p.committee_name : '';
    const date = typeof p.meeting_date === 'string' ? p.meeting_date : '';
    if (committee || date) {
      return [committee, date].filter(Boolean).join(' — ');
    }
  }
  return (billTitle ?? '').trim();
}
