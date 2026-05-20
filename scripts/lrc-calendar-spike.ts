#!/usr/bin/env npx tsx
/**
 * Phase 0 — parse LRC legislative calendar fixture and print summary JSON.
 *
 *   npm run spike:lrc:calendar
 *   npm run spike:lrc:calendar -- --fixture fixtures/lrc/legislative-calendar-live.html
 *   npm run spike:lrc:calendar -- --refresh   # re-fetch live HTML into fixture
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import { parseLegislativeCalendarHtml } from '../src/lib/lrc-legislative-calendar-parser';

const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_FIXTURE = resolve(REPO_ROOT, 'fixtures/lrc/legislative-calendar-live.html');
const CALENDAR_URL = 'https://apps.legislature.ky.gov/legislativecalendar';

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a?.slice(prefix.length + 1);
}

async function loadHtml(): Promise<string> {
  if (argFlag('--refresh')) {
    console.log(`[spike] Fetching ${CALENDAR_URL}…`);
    const r = await axios.get<string>(CALENDAR_URL, {
      timeout: 30_000,
      responseType: 'text',
      headers: {
        'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; committee-calendar phase0)',
      },
    });
    writeFileSync(DEFAULT_FIXTURE, r.data, 'utf8');
    console.log(`[spike] Wrote ${DEFAULT_FIXTURE} (${r.data.length} bytes)`);
    return r.data;
  }
  const path = argValue('--fixture') ?? DEFAULT_FIXTURE;
  return readFileSync(resolve(path), 'utf8');
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`[spike] ASSERT FAILED: ${message}`);
    process.exit(1);
  }
}

async function main() {
  const html = await loadHtml();
  const result = parseLegislativeCalendarHtml(html);

  assert(result.stats.dayCount >= 3, `expected >= 3 days, got ${result.stats.dayCount}`);
  assert(result.stats.meetingCount >= 1, `expected >= 1 scheduled meeting, got ${result.stats.meetingCount}`);
  assert(result.stats.billReferenceCount >= 1, `expected >= 1 bill ref in agendas, got ${result.stats.billReferenceCount}`);

  const scheduled = result.days.flatMap((d) =>
    d.meetings.filter((m) => m.status === 'scheduled').map((m) => ({ day: d.dateLabel, ...m })),
  );

  const sample = scheduled.slice(0, 3).map((m) => ({
    date: m.dateLabel,
    time: m.timeAndLocation,
    committee: m.committee.name,
    lrcRsn: m.committee.lrcRsn,
    agendaLines: m.agendaItems.length,
    bills: m.agendaItems.flatMap((i) => i.billReferences).map((b) => `${b.kind} ${b.number}${b.sessionLabel ? ` (${b.sessionLabel})` : ''}`),
  }));

  console.log(JSON.stringify({ stats: result.stats, sampleMeetings: sample }, null, 2));
  console.log('\n[spike] Phase 0 calendar parser checks passed.');
}

main().catch((err) => {
  console.error('[spike] Fatal:', err?.message ?? err);
  process.exit(1);
});
