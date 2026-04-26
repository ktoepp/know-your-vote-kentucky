import { hasTooltipContent } from '@/lib/tooltipContent';

/**
 * Phrase → key in `governmentTooltips` (getTooltipContent / LegislativeStageTooltip).
 * Longer phrases first so the segmenter can pick the most specific match.
 */
const RAW: { phrase: string; key: string }[] = [
  { phrase: 'reported favorably with committee substitute', key: 'reported_favorably_with_committee_substitute' },
  { phrase: 'posted for passage in the regular orders of the day', key: 'posted_for_passage' },
  { phrase: 'posted for passage', key: 'posted_for_passage' },
  { phrase: 'unanimous consent', key: 'unanimous_consent' },
  { phrase: 'conference committee', key: 'conference_committee' },
  { phrase: 'conference report', key: 'conference_report' },
  { phrase: 'motion to reconsider', key: 'motion_to_reconsider' },
  { phrase: 'committee substitute', key: 'committee_substitute' },
  { phrase: 'emergency clause', key: 'emergency_clause' },
  { phrase: 'discharge petition', key: 'discharge_petition' },
  { phrase: 'fiscal note', key: 'fiscal_note' },
  { phrase: 'third reading', key: 'third_reading' },
  { phrase: 'second reading', key: 'second_reading' },
  { phrase: 'first reading', key: 'first_reading' },
  { phrase: 'floor amendment', key: 'floor_amendment' },
  { phrase: 'veto override', key: 'veto_override' },
  { phrase: 'signed by the governor', key: 'signed_by_governor' },
  { phrase: 'signed by governor', key: 'signed_by_governor' },
  { phrase: 'reported favorably', key: 'reported' },
  { phrase: 'referred to the committee on', key: 'referred' },
  { phrase: 'referred to committee', key: 'referred' },
  { phrase: 'referred to', key: 'referred' },
  { phrase: 'as passed', key: 'passed_chamber' },
  { phrase: 'voice vote', key: 'voiceVote' },
  { phrase: 'roll call', key: 'rollCall' },
  { phrase: 'floor vote', key: 'floorVote' },
  { phrase: 'in committee', key: 'in_committee' },
  { phrase: 'sine die', key: 'adjourned_sine_die' },
  { phrase: 'pre-filed', key: 'prefiled' },
  { phrase: 'recommitted', key: 'recommitted' },
  { phrase: 'engrossed', key: 'engrossed' },
  { phrase: 'enrolled', key: 'enrolled' },
  { phrase: 'introduced', key: 'introduced' },
  { phrase: 'prefiled', key: 'prefiled' },
  { phrase: 'tabled', key: 'tabled' },
  { phrase: 'amendment', key: 'amendment' },
  { phrase: 'amended', key: 'amendment' },
  { phrase: 'hearing', key: 'hearing' },
  { phrase: 'calendar', key: 'calendar' },
  { phrase: 'quorum', key: 'quorum' },
  { phrase: 'vetoed', key: 'vetoed' },
  { phrase: 'enacted', key: 'enacted' },
  { phrase: 'failed', key: 'failed' },
  { phrase: 'passed', key: 'passed' },
  { phrase: 'reported', key: 'reported' },
  { phrase: 'referred', key: 'referred' },
  { phrase: 'yeas and nays', key: 'yeas_nays' },
];

const VALIDATED = RAW.filter((p) => hasTooltipContent(p.key));

/** Longest phrase first (stable for ties). */
const ORDERED = [...VALIDATED].sort((a, b) => {
  const d = b.phrase.length - a.phrase.length;
  return d !== 0 ? d : a.phrase.localeCompare(b.phrase);
});

export type BillActionTextSegment = { start: number; end: number; key: string | null };

/**
 * Splits free-form LRC / LegiScan action text into runs of plain text and tooltip keys
 * (left-to-right, greedy longest match at each index).
 */
/** Avoid matching the middle of words (e.g. "reported" in "unreported"). */
function isPhraseAtTokenBoundaries(s: string, start: number, len: number): boolean {
  const end = start + len;
  const beforeOk = start === 0 || !/[\p{L}\p{N}]/u.test(s[start - 1]!);
  const afterOk = end >= s.length || !/[\p{L}\p{N}]/u.test(s[end]!);
  return beforeOk && afterOk;
}

export function segmentBillActionText(raw: string): BillActionTextSegment[] {
  if (raw == null || raw === '') return [];
  const text = String(raw);
  const lower = text.toLowerCase();
  const out: BillActionTextSegment[] = [];
  let i = 0;
  while (i < text.length) {
    let matched: { key: string; len: number } | null = null;
    for (const { phrase, key } of ORDERED) {
      if (lower.startsWith(phrase, i) && isPhraseAtTokenBoundaries(text, i, phrase.length)) {
        matched = { key, len: phrase.length };
        break;
      }
    }
    if (matched) {
      const end = i + matched.len;
      out.push({ start: i, end, key: matched.key });
      i = end;
      continue;
    }
    out.push({ start: i, end: i + 1, key: null });
    i += 1;
  }
  return mergeAdjacentPlain(out);
}

function mergeAdjacentPlain(segments: BillActionTextSegment[]): BillActionTextSegment[] {
  const merged: BillActionTextSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.key == null && seg.key == null) {
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}
