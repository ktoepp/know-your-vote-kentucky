/**
 * Diagnostic: duplicate committee records (seed vs LRC calendar sync)
 *
 * Detects ky_committees rows that are likely the same real-world committee and
 * reports which record holds the data (meetings, materials, events, follows,
 * legislator membership references) so a merge can be planned.
 *
 * Detection tiers:
 *   1. same lrc_rsn, different committee_type        → high confidence
 *   2. normalized-name equality (depluralized tokens) → high confidence
 *   3. token-subset names (one name ⊂ the other)      → suspect, report only
 *
 * Read-only — no DB writes.
 *
 * Usage:
 *   npm run diagnose:committee-duplicates
 *   npm run diagnose:committee-duplicates -- --json=reports/committee-duplicates.json
 */
import './load-env';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeCommitteeNameForDupes } from '../src/lib/ky-committee-utils';

const args = process.argv.slice(2);
const jsonOut = args.find((a) => a.startsWith('--json='))?.split('=')[1];

interface CommitteeRow {
  id: string;
  lrc_rsn: number | null;
  committee_type: string | null;
  name: string;
  chamber: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface RecordStats {
  meetings: number;
  upcomingMeetings: number;
  latestMeetingScrapedAt: string | null;
  latestMeetingDate: string | null;
  materials: number;
  events: number;
  follows: number;
  membershipRefs: number;
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter((t) => !['the', 'on', 'of', 'and'].includes(t)));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
  const db = createClient(url, key);

  const { data: committeeRows, error } = await db
    .from('ky_committees')
    .select('id, lrc_rsn, committee_type, name, chamber, slug, created_at, updated_at')
    .order('name');
  if (error) { console.error('DB fetch failed:', error.message); process.exit(1); }
  const committees = (committeeRows ?? []) as CommitteeRow[];
  console.log(`[diagnose] ${committees.length} ky_committees rows loaded`);

  // --- Pair detection -------------------------------------------------------
  type Pair = { a: CommitteeRow; b: CommitteeRow; reason: string; confidence: 'high' | 'suspect' };
  const pairs: Pair[] = [];
  const seenPairKeys = new Set<string>();
  const addPair = (a: CommitteeRow, b: CommitteeRow, reason: string, confidence: 'high' | 'suspect') => {
    const k = [a.id, b.id].sort().join('|');
    if (seenPairKeys.has(k)) return;
    seenPairKeys.add(k);
    pairs.push({ a, b, reason, confidence });
  };

  for (let i = 0; i < committees.length; i++) {
    for (let j = i + 1; j < committees.length; j++) {
      const a = committees[i];
      const b = committees[j];
      if (a.lrc_rsn != null && a.lrc_rsn === b.lrc_rsn) {
        addPair(a, b, `same lrc_rsn=${a.lrc_rsn} (types ${a.committee_type} vs ${b.committee_type})`, 'high');
        continue;
      }
      const na = normalizeCommitteeNameForDupes(a.name);
      const nb = normalizeCommitteeNameForDupes(b.name);
      if (na === nb) {
        addPair(a, b, 'normalized names identical', 'high');
        continue;
      }
      const ta = tokenSet(na);
      const tb = tokenSet(nb);
      // Token-subset only meaningful for longer names (avoid e.g. "Education" ⊂ everything)
      if (ta.size >= 4 && tb.size >= 4 && (isSubset(ta, tb) || isSubset(tb, ta))) {
        addPair(a, b, 'one name token-subset of the other', 'suspect');
      }
    }
  }

  if (pairs.length === 0) {
    console.log('[diagnose] No near-duplicate committee pairs detected.');
    return;
  }

  // --- Per-record stats ------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  async function statsFor(c: CommitteeRow): Promise<RecordStats> {
    const [meetings, materials, events, follows, memberships] = await Promise.all([
      db.from('ky_committee_meetings')
        .select('id, meeting_date, scraped_at, status')
        .eq('committee_id', c.id),
      db.from('ky_committee_materials').select('id', { count: 'exact', head: true }).eq('committee_id', c.id),
      db.from('ky_committee_events').select('id', { count: 'exact', head: true }).eq('committee_id', c.id),
      db.from('ky_committee_follows').select('user_id', { count: 'exact', head: true }).eq('committee_id', c.id),
      db.from('ky_legislators').select('id', { count: 'exact', head: true }).contains('committee_memberships', [c.slug]),
    ]);
    const meetingRows = (meetings.data ?? []) as Array<{ meeting_date: string; scraped_at: string | null; status: string }>;
    const scrapedDates = meetingRows.map((m) => m.scraped_at).filter(Boolean).sort();
    const meetingDates = meetingRows.map((m) => m.meeting_date).filter(Boolean).sort();
    return {
      meetings: meetingRows.length,
      upcomingMeetings: meetingRows.filter((m) => m.status === 'scheduled' && m.meeting_date >= today).length,
      latestMeetingScrapedAt: scrapedDates.at(-1) ?? null,
      latestMeetingDate: meetingDates.at(-1) ?? null,
      materials: materials.count ?? 0,
      events: events.count ?? 0,
      follows: follows.count ?? 0,
      membershipRefs: memberships.count ?? 0,
    };
  }

  const report: Array<Record<string, unknown>> = [];
  for (const pair of pairs) {
    const [sa, sb] = await Promise.all([statsFor(pair.a), statsFor(pair.b)]);
    // Survivor heuristic: the record still receiving calendar data — most recent
    // meeting scrape wins, then upcoming meetings, then latest meeting date.
    // Compared field-by-field (upcomingMeetings is numeric — a single composite
    // string would sort it lexically, ranking 10 below 2).
    const cmp = (a: RecordStats, b: RecordStats): number =>
      (a.latestMeetingScrapedAt ?? '').localeCompare(b.latestMeetingScrapedAt ?? '') ||
      a.upcomingMeetings - b.upcomingMeetings ||
      (a.latestMeetingDate ?? '').localeCompare(b.latestMeetingDate ?? '');
    const survivorIsA = cmp(sa, sb) >= 0;
    const fmt = (c: CommitteeRow, s: RecordStats, role: string) =>
      `  [${role}] ${c.slug}\n` +
      `        name="${c.name}" rsn=${c.lrc_rsn} type=${c.committee_type} chamber=${c.chamber}\n` +
      `        meetings=${s.meetings} (upcoming=${s.upcomingMeetings}, latest=${s.latestMeetingDate ?? '—'}, lastScrape=${s.latestMeetingScrapedAt ?? '—'})\n` +
      `        materials=${s.materials} events=${s.events} follows=${s.follows} legislatorMembershipRefs=${s.membershipRefs}`;

    console.log(`\n${pair.confidence === 'high' ? '✗ DUPLICATE' : '? SUSPECT'} — ${pair.reason}`);
    console.log(fmt(survivorIsA ? pair.a : pair.b, survivorIsA ? sa : sb, 'survivor?'));
    console.log(fmt(survivorIsA ? pair.b : pair.a, survivorIsA ? sb : sa, 'loser?  '));

    report.push({
      confidence: pair.confidence,
      reason: pair.reason,
      suggestedSurvivor: (survivorIsA ? pair.a : pair.b).slug,
      suggestedLoser: (survivorIsA ? pair.b : pair.a).slug,
      a: { ...pair.a, stats: sa },
      b: { ...pair.b, stats: sb },
    });
  }

  console.log(`\n[diagnose] ${pairs.filter((p) => p.confidence === 'high').length} high-confidence pair(s), ${pairs.filter((p) => p.confidence === 'suspect').length} suspect pair(s).`);
  console.log('[diagnose] Merge with: npm run merge:duplicate-committees -- --pair=<loserSlug>:<survivorSlug> (dry-run by default)');

  if (jsonOut) {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify(report, null, 2));
    console.log(`[diagnose] JSON written to ${jsonOut}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
