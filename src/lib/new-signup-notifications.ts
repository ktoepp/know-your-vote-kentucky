/**
 * Server-authoritative "new verified user" Slack announcements.
 *
 * Source of truth is Supabase `auth.users.email_confirmed_at`, surfaced via the
 * `ky_pending_signup_notifications` RPC (migration 045) — NOT the browser-driven
 * `email_verified_at` stamp, which can silently never land. Each confirmed signup
 * is announced exactly once to #user-signups; `ky_user_profiles.signup_notified_at`
 * is the idempotency stamp.
 *
 * Failures (unconfigured #user-signups webhook, a failed Slack post, or an RPC
 * error) escalate to #errors via {@link notifySignupPipelineFailureSlack}.
 */
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import {
  notifyNewUserSlack,
  notifySignupPipelineFailureSlack,
  signupsWebhookConfigured,
} from './slack-webhook';

type PendingSignup = {
  user_id: string;
  email: string;
  display_name: string | null;
  confirmed_at: string;
};

export type NewSignupNotifyResult = {
  considered: number;
  notified: number;
  failed: number;
  misconfigured?: boolean;
  error?: string;
};

/**
 * Claim one pending signup and announce it. The claim is a conditional
 * null→timestamp update on `signup_notified_at`, so concurrent runs (the cron and
 * the ack-email-verification fast path) never double-post: only the writer that
 * flips the row proceeds. If the Slack post then fails, the stamp is rolled back
 * so a later run retries.
 */
async function claimAndNotify(row: PendingSignup): Promise<'notified' | 'failed' | 'skipped'> {
  if (!supabaseAdmin) return 'failed';
  const stamp = new Date().toISOString();

  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from('ky_user_profiles')
    .update({ signup_notified_at: stamp })
    .eq('user_id', row.user_id)
    .is('signup_notified_at', null)
    .select('user_id')
    .maybeSingle();

  if (claimErr) {
    console.error('[signups] claim failed:', claimErr.message);
    return 'failed';
  }
  // Another writer already claimed (or the row vanished) — not our notice to send.
  if (!claimed) return 'skipped';

  const res = await notifyNewUserSlack({ email: row.email, displayName: row.display_name });
  if (res.ok) return 'notified';

  // Roll the stamp back so the next run retries this user.
  await supabaseAdmin
    .from('ky_user_profiles')
    .update({ signup_notified_at: null })
    .eq('user_id', row.user_id)
    .eq('signup_notified_at', stamp);
  return 'failed';
}

/**
 * Announce every confirmed-but-un-announced signup. Safe to call from the cron
 * (safety net) and inline from ack-email-verification (fast path) — idempotent via
 * the per-row claim. Escalates to #errors when the webhook is missing or posts fail.
 */
export async function runNewSignupNotifications(
  opts: { limit?: number } = {},
): Promise<NewSignupNotifyResult> {
  const limit = opts.limit ?? 50;

  if (!supabaseAdmin) {
    return { considered: 0, notified: 0, failed: 0, error: 'supabase-admin-unavailable' };
  }

  const { data, error } = await supabaseAdmin.rpc('ky_pending_signup_notifications', {
    p_limit: limit,
  });

  if (error) {
    await notifySignupPipelineFailureSlack(
      `Could not read pending signups (RPC ky_pending_signup_notifications): ${error.message}`,
    ).catch(() => {});
    return { considered: 0, notified: 0, failed: 0, error: error.message };
  }

  const pending = ((data ?? []) as PendingSignup[]).filter((p) => Boolean(p.email));
  if (pending.length === 0) {
    return { considered: 0, notified: 0, failed: 0 };
  }

  // Missing #user-signups webhook: escalate ONCE (not per user) and leave every
  // row unstamped so they all deliver the moment the webhook is configured.
  if (!signupsWebhookConfigured()) {
    await notifySignupPipelineFailureSlack(
      `SLACK_WEBHOOK_SIGNUPS is not configured — ${pending.length} verified signup(s) pending announcement to #user-signups.`,
    ).catch(() => {});
    return { considered: pending.length, notified: 0, failed: pending.length, misconfigured: true };
  }

  let notified = 0;
  let failed = 0;

  for (const row of pending) {
    const outcome = await claimAndNotify(row);
    if (outcome === 'notified') notified += 1;
    else if (outcome === 'failed') failed += 1;
    // `skipped` = claimed by a concurrent writer; not counted as a failure.
  }

  if (failed > 0) {
    await notifySignupPipelineFailureSlack(
      `Failed to deliver ${failed} new-signup notice(s) to #user-signups (Slack post failed); will retry next run.`,
    ).catch(() => {});
  }

  return { considered: pending.length, notified, failed };
}
