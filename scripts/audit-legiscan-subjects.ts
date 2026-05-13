#!/usr/bin/env npx tsx
/**
 * Audit LegiScan subject coverage in our KY_TOPIC mapping.
 *
 *   npm run audit:legiscan-subjects
 *   npm run audit:legiscan-subjects -- --json --output reports/legiscan-subjects.json
 *
 * Reads `ky_bills.legiscan_subjects` for active bills, counts each distinct
 * subject_name, then checks whether `src/lib/ky-topic-legiscan-mapping.ts`
 * resolves it to at least one KY_TOPIC. Unmapped subjects (sorted by
 * frequency desc) are candidates to add to the mapping so topic-followers
 * stop silently missing those bills in their digest.
 *
 * Exit code: 0 always — coverage is informational, not pass/fail.
 */
import fs from 'node:fs';
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { topicsForLegiScanSubject } from '../src/lib/ky-topic-legiscan-mapping';

type Args = { json: boolean; output: string | null; topN: number };
function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = { json: false, output: null, topN: 50 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') out.json = true;
    else if (argv[i] === '--output' && argv[i + 1]) {
      out.output = argv[++i]!;
    } else if (argv[i] === '--top' && argv[i + 1]) {
      out.topN = Math.max(1, parseInt(argv[++i]!, 10));
    }
  }
  return out;
}

type SubjectRow = { legiscan_subjects: Array<{ subject_name?: string | null }> | null };

async function main() {
  const args = parseArgs();
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(1);
  }

  const counts = new Map<string, number>();
  const PAGE = 1000;
  let from = 0;
  let totalBills = 0;
  let billsWithSubjects = 0;

  // Stream pages so we don't blow memory.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('ky_bills')
      .select('legiscan_subjects')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as SubjectRow[];
    if (rows.length === 0) break;
    totalBills += rows.length;
    for (const r of rows) {
      const subjects = Array.isArray(r.legiscan_subjects) ? r.legiscan_subjects : [];
      if (subjects.length > 0) billsWithSubjects++;
      for (const s of subjects) {
        const name = String(s?.subject_name ?? '').trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  const distinct = counts.size;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  type SubjectReport = { subject: string; count: number; mapped: boolean; topics: string[] };
  const report: SubjectReport[] = sorted.map(([subject, count]) => {
    const topics = topicsForLegiScanSubject(subject);
    return { subject, count, mapped: topics.length > 0, topics };
  });
  const unmapped = report.filter((r) => !r.mapped);
  const mapped = report.length - unmapped.length;
  const unmappedBillTouches = unmapped.reduce((sum, r) => sum + r.count, 0);
  const totalBillTouches = report.reduce((sum, r) => sum + r.count, 0);

  const summary = {
    totalBills,
    billsWithSubjects,
    distinctSubjects: distinct,
    mappedSubjects: mapped,
    unmappedSubjects: unmapped.length,
    coverageBySubject: distinct === 0 ? null : +(mapped / distinct).toFixed(3),
    coverageByBillTouches:
      totalBillTouches === 0 ? null : +((totalBillTouches - unmappedBillTouches) / totalBillTouches).toFixed(3),
    topUnmapped: unmapped.slice(0, args.topN),
  };

  if (args.json) {
    const json = JSON.stringify({ summary, report }, null, 2);
    if (args.output) {
      fs.writeFileSync(args.output, json, 'utf8');
      console.log(`Wrote ${args.output}`);
    } else {
      console.log(json);
    }
  } else {
    console.log(
      `Bills: ${totalBills} | with LegiScan subjects: ${billsWithSubjects} | distinct subject names: ${distinct}`,
    );
    console.log(
      `Mapped: ${mapped}/${distinct} (${summary.coverageBySubject ?? '—'}) | by bill-touches: ${summary.coverageByBillTouches ?? '—'}`,
    );
    console.log('');
    if (unmapped.length === 0) {
      console.log('All distinct LegiScan subjects map to at least one KY_TOPIC. ✓');
    } else {
      console.log(`Top ${Math.min(args.topN, unmapped.length)} unmapped subjects (add patterns to src/lib/ky-topic-legiscan-mapping.ts):`);
      console.log('');
      const wName = Math.min(60, Math.max(20, ...unmapped.map((u) => u.subject.length), 20));
      console.log(`${'SUBJECT'.padEnd(wName)} BILLS`);
      console.log('-'.repeat(wName + 7));
      for (const u of unmapped.slice(0, args.topN)) {
        console.log(`${u.subject.slice(0, wName).padEnd(wName)} ${u.count}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
