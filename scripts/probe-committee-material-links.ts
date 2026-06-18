/**
 * Probe LRC committee material links for reachability and persist the result to
 * ky_committee_materials.link_status (migration 031).
 *
 * The weekly accuracy audit only probes a small rotating sample (ACCURACY_LINK_SAMPLE/2),
 * so this is the full-coverage / backfill tool — and a cron candidate. 404 → 'dead'
 * (the committee detail page then flags the link as unavailable instead of linking to
 * a broken URL); 2xx/3xx → 'ok'; transient/ambiguous results leave the stored value
 * untouched so a blip never flips a good link to dead.
 *
 * Usage:
 *   npm run probe:committee-links                 # probe all, write results
 *   npm run probe:committee-links:dry             # probe all, write nothing
 *   npm run probe:committee-links -- --only-unchecked   # skip rows already probed
 *   npm run probe:committee-links -- --limit=200        # cap rows this run
 *   npm run probe:committee-links -- --committee=admin-regs-review
 *   npm run probe:committee-links -- --concurrency=6
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import {
  classifyLinkStatus,
  mapWithConcurrency,
  persistMaterialLinkStatus,
  probeUrl,
} from '../src/lib/ky-committee-material-link-probe';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry') || args.includes('--dry-run');
const onlyUnchecked = args.includes('--only-unchecked');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || undefined;
const committeeSlug = args.find((a) => a.startsWith('--committee='))?.split('=')[1];
const concurrency = Number(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1]) || 4;

interface MaterialRow {
  id: string;
  title: string | null;
  url: string;
  link_status: 'ok' | 'dead' | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }
  const db = createClient(url, key);

  let committeeId: string | undefined;
  if (committeeSlug) {
    const { data } = await db.from('ky_committees').select('id').eq('slug', committeeSlug).maybeSingle();
    if (!data) {
      console.error(`No committee found for slug "${committeeSlug}".`);
      process.exit(1);
    }
    committeeId = (data as { id: string }).id;
  }

  let query = db
    .from('ky_committee_materials')
    .select('id, title, url, link_status')
    // Refresh the stalest first so repeated capped runs rotate coverage.
    .order('link_checked_at', { ascending: true, nullsFirst: true });
  if (committeeId) query = query.eq('committee_id', committeeId);
  if (onlyUnchecked) query = query.is('link_status', null);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('Fetch failed:', error.message);
    process.exit(1);
  }
  const rows = (data ?? []) as MaterialRow[];
  if (rows.length === 0) {
    console.log('No material rows to probe.');
    return;
  }

  console.log(
    `[probe] ${rows.length} material link(s)${committeeSlug ? ` for ${committeeSlug}` : ''}` +
      `${onlyUnchecked ? ' (unchecked only)' : ''}${dryRun ? ' — DRY RUN (no writes)' : ''} — concurrency ${concurrency}`,
  );

  const tally = { ok: 0, dead: 0, ambiguous: 0 };
  const newlyDead: MaterialRow[] = [];

  await mapWithConcurrency(rows, concurrency, async (row) => {
    const { status } = await probeUrl(row.url);
    const next = classifyLinkStatus(status);
    if (next === 'ok') tally.ok += 1;
    else if (next === 'dead') {
      tally.dead += 1;
      if (row.link_status !== 'dead') newlyDead.push(row);
    } else tally.ambiguous += 1;

    if (!dryRun && next) {
      await persistMaterialLinkStatus(db, row.id, next);
    }
  });

  console.log(
    `[probe] done — ok ${tally.ok}, dead ${tally.dead}, ambiguous/unchanged ${tally.ambiguous}` +
      `${dryRun ? ' (nothing written)' : ' (written)'}`,
  );
  if (newlyDead.length) {
    console.log(`[probe] ${newlyDead.length} newly-dead link(s):`);
    for (const m of newlyDead) console.log(`  - ${m.title ?? '(untitled)'} — ${m.url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
