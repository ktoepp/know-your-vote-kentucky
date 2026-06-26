import { writeFileSync } from 'node:fs';
import type { SyncResult } from './ky-sync-pipeline';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import { fetchLegiscanQuotaSummary } from './legiscan-quota';

const SLACK_POST_TIMEOUT_MS = 8_000;

/**
 * Sentinel file a workflow's generic "notify on workflow failure" step checks
 * before posting. Lets that step act as a pure last-resort net (setup failures,
 * OOM, pre-flight exits) without double-posting when a script has already sent
 * a rich message to #errors. See {@link markSlackErrorNotified}.
 */
export const SLACK_NOTIFIED_MARKER = '.slack-notified';

/**
 * Drop the {@link SLACK_NOTIFIED_MARKER} file so the workflow failure step skips.
 * No-op outside GitHub Actions, so it never writes during Vercel runtime or local dev.
 */
export function markSlackErrorNotified(): void {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  try {
    writeFileSync(SLACK_NOTIFIED_MARKER, new Date().toISOString());
  } catch {
    /* ignore — marker is best-effort */
  }
}

export function isVercelCronRequest(req: Request): boolean {
  return req.headers.get('x-vercel-cron') === '1';
}

/** Routine sync digests (#status-reports). */
function webhookUrlForSyncDigest(): string | null {
  return (
    process.env.SLACK_WEBHOOK_STATUS_REPORTS?.trim() ||
    process.env.SLACK_WEBHOOK_SYNC?.trim() ||
    process.env.SLACK_WEBHOOK_URL?.trim() ||
    null
  );
}

/** Sync row failures, exception alerts, health failures (#errors). */
function webhookUrlForAlerts(): string | null {
  const digest = webhookUrlForSyncDigest();
  return (
    process.env.SLACK_WEBHOOK_ERRORS?.trim() ||
    process.env.SLACK_WEBHOOK_ALERTS?.trim() ||
    process.env.SLACK_WEBHOOK_URL?.trim() ||
    digest
  );
}

/** Optional: sync crashes + health-check failures only (#support / triage). */
function webhookUrlForSupportEscalation(): string | null {
  return process.env.SLACK_WEBHOOK_SUPPORT?.trim() || null;
}

async function postToAlertsAndSupport(text: string): Promise<void> {
  const alertUrl = webhookUrlForAlerts();
  const supportUrl = webhookUrlForSupportEscalation();
  const targets = new Set<string>();
  if (alertUrl) targets.add(alertUrl);
  if (supportUrl) targets.add(supportUrl);
  for (const url of targets) {
    await postSlackIncomingWebhook(url, text);
  }
}

export async function postSlackIncomingWebhook(
  url: string,
  text: string,
): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_POST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Slack] webhook HTTP', res.status, body.slice(0, 500));
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('[Slack] webhook fetch failed:', err);
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export type SlackSmokeTestSlotResult = {
  slot: string;
  skipped?: boolean;
  duplicate?: boolean;
  ok?: boolean;
  status?: number;
};

/** One distinguishable message per configured webhook (dedupes identical URLs). */
export async function runSlackSmokeTest(meta: {
  triggeredBy: string;
}): Promise<SlackSmokeTestSlotResult[]> {
  const stamp = new Date().toISOString();
  const slots: [string, string | null][] = [
    [
      'status-reports',
      process.env.SLACK_WEBHOOK_STATUS_REPORTS?.trim() ||
        process.env.SLACK_WEBHOOK_SYNC?.trim() ||
        null,
    ],
    [
      'errors',
      process.env.SLACK_WEBHOOK_ERRORS?.trim() ||
        process.env.SLACK_WEBHOOK_ALERTS?.trim() ||
        null,
    ],
    ['support', process.env.SLACK_WEBHOOK_SUPPORT?.trim() || null],
  ];

  const seen = new Set<string>();
  const results: SlackSmokeTestSlotResult[] = [];

  for (const [slot, url] of slots) {
    if (!url) {
      results.push({ slot, skipped: true });
      continue;
    }
    if (seen.has(url)) {
      results.push({ slot, duplicate: true, skipped: true });
      continue;
    }
    seen.add(url);
    const text = `*[KY Vote Slack test — ${slot}]*\nSmoke test (${meta.triggeredBy}) at ${stamp}`;
    const { ok, status } = await postSlackIncomingWebhook(url, text);
    results.push({ slot, ok, status });
  }

  const fb = process.env.SLACK_WEBHOOK_URL?.trim();
  if (fb && results.every((r) => r.skipped || r.duplicate)) {
    const text = `*[KY Vote Slack test — fallback SLACK_WEBHOOK_URL]*\nSmoke test (${meta.triggeredBy}) at ${stamp}\n(Configure SLACK_WEBHOOK_STATUS_REPORTS / ERRORS / SUPPORT for per-channel tests.)`;
    const { ok, status } = await postSlackIncomingWebhook(fb, text);
    results.push({ slot: 'fallback_SLACK_WEBHOOK_URL', ok, status });
  }

  return results;
}

function formatSyncLines(results: SyncResult[]): string {
  return results
    .map((r) => {
      const dur = `${(r.duration / 1000).toFixed(1)}s`;
      if (r.status === 'success') {
        return `• ${r.source}: ok (${r.itemsSynced} items, ${dur})`;
      }
      if (r.status === 'skipped') {
        return `• ${r.source}: skipped${r.error ? ` — ${r.error}` : ''}`;
      }
      return `• ${r.source}: ERROR — ${r.error || 'unknown'} (${dur})`;
    })
    .join('\n');
}

function slackQuotaAlertThresholdPct(): number {
  const v = parseInt(process.env.SLACK_LEGISCAN_QUOTA_ALERT_PCT?.trim() || '', 10);
  if (!Number.isFinite(v) || v < 1 || v > 100) return 90;
  return v;
}

async function buildDigestExtras(results: SyncResult[]): Promise<{ quota?: string; dbSources?: string }> {
  if (process.env.SLACK_SYNC_SKIP_METADATA === 'true') {
    return {};
  }

  const out: { quota?: string; dbSources?: string } = {};
  try {
    const quota = await fetchLegiscanQuotaSummary();
    if (quota && quota.limit > 0) {
      const warnMark =
        quota.pct >= slackQuotaAlertThresholdPct()
          ? ' ⚠️'
          : '';
      out.quota = `\n*LegiScan quota (${quota.month})*: ${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} (${quota.pct}% used)${warnMark}`;
    }
  } catch {
    /* ignore */
  }

  const names = [...new Set(results.map((r) => r.source))].filter(Boolean);
  if (!supabaseAdmin || names.length === 0) return out;

  try {
    const { data, error } = await supabaseAdmin
      .from('ky_sources')
      .select('source_name,status,last_sync_at,items_synced,error_message')
      .in('source_name', names);
    if (!error && data?.length) {
      const lines = data.map((row) => {
        const t =
          row.last_sync_at != null
            ? new Date(row.last_sync_at as string).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
            : 'never';
        const err =
          row.error_message != null && String(row.error_message).trim()
            ? ` — _${String(row.error_message).slice(0, 140)}_`
            : '';
        return `• ${row.source_name}: ${row.status} · last sync ${t} · ${row.items_synced ?? 0} items${err}`;
      });
      out.dbSources = `\n*ky_sources*\n${lines.join('\n')}`;
    }
  } catch {
    /* ignore */
  }

  return out;
}

const QUOTA_ALERT_BANDS = [90, 95, 98, 100] as const;
type QuotaAlertBand = (typeof QUOTA_ALERT_BANDS)[number];
const QUOTA_ALERT_STATE_KEY = 'slack_legiscan_quota_alert_state';

function bandFor(pct: number): QuotaAlertBand | 0 {
  let band: QuotaAlertBand | 0 = 0;
  for (const b of QUOTA_ALERT_BANDS) {
    if (pct >= b) band = b;
  }
  return band;
}

type QuotaAlertState = { month: string; band: QuotaAlertBand | 0 };

async function readQuotaAlertState(): Promise<QuotaAlertState | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('ky_sync_state')
    .select('payload')
    .eq('key', QUOTA_ALERT_STATE_KEY)
    .maybeSingle();
  const payload = data?.payload as Partial<QuotaAlertState> | null;
  if (!payload?.month || typeof payload.band !== 'number') return null;
  return { month: payload.month, band: payload.band as QuotaAlertBand | 0 };
}

async function writeQuotaAlertState(state: QuotaAlertState): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('ky_sync_state').upsert(
    { key: QUOTA_ALERT_STATE_KEY, payload: state, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
}

/**
 * Edge-triggered: only posts when the quota band increases (90 → 95 → 98 → 100) within a month,
 * or when the month rolls over. Sustained usage at the same band stays silent.
 */
async function maybeAlertLegiscanQuotaHigh(): Promise<void> {
  try {
    const quota = await fetchLegiscanQuotaSummary();
    if (!quota || quota.limit <= 0) return;
    const minBand = slackQuotaAlertThresholdPct();
    const currentBand = bandFor(quota.pct);
    if (currentBand === 0 || currentBand < minBand) return;

    const last = await readQuotaAlertState();
    const monthChanged = !last || last.month !== quota.month;
    const bandRose = !last || currentBand > last.band;
    if (!monthChanged && !bandRose) return;

    await postToAlertsAndSupport(
      `*LegiScan quota threshold (${currentBand}%+)*\nMonth \`${quota.month}\`: ${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} (${quota.pct}% used)`,
    );
    await writeQuotaAlertState({ month: quota.month, band: currentBand });
  } catch {
    /* ignore — alert hygiene is best-effort */
  }
}

function syncTriggerLabel(isVercelCron: boolean, fromCli: boolean): string {
  if (isVercelCron) return 'Vercel cron';
  if (fromCli) return 'CLI / GitHub Actions';
  return 'Manual HTTP';
}

function githubActionsRunUrl(): string | undefined {
  const id = process.env.GITHUB_RUN_ID?.trim();
  if (!id) return undefined;
  const server = process.env.GITHUB_SERVER_URL?.trim() || 'https://github.com';
  const repo = process.env.GITHUB_REPOSITORY?.trim();
  if (!repo) return undefined;
  return `${server}/${repo}/actions/runs/${id}`;
}

export type LegislatorLinkVerifyFailure = {
  name: string;
  field: string;
  status: number;
  url: string;
};

/**
 * Posts legislator outbound-link verify summaries for CLI / GitHub Actions
 * (set SLACK_SYNC_NOTIFY_CLI=true — same flag as manual-sync.ts).
 *
 * Success → status-reports digest. Failures → errors webhook (and digest when configured).
 */
export async function notifyLegislatorLinksVerifySlack(params: {
  legislators: number;
  probes: number;
  failed: number;
  skippedLegiscan403: number;
  skippedSocialBlock: number;
  failures?: LegislatorLinkVerifyFailure[];
  fromCli?: boolean;
  runUrl?: string;
}): Promise<void> {
  if (params.fromCli !== true || process.env.SLACK_SYNC_NOTIFY_CLI !== 'true') {
    return;
  }

  const syncUrl = webhookUrlForSyncDigest();
  const alertUrl = webhookUrlForAlerts();
  if (!syncUrl && !alertUrl) return;

  const trigger = syncTriggerLabel(false, true);
  const header = `*KY Vote — legislator link verify* (${trigger})`;
  const stats =
    `Legislators \`${params.legislators}\` · Probes \`${params.probes}\` · Failed \`${params.failed}\`` +
    (params.skippedLegiscan403 > 0 ? ` · LegiScan HTTP skipped \`${params.skippedLegiscan403}\`` : '') +
    (params.skippedSocialBlock > 0 ? ` · Social skipped \`${params.skippedSocialBlock}\`` : '');
  const runUrl = params.runUrl ?? githubActionsRunUrl();
  const runLine = runUrl ? `\n<${runUrl}|GitHub run>` : '';

  let failureBlock = '';
  if (params.failed > 0 && params.failures?.length) {
    const lines = params.failures
      .slice(0, 10)
      .map((f) => `• ${f.name} (\`${f.field}\`, HTTP ${f.status}): ${f.url}`)
      .join('\n');
    const more =
      params.failures.length > 10 ? `\n_…and ${params.failures.length - 10} more_` : '';
    failureBlock = `\n*Failures*\n${lines}${more}`;
  }

  const body = `${header}\n${stats}${failureBlock}${runLine}`;

  if (params.failed > 0 && alertUrl) {
    await postSlackIncomingWebhook(alertUrl, body);
    if (syncUrl && syncUrl !== alertUrl) {
      await postSlackIncomingWebhook(syncUrl, body);
    }
  } else if (syncUrl) {
    await postSlackIncomingWebhook(syncUrl, body);
  } else if (alertUrl) {
    await postSlackIncomingWebhook(alertUrl, body);
  }
}

/**
 * Posts a digest to the sync webhook for cron runs (or manual runs when SLACK_SYNC_NOTIFY_MANUAL=true).
 * CLI/GitHub Actions: set SLACK_SYNC_NOTIFY_CLI=true when invoking `scripts/manual-sync.ts`.
 *
 * Default: status-reports digest only when new rows were synced (`itemsSynced > 0`), or errors/skips-with-message.
 * Set SLACK_SYNC_DIGEST_ALWAYS=true for a digest on every Vercel cron run (heartbeat).
 * Vercel daily bills cron (`source=bills`) posts a digest every run by default (quota + ky_sources);
 * set SLACK_SYNC_BILLS_DIGEST_ALWAYS=false to only post when something changed or failed.
 * CLI / GitHub Actions (SLACK_SYNC_NOTIFY_CLI=true) posts only on change/error by default;
 * set SLACK_SYNC_CLI_DIGEST_ALWAYS=true for an every-run heartbeat.
 *
 * Adds LegiScan monthly quota + ky_sources snapshot unless SLACK_SYNC_SKIP_METADATA=true.
 * Posts alerts webhook when LegiScan usage ≥ SLACK_LEGISCAN_QUOTA_ALERT_PCT (default 90).
 */
export async function notifySyncSlack(params: {
  results: SyncResult[];
  source?: string;
  dryRun: boolean;
  isVercelCron: boolean;
  fromCli?: boolean;
}): Promise<void> {
  const { results, source, dryRun, isVercelCron } = params;
  const fromCli = params.fromCli === true;
  const cliNotify = process.env.SLACK_SYNC_NOTIFY_CLI === 'true';
  const hasErrors = results.some((r) => r.status === 'error');
  const manualNotify = process.env.SLACK_SYNC_NOTIFY_MANUAL === 'true';

  const syncUrl = webhookUrlForSyncDigest();
  const alertUrl = webhookUrlForAlerts();

  const trigger = syncTriggerLabel(isVercelCron, fromCli);
  const scope = source ? `source=\`${source}\`` : 'all sources';
  const header = `*KY Vote sync* (${trigger}) ${scope}${dryRun ? ' `dryRun`' : ''}`;
  const body = formatSyncLines(results);

  const digestHeartbeat = process.env.SLACK_SYNC_DIGEST_ALWAYS === 'true';
  /**
   * Default (false): only post the bills digest on change/error/new-skip-reason.
   * Set SLACK_SYNC_BILLS_DIGEST_ALWAYS=true to restore the previous always-on heartbeat.
   */
  const vercelBillsHeartbeat =
    isVercelCron &&
    source === 'bills' &&
    process.env.SLACK_SYNC_BILLS_DIGEST_ALWAYS === 'true';
  /**
   * Quota-hold skips re-fire every cron tick with the same reason; treat them as quiet so we
   * don't repost "bills skipped — LegiScan quota 96%" hourly. The banded #errors alert covers
   * the band transitions; mid-band sustained holds don't need a #status-reports tick.
   */
  const isQuotaHoldSkip = (r: SyncResult) =>
    r.status === 'skipped' && typeof r.error === 'string' && /LegiScan quota/i.test(r.error);
  const hasNewOrInteresting =
    hasErrors ||
    results.some((r) => r.status === 'success' && r.itemsSynced > 0) ||
    results.some((r) => r.status === 'skipped' && Boolean(r.error) && !isQuotaHoldSkip(r));

  // CLI / GitHub Actions runs may post when SLACK_SYNC_NOTIFY_CLI=true.
  const cliEnabled = fromCli && cliNotify;
  // Every-run CLI heartbeat is opt-in (SLACK_SYNC_CLI_DIGEST_ALWAYS=true). By default the
  // CLI path posts only when something changed or failed — avoids hourly "0 items" noise.
  const cliHeartbeat = cliEnabled && process.env.SLACK_SYNC_CLI_DIGEST_ALWAYS === 'true';
  const worthDigest =
    digestHeartbeat || hasNewOrInteresting || cliHeartbeat || vercelBillsHeartbeat;

  const mayPostDigest = isVercelCron || manualNotify || cliEnabled;
  const postDigest = Boolean(syncUrl && mayPostDigest && worthDigest);

  const extras = postDigest ? await buildDigestExtras(results) : {};
  const digestBody =
    `${header}\n${body}${extras.quota ?? ''}${extras.dbSources ?? ''}`;

  if (postDigest && syncUrl) {
    await postSlackIncomingWebhook(syncUrl, digestBody);
  }

  await maybeAlertLegiscanQuotaHigh();

  const duplicateAlert = Boolean(syncUrl && alertUrl && syncUrl === alertUrl && postDigest && hasErrors);

  if (hasErrors && alertUrl && !duplicateAlert) {
    const errorLines = results
      .filter((r) => r.status === 'error')
      .map((r) => `• ${r.source}: ${r.error || 'unknown'}`)
      .join('\n');
    await postSlackIncomingWebhook(alertUrl, `${header}\n*Failures*\n${errorLines}`);
  }
}

export async function notifySyncExceptionSlack(params: {
  error: unknown;
  source?: string;
  dryRun: boolean;
  isVercelCron: boolean;
  fromCli?: boolean;
}): Promise<void> {
  const msg = params.error instanceof Error ? params.error.message : String(params.error);
  const fromCli = params.fromCli === true;
  const trigger = syncTriggerLabel(params.isVercelCron, fromCli);
  const scope = params.source ? `source=\`${params.source}\`` : 'sync';
  const dry = params.dryRun ? ' `dryRun`' : '';
  const clipped = msg.length > 1500 ? `${msg.slice(0, 1500)}…` : msg;
  const text = `*KY Vote sync crashed* (${trigger}) ${scope}${dry}\n\`\`\`${clipped}\`\`\``;
  await postToAlertsAndSupport(text);
}

export async function notifyHealthCheckFailureSlack(details: string): Promise<void> {
  const clipped = details.length > 2000 ? `${details.slice(0, 2000)}…` : details;
  await postToAlertsAndSupport(`*KY Vote health check failed*\n${clipped}`);
}

/** Mask an email for an ops channel: keep first 2 chars of the local part + domain. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? '***' : '*'}${domain}`;
}

/**
 * Posts a new-signup notice to the status-reports digest channel. Server-side and
 * fires exactly once per user (called from ack-email-verification on first verify),
 * unlike the client `user_registered` PostHog event it can't be dropped by ad-blockers.
 * No-op when no digest webhook is configured.
 */
export async function notifyNewUserSlack(params: {
  email: string;
  displayName?: string | null;
}): Promise<void> {
  const url = webhookUrlForSyncDigest();
  if (!url) return;
  const name = params.displayName?.trim();
  const who = name ? `${name} · \`${maskEmail(params.email)}\`` : `\`${maskEmail(params.email)}\``;
  await postSlackIncomingWebhook(url, `*KY Vote — new verified user* :tada:\n${who}`);
}

/**
 * Posts the content-accuracy audit report.
 *
 * Digest body → status-reports webhook (always, when configured), so the weekly
 * run is visible even when clean. When `hasHardFailures` is true, the same body
 * is also escalated to the errors webhook (deduped if both point to the same URL).
 *
 * From CLI / GitHub Actions, gated by SLACK_SYNC_NOTIFY_CLI=true (same flag as
 * the sync + legislator-link verifiers).
 */
export async function notifyAccuracyAuditSlack(params: {
  body: string;
  /**
   * Escalate the report to the #errors webhook. Reserved for OPERATIONAL
   * problems (a checker crashed, or LegiScan quota blocked the run) — NOT for
   * content findings. Content findings (even deterministic `fail`s) are
   * reported to the status digest only and do not page #errors.
   */
  escalateToAlerts: boolean;
  fromCli?: boolean;
}): Promise<void> {
  if (params.fromCli === true && process.env.SLACK_SYNC_NOTIFY_CLI !== 'true') {
    return;
  }

  const syncUrl = webhookUrlForSyncDigest();
  const alertUrl = webhookUrlForAlerts();

  const posted = new Set<string>();
  if (syncUrl) {
    await postSlackIncomingWebhook(syncUrl, params.body);
    posted.add(syncUrl);
  }
  if (params.escalateToAlerts && alertUrl && !posted.has(alertUrl)) {
    await postSlackIncomingWebhook(alertUrl, params.body);
  }
}
