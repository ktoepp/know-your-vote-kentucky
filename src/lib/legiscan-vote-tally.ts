/**
 * Tally individual LegiScan roll-call rows and compare to API roll_call totals.
 */

export type VoteBucket = 'yea' | 'nay' | 'nv' | 'absent' | 'unknown';

/** Map LegiScan vote_text (and common variants) to a bucket. */
export function bucketLegiscanVoteText(voteText: string | null | undefined): VoteBucket {
  const raw = (voteText || '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (/^(yea|yes|yeah|y|aye)$/.test(raw)) return 'yea';
  if (/^(nay|no|n)$/.test(raw)) return 'nay';
  if (raw === 'nv' || raw.includes('not voting') || raw.includes('abstain')) return 'nv';
  if (raw.includes('absent') || raw.includes('excused')) return 'absent';
  return 'unknown';
}

export interface RollCallTally {
  yea: number;
  nay: number;
  nv: number;
  absent: number;
  unknown: number;
}

/** Prefer vote_id (LegiScan) when present: 1 Yea, 2 Nay, 3 NV, 4 Absent. */
export function bucketLegiscanVoteRow(row: {
  vote_text?: string | null;
  vote_id?: number | null;
}): VoteBucket {
  const id = row.vote_id;
  if (id === 1) return 'yea';
  if (id === 2) return 'nay';
  if (id === 3) return 'nv';
  if (id === 4) return 'absent';
  return bucketLegiscanVoteText(row.vote_text);
}

export function tallyRollCallVoteRows(
  votes: ReadonlyArray<{ vote_text?: string | null; vote_id?: number | null }> | null | undefined,
): RollCallTally {
  const out: RollCallTally = { yea: 0, nay: 0, nv: 0, absent: 0, unknown: 0 };
  if (!votes?.length) return out;
  for (const row of votes) {
    out[bucketLegiscanVoteRow(row)] += 1;
  }
  return out;
}

export interface RollCallCountFields {
  yea?: number;
  nay?: number;
  nv?: number;
  absent?: number;
}

/** Compare tallied rows to LegiScan roll_call summary integers (allow small tolerance 0). */
export function mismatchesAgainstRollCallSummary(
  tally: RollCallTally,
  summary: RollCallCountFields,
): string[] {
  const issues: string[] = [];
  const expect = (label: keyof RollCallTally, apiVal: number | undefined) => {
    if (apiVal === undefined || Number.isNaN(apiVal)) return;
    const got = tally[label];
    if (got !== apiVal) issues.push(`${label}: tallied ${got}, API ${apiVal}`);
  };
  expect('yea', summary.yea);
  expect('nay', summary.nay);
  expect('nv', summary.nv);
  expect('absent', summary.absent);
  if (tally.unknown > 0) issues.push(`unknown vote_text rows: ${tally.unknown}`);
  return issues;
}
