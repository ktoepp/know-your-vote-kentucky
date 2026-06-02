#!/usr/bin/env npx tsx
/**
 * Sync LRC Committee Documents pages → ky_committee_materials.
 *
 *   npm run sync:ky:lrc-committee-materials
 *   npm run sync:ky:lrc-committee-materials -- --dry-run
 *   npm run sync:ky:lrc-committee-materials -- --limit=5
 *   npm run sync:ky:lrc-committee-materials -- --committee-type="Statutory Committee"
 *   npm run sync:ky:lrc-committee-materials -- --delay-ms=500
 *
 * Spike-only single-committee parse against a fixture (no DB writes):
 *   npm run spike:lrc:committee-materials
 *   npm run spike:lrc:committee-materials -- --fixture=fixtures/lrc/committee-materials-itoc-live.html
 *   npm run spike:lrc:committee-materials -- --refresh --rsn=390
 */
import './load-env';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { parseCommitteeMaterialsHtml, lrcCommitteeDocumentsUrl } from '../src/lib/lrc-committee-materials-parser';
import { syncKyLrcCommitteeMaterials } from '../src/lib/ky-lrc-committee-materials-sync';

const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_FIXTURE = resolve(REPO_ROOT, 'fixtures/lrc/committee-materials-itoc-live.html');

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a?.slice(prefix.length + 1);
}

const isSpike = process.argv.includes('--spike') || /spike-lrc-committee-materials/.test(__filename);

async function runSpike() {
  let html: string;
  let sourceUrl: string = lrcCommitteeDocumentsUrl(390); // default fixture is ITOC (rsn=390)

  if (argFlag('--refresh')) {
    const rsn = Number(argValue('--rsn') ?? 390);
    sourceUrl = lrcCommitteeDocumentsUrl(rsn);
    console.log(`[spike] Fetching ${sourceUrl}…`);
    const r = await axios.get<string>(sourceUrl, {
      timeout: 30_000,
      responseType: 'text',
      headers: {
        'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; committee-materials spike)',
      },
    });
    writeFileSync(DEFAULT_FIXTURE, r.data, 'utf8');
    console.log(`[spike] Wrote ${DEFAULT_FIXTURE} (${r.data.length} bytes)`);
    html = r.data;
  } else {
    const path = argValue('--fixture') ?? DEFAULT_FIXTURE;
    if (!existsSync(path)) {
      console.error(`[spike] fixture not found: ${path}`);
      process.exit(1);
    }
    html = readFileSync(resolve(path), 'utf8');
  }

  const result = parseCommitteeMaterialsHtml(html, sourceUrl);
  console.log(JSON.stringify({
    committeeName: result.committeeName,
    stats: result.stats,
    priorYearUrls: result.priorYearUrls,
    meetings: result.meetings.slice(0, 3).map((m) => ({
      dateLabel: m.dateLabel,
      meetingDate: m.meetingDate,
      materialCount: m.materials.length,
      first: m.materials[0],
    })),
  }, null, 2));

  if (result.stats.meetingCount === 0) {
    console.error('[spike] WARN: zero meetings parsed');
    process.exit(2);
  }
}

async function runSync() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const dryRun = argFlag('--dry-run');
  const limitStr = argValue('--limit');
  const committeeType = argValue('--committee-type');
  const delayStr = argValue('--delay-ms');

  const stats = await syncKyLrcCommitteeMaterials(supabase, {
    dryRun,
    limit: limitStr ? Number(limitStr) : undefined,
    committeeTypes: committeeType ? [committeeType] : undefined,
    delayMs: delayStr ? Number(delayStr) : 250,
  });

  console.log(JSON.stringify(stats, null, 2));
  if (stats.errors > 0) process.exit(2);
}

(async () => {
  if (isSpike) {
    await runSpike();
  } else {
    await runSync();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
