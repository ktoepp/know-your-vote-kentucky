/**
 * One-line summary of a digest cron run, logged so Vercel's runtime logs show
 * that the 11:00 UTC cron fired and what it did. A run that finds nothing to
 * send is a healthy outcome and otherwise leaves no trace, which made "did it
 * run?" unanswerable. Counts only: never log addresses or user ids.
 */
export type DigestRunSummaryInput = {
  ok: boolean;
  dryRun: boolean;
  usersConsidered: number;
  emailsSent: number;
  skippedNoEvents: number;
  errors: readonly string[];
  logRowsTrimmed?: number;
};

export function formatDigestRunSummary(result: DigestRunSummaryInput, durationMs: number): string {
  const parts = [
    `ok=${result.ok}`,
    `dryRun=${result.dryRun}`,
    `usersConsidered=${result.usersConsidered}`,
    `emailsSent=${result.emailsSent}`,
    `skippedNoEvents=${result.skippedNoEvents}`,
    `errors=${result.errors.length}`,
  ];
  if (result.logRowsTrimmed !== undefined) parts.push(`logRowsTrimmed=${result.logRowsTrimmed}`);
  parts.push(`durationMs=${Math.max(0, Math.round(durationMs))}`);
  return `[cron/notify] done ${parts.join(' ')}`;
}
