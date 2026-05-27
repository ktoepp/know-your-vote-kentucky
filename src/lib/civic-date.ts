/**
 * Format a civic calendar date (bill actions, roll calls, session windows) for display.
 *
 * Inputs are calendar dates recorded by LRC / LegiScan (e.g. "2026-04-15" or
 * "2026-04-15T00:00:00"). `new Date("2026-04-15")` parses as UTC midnight, which a
 * negative-offset locale (e.g. Eastern) then renders as the *previous* day — and the
 * server (UTC) vs client (local) divergence is a hydration mismatch (React #418).
 *
 * We anchor the calendar date to UTC noon and format in UTC so the output is the same
 * calendar day on the server and the client, in any timezone.
 */
export function formatCivicDate(
  value: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  let date: Date;
  if (ymd) {
    date = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
  } else {
    const t = Date.parse(raw);
    if (Number.isNaN(t)) return raw;
    date = new Date(t);
  }
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}
