#!/usr/bin/env npx tsx
/**
 * One-time backfill: parse the LRC 2026 Interim Calendar PDF and insert committee meetings
 * into ky_committee_meetings + ky_committee_events.
 *
 *   npx tsx scripts/backfill-interim-calendar-2026.ts --dry-run    # show plan, no writes
 *   npx tsx scripts/backfill-interim-calendar-2026.ts               # run for real
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (loaded via load-env.ts)
 * The PDF is fetched from the LRC website on each run. If it has been updated, re-running
 * (idempotently) is safe — meetings upsert on (committee_id, meeting_date, time_and_location).
 */
import './load-env';
import axios from 'axios';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

const DRY_RUN = process.argv.includes('--dry-run');
const PDF_URL = 'https://legislature.ky.gov/Documents/Current%20Interim%20Calendar.pdf';
const SOURCE_URL = PDF_URL;

// ---------------------------------------------------------------------------
// Abbreviation / short-name → full committee name as it appears in ky_committees
// after migration 027 seeds all interim/statutory committees.
// Keys are lowercased for matching.
// ---------------------------------------------------------------------------
const ABBREV_MAP: Record<string, string> = {
  // Interim Joint Committees (IJ)
  'agriculture':                'Interim Joint Committee on Agriculture',
  'banking & insurance':        'Interim Joint Committee on Banking and Insurance',
  'banking and insurance':      'Interim Joint Committee on Banking and Insurance',
  'education':                  'Interim Joint Committee on Education',
  'families & children':        'Interim Joint Committee on Families and Children',
  'families and children':      'Interim Joint Committee on Families and Children',
  'health services':            'Interim Joint Committee on Health Services',
  'judiciary':                  'Interim Joint Committee on Judiciary',
  'l&o':                        'Interim Joint Committee on Licensing, Occupations, and Administrative Regulations',
  'labor & occupations':        'Interim Joint Committee on Licensing, Occupations, and Administrative Regulations',
  'local govt':                 'Interim Joint Committee on Local Government',
  'local government':           'Interim Joint Committee on Local Government',
  'natural resources':          'Interim Joint Committee on Natural Resources and Energy',
  'state govt':                 'Interim Joint Committee on State Government',
  'state government':           'Interim Joint Committee on State Government',
  'transportation':             'Interim Joint Committee on Transportation',
  'veterans, military affairs': 'Interim Joint Committee on Veterans, Military Affairs, and Public Protection',
  'vmapp':                      'Interim Joint Committee on Veterans, Military Affairs, and Public Protection',
  'edwi':                       'Interim Joint Committee on Economic Development and Workforce Investment',
  'edwi & tsbit':               'Interim Joint Committee on Economic Development and Workforce Investment',
  'tsbit':                      'Interim Joint Committee on Tourism, Small Business, and Information Technology',

  // Budget Review Subcommittees (IJ type)
  'br eco dev':                 'Budget Review Subcommittee on Economic Development and Tourism',
  'br gen govt':                'Budget Review Subcommittee on General Government',
  'br justice':                 'Budget Review Subcommittee on Justice and Judiciary',
  'br educ':                    'Budget Review Subcommittee on Education',
  'br transp':                  'Budget Review Subcommittee on Transportation',
  'br health & fs':             'Budget Review Subcommittee on Health and Family Services',

  // Statutory Committees
  'a&r':                        'Appropriations and Revenue',
  'appropriations and revenue': 'Appropriations and Revenue',
  'admin regs':                 'Administrative Regulations Review Subcommittee',
  'administrative regs':        'Administrative Regulations Review Subcommittee',
  'cpboc':                      'Capital Projects and Bond Oversight Committee',
  'capital projects and bond oversight': 'Capital Projects and Bond Oversight Committee',
  'cpab':                       'Capital Planning Advisory Board',
  'crao':                       'Commission on Race and Access to Opportunity',
  'eaars':                      'Education Assessment and Accountability Review Subcommittee',
  'gcrc':                       'Governmental Contract Review Committee',
  'itoc':                       'Information Technology Oversight Committee',
  'juvenile justice':           'Juvenile Justice Oversight Council',
  'loic':                       'Legislative Oversight and Investigations Committee',
  'moab':                       'Medicaid Oversight and Advisory Board',
  'moab health transparency dashboard sub': 'Medicaid Oversight and Advisory Board',
  'moab waiver waitlist sub':   'Medicaid Oversight and Advisory Board',
  'moab nemt working group':    'Medicaid Oversight and Advisory Board',
  'ppob':                       'Public Pension Oversight Board',
  'tobacco settlement':         'Tobacco Settlement Agreement Fund Oversight Committee',
  'tobacco settlement agreement fund oversight': 'Tobacco Settlement Agreement Fund Oversight Committee',
};

// ---------------------------------------------------------------------------
// PDF text — the full interim calendar extracted from the LRC PDF
// This is embedded as a constant so the script works even if the PDF moves.
// Re-run with --refresh-pdf to re-fetch and update.
// ---------------------------------------------------------------------------
const MONTHS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

interface ParsedMeeting {
  isoDate: string;
  timeAndLocation: string | null;
  committeeName: string;
  raw: string;
}

function normalizeAbbrev(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveCommitteeName(token: string): string | null {
  const key = normalizeAbbrev(token);
  return ABBREV_MAP[key] ?? null;
}

/**
 * Parse the pypdf plain-text extraction of the interim calendar PDF.
 * The text for each month looks like:
 *
 *   June 2026
 *   Mon Tue Wed Thu Fri
 *   1              <- day number (Monday)
 *   1:00
 *   PPOB
 *   2              <- day number (Tuesday)
 *   9:30
 *   Banking & Insurance
 *   ...
 *
 * We accumulate a "current date" and a "current time" as we read lines.
 */
function parsePdfText(text: string): ParsedMeeting[] {
  const meetings: ParsedMeeting[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentYear = 2026;
  let currentMonth = 0;
  let currentDay = 0;
  let pendingTime: string | null = null;
  const timeRe = /^(\d{1,2}:\d{2})\s*(?:am|pm|ET|CT|-)?/i;
  const dayOnlyRe = /^(\d{1,2})$/;
  const monthHeaderRe = new RegExp(`^(${Object.keys(MONTHS).join('|')})\\s+(\\d{4})$`, 'i');
  const skipRe = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Page \d|Notes:|Per KRS|Calendar may|Italicized|LRC CLE|State Holiday|KY Farm Bureau|\*KFB|Mon Tue)/i;

  for (const line of lines) {
    if (skipRe.test(line)) continue;

    const monthMatch = line.match(monthHeaderRe);
    if (monthMatch) {
      const monthName = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
      currentMonth = MONTHS[monthName] ?? 0;
      currentYear = parseInt(monthMatch[2], 10);
      currentDay = 0;
      pendingTime = null;
      continue;
    }

    if (!currentMonth) continue;

    // Bare day number (1–31)
    const dayMatch = line.match(dayOnlyRe);
    if (dayMatch) {
      const d = parseInt(dayMatch[1], 10);
      if (d >= 1 && d <= 31) {
        currentDay = d;
        pendingTime = null;
        continue;
      }
    }

    if (!currentDay) continue;

    // Time line: "9:30", "1:00 PM", "9:00 - EDWI" (time+committee inline)
    const timeMatch = line.match(timeRe);
    if (timeMatch) {
      pendingTime = timeMatch[1];
      // Check if committee name is on the same line after the time
      const afterTime = line.slice(timeMatch[0].length).replace(/^[\s-]+/, '').trim();
      if (afterTime) {
        const resolved = resolveCommitteeName(afterTime);
        if (resolved && pendingTime) {
          const isoDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
          meetings.push({
            isoDate,
            timeAndLocation: `${pendingTime} ET`,
            committeeName: resolved,
            raw: `${isoDate} ${pendingTime} ${afterTime}`,
          });
          pendingTime = null;
        }
      }
      continue;
    }

    // Committee line (following a time line)
    if (pendingTime) {
      const resolved = resolveCommitteeName(line);
      if (resolved) {
        const isoDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
        meetings.push({
          isoDate,
          timeAndLocation: `${pendingTime} ET`,
          committeeName: resolved,
          raw: `${isoDate} ${pendingTime} ${line}`,
        });
        // Keep pendingTime — multiple committees can share the same time slot
      } else {
        // Unknown abbreviation — log it
        const isoDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
        console.warn(`  [SKIP] ${isoDate} ${pendingTime} — unknown: "${line}"`);
        pendingTime = null;
      }
      continue;
    }
  }

  return meetings;
}

// ---------------------------------------------------------------------------
// Fetch PDF and extract text via Python (pypdf must be installed)
// ---------------------------------------------------------------------------
async function fetchPdfText(): Promise<string> {
  console.log(`Downloading PDF: ${PDF_URL}`);
  const resp = await axios.get<ArrayBuffer>(PDF_URL, {
    responseType: 'arraybuffer',
    timeout: 30_000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Referer: 'https://legislature.ky.gov/Committees/Pages/default.aspx',
    },
  });
  // Write to temp file and extract with Python
  const { writeFileSync } = await import('fs');
  const { execSync } = await import('child_process');
  const tmpPath = '/tmp/ky-interim-calendar-backfill.pdf';
  writeFileSync(tmpPath, Buffer.from(resp.data));
  console.log(`PDF saved (${Math.round(resp.data.byteLength / 1024)} KB). Extracting text…`);
  const text = execSync(
    `python3 -c "
from pypdf import PdfReader
r = PdfReader('${tmpPath}')
print('\\n'.join(p.extract_text() for p in r.pages))
"`,
    { encoding: 'utf8', timeout: 30_000 },
  );
  return text;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function loadCommitteesByName(): Promise<Map<string, { id: string; name: string; slug: string }>> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');
  const { data, error } = await supabaseAdmin
    .from('ky_committees')
    .select('id, name, slug');
  if (error) throw new Error(`Could not load committees: ${error.message}`);
  const map = new Map<string, { id: string; name: string; slug: string }>();
  for (const c of data ?? []) {
    map.set(String(c.name).toLowerCase().trim(), { id: String(c.id), name: String(c.name), slug: String(c.slug) });
  }
  return map;
}

function findCommitteeId(
  name: string,
  byName: Map<string, { id: string; name: string; slug: string }>,
): { id: string; name: string; slug: string } | null {
  const key = name.toLowerCase().trim();
  // Exact match
  if (byName.has(key)) return byName.get(key)!;
  // Partial match — target name contains our key or vice versa
  for (const [k, v] of byName) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!supabaseAdmin) {
    console.error('ERROR: supabaseAdmin not available. Check SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(1);
  }

  console.log(`\n=== 2026 Interim Calendar Backfill ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} ===\n`);

  // 1. Download + parse PDF
  const pdfText = await fetchPdfText();
  const parsed = parsePdfText(pdfText);
  console.log(`Parsed ${parsed.length} meeting-committee entries from PDF\n`);

  // 2. Load existing committees
  const byName = await loadCommitteesByName();
  console.log(`Loaded ${byName.size} committees from DB\n`);

  // 3. Resolve committee IDs + group by (committee, date, time)
  type InsertRow = {
    committee_id: string;
    committee_name: string;
    meeting_date: string;
    time_and_location: string | null;
    slug: string;
  };

  const toInsert: InsertRow[] = [];
  const missing = new Set<string>();

  for (const m of parsed) {
    const committee = findCommitteeId(m.committeeName, byName);
    if (!committee) {
      missing.add(m.committeeName);
      continue;
    }
    // Dedupe within the run
    const key = `${committee.id}|${m.isoDate}|${m.timeAndLocation ?? ''}`;
    if (toInsert.some((r) => `${r.committee_id}|${r.meeting_date}|${r.time_and_location ?? ''}` === key)) continue;
    toInsert.push({
      committee_id: committee.id,
      committee_name: committee.name,
      meeting_date: m.isoDate,
      time_and_location: m.timeAndLocation,
      slug: committee.slug,
    });
  }

  // 4. Report
  console.log(`Plan: ${toInsert.length} meetings to upsert, ${missing.size} unresolved committee names\n`);

  if (missing.size > 0) {
    console.log('UNRESOLVED committee names (not in DB, need manual mapping or committee creation):');
    for (const m of [...missing].sort()) console.log(`  - ${m}`);
    console.log('');
  }

  // Group by committee for readability
  const grouped = new Map<string, InsertRow[]>();
  for (const r of toInsert) {
    if (!grouped.has(r.committee_name)) grouped.set(r.committee_name, []);
    grouped.get(r.committee_name)!.push(r);
  }
  console.log('Resolved meetings by committee:');
  for (const [name, rows] of [...grouped.entries()].sort()) {
    console.log(`  ${name}: ${rows.length} meeting(s)`);
    if (DRY_RUN) {
      for (const r of rows.slice(0, 3)) console.log(`    ${r.meeting_date} ${r.time_and_location ?? ''}`);
      if (rows.length > 3) console.log(`    ... +${rows.length - 3} more`);
    }
  }
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN complete — no writes. Re-run without --dry-run to insert.\n');
    return;
  }

  // 5. Insert meetings
  console.log('Inserting meetings…');
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of toInsert) {
    const meetingRow = {
      committee_id: r.committee_id,
      meeting_date: r.meeting_date,
      time_and_location: r.time_and_location ?? '',
      status: 'scheduled' as const,
      member_refs: [],
      source_url: SOURCE_URL,
      scraped_at: new Date().toISOString(),
    };

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('ky_committee_meetings')
      .select('id')
      .eq('committee_id', r.committee_id)
      .eq('meeting_date', r.meeting_date)
      .eq('time_and_location', r.time_and_location ?? '')
      .maybeSingle();

    if (existing?.id) {
      skipped++;
      // Emit committee event if missing
      await supabaseAdmin.from('ky_committee_events').insert({
        committee_id: r.committee_id,
        meeting_id: String(existing.id),
        event_type: 'meeting_scheduled',
        event_payload: {
          meeting_date: r.meeting_date,
          time_and_location: r.time_and_location,
          committee_name: r.committee_name,
          committee_slug: r.slug,
        },
      }).throwOnError().then(() => {}).catch(() => {}); // ignore duplicate events
      continue;
    }

    const { data: meetingRecord, error: mErr } = await supabaseAdmin
      .from('ky_committee_meetings')
      .insert(meetingRow)
      .select('id')
      .single();

    if (mErr || !meetingRecord) {
      errors.push(`${r.meeting_date} ${r.committee_name}: ${mErr?.message ?? 'no record returned'}`);
      continue;
    }

    inserted++;

    // Emit committee event
    await supabaseAdmin.from('ky_committee_events').insert({
      committee_id: r.committee_id,
      meeting_id: String(meetingRecord.id),
      event_type: 'meeting_scheduled',
      event_payload: {
        meeting_date: r.meeting_date,
        time_and_location: r.time_and_location,
        committee_name: r.committee_name,
        committee_slug: r.slug,
      },
    }).throwOnError().then(() => {}).catch(() => {}); // ignore duplicate events
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} already existed, ${errors.length} errors`);
  if (errors.length) {
    console.error('Errors:');
    for (const e of errors) console.error(' ', e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
