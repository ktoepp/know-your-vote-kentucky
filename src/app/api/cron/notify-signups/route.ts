/**
 * GET /api/cron/notify-signups — server-authoritative "new verified user" alerts.
 *
 * Safety net for the signup announcement pipeline: finds users confirmed in
 * Supabase auth (`email_confirmed_at`) but not yet announced to #user-signups and
 * posts each exactly once. Independent of the browser-driven /auth/verify POST, so
 * confirmed signups are never silently missed. Idempotent via
 * ky_user_profiles.signup_notified_at.
 *
 * Auth matches the other cron routes (Bearer CRON_SECRET or SYNC_API_KEY).
 * Failures escalate to #errors from within runNewSignupNotifications.
 */
import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessOperator } from '@/lib/auth/operator-guard';
import { runNewSignupNotifications } from '@/lib/new-signup-notifications';
import { notifySignupPipelineFailureSlack } from '@/lib/slack-webhook';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = await rejectUnlessOperator(req);
  if (denied) return denied;

  try {
    const result = await runNewSignupNotifications({ limit: 100 });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[cron/notify-signups]', detail);
    await notifySignupPipelineFailureSlack(
      `notify-signups cron threw: ${detail}`,
    ).catch(() => {});
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
