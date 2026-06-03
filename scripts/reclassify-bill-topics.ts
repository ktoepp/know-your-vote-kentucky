#!/usr/bin/env npx tsx
/**
 * Recompute ky_bills.topics with the current keyword classifier and update rows
 * whose tags changed. Use this after editing TOPIC_KEYWORDS in
 * src/lib/ky-topic-classifier.ts — the sync only reclassifies new/changed bills,
 * so existing rows keep stale tags until backfilled.
 *
 *   npx tsx scripts/reclassify-bill-topics.ts --dry-run     # show plan, no writes
 *   npx tsx scripts/reclassify-bill-topics.ts               # apply updates
 *   npx tsx scripts/reclassify-bill-topics.ts --limit=500   # cap rows scanned
 *
 * Mirrors the sync: keyword-only classifyTopics, stores null when no topic hits.
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { classifyTopics } from '../src/lib/ky-topic-classifier';

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;

function sameTags(a: string[] | null, b: string[] | null): boolean {
  const x = a ?? [];
  const y = b ?? [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

async function main() {
  const db = supabaseAdmin;
  if (!db) throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');

  const PAGE = 1000;
  let from = 0;
  let scanned = 0;
  let changed = 0;
  let removedTags = 0;
  let addedTags = 0;
  const samples: string[] = [];

  for (;;) {
    if (scanned >= LIMIT) break;
    const { data, error } = await db
      .from('ky_bills')
      .select('id, bill_number, session, title, description, topics')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (scanned >= LIMIT) break;
      scanned += 1;
      const stored = (row.topics as string[] | null) ?? null;
      const recomputed = classifyTopics(row.title as string, (row.description as string) ?? '');
      const next = recomputed.length > 0 ? recomputed : null;
      if (sameTags(stored, next)) continue;

      changed += 1;
      removedTags += (stored ?? []).filter((t) => !(next ?? []).includes(t)).length;
      addedTags += (next ?? []).filter((t) => !(stored ?? []).includes(t)).length;
      if (samples.length < 30) {
        samples.push(`${row.bill_number} (${row.session}): ${JSON.stringify(stored)} -> ${JSON.stringify(next)}`);
      }

      if (!DRY_RUN) {
        const { error: uErr } = await db.from('ky_bills').update({ topics: next }).eq('id', row.id as string);
        if (uErr) console.error(`update ${row.bill_number}: ${uErr.message}`);
      }
    }
    from += PAGE;
  }

  if (samples.length > 0) {
    console.log('Sample changes:');
    console.log(samples.join('\n'));
  }
  console.log(
    `\nscanned=${scanned} changed=${changed} (tags removed=${removedTags}, added=${addedTags}) ` +
      `${DRY_RUN ? '[DRY RUN - no writes]' : '[APPLIED]'}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
