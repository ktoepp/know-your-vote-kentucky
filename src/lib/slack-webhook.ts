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
 *
 * `delivered` is the honest answer to "did our rich #errors message actually land?".
 * Pass the boolean returned by the `notify*` call that preceded this one: when Slack
 * is down or no alerts webhook is configured, the post silently failed and dropping
 * the sentinel would stand the workflow's fallback step down too — leaving the
 * failure reported NOWHERE. So `delivered: false` deliberately does NOT write the
 * marker, and the generic workflow step becomes the last line of defence (a
 * duplicate message is far cheaper than a missed outage). Defaults to `true` for
 * back-compat with callers that don't yet thread delivery status through.
 */
export function markSlackErrorNotified(delivered: boolean = true): void {
  if (!delivered) return;
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

/**
 * New-signup announcements (#user-signups). Deliberately has NO fallback to the
 * sync-digest webhook: routing signups through #status-reports buried them under
 * routine sync noise (the visibility bug this channel exists to fix). When it's
 * unset, {@link notifyNewUserSlack} reports "skipped" and the reconciliation
 * pipeline escalates to #errors instead of silently dropping the notice.
 */
function webhookUrlForSignups(): string | null {
  return process.env.SLACK_WEBHOOK_SIGNUPS?.trim() || null;
}

/**
 * Whether any #errors-class webhook is configured at all. Lets a script tell
 * "nobody was told, because there is nowhere to tell" apart from a genuine
 * delivery failure before it decides whether to drop the sentinel.
 */
export function slackDeliveryConfigured(): boolean {
  return webhookUrlForAlerts() !== null;
}

/** Whether a dedicated #user-signups webhook is configured. */
export function signupsWebhookConfigured(): boolean {
  return webhookUrlForSignups() !== null;
}

/**
 * Returns whether the message reached at least one channel.
 *
 * Callers that drop the `.slack-notified` sentinel MUST honour this: a `false`
 * here (Slack down, or no alerts webhook configured) means nothing was
 * delivered, and standing the workflow's fallback step down on that basis
 * leaves the failure reported nowhere. See {@link markSlackErrorNotified}.
 */
async function postToAlertsAndSupport(text: string): Promise<boolean> {
  const alertUrl = webhookUrlForAlerts();
  const supportUrl = webhookUrlForSupportEscalation();
  const targets = new Set<string>();
  if (alertUrl) targets.add(alertUrl);
  if (supportUrl) targets.add(supportUrl);
  let delivered = false;
  for (const url of targets) {
    const { ok } = await postSlackIncomingWebhook(url, text);
    delivered = delivered || ok;
  }
  return delivered;
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
 *
 * Returns whether at least one post actually landed. The caller must feed that
 * into {@link markSlackErrorNotified} — a `false` here means the workflow's
 * generic failure step is the only remaining reporter and must not be silenced.
 * `false` also covers the early returns (gate off, no webhook configured).
 */
export async function notifyLegislatorLinksVerifySlack(params: {
  legislators: number;
  probes: number;
  failed: number;
  skippedLegiscan403: number;
  skippedLegiscanQuota?: number;
  skippedSocialBlock: number;
  skippedTransient?: number;
  failures?: LegislatorLinkVerifyFailure[];
  fromCli?: boolean;
  runUrl?: string;
}): Promise<boolean> {
  if (params.fromCli !== true || process.env.SLACK_SYNC_NOTIFY_CLI !== 'true') {
    return false;
  }

  const syncUrl = webhookUrlForSyncDigest();
  const alertUrl = webhookUrlForAlerts();
  if (!syncUrl && !alertUrl) return false;

  const trigger = syncTriggerLabel(false, true);
  const header = `*KY Vote — legislator link verify* (${trigger})`;
  const stats =
    `Legislators \`${params.legislators}\` · Probes \`${params.probes}\` · Failed \`${params.failed}\`` +
    (params.skippedLegiscan403 > 0 ? ` · LegiScan HTTP skipped \`${params.skippedLegiscan403}\`` : '') +
    ((params.skippedLegiscanQuota ?? 0) > 0 ? ` · LegiScan quota-hold skipped \`${params.skippedLegiscanQuota}\`` : '') +
    (params.skippedSocialBlock > 0 ? ` · Social skipped \`${params.skippedSocialBlock}\`` : '') +
    ((params.skippedTransient ?? 0) > 0 ? ` · Transient skipped \`${params.skippedTransient}\`` : '');
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

  let delivered = false;
  if (params.failed > 0 && alertUrl) {
    delivered = (await postSlackIncomingWebhook(alertUrl, body)).ok;
    if (syncUrl && syncUrl !== alertUrl) {
      delivered = (await postSlackIncomingWebhook(syncUrl, body)).ok || delivered;
    }
  } else if (syncUrl) {
    delivered = (await postSlackIncomingWebhook(syncUrl, body)).ok;
  } else if (alertUrl) {
    delivered = (await postSlackIncomingWebhook(alertUrl, body)).ok;
  }
  return delivered;
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
  await postToAlertsAndSupport(`*KY Vote — health check failed*\n${clipped}`);
}

/**
 * Sync-pipeline degradation (a source stale past its SLO, errored, or stuck in
 * `running`). Distinct from {@link notifyHealthCheckFailureSlack}, which means
 * the infrastructure itself is unreachable.
 *
 * Callers are expected to edge-trigger this (see `source-health.ts` §
 * `shouldAlertOnHealth`) — the health check runs daily and a source that stays
 * broken for a week should page once, not seven times.
 */
/**
 * Agent-generated triage of a check run (see `scripts/triage-findings.ts`).
 *
 * Goes to the status/digest channel, never to #errors: this is interpretation of
 * findings that were already reported, not a new alert, and escalating an
 * advisory summary would undo the "green = the agent ran" separation that keeps
 * #errors meaningful (decisions.md § 2026-06-03).
 */
export async function notifyTriageSlack(details: string): Promise<boolean> {
  const url = webhookUrlForSyncDigest();
  if (!url) return false;
  const clipped = details.length > 3500 ? `${details.slice(0, 3500)}…` : details;
  const { ok } = await postSlackIncomingWebhook(url, clipped);
  return ok;
}

export async function notifySourceHealthSlack(details: string): Promise<boolean> {
  const clipped = details.length > 2000 ? `${details.slice(0, 2000)}…` : details;
  // Header wording is uniform across the accuracy-checker family
  // ("KY Vote — <thing>") so a scanner can spot the source at a glance.
  return postToAlertsAndSupport(`*KY Vote — sync sources degraded*\n${clipped}`);
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
 * Posts a new-signup notice to the dedicated #user-signups channel
 * ({@link webhookUrlForSignups}). Kept out of the sync-digest firehose so the
 * notice is actually visible. Returns delivery status so the reconciliation
 * pipeline can stamp-on-success / retry-on-failure and escalate to #errors.
 *
 * `skipped: true` means no #user-signups webhook is configured — the caller
 * should escalate to #errors rather than treat it as delivered.
 */
export async function notifyNewUserSlack(params: {
  email: string;
  displayName?: string | null;
}): Promise<{ ok: boolean; status: number; skipped?: boolean }> {
  const url = webhookUrlForSignups();
  if (!url) return { ok: false, status: 0, skipped: true };
  const name = params.displayName?.trim();
  const who = name ? `${name} · \`${maskEmail(params.email)}\`` : `\`${maskEmail(params.email)}\``;
  return postSlackIncomingWebhook(url, `*KY Vote — new verified user* :tada:\n${who}`);
}

/**
 * Escalates a failure in the new-signup notification pipeline to #errors
 * (the alerts webhook): the #user-signups webhook is unconfigured, a Slack post
 * failed, or the reconciliation cron itself threw. Best-effort; no-op when no
 * alerts webhook is configured.
 */
export async function notifySignupPipelineFailureSlack(detail: string): Promise<void> {
  const url = webhookUrlForAlerts();
  if (!url) return;
  const clipped = detail.length > 1500 ? `${detail.slice(0, 1500)}…` : detail;
  await postSlackIncomingWebhook(url, `*KY Vote — new-signup alert pipeline problem*\n${clipped}`);
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
 *
 * Returns whether at least one post actually landed, so the caller can pass it to
 * {@link markSlackErrorNotified} rather than dropping the sentinel on a post that
 * never made it out (which would silence the workflow fallback step too).
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
}): Promise<boolean> {
  if (params.fromCli === true && process.env.SLACK_SYNC_NOTIFY_CLI !== 'true') {
    return false;
  }

  const syncUrl = webhookUrlForSyncDigest();
  const alertUrl = webhookUrlForAlerts();

  let delivered = false;
  const posted = new Set<string>();
  if (syncUrl) {
    delivered = (await postSlackIncomingWebhook(syncUrl, params.body)).ok || delivered;
    posted.add(syncUrl);
  }
  if (params.escalateToAlerts && alertUrl && !posted.has(alertUrl)) {
    delivered = (await postSlackIncomingWebhook(alertUrl, params.body)).ok || delivered;
  }
  return delivered;
}
