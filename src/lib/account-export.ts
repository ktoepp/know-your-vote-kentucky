/**
 * Column lists for the account data export (`GET /api/me/export`).
 *
 * Kept as constants so `account-export.test.ts` can check every column against
 * `supabase/migrations/`. The export returns 500 if any of its queries errors,
 * so a column that no migration creates breaks the whole export.
 */

/** Columns exported from `ky_notifications_log` (migrations 019, 041). */
export const EXPORT_NOTIFICATION_LOG_COLUMNS = [
  'id',
  'sent_at',
  'digest_window_start',
  'digest_window_end',
  'delivery_status',
] as const;

/** Columns exported from `ky_committee_follows` (migration 026). */
export const EXPORT_COMMITTEE_FOLLOW_COLUMNS = ['committee_id', 'created_at'] as const;

/** Comma-separated select list for a Supabase `.select()` call. */
export function toSelectList(columns: readonly string[]): string {
  return columns.join(', ');
}
