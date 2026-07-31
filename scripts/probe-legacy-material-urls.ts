/**
 * Confirm — empirically — that the superseded flat committee-material URLs are
 * dead before anything deletes the rows that hold them.
 *
 * 802 of 1,773 `ky_committee_materials` rows carry the pre-migration flat
 * `/CommitteeDocuments/{meeting_id}/{file}` shape, and every one has an exact
 * nested twin under `/CommitteeDocuments/{rsn}/{meeting_id}/{file}`. The claim
 * that the flat copies 404 comes from a code comment (`lrcCommitteeDocumentsUrl`),
 * never from a live probe — it is the one part of the duplicate-rows diagnosis
 * that was never confirmed. This script confirms or refutes it.
 *
 * For each sampled legacy row it probes BOTH the legacy URL and its nested twin,
 * because "legacy is dead" only justifies deletion if "twin is alive" holds too.
 *
 * READ-ONLY: never writes `link_status` — persisting a probe result is
 * `probe:committee-links`' job. This script only reports.
 *
 * Must run somewhere that can reach apps.legislature.ky.gov (GitHub Actions);
 * the dev sandbox network policy blocks it.
 *
 * Usage:
 *   npm run probe:legacy-material-urls                 # sample 40 (default)
 *   npm run probe:legacy-material-urls -- --limit=200
 *   npm run probe:legacy-material-urls -- --all
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { mapWithConcurrency, probeUrl } from '../src/lib/ky-committee-material-link-probe';

const args = process.argv.slice(2);
const all = args.includes('--all');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 40;
const concurrency = Number(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1]) || 4;

const LEGACY_SHAPE = /\/CommitteeDocuments\/\d+\/[^/]+$/;
const NESTED_SHAPE = /\/CommitteeDocuments\/\d+\/\d+\/[^/]+$/;

interface MaterialRow {
  id: string;
  committee_id: string;
  title: string | null;
  url: string;
  meeting_date: string | null;
}

async function fetchAll(db: ReturnType<typeof createClient>): Promise<MaterialRow[]> {
  const out: MaterialRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from('ky_committee_materials')
      .select('id, committee_id, title, url, meeting_date')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Fetch failed:', error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as unknown as MaterialRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** Deterministic spread across the corpus — no Math.random, so runs compare. */
function evenSample<T>(rows: T[], n: number): T[] {
  if (rows.length <= n) return rows;
  const step = rows.length / n;
  return Array.from({ length: n }, (_, i) => rows[Math.floor(i * step)]!);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }
  const db = createClient(url, key);

  const rows = await fetchAll(db);
  const legacy = rows.filter((r) => LEGACY_SHAPE.test(r.url) && !NESTED_SHAPE.test(r.url));
  const nested = rows.filter((r) => NESTED_SHAPE.test(r.url));
  console.log(`[legacy-probe] ${legacy.length} legacy / ${nested.length} nested / ${rows.length} total`);

  // Twin = same committee + title + meeting_date, nested URL shape.
  const twinKey = (r: MaterialRow) => `${r.committee_id}|${r.title ?? ''}|${r.meeting_date ?? ''}`;
  const nestedByKey = new Map<string, MaterialRow>();
  for (const r of nested) if (!nestedByKey.has(twinKey(r))) nestedByKey.set(twinKey(r), r);

  const withTwin = legacy.filter((r) => nestedByKey.has(twinKey(r)));
  console.log(
    `[legacy-probe] ${withTwin.length}/${legacy.length} legacy rows have an exact nested twin` +
      `${withTwin.length === legacy.length ? ' — invariant holds' : ' — INVARIANT BROKEN, do not delete'}`,
  );

  const sample = all ? legacy : evenSample(legacy, limit);
  console.log(`[legacy-probe] probing ${sample.length} legacy URL(s) + their twins — concurrency ${concurrency}\n`);

  const tally = {
    legacyDead: 0,
    legacyAlive: 0,
    legacyAmbiguous: 0,
    twinAlive: 0,
    twinDead: 0,
    twinAmbiguous: 0,
    twinMissing: 0,
  };

  await mapWithConcurrency(sample, concurrency, async (row) => {
    const legacyRes = await probeUrl(row.url);
    const twin = nestedByKey.get(twinKey(row));
    const twinRes = twin ? await probeUrl(twin.url) : null;

    if (legacyRes.status === 404) tally.legacyDead++;
    else if (legacyRes.ok) tally.legacyAlive++;
    else tally.legacyAmbiguous++;

    if (!twin) tally.twinMissing++;
    else if (twinRes!.ok) tally.twinAlive++;
    else if (twinRes!.status === 404) tally.twinDead++;
    else tally.twinAmbiguous++;

    // A legacy URL that still resolves is the finding that stops the cleanup.
    const flag = legacyRes.ok ? 'LEGACY STILL LIVE ' : '';
    console.log(
      `  ${flag}legacy=${String(legacyRes.status).padStart(3)} twin=${twin ? String(twinRes!.status).padStart(3) : '---'}` +
        ` | ${(row.title ?? '(untitled)').slice(0, 44).padEnd(44)} | ${row.url}`,
    );
  });

  console.log(
    `\n[legacy-probe] legacy: ${tally.legacyDead} dead(404), ${tally.legacyAlive} ALIVE, ${tally.legacyAmbiguous} ambiguous`,
  );
  console.log(
    `[legacy-probe] twins:  ${tally.twinAlive} alive, ${tally.twinDead} dead(404), ${tally.twinAmbiguous} ambiguous, ${tally.twinMissing} missing`,
  );

  const safe = tally.legacyAlive === 0 && tally.twinDead === 0 && withTwin.length === legacy.length;
  console.log(
    `\n[legacy-probe] VERDICT: ${
      safe
        ? 'sample supports the cleanup — every legacy URL probed is dead and every twin resolves.'
        : 'DO NOT DELETE on this evidence — see the flagged rows above.'
    }`,
  );
  if (tally.legacyAmbiguous > 0 || tally.twinAmbiguous > 0) {
    console.log(
      '[legacy-probe] Ambiguous results (timeout/403/5xx) are not evidence either way — re-run before deciding.',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
