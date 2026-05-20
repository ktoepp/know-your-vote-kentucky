#!/usr/bin/env npx tsx
/**
 * Phase 0 — audit bill references across all agenda lines in a calendar fixture.
 *
 *   npm run audit:lrc:bill-refs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseLegislativeCalendarHtml } from '../src/lib/lrc-legislative-calendar-parser';
import { extractLrcBillReferences } from '../src/lib/lrc-bill-reference-parser';

const FIXTURE = resolve(__dirname, '../fixtures/lrc/legislative-calendar-live.html');

function main() {
  const html = readFileSync(FIXTURE, 'utf8');
  const parsed = parseLegislativeCalendarHtml(html);

  const linesWithBills: { line: string; refs: string[] }[] = [];
  const linesWithoutBills: string[] = [];

  for (const day of parsed.days) {
    for (const mtg of day.meetings) {
      for (const item of mtg.agendaItems) {
        const refs = extractLrcBillReferences(item.rawText);
        if (refs.length > 0) {
          linesWithBills.push({
            line: item.rawText.slice(0, 120),
            refs: refs.map((r) => `${r.kind} ${r.number}${r.sessionLabel ? ` (${r.sessionLabel})` : ''}`),
          });
        } else if (/\bbill\b|\bresolution\b|\bHB\b|\bSB\b|\bHJR\b/i.test(item.rawText)) {
          linesWithoutBills.push(item.rawText.slice(0, 160));
        }
      }
    }
  }

  const report = {
    fixture: FIXTURE,
    stats: parsed.stats,
    uniqueBillReferences: [
      ...new Set(
        parsed.days.flatMap((d) =>
          d.meetings.flatMap((m) =>
            m.agendaItems.flatMap((i) =>
              i.billReferences.map((r) => `${r.kind} ${r.number}|${r.sessionLabel ?? ''}`),
            ),
          ),
        ),
      ),
    ].sort(),
    linesWithBills,
    possibleMissedLines: linesWithoutBills,
  };

  const outPath = resolve(__dirname, '../reports/lrc-agenda-bill-refs-audit.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Wrote ${outPath}`);
  console.log(`Unique bill refs: ${report.uniqueBillReferences.length}`);
  console.log(`Possible missed (heuristic): ${report.possibleMissedLines.length}`);
  if (report.possibleMissedLines.length > 0) {
    console.log('\nReview possible misses:');
    for (const line of report.possibleMissedLines.slice(0, 10)) {
      console.log(`  - ${line}`);
    }
  }
}

main();
