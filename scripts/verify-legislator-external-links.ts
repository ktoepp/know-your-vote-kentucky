#!/usr/bin/env npx tsx
/**
 * Systematically verify reachability of legislator outbound URLs in ky_legislators.
 *
 * Checks (when present): lrc_profile_url, website, Ballotpedia (resolved), LegiScan person page.
 * Non-LegiScan: HEAD first; on 405/501 or HEAD failure, retries with GET (Range: bytes=0-0, then full GET).
 *
 * Transient signals (any 5xx — e.g. legislature.ky.gov 503 under load — or status 0 / connection drop)
 * are retried with exponential backoff + jitter, and any that still don't resolve are recorded as
 * **skip** (server unavailable / transient), NOT a failure. This mirrors `classifyLinkStatus`
 * (src/lib/ky-committee-material-link-probe.ts): only a definitive 4xx (404/410) means a link is broken;
 * a host throttle or blip must never flip a good link to "failed" and page #errors. The skip count is
 * still surfaced in the summary so a genuine host-wide outage stays visible.
 *
 * LegiScan: the public `legiscan.com/people/id/...` HTML is often **403** for scripts (Cloudflare). That shows as
 * `skip` in human output — the URL was still probed; the site blocked automation, not "missing link."
 * When **LEGISCAN_API_KEY** is set (same as bill sync), LegiScan rows are validated with **getPerson** instead,
 * so you get a real OK/fail per `people_id` without relying on public HTML.
 *
 * Usage:
 *   npx tsx scripts/verify-legislator-external-links.ts
 *   npx tsx scripts/verify-legislator-external-links.ts --limit 20
 *   npx tsx scripts/verify-legislator-external-links.ts --json
 *   npx tsx scripts/verify-legislator-external-links.ts --strict-legiscan
 *   npx tsx scripts/verify-legislator-external-links.ts --http-legiscan-only   # ignore API; force HTTP probe only
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in .env.local
 * Optional: LEGISCAN_API_KEY — LegiScan API verification for person IDs (recommended).
 * Optional Slack (GitHub Actions / CLI): SLACK_WEBHOOK_STATUS_REPORTS (+ SLACK_WEBHOOK_ERRORS) and SLACK_SYNC_NOTIFY_CLI=true
 *
 * Exit: 0 if every non-exempt probe returns 2xx/3xx (LegiScan API counts as OK when getPerson succeeds); 1 if any other failure.
 */
import fs from 'node:fs';
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { legiscanPersonUrl, normalizeBallotpediaHref } from '../src/lib/external-legislative-links';
import { normalizeHttpsUrl, type LegislatorExternalLink } from '../src/lib/legislator-link-normalize';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';
import { makeHostGateRouter, type HostLimit } from '../src/lib/host-rate-gate';
import { isLegiscanQuotaHoldError } from '../src/lib/legiscan-quota';
import {
  markSlackErrorNotified,
  notifyLegislatorLinksVerifySlack,
} from '../src/lib/slack-webhook';

const TIMEOUT_MS = 18_000;
const CONCURRENCY = 6;
/**
 * Per-host caps layered under the global pool.
 *
 * `legislature.ky.gov` throttles under the full 6-way burst: run #18 (2026-07-20)
 * came back with 79 `lrc_profile_url` probes at HTTP 503 / status-0. Those are
 * classified as transient skips rather than failures (the `202f383` fix), which
 * is correct but means a throttled run silently verifies nothing for that host.
 * Capping LRC at 2 in flight, with a floor on the gap between request starts,
 * keeps coverage instead of trading it for speed. Other hosts are unaffected —
 * they still run at the global limit.
 */
const HOST_LIMITS: Record<string, HostLimit> = {
  'legislature.ky.gov': { concurrency: 2, minSpacingMs: 400 },
};
/** Max probe attempts (initial + retries) for a URL that comes back transient (5xx/status-0). */
const MAX_PROBE_ATTEMPTS = 3;
/** Exponential-backoff base between transient retries; jitter added on top. */
const RETRY_BASE_MS = 800;
/** Small pre-probe jitter (ms) to spread the concurrency burst across the host. */
const PROBE_JITTER_MS = 250;

type FieldKey =
  | 'lrc_profile_url'
  | 'website'
  | 'ballotpedia'
  | 'legiscan'
  | 'external_official'
  | 'external_other'
  | 'external_social';

interface Row {
  id: string;
  name: string;
  legiscan_id: number | null;
  lrc_profile_url: string | null;
  website: string | null;
  ballotpedia: string | null;
  external_links: LegislatorExternalLink[] | null;
}

interface LinkProbe {
  legislatorId: string;
  name: string;
  field: FieldKey;
  url: string;
}

interface ProbeResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  error?: string;
  /** LegiScan API refused the call because monthly quota is on sync hold — link is un-verifiable, not broken. */
  quotaHold?: boolean;
}

function parseArgs(): {
  limit: number | null;
  json: boolean;
  strictLegiscan: boolean;
  httpLegiscanOnly: boolean;
  probeSocial: boolean;
  output: string | null;
} {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let json = false;
  let strictLegiscan = false;
  let httpLegiscanOnly = false;
  let probeSocial = false;
  let output: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Math.max(1, parseInt(args[i + 1]!, 10));
      i++;
    } else if (args[i] === '--json') {
      json = true;
    } else if (args[i] === '--strict-legiscan') {
      strictLegiscan = true;
    } else if (args[i] === '--http-legiscan-only') {
      httpLegiscanOnly = true;
    } else if (args[i] === '--probe-social') {
      probeSocial = true;
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[i + 1]!;
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: npx tsx scripts/verify-legislator-external-links.ts [--limit N] [--json [--output FILE]] [--strict-legiscan] [--http-legiscan-only] [--probe-social]',
      );
      process.exit(0);
    }
  }
  return { limit, json, strictLegiscan, httpLegiscanOnly, probeSocial, output };
}

/** Hosts that routinely return 401/403/429 to automated probes; we still record them but don't treat as failures. */
const BOT_BLOCKING_HOSTS = new Set([
  'twitter.com',
  'x.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'tiktok.com',
  'linkedin.com',
  'threads.net',
  'truth.social',
]);

function isBotBlockedExempt(field: FieldKey, host: string, status: number): boolean {
  if (status !== 401 && status !== 403 && status !== 429 && status !== 999) return false;
  if (field === 'external_social') return BOT_BLOCKING_HOSTS.has(host.replace(/^www\./i, ''));
  return false;
}

/** LegiScan blocks many automated GETs with 403; URL pattern is often still valid in a browser. */
function isLegiscanPublic403Exempt(field: FieldKey, status: number, strictLegiscan: boolean): boolean {
  return field === 'legiscan' && status === 403 && !strictLegiscan;
}

function legiscanPeopleIdFromPublicUrl(url: string): number | null {
  const m = url.match(/\/people\/id\/(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

/** True when LegiScan API confirms this people_id exists (avoids Cloudflare on public HTML). */
async function verifyLegiscanPersonViaApi(peopleId: number): Promise<ProbeResult> {
  try {
    const client = getKyLegiScanClient();
    const person = await client.getPerson(peopleId);
    if (person?.people_id === peopleId) {
      return { ok: true, status: 200, finalUrl: legiscanPersonUrl(peopleId) };
    }
    return {
      ok: false,
      status: 404,
      finalUrl: legiscanPersonUrl(peopleId),
      error: 'getPerson returned empty or mismatched people_id',
    };
  } catch (e: unknown) {
    return {
      ok: false,
      status: 0,
      finalUrl: legiscanPersonUrl(peopleId),
      error: e instanceof Error ? e.message : String(e),
      quotaHold: isLegiscanQuotaHoldError(e),
    };
  }
}

function collectProbes(rows: Row[], probeSocial: boolean): LinkProbe[] {
  const probes: LinkProbe[] = [];
  const seenPerLegislator = new Map<string, Set<string>>();
  const pushUnique = (legislatorId: string, name: string, field: FieldKey, url: string) => {
    let seen = seenPerLegislator.get(legislatorId);
    if (!seen) {
      seen = new Set<string>();
      seenPerLegislator.set(legislatorId, seen);
    }
    if (seen.has(url)) return;
    seen.add(url);
    probes.push({ legislatorId, name, field, url });
  };

  for (const row of rows) {
    const push = (field: FieldKey, raw: string | null | undefined) => {
      const t = (raw ?? '').trim();
      if (!t) return;
      const n = normalizeHttpsUrl(t) ?? t;
      pushUnique(row.id, row.name, field, n);
    };

    push('lrc_profile_url', row.lrc_profile_url);
    push('website', row.website);

    const bp = normalizeBallotpediaHref(row.ballotpedia);
    if (bp) pushUnique(row.id, row.name, 'ballotpedia', bp);

    if (row.legiscan_id != null && Number.isFinite(Number(row.legiscan_id))) {
      pushUnique(row.id, row.name, 'legiscan', legiscanPersonUrl(Number(row.legiscan_id)));
    }

    for (const link of row.external_links ?? []) {
      const field: FieldKey =
        link.category === 'official'
          ? 'external_official'
          : link.category === 'social'
            ? 'external_social'
            : 'external_other';
      if (field === 'external_social' && !probeSocial) continue;
      pushUnique(row.id, row.name, field, link.url);
    }
  }
  return probes;
}

function fetchOpts(method: 'HEAD' | 'GET', extraHeaders?: Record<string, string>): RequestInit {
  return {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': 'KnowYourVoteKentucky-LinkVerifier/1.0 (integrity check; +https://kyvky.com)',
      Accept: '*/*',
      ...extraHeaders,
    },
  };
}

/**
 * Server-side / network signals that mean "inconclusive," not "broken link":
 * status 0 (connection dropped / timeout) or any 5xx (e.g. legislature.ky.gov 503
 * under the probe's concurrent load). Mirrors `classifyLinkStatus` — a transient
 * blip or host throttle must never be recorded as a dead link.
 */
function isTransientStatus(status: number): boolean {
  return status === 0 || (status >= 500 && status <= 599);
}

async function probeOnce(url: string): Promise<ProbeResult> {
  try {
    let res = await fetch(url, fetchOpts('HEAD'));
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, fetchOpts('GET', { Range: 'bytes=0-0' }));
    }
    const ok = res.status >= 200 && res.status < 400;
    return { ok, status: res.status, finalUrl: res.url };
  } catch {
    try {
      const res = await fetch(url, fetchOpts('GET', { Range: 'bytes=0-0' }));
      const ok = res.status >= 200 && res.status < 400;
      return { ok, status: res.status, finalUrl: res.url };
    } catch {
      try {
        const res = await fetch(url, fetchOpts('GET'));
        const ok = res.status >= 200 && res.status < 400;
        return { ok, status: res.status, finalUrl: res.url };
      } catch (e2: unknown) {
        return {
          ok: false,
          status: 0,
          finalUrl: url,
          error: e2 instanceof Error ? e2.message : String(e2),
        };
      }
    }
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Probe a URL, retrying transient (5xx/status-0) results with exponential backoff
 * + jitter before giving up. A small pre-probe jitter spreads the concurrency
 * burst so we don't provoke the host's rate limiter in the first place. Definitive
 * results (2xx/3xx, 404, …) return immediately — only transient signals retry.
 */
const gateForUrl = makeHostGateRouter(HOST_LIMITS);

async function probeUrl(url: string): Promise<ProbeResult> {
  const gate = gateForUrl(url);
  return gate ? gate(() => probeUrlUngated(url)) : probeUrlUngated(url);
}

async function probeUrlUngated(url: string): Promise<ProbeResult> {
  await sleep(Math.floor(Math.random() * PROBE_JITTER_MS));
  let result = await probeOnce(url);
  for (
    let attempt = 1;
    attempt < MAX_PROBE_ATTEMPTS && !result.ok && isTransientStatus(result.status);
    attempt++
  ) {
    await sleep(RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 400));
    result = await probeOnce(url);
  }
  return result;
}

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const { limit, json, strictLegiscan, httpLegiscanOnly, probeSocial, output } = parseArgs();

  if (!supabaseAdmin) {
    console.error(
      'Missing Supabase admin client. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local',
    );
    process.exit(1);
  }

  const useLegiscanApi = Boolean(process.env.LEGISCAN_API_KEY?.trim()) && !httpLegiscanOnly;

  let query = supabaseAdmin
    .from('ky_legislators')
    .select('id, name, legiscan_id, lrc_profile_url, website, ballotpedia, external_links')
    .eq('active', true)
    .order('last_name', { ascending: true });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Supabase:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  const probes = collectProbes(rows, probeSocial);
  const httpProbeList = probes.filter((p) => !(useLegiscanApi && p.field === 'legiscan'));
  const uniqueUrls = [...new Set(httpProbeList.map((p) => p.url))];

  const probeResults = await mapLimit(uniqueUrls, CONCURRENCY, (url) => probeUrl(url));
  const urlCache = new Map<string, ProbeResult>();
  for (let i = 0; i < uniqueUrls.length; i++) {
    urlCache.set(uniqueUrls[i]!, probeResults[i]!);
  }

  type RowOut = LinkProbe &
    ProbeResult & {
      exemptLegiscan403: boolean;
      exemptSocialBlock: boolean;
      exemptLegiscanQuota: boolean;
      exemptTransient: boolean;
      legiscanVia?: 'api' | 'http';
    };
  const table: RowOut[] = [];
  for (const p of probes) {
    if (p.field === 'legiscan' && useLegiscanApi) {
      const pid = legiscanPeopleIdFromPublicUrl(p.url);
      const r =
        pid != null
          ? await verifyLegiscanPersonViaApi(pid)
          : ({ ok: false, status: 0, finalUrl: p.url, error: 'Could not parse people id from URL' } satisfies ProbeResult);
      table.push({
        ...p,
        ...r,
        exemptLegiscan403: false,
        exemptSocialBlock: false,
        exemptLegiscanQuota: r.quotaHold === true,
        exemptTransient: r.quotaHold !== true && !r.ok && isTransientStatus(r.status),
        legiscanVia: 'api',
      });
      continue;
    }
    const r = urlCache.get(p.url)!;
    const exemptLegiscan403 = isLegiscanPublic403Exempt(p.field, r.status, strictLegiscan);
    let host = '';
    try {
      host = new URL(p.url).hostname;
    } catch {
      // ignore
    }
    const exemptSocialBlock = !exemptLegiscan403 && isBotBlockedExempt(p.field, host, r.status);
    const exemptTransient =
      !r.ok && !exemptLegiscan403 && !exemptSocialBlock && isTransientStatus(r.status);
    table.push({
      ...p,
      ...r,
      exemptLegiscan403,
      exemptSocialBlock,
      exemptLegiscanQuota: false,
      exemptTransient,
      legiscanVia: p.field === 'legiscan' ? 'http' : undefined,
    });
  }

  let failed = 0;
  let skippedLegiscan403 = 0;
  let skippedSocialBlock = 0;
  let skippedLegiscanQuota = 0;
  let skippedTransient = 0;
  for (const row of table) {
    if (row.exemptLegiscan403) skippedLegiscan403++;
    else if (row.exemptLegiscanQuota) skippedLegiscanQuota++;
    else if (row.exemptSocialBlock) skippedSocialBlock++;
    else if (row.exemptTransient) skippedTransient++;
    else if (!row.ok) failed++;
  }

  if (json) {
    const payload = {
      legislators: rows.length,
      probes: table.length,
      failed,
      skippedLegiscan403,
      skippedLegiscanQuota,
      skippedSocialBlock,
      skippedTransient,
      strictLegiscan,
      probeSocial,
      legiscanVerification: useLegiscanApi ? 'legiscan_api_getperson' : 'public_http',
      rows: table.map(
        ({ exemptLegiscan403, exemptSocialBlock, exemptLegiscanQuota, exemptTransient, ...rest }) => ({
          ...rest,
          ...(exemptLegiscan403 ? { verifierNote: 'legiscan_html_403_exempt' } : {}),
          ...(exemptLegiscanQuota ? { verifierNote: 'legiscan_quota_hold_exempt' } : {}),
          ...(exemptSocialBlock ? { verifierNote: 'social_host_bot_block_exempt' } : {}),
          ...(exemptTransient ? { verifierNote: 'transient_server_unavailable_exempt' } : {}),
        }),
      ),
    };
    const json2 = JSON.stringify(payload, null, 2);
    if (output) {
      fs.writeFileSync(output, json2, 'utf8');
      console.log(`Wrote ${output}`);
    } else {
      console.log(json2);
    }
  } else {
    const legApiN = table.filter((t) => t.legiscanVia === 'api').length;
    const skipNote =
      skippedLegiscan403 > 0 && !strictLegiscan
        ? ` | LegiScan HTTP skipped (403 bot block): ${skippedLegiscan403}`
        : '';
    const quotaNote =
      skippedLegiscanQuota > 0
        ? ` | LegiScan API skipped (monthly quota on sync hold): ${skippedLegiscanQuota}`
        : '';
    const socialNote = skippedSocialBlock > 0 ? ` | Social hosts skipped (401/403/429 bot block): ${skippedSocialBlock}` : '';
    const transientNote =
      skippedTransient > 0
        ? ` | Transient skipped (5xx/timeout after ${MAX_PROBE_ATTEMPTS} tries — server unavailable, not a dead link): ${skippedTransient}`
        : '';
    const apiNote =
      useLegiscanApi && legApiN > 0
        ? ` | LegiScan checked via API (getPerson): ${legApiN}`
        : !useLegiscanApi && table.some((t) => t.field === 'legiscan')
          ? ' | LegiScan: set LEGISCAN_API_KEY to validate people_id via API (public HTML often 403).'
          : '';
    console.log(
      `Legislators: ${rows.length} | Link checks: ${table.length} (${uniqueUrls.length} unique HTTP URLs) | Failed: ${failed}${skipNote}${quotaNote}${socialNote}${transientNote}${apiNote}\n`,
    );
    if (strictLegiscan && !useLegiscanApi) {
      console.log(
        'Mode: --strict-legiscan (LegiScan person URLs that return HTTP 403 count as failures). ' +
          'Set LEGISCAN_API_KEY to validate LegiScan via getPerson instead of public HTML.\n',
      );
    }
    console.log(
      'Legend: STAT = HTTP status (or 200 for LegiScan API OK). OK = yes if 2xx–3xx. ' +
        'LegiScan **skip** = public legiscan.com returned 403 to automated HTTP (Cloudflare); the store link may still work in a browser. ' +
        '**skip** on a 5xx/status-0 = server was unavailable/throttled after retries (transient), not a dead link. ' +
        'With LEGISCAN_API_KEY, LegiScan rows use the API instead of public HTML. ' +
        'Use --http-legiscan-only to force HTTP probes only.\n',
    );
    const wName = Math.min(28, Math.max(12, ...table.map((t) => t.name.length), 12));
    const head = `${'NAME'.padEnd(wName)} ${'FIELD'.padEnd(18)} ${'HTTP'.padEnd(4)} OK    URL`;
    console.log(head);
    console.log('-'.repeat(Math.min(120, head.length + 40)));
    for (const t of table) {
      let okStr = 'yes';
      if (!t.ok) {
        okStr =
          t.exemptLegiscan403 || t.exemptSocialBlock || t.exemptLegiscanQuota || t.exemptTransient
            ? 'skip'
            : 'no ';
      }
      const line = `${t.name.slice(0, wName).padEnd(wName)} ${t.field.padEnd(18)} ${String(t.status).padEnd(4)} ${okStr}   ${t.finalUrl}`;
      console.log(line);
      if (
        !t.ok &&
        !t.exemptLegiscan403 &&
        !t.exemptSocialBlock &&
        !t.exemptLegiscanQuota &&
        !t.exemptTransient &&
        t.error
      )
        console.log(`${''.padEnd(wName)} ${''.padEnd(18)}      note: ${t.error}`);
    }
  }

  const failures = table
    .filter(
      (row) =>
        !row.ok &&
        !row.exemptLegiscan403 &&
        !row.exemptSocialBlock &&
        !row.exemptLegiscanQuota &&
        !row.exemptTransient,
    )
    .map((row) => ({
      name: row.name,
      field: row.field,
      status: row.status,
      url: row.finalUrl,
    }));

  const slackDelivered = await notifyLegislatorLinksVerifySlack({
    legislators: rows.length,
    probes: table.length,
    failed,
    skippedLegiscan403,
    skippedLegiscanQuota,
    skippedSocialBlock,
    skippedTransient,
    failures,
    fromCli: true,
  }).catch((e) => {
    console.error('[Slack] verify notify failed:', e);
    return false;
  });

  // Failures were already posted to #errors above; suppress the workflow's
  // generic failure-notify step to avoid a duplicate message — but only if the
  // post actually landed. If Slack was down or no webhook is configured, keep the
  // sentinel absent so that fallback step is still the one thing that reports.
  if (failed > 0) markSlackErrorNotified(slackDelivered);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
