/**
 * Shared display mapping for roll-call vote positions, so every surface that
 * renders a vote (member profile, bill roll calls) uses the same label and
 * color per bucket. Buckets come from legiscan-vote-tally.
 */

import type { VoteBucket } from '@/lib/legiscan-vote-tally';

/** Subset of MUI Chip colors used for vote positions. */
export type VoteChipColor = 'success' | 'error' | 'warning' | 'default';

/**
 * Yea green, Nay red, Not voting amber (present but declined to vote —
 * distinct from Absent gray, not present). Unknown stays neutral.
 */
export function voteBucketChipColor(bucket: VoteBucket): VoteChipColor {
  if (bucket === 'yea') return 'success';
  if (bucket === 'nay') return 'error';
  if (bucket === 'nv') return 'warning';
  return 'default';
}

export function voteBucketLabel(bucket: VoteBucket): string {
  if (bucket === 'yea') return 'Yea';
  if (bucket === 'nay') return 'Nay';
  if (bucket === 'nv') return 'Not voting';
  if (bucket === 'absent') return 'Absent';
  return 'Other';
}

/**
 * Label for a single member's vote. Prefers the official roll-call text
 * (e.g. "Excused") over the bucket label, except the "NV" abbreviation,
 * which is expanded for readability.
 */
export function memberVoteLabel(bucket: VoteBucket, raw: string | null | undefined): string {
  const text = raw?.trim();
  if (text && text.toLowerCase() !== 'nv') return text;
  return voteBucketLabel(bucket);
}
