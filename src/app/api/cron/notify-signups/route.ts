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
import { runNewSignupNotifications } from '@/lib/new-signup-notifications';
import { notifySignupPipelineFailureSlack } from '@/lib/slack-webhook';

export const maxDuration = 60;

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function authenticate(req: NextRequest): boolean {
  const token = getBearerToken(req);
  if (!token) return false;
  const syncKey = process.env.SYNC_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!syncKey && !cronSecret) return false;
  if (syncKey && token === syncKey) return true;
  if (cronSecret && token === cronSecret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
