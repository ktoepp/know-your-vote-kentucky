/**
 * POST /api/webhooks/sentry — Sentry Internal Integration → Slack incoming webhook bridge.
 *
 * Sentry's paid Slack integration is Team-plan+; this route lets a free-plan
 * project post to Slack anyway. Configure it on the Sentry side as a Sentry
 * Internal Integration (Settings → Developer Settings → New Internal Integration)
 * with:
 *   - Webhook URL: https://<host>/api/webhooks/sentry
 *   - Alert Rule Action: enabled (checkbox), so this shows up in the alert-rule
 *     action picker as "Send a notification via <integration name>".
 *   - Permissions: Issue & Event: Read.
 * Copy the "Client Secret" that Sentry generates into SENTRY_WEBHOOK_SECRET
 * (Vercel env), then in each alert rule pick this integration as the action
 * target. Slack side just needs a plain Incoming Webhook (already stored in
 * SLACK_WEBHOOK_ERRORS for the sync/health pipelines).
 *
 * Signature check is HMAC-SHA256 over the raw request body using the shared
 * secret, header `sentry-hook-signature`. Timing-safe comparison; a missing or
 * bad signature returns 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { postSlackIncomingWebhook } from '@/lib/slack-webhook';

export const runtime = 'nodejs';

type SentryEvent = {
  event_id?: string;
  level?: string;
  environment?: string | null;
  message?: string;
  title?: string;
  culprit?: string | null;
  tags?: Array<[string, string]>;
  web_url?: string;
  issue_url?: string;
  project_slug?: string;
  release?: string | null;
};

type SentryIssueAlertPayload = {
  action?: string;
  data?: {
    event?: SentryEvent;
    triggered_rule?: string;
    issue_alert?: { title?: string; settings?: unknown };
  };
  installation?: { uuid?: string };
};

function verifySentrySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const provided = headers.get('sentry-hook-signature');
  if (!provided) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

/** Slack channel target. Sentry alerts go to the #errors slot with a fallback. */
function slackWebhookUrl(): string | null {
  return (
    process.env.SLACK_WEBHOOK_ERRORS?.trim() ||
    process.env.SLACK_WEBHOOK_ALERTS?.trim() ||
    process.env.SLACK_WEBHOOK_URL?.trim() ||
    null
  );
}

function levelEmoji(level: string | undefined): string {
  switch ((level || '').toLowerCase()) {
    case 'fatal':
    case 'error':
      return ':rotating_light:';
    case 'warning':
      return ':warning:';
    case 'info':
      return ':information_source:';
    case 'debug':
      return ':mag:';
    default:
      return ':bell:';
  }
}

function pickTag(tags: Array<[string, string]> | undefined, key: string): string | undefined {
  return tags?.find(([k]) => k === key)?.[1];
}

function formatSlackMessage(payload: SentryIssueAlertPayload): string | null {
  const event = payload.data?.event;
  if (!event) return null;

  const title = (event.title || event.message || 'Sentry alert').toString().trim();
  const level = event.level || 'error';
  const env = event.environment || pickTag(event.tags, 'environment') || 'production';
  const route = pickTag(event.tags, 'route');
  const release = event.release || pickTag(event.tags, 'release');
  const rule = payload.data?.triggered_rule?.trim();
  const link = event.web_url || event.issue_url;

  const chips: string[] = [`env \`${env}\``];
  if (route) chips.push(`route \`${route}\``);
  if (release) chips.push(`release \`${String(release).slice(0, 24)}\``);

  const header = `${levelEmoji(level)} *Sentry — ${level}* · ${chips.join(' · ')}`;
  const ruleLine = rule ? `_${rule}_` : '';
  const titleLine = link ? `<${link}|${escapeSlack(title)}>` : escapeSlack(title);
  const culprit = event.culprit ? `\n\`${escapeSlack(event.culprit).slice(0, 240)}\`` : '';

  return [header, ruleLine, titleLine + culprit].filter(Boolean).join('\n');
}

/** Slack MRKDWN — escape angle-brackets & ampersands that would break link parsing. */
function escapeSlack(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SENTRY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'SENTRY_WEBHOOK_SECRET not set' }, { status: 500 });
  }

  const rawBody = await req.text();
  if (!verifySentrySignature(rawBody, req.headers, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const resource = req.headers.get('sentry-hook-resource') || '';
  // Only issue-alert deliveries produce a Slack ping; other resources (metric_alert,
  // installation, etc.) 200 silently so Sentry doesn't retry.
  if (resource && resource !== 'event_alert' && resource !== 'issue') {
    return NextResponse.json({ ok: true, skipped: `resource=${resource}` });
  }

  let payload: SentryIssueAlertPayload;
  try {
    payload = JSON.parse(rawBody) as SentryIssueAlertPayload;
  } catch {
    return NextResponse.json({ error: 'malformed json' }, { status: 400 });
  }

  const slackUrl = slackWebhookUrl();
  if (!slackUrl) {
    Sentry.captureMessage('sentry->slack webhook: no SLACK_WEBHOOK_ERRORS configured', 'warning');
    return NextResponse.json({ ok: true, skipped: 'no slack webhook configured' });
  }

  const text = formatSlackMessage(payload);
  if (!text) return NextResponse.json({ ok: true, skipped: 'no event in payload' });

  const { ok, status } = await postSlackIncomingWebhook(slackUrl, text);
  if (!ok) {
    Sentry.captureMessage(`sentry->slack post failed (HTTP ${status})`, 'error');
    return NextResponse.json({ ok: false, slackStatus: status }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
