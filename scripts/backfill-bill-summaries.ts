#!/usr/bin/env npx tsx
/**
 * Populate ky_bills.ai_summary with AI plain-language summaries (each including a
 * grounded "Who it may affect:" clause) via src/lib/ky-content-generation.ts.
 *
 *   npx tsx scripts/backfill-bill-summaries.ts --dry-run --limit=15  # generate + print, no writes
 *   npx tsx scripts/backfill-bill-summaries.ts --limit=15            # generate + persist (capped)
 *   npx tsx scripts/backfill-bill-summaries.ts                       # whole active session
 *   npx tsx scripts/backfill-bill-summaries.ts --only-missing        # skip bills that already have a summary
 *   npx tsx scripts/backfill-bill-summaries.ts --all-sessions        # widen beyond the active session
 *   npx tsx scripts/backfill-bill-summaries.ts --session="2025 Regular Session"
 *   npx tsx scripts/backfill-bill-summaries.ts --bill=HB877              # regen one bill (forces regen)
 *
 * --limit caps the number of summaries GENERATED this run (the cost knob), not rows scanned.
 * Decoupled from LegiScan sync on purpose: keeps AI latency/cost out of the quota-sensitive
 * sync path. Idempotent — re-running regenerates only bills whose inputs changed (input-hash
 * mismatch) unless --only-missing is set. Costs Anthropic tokens, zero LegiScan quota.
 *
 * Requires ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import {
  generateBillSummary,
  isUsableSummary,
  KY_CONTENT_MODEL,
} from '../src/lib/ky-content-generation';
import { mapWithConcurrency } from '../src/lib/ky-committee-material-link-probe';
import { getCivicDataSessionName } from '../src/lib/ky-sessions';
import type { KYBill } from '../src/types/kentucky';

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_MISSING = process.argv.includes('--only-missing');
const ALL_SESSIONS = process.argv.includes('--all-sessions');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] ?? '' : null;
// --bill=HB877 targets one bill (within the session scope) and forces regeneration
// even when the input hash is unchanged — for accuracy-audit triage of a flagged summary.
const billArg = process.argv.find((a) => a.startsWith('--bill='));
const BILL = billArg ? (billArg.split('=')[1] ?? '').toUpperCase().replace(/\s+/g, '') : null;
const CONCURRENCY = 4;

type SummaryRow = Pick<
  KYBill,
  | 'id'
  | 'bill_number'
  | 'session'
  | 'title'
  | 'description'
  | 'status'
  | 'chamber'
  | 'topics'
  | 'legiscan_subjects'
  | 'ai_summary'
> & { ai_summary_input_hash: string | null };

/** Stable hash of the fields that feed the summary; regen only when this changes. */
function summaryInputHash(row: SummaryRow): string {
  const subjectNames = (row.legiscan_subjects ?? [])
    .map((s) => s?.subject_name?.trim())
    .filter((s): s is string => !!s)
    .sort();
  const topics = (row.topics ?? []).slice().sort();
  const payload = JSON.stringify({
    title: row.title ?? '',
    description: row.description ?? '',
    topics,
    subjects: subjectNames,
  });
  return createHash('sha1').update(payload).digest('hex');
}

function needsRegen(row: SummaryRow, hash: string): boolean {
  if (BILL) return true; // explicit target: always regenerate
  if (!isUsableSummary(row.ai_summary)) return true; // missing / empty / stale placeholder
  if (ONLY_MISSING) return false; // has a usable summary and we only fill gaps
  return row.ai_summary_input_hash !== hash; // inputs changed since last generation
}

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set — cannot generate summaries.');
  }

  const sessionName = ALL_SESSIONS ? null : SESSION ?? getCivicDataSessionName();
  const scope = sessionName ? `session="${sessionName}"` : 'all sessions';

  // Pass 1: scan pages, collect up to LIMIT bills that need (re)generation.
  const PAGE = 1000;
  let from = 0;
  let scanned = 0;
  const candidates: { row: SummaryRow; hash: string }[] = [];

  for (;;) {
    if (candidates.length >= LIMIT) break;
    let q = db
      .from('ky_bills')
      .select(
        'id, bill_number, session, title, description, status, chamber, topics, legiscan_subjects, ai_summary, ai_summary_input_hash',
      )
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (sessionName) q = q.eq('session', sessionName);
    if (BILL) q = q.eq('bill_number', BILL);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as SummaryRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const hash = summaryInputHash(row);
      if (needsRegen(row, hash)) {
        candidates.push({ row, hash });
        if (candidates.length >= LIMIT) break;
      }
    }
    from += PAGE;
  }

  console.log(
    `Scope: ${scope}${ONLY_MISSING ? ' [only-missing]' : ''} — scanned=${scanned}, ` +
      `${candidates.length} bill(s) to ${DRY_RUN ? 'preview' : 'generate'}.`,
  );

  // Pass 2: generate (and persist unless dry-run) with bounded concurrency.
  let generated = 0;
  let skippedUnusable = 0;
  let writeErrors = 0;
  const samples: string[] = [];

  await mapWithConcurrency(candidates, CONCURRENCY, async ({ row, hash }) => {
    const text = await generateBillSummary(row as KYBill);
    if (!isUsableSummary(text)) {
      skippedUnusable += 1;
      console.warn(`  skip ${row.bill_number}: generator returned no usable summary`);
      return;
    }
    generated += 1;
    if (samples.length < 15) {
      samples.push(`\n— ${row.bill_number} (${row.session ?? '?'}) —\n${text}`);
    }
    if (!DRY_RUN) {
      const { error: uErr } = await db
        .from('ky_bills')
        .update({
          ai_summary: text,
          ai_summary_generated_at: new Date().toISOString(),
          ai_summary_model: KY_CONTENT_MODEL,
          ai_summary_input_hash: hash,
        })
        .eq('id', row.id);
      if (uErr) {
        writeErrors += 1;
        console.error(`  update ${row.bill_number}: ${uErr.message}`);
      }
    }
  });

  if (samples.length > 0) {
    console.log(`\nSample summaries (${samples.length}):`);
    console.log(samples.join('\n'));
  }
  console.log(
    `\nscanned=${scanned} generated=${generated} skipped(unusable)=${skippedUnusable} ` +
      `writeErrors=${writeErrors} model=${KY_CONTENT_MODEL} ` +
      `${DRY_RUN ? '[DRY RUN - no writes]' : '[APPLIED]'}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
