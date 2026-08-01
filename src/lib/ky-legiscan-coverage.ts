/**
 * LegiScan coverage boundaries for the Kentucky corpus.
 *
 * LegiScan ships roll-call JSON in the dataset ZIP only from the 2018 Regular
 * Session onward. 2018 Special and every earlier KY session (2010–2017 Regular
 * + specials) decoded to 0 roll-call files, and their bill payloads' `votes[]`
 * summaries are also empty — so `getRollCall` has nothing to fetch either. This
 * is upstream data, not a packaging quirk, and no LegiScan retry can fix it.
 *
 * Verified against production 2026-08-01 (see TASKS.md § "Pre-2018 roll-call
 * votes"):
 * - Dataset ZIP re-import: workflow run 30676976863 (`sync:ky:dataset --force`).
 * - Bill-payload discovery: workflow run 30719943098
 *   (`backfill:session-votes --since-year=2015`).
 *
 * Used to distinguish "no votes upstream, ever" from "no votes yet" in
 * user-facing empty states.
 */

/** True when LegiScan carries no roll-call record for this KY session. */
export function legiscanHasNoRollCallsForKySession(sessionName: string): boolean {
  const match = /^(\d{4})\s+(Regular|Special)\s+Session\b/i.exec(sessionName);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const kind = match[2].toLowerCase();
  return year < 2018 || (year === 2018 && kind === 'special');
}

/**
 * LRC's own Record Vote Search — the only known source of KY roll-call votes
 * for the sessions LegiScan does not carry.
 */
export const LRC_RECORD_VOTE_SEARCH_URL =
  'https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx';
