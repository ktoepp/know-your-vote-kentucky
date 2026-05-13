#!/usr/bin/env npx tsx
/**
 * Spot-check LegiScan roll-call URLs and sponsor Ballotpedia links derived from synced bill rows.
 *
 * Roll-call **public** URLs often return **403** to scripts (LegiScan / Cloudflare). When
 * **LEGISCAN_API_KEY** is set, each roll call is validated with **getRollCall** instead.
 * Sponsor Ballotpedia values are read from `ky_bills.sponsors` JSON (sync snapshot shape varies).
 *
 * Usage:
 *   npx tsx scripts/spot-check-bill-external-links.ts
 *   npx tsx scripts/spot-check-bill-external-links.ts --votes-limit 12 --bills-scan 400
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { legiscanRollCallPublicUrl, normalizeBallotpediaHref } from '../src/lib/external-legislative-links';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';

const TIMEOUT_MS = 18_000;

function parseArgs(): { votesLimit: number; billsScan: number } {
  const args = process.argv.slice(2);
  let votesLimit = 12;
  let billsScan = 400;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--votes-limit' && args[i + 1]) {
      votesLimit = Math.max(1, parseInt(args[i + 1]!, 10));
      i++;
    } else if (args[i] === '--bills-scan' && args[i + 1]) {
      billsScan = Math.max(1, parseInt(args[i + 1]!, 10));
      i++;
    }
  }
  return { votesLimit, billsScan };
}

async function probeUrl(url: string): Promise<{ ok: boolean; status: number }> {
  const ua = 'KnowYourVoteKentucky-SpotCheck/1.0 (+https://kyvky.com)';
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': ua, Accept: '*/*' },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': ua, Range: 'bytes=0-0', Accept: '*/*' },
      });
    }
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': ua, Accept: '*/*' },
      });
      return { ok: res.status >= 200 && res.status < 400, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}

function ballotpediaFromSponsorPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const direct = o.ballotpedia ?? o.Ballotpedia;
  if (typeof direct === 'string') return normalizeBallotpediaHref(direct);
  const bio = o.bio;
  if (bio && typeof bio === 'object') {
    const social = (bio as { social?: Record<string, unknown> }).social;
    const bp = social?.ballotpedia ?? social?.Ballotpedia;
    if (typeof bp === 'string') return normalizeBallotpediaHref(bp);
  }
  return null;
}

function collectSponsorBallotpediaUrls(sponsorsUnknown: unknown): string[] {
  if (!Array.isArray(sponsorsUnknown)) return [];
  const out: string[] = [];
  for (const s of sponsorsUnknown) {
    const href = ballotpediaFromSponsorPayload(s);
    if (href) out.push(href);
  }
  return [...new Set(out)];
}

async function main() {
  const { votesLimit, billsScan } = parseArgs();
  const legiscanApi = Boolean(process.env.LEGISCAN_API_KEY?.trim());

  if (!supabaseAdmin) {
    console.error(
      'Missing Supabase admin client. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local',
    );
    process.exit(1);
  }

  let exitCode = 0;

  const { data: voteRows, error: vErr } = await supabaseAdmin
    .from('ky_votes')
    .select('roll_call_id, ky_bills!inner(bill_number)')
    .not('roll_call_id', 'is', null)
    .order('date', { ascending: false })
    .limit(votesLimit);

  if (vErr) {
    console.error('Supabase ky_votes:', vErr.message);
    process.exit(1);
  }

  console.log('\n═══ LegiScan roll-call URLs (latest votes in DB) ═══\n');
  if (legiscanApi) {
    console.log('Roll calls verified via LegiScan API (getRollCall). Public URL shown for manual/browser checks.\n');
  } else {
    console.log(
      'Without LEGISCAN_API_KEY: HTTP probe only — legiscan.com often returns 403 to automation (not treated as hard failure).\n',
    );
  }

  const legiscan = legiscanApi ? getKyLegiScanClient() : null;

  for (const row of voteRows ?? []) {
    const nest = row as { roll_call_id: number; ky_bills?: { bill_number?: string } };
    const bn = nest.ky_bills?.bill_number;
    const rid = nest.roll_call_id;
    if (bn == null || rid == null) continue;
    const url = legiscanRollCallPublicUrl(bn, Number(rid));
    let ok = false;
    let detail = '';
    if (legiscan) {
      try {
        const rc = await legiscan.fetchRollCall(Number(rid));
        ok = Boolean(rc && Number(rc.roll_call_id) === Number(rid));
        detail = ok ? 'API OK' : 'API miss';
      } catch (e) {
        detail = `API error: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      const r = await probeUrl(url);
      ok = r.ok || r.status === 403;
      detail = r.status === 403 ? 'HTTP 403 (browser likely OK)' : `HTTP ${r.status}`;
      if (!r.ok && r.status !== 403) exitCode = 1;
    }
    if (legiscan && !ok) exitCode = 1;
    const tag = ok ? 'OK ' : 'FAIL';
    console.log(`${tag}  ${detail.padEnd(26)}  ${url}`);
  }

  const { data: billRows, error: bErr } = await supabaseAdmin
    .from('ky_bills')
    .select('bill_number, sponsors')
    .not('sponsors', 'is', null)
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(billsScan);

  if (bErr) {
    console.error('Supabase ky_bills:', bErr.message);
    process.exit(1);
  }

  const bpTargets: { bill: string; url: string }[] = [];
  for (const b of billRows ?? []) {
    const sponsors = (b as { bill_number?: string; sponsors?: unknown }).sponsors;
    const urls = collectSponsorBallotpediaUrls(sponsors);
    const billNum = (b as { bill_number?: string }).bill_number ?? '?';
    for (const url of urls) {
      bpTargets.push({ bill: billNum, url });
      if (bpTargets.length >= 10) break;
    }
    if (bpTargets.length >= 10) break;
  }

  console.log('\n═══ Sponsor Ballotpedia URLs (first matches from recent bills) ═══\n');

  if (bpTargets.length === 0) {
    console.log(
      'No Ballotpedia sponsor fields found in scanned bills (detail page still resolves many sponsors via live LegiScan).',
    );
  } else {
    for (const { bill, url } of bpTargets) {
      const r = await probeUrl(url);
      const tag = r.ok ? 'OK ' : 'FAIL';
      if (!r.ok) exitCode = 1;
      console.log(`${tag}  HTTP ${String(r.status).padEnd(3)}  [${bill}]  ${url}`);
    }
  }

  console.log('');
  process.exit(exitCode);
}

main();
