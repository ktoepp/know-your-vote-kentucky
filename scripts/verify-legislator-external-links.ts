#!/usr/bin/env npx tsx
/**
 * Systematically verify reachability of legislator outbound URLs in ky_legislators.
 *
 * Checks (when present): lrc_profile_url, website, Ballotpedia (resolved), LegiScan person page.
 * Non-LegiScan: HEAD first; on 405/501 or HEAD failure, retries with GET (Range: bytes=0-0, then full GET).
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
 *
 * Exit: 0 if every non-exempt probe returns 2xx/3xx (LegiScan API counts as OK when getPerson succeeds); 1 if any other failure.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { legiscanPersonUrl, normalizeBallotpediaHref } from '../src/lib/external-legislative-links';
import { normalizeHttpsUrl } from '../src/lib/legislator-link-normalize';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';

const TIMEOUT_MS = 18_000;
const CONCURRENCY = 6;

type FieldKey = 'lrc_profile_url' | 'website' | 'ballotpedia' | 'legiscan';

interface Row {
  id: string;
  name: string;
  legiscan_id: number | null;
  lrc_profile_url: string | null;
  website: string | null;
  ballotpedia: string | null;
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
}

function parseArgs(): {
  limit: number | null;
  json: boolean;
  strictLegiscan: boolean;
  httpLegiscanOnly: boolean;
} {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let json = false;
  let strictLegiscan = false;
  let httpLegiscanOnly = false;
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
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: npx tsx scripts/verify-legislator-external-links.ts [--limit N] [--json] [--strict-legiscan] [--http-legiscan-only]',
      );
      process.exit(0);
    }
  }
  return { limit, json, strictLegiscan, httpLegiscanOnly };
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
    };
  }
}

function collectProbes(rows: Row[]): LinkProbe[] {
  const probes: LinkProbe[] = [];
  for (const row of rows) {
    const push = (field: FieldKey, raw: string | null | undefined) => {
      const t = (raw ?? '').trim();
      if (!t) return;
      const n = normalizeHttpsUrl(t) ?? t;
      probes.push({ legislatorId: row.id, name: row.name, field, url: n });
    };

    push('lrc_profile_url', row.lrc_profile_url);
    push('website', row.website);

    const bp = normalizeBallotpediaHref(row.ballotpedia);
    if (bp) probes.push({ legislatorId: row.id, name: row.name, field: 'ballotpedia', url: bp });

    if (row.legiscan_id != null && Number.isFinite(Number(row.legiscan_id))) {
      probes.push({
        legislatorId: row.id,
        name: row.name,
        field: 'legiscan',
        url: legiscanPersonUrl(Number(row.legiscan_id)),
      });
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
      'User-Agent': 'KnowYourVoteKentucky-LinkVerifier/1.0 (integrity check; +https://knowyourvotekentucky.org)',
      Accept: '*/*',
      ...extraHeaders,
    },
  };
}

async function probeUrl(url: string): Promise<ProbeResult> {
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
  const { limit, json, strictLegiscan, httpLegiscanOnly } = parseArgs();

  if (!supabaseAdmin) {
    console.error(
      'Missing Supabase admin client. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local',
    );
    process.exit(1);
  }

  const useLegiscanApi = Boolean(process.env.LEGISCAN_API_KEY?.trim()) && !httpLegiscanOnly;

  let query = supabaseAdmin
    .from('ky_legislators')
    .select('id, name, legiscan_id, lrc_profile_url, website, ballotpedia')
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
  const probes = collectProbes(rows);
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
      table.push({ ...p, ...r, exemptLegiscan403: false, legiscanVia: 'api' });
      continue;
    }
    const r = urlCache.get(p.url)!;
    const exemptLegiscan403 = isLegiscanPublic403Exempt(p.field, r.status, strictLegiscan);
    table.push({ ...p, ...r, exemptLegiscan403, legiscanVia: p.field === 'legiscan' ? 'http' : undefined });
  }

  let failed = 0;
  let skippedLegiscan403 = 0;
  for (const row of table) {
    if (row.exemptLegiscan403) skippedLegiscan403++;
    else if (!row.ok) failed++;
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          legislators: rows.length,
          probes: table.length,
          failed,
          skippedLegiscan403,
          strictLegiscan,
          legiscanVerification: useLegiscanApi ? 'legiscan_api_getperson' : 'public_http',
          rows: table.map(({ exemptLegiscan403, ...rest }) => ({
            ...rest,
            ...(exemptLegiscan403 ? { verifierNote: 'legiscan_html_403_exempt' } : {}),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    const legApiN = table.filter((t) => t.legiscanVia === 'api').length;
    const skipNote =
      skippedLegiscan403 > 0 && !strictLegiscan
        ? ` | LegiScan HTTP skipped (403 bot block, not missing link): ${skippedLegiscan403}`
        : '';
    const apiNote =
      useLegiscanApi && legApiN > 0
        ? ` | LegiScan checked via API (getPerson): ${legApiN}`
        : !useLegiscanApi && table.some((t) => t.field === 'legiscan')
          ? ' | LegiScan: set LEGISCAN_API_KEY to validate people_id via API (public HTML often 403).'
          : '';
    console.log(
      `Legislators: ${rows.length} | Link checks: ${table.length} (${uniqueUrls.length} unique HTTP URLs) | Failed: ${failed}${skipNote}${apiNote}\n`,
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
        'With LEGISCAN_API_KEY, LegiScan rows use the API instead of public HTML. ' +
        'Use --http-legiscan-only to force HTTP probes only.\n',
    );
    const wName = Math.min(28, Math.max(12, ...table.map((t) => t.name.length), 12));
    const head = `${'NAME'.padEnd(wName)} ${'FIELD'.padEnd(14)} ${'HTTP'.padEnd(4)} OK    URL`;
    console.log(head);
    console.log('-'.repeat(Math.min(120, head.length + 40)));
    for (const t of table) {
      let okStr = 'yes';
      if (!t.ok) {
        okStr = t.exemptLegiscan403 ? 'skip' : 'no ';
      }
      const line = `${t.name.slice(0, wName).padEnd(wName)} ${t.field.padEnd(14)} ${String(t.status).padEnd(4)} ${okStr}   ${t.finalUrl}`;
      console.log(line);
      if (!t.ok && !t.exemptLegiscan403 && t.error)
        console.log(`${''.padEnd(wName)} ${''.padEnd(14)}      note: ${t.error}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
