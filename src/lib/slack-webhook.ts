import type { SyncResult } from './ky-sync-pipeline';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import { fetchLegiscanQuotaSummary } from './legiscan-quota';

const SLACK_POST_TIMEOUT_MS = 8_000;

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

async function maybeAlertLegiscanQuotaHigh(): Promise<void> {
  try {
    const quota = await fetchLegiscanQuotaSummary();
    if (!quota || quota.limit <= 0) return;
    const pctThreshold = slackQuotaAlertThresholdPct();
    const fracThreshold = pctThreshold / 100;
    if (quota.used < quota.limit * fracThreshold) return;
    await postToAlertsAndSupport(
      `*LegiScan quota threshold (${pctThreshold}%+)*\nMonth \`${quota.month}\`: ${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} (${quota.pct}% used)`,
    );
  } catch {
    /* ignore */
  }
}

function syncTriggerLabel(isVercelCron: boolean, fromCli: boolean): string {
  if (isVercelCron) return 'Vercel cron';
  if (fromCli) return 'CLI / GitHub Actions';
  return 'Manual HTTP';
}

/**
 * Posts a digest to the sync webhook for cron runs (or manual runs when SLACK_SYNC_NOTIFY_MANUAL=true).
 * CLI/GitHub Actions: set SLACK_SYNC_NOTIFY_CLI=true when invoking `scripts/manual-sync.ts`.
 *
 * Default: status-reports digest only when new rows were synced (`itemsSynced > 0`), or errors/skips-with-message.
 * Set SLACK_SYNC_DIGEST_ALWAYS=true for a digest on every Vercel cron run (heartbeat).
 * Vercel hourly bills cron (`source=bills`) posts a digest every run by default (quota + ky_sources);
 * set SLACK_SYNC_BILLS_DIGEST_ALWAYS=false to only post when something changed or failed.
 * CLI notify implies every-run digest when webhook configured (hourly Actions visibility).
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
  /** Hourly Vercel `source=bills` cron: post digest + quota unless opted out with SLACK_SYNC_BILLS_DIGEST_ALWAYS=false */
  const vercelBillsHeartbeat =
    isVercelCron &&
    source === 'bills' &&
    process.env.SLACK_SYNC_BILLS_DIGEST_ALWAYS !== 'false';
  const hasNewOrInteresting =
    hasErrors ||
    results.some((r) => r.status === 'success' && r.itemsSynced > 0) ||
    results.some((r) => r.status === 'skipped' && Boolean(r.error));

  const cliHeartbeat = fromCli && cliNotify;
  const worthDigest =
    digestHeartbeat || hasNewOrInteresting || cliHeartbeat || vercelBillsHeartbeat;

  const mayPostDigest = isVercelCron || manualNotify || cliHeartbeat;
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
