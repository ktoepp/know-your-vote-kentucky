/**
 * GET /api/cron/notify — digest builder + Resend send (Bearer CRON_SECRET or SYNC_API_KEY).
 * Set DIGEST_DRY_RUN=true to log samples without sending. Requires RESEND_API_KEY + RESEND_FROM_EMAIL to send.
 * After a non-dry digest run it trims `ky_notifications_log` rows older than one year
 * (the retention `/privacy` promises) and reports the count as `logRowsTrimmed`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessOperator } from '@/lib/auth/operator-guard';
import * as Sentry from '@sentry/nextjs';
import { runBillDigestCron } from '@/lib/digest/run-bill-digest-cron';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { shouldTrimLog, trimNotificationLog } from '@/lib/email/notification-log-retention';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = await rejectUnlessOperator(req);
  if (denied) return denied;

  const dryRun =
    process.env.DIGEST_DRY_RUN === 'true' || new URL(req.url).searchParams.get('dryRun') === 'true';
  try {
    const result = await runBillDigestCron({ dryRun });
    // Per-user send errors don't throw — they accumulate in result.errors.
    // Surface them to Sentry so we get paged when sends start failing in
    // bulk, even though the HTTP response is 200.
    if (!dryRun && result.errors.length > 0) {
      Sentry.captureMessage('Bill digest cron completed with per-user errors', {
        level: 'error',
        tags: { route: 'cron/notify' },
        extra: {
          usersConsidered: result.usersConsidered,
          emailsSent: result.emailsSent,
          errorCount: result.errors.length,
          errorSample: result.errors.slice(0, 5),
        },
      });
    }
    // Retention trim runs after the digest returns (whatever it returned) and
    // never on dry runs. Its own try/catch keeps a trim failure from failing the cron.
    let logRowsTrimmed: number | undefined;
    if (shouldTrimLog({ dryRun }) && supabaseAdmin) {
      try {
        const trim = await trimNotificationLog(supabaseAdmin, new Date());
        if (trim.error) {
          Sentry.captureMessage('Notification log retention trim failed', {
            level: 'error',
            tags: { route: 'cron/notify', kind: 'log_trim' },
            extra: { error: trim.error },
          });
        } else {
          logRowsTrimmed = trim.deleted;
        }
      } catch (trimErr) {
        Sentry.captureMessage('Notification log retention trim failed', {
          level: 'error',
          tags: { route: 'cron/notify', kind: 'log_trim' },
          extra: { error: trimErr instanceof Error ? trimErr.message : String(trimErr) },
        });
      }
    }
    return NextResponse.json(
      logRowsTrimmed === undefined ? result : { ...result, logRowsTrimmed },
      { status: 200 },
    );
  } catch (e) {
    console.error('[cron/notify]', e);
    Sentry.captureException(e, { tags: { route: 'cron/notify' } });
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
