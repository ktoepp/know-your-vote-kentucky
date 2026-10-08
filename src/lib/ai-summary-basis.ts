/**
 * What an AI bill summary was built from, and the copy that says so (WS3-04).
 *
 * Every rendered AI summary states its basis. Until summaries are grounded in bill
 * text (WS3-09d), every summary is description-based. Other surfaces (WS6-09b,
 * WS8-07b) import `aiSummaryBasisLine` rather than re-typing this copy.
 */

export type AiSummaryBasis =
  | { kind: 'description' }
  | { kind: 'bill_text'; versionLabel: string; date: string | null };

export const AI_SUMMARY_DESCRIPTION_BASIS_LINE =
  "Written by AI from the bill's title and official description, not the full bill text.";

/**
 * The sentence that says what a summary was built from. `bill_text` returns the
 * description line until WS3-09d adds the version-and-date form.
 */
export function aiSummaryBasisLine(basis: AiSummaryBasis): string {
  switch (basis.kind) {
    case 'description':
      return AI_SUMMARY_DESCRIPTION_BASIS_LINE;
    case 'bill_text':
      // WS3-09d replaces this with the summarized version and its date.
      return AI_SUMMARY_DESCRIPTION_BASIS_LINE;
  }
}

/** Label the generator emits before the impacted-audience clause (kept in sync with ky-content-generation.ts). */
export const AUDIENCE_CLAUSE_LABEL = 'Who it may affect:';

/**
 * Whether to render the "Who it may affect" clause. Owner decision WS3-04 (2) = (b):
 * hidden at render time until summaries are text-grounded and the clause is backed
 * by quoted text (WS3-09b/09d). Flip to `true` to restore the clause everywhere the
 * block renders. Stored summaries are never edited.
 */
export const SHOW_AUDIENCE_CLAUSE = false;

/**
 * The summary text before the "Who it may affect:" label, trimmed. Returns the input
 * unchanged when the label is absent.
 */
export function stripAudienceClause(summary: string): string {
  const idx = summary.indexOf(AUDIENCE_CLAUSE_LABEL);
  if (idx === -1) return summary;
  return summary.slice(0, idx).trim();
}
