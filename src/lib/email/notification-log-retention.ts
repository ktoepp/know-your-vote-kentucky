/**
 * Retention trim for `ky_notifications_log`. `/privacy` promises the mail-event
 * log is kept for one year, then trimmed. `/api/cron/notify` calls
 * `trimNotificationLog` once per non-dry run, after the digest.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const NOTIFICATION_LOG_RETENTION_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rows with `sent_at` strictly before this instant are trimmed. */
export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - NOTIFICATION_LOG_RETENTION_DAYS * DAY_MS);
}

/** Dry runs never delete. */
export function shouldTrimLog({ dryRun }: { dryRun: boolean }): boolean {
  return !dryRun;
}

export async function trimNotificationLog(
  db: SupabaseClient,
  now: Date,
): Promise<{ deleted: number; error: string | null }> {
  const { count, error } = await db
    .from('ky_notifications_log')
    .delete({ count: 'exact' })
    .lt('sent_at', retentionCutoff(now).toISOString());
  if (error) return { deleted: 0, error: error.message };
  return { deleted: count ?? 0, error: null };
}
