/**
 * LegiScan numeric status codes for state bills (cross-validated with last_action text).
 */
export const LEGISCAN_STATUS_MAP: Record<number, string> = {
  1: 'Introduced',
  2: 'Engrossed',
  3: 'Enrolled',
  4: 'Passed',
  5: 'Vetoed',
  6: 'Failed',
  7: 'Veto Override',
  8: 'Chaptered',
  9: 'Referred',
  10: 'Reported',
  11: 'Failed in Committee',
  12: 'Draft',
};

/**
 * True when action text reflects a completed or attempted veto override (not a bare veto).
 * Matches every singular/plural form KY's LRC emits — "veto overridden", "vetoes overridden"
 * (budget bills), "veto override", "overrode the veto". NOTE: the substring "override" does NOT
 * appear in "overridden", so we match the "overrid"/"overrod" roots rather than "override".
 */
export function legiscanActionIndicatesVetoOverride(action: string | null | undefined): boolean {
  const a = (action || '').toLowerCase();
  if (!a.includes('veto')) return false;
  return a.includes('overrid') || a.includes('overrod') || a.includes('override');
}

export function legiscanHistoryIndicatesVetoOverride(
  history: ReadonlyArray<{ action?: string | null }>,
): boolean {
  for (const h of history) {
    if (legiscanActionIndicatesVetoOverride(h.action)) return true;
  }
  return false;
}

/**
 * True when action text reflects a *full* veto that kills the bill (governor vetoes the entire
 * bill and it is not overridden). Deliberately excludes:
 *   - veto overrides in any form ("overrid"/"overrod" — "veto overridden", "vetoes overridden";
 *     the bill still becomes law),
 *   - line-item / line vetoes ("line item" / "line veto" — only appropriations lines are struck;
 *     the bill still becomes law and is chaptered, e.g. SB197 2026RS → Acts Ch. 202), and
 *   - procedural postings that merely reference a veto ("posted for consideration of Governor's
 *     veto") rather than the veto action itself.
 */
export function legiscanActionIndicatesFullVeto(action: string | null | undefined): boolean {
  const a = (action || '').toLowerCase();
  if (!a.includes('veto')) return false;
  if (a.includes('overrid') || a.includes('overrod') || a.includes('override')) return false;
  if (a.includes('line item') || a.includes('line-item') || a.includes('line veto')) return false;
  if (a.includes('posted') || a.includes('consideration of')) return false;
  return true;
}

export function legiscanHistoryIndicatesFullVeto(
  history: ReadonlyArray<{ action?: string | null }>,
): boolean {
  for (const h of history) {
    if (legiscanActionIndicatesFullVeto(h.action)) return true;
  }
  return false;
}

/**
 * True when action text reflects a *line-item* (partial) veto. Under Ky. Const. §88 the Governor
 * may disapprove "any part or parts of appropriation bills embracing distinct items" — only those
 * distinct items fail; the REST OF THE BILL BECOMES LAW and is published in the Kentucky Acts with
 * a chapter number. So a line-item veto is a became-law signal, NOT a bill-killing veto. KY's LRC
 * records it as "line item(s) vetoed" (sometimes with the chapter number, e.g. "line items vetoed
 * (Acts, ch. 194)", sometimes without). The chapter number's punctuation/spacing varies and may be
 * absent entirely, so we key off the line-item-veto wording itself rather than the chapter string.
 */
export function legiscanActionIndicatesLineItemVeto(action: string | null | undefined): boolean {
  const a = (action || '').toLowerCase();
  if (!a.includes('veto')) return false;
  return a.includes('line item') || a.includes('line-item') || a.includes('line veto');
}

export function legiscanHistoryIndicatesLineItemVeto(
  history: ReadonlyArray<{ action?: string | null }>,
): boolean {
  for (const h of history) {
    if (legiscanActionIndicatesLineItemVeto(h.action)) return true;
  }
  return false;
}

/**
 * Matches Kentucky's "Acts chapter" enactment citation in any of the punctuation/spacing variants
 * the LRC emits: "Acts Ch. 202", "Acts, ch. 194", "Acts, ch.149", "Acts Chapter 1". Every bill that
 * becomes law — signed, unsigned after 10 days, overridden, or an appropriations bill that was only
 * line-item vetoed — is published in the session's Acts with such a chapter number, so its presence
 * anywhere in the action text is an authoritative became-law signal. (The earlier fix matched only
 * the literal "acts ch" substring and missed the comma form "Acts, ch." used before ~2018.)
 */
export const ACTS_CHAPTER_RE = /acts\s*,?\s*ch/;

/**
 * Map LegiScan status code + last_action into `ky_bills.status` display text.
 * Kentucky: filing with the Secretary of State follows both governor signing and veto override,
 * so it must not be stored as `Signed` unless the action explicitly says the governor signed.
 *
 * Two KY-specific patterns are handled here:
 *
 * 1. KY committee-referral format — LRC action strings like "to State & Local Government (S)"
 *    or "to Appropriations & Revenue (H)" don't contain the word "committee" or "referred to",
 *    but they always end with a chamber suffix "(H)" or "(S)". We detect these as committee
 *    referrals so they map to `In Committee` rather than falling through to the status code.
 *
 * 2. Don't downgrade past Engrossed/Enrolled/Passed — when a bill passes one chamber
 *    (LegiScan status code 2–5, 7, 8) and is then referred to the second chamber's committee,
 *    the latest action contains "committee" or a "(H)"/"(S)" suffix. Allowing that to override
 *    the status code would silently regress `Engrossed` → `In Committee` every sync cycle.
 *    Instead, once the status code indicates passage of at least one chamber, we let the code
 *    win over the action text. (Documented in TASKS.md § "Status mapper doesn't preserve
 *    furthest progress".)
 *
 * 3. "Delivered to Secretary of State" is ambiguous — KY files the bill with the SoS after a
 *    governor signing, after a veto override, AND after a plain (non-overridden) veto. Because
 *    LegiScan reports that filing as the single `last_action`, the SoS text alone cannot tell
 *    an enacted bill from a vetoed one. We disambiguate with the LegiScan status code and, when
 *    available, the full action `history`: a bill vetoed and never overridden must map to
 *    `Vetoed`, not `Chaptered`. (Regression: SB70 2026RS was vetoed 04/23 and showed "Chaptered"
 *    because its last action was the SoS filing.)
 *
 * 4. A became-law signal WHEREVER it appears in the action text (not only on a "delivered to
 *    Secretary of State" filing) must win over the numeric status code, because LegiScan codes a
 *    line-item veto — after which the bill STILL becomes law (Ky. Const. §88) — identically (5) to
 *    a bill-killing full veto. KY sometimes never files a separate SoS action at all: the veto
 *    action itself is the final recorded action, e.g. "line items vetoed (Acts Ch. 239)". Two forms
 *    of the signal are recognized, on last_action and on every history entry:
 *      (a) the Acts-chapter citation in any punctuation variant KY uses — "Acts Ch. 202",
 *          "Acts, ch. 194", "Acts Chapter 1" (see ACTS_CHAPTER_RE); and
 *      (b) a line-item veto itself ("line items vetoed"), which is a became-law signal even when NO
 *          chapter number is recorded, since §88 line-item vetoes only strike distinct items.
 *    This check runs before the statusCode===5 fallback so it isn't defeated by that ambiguity.
 *    (Regression: SB197 2026RS; HB604/HB92 2022RS, HB1/HB3 2010SS; HB13 2017RS "Acts, ch. 194";
 *    HB193 2021RS / HB306 2016RS "line items vetoed" with no chapter number.)
 *
 * `history` (optional) is the LegiScan getBill action history; pass it wherever available so the
 * veto/override milestones — which precede the final SoS filing — can be seen.
 */
export function mapLegiScanBillStatus(
  statusCode: number,
  lastAction: string,
  history?: ReadonlyArray<{ action?: string | null }>,
): string {
  const action = (lastAction || '').toLowerCase();
  const historyHasOverride = history ? legiscanHistoryIndicatesVetoOverride(history) : false;
  const historyHasFullVeto = history ? legiscanHistoryIndicatesFullVeto(history) : false;
  // Two became-law signals that can hide on an earlier history action rather than last_action:
  //
  //   1. The Acts-chapter citation ("Acts Ch. 202" / "Acts, ch. 194") — KY sometimes records the
  //      chapter number on the veto action ("line items vetoed (Acts Ch. 202)") and the subsequent
  //      "delivered to Secretary of State" filing carries no chapter number. (Regression: SB197.)
  //   2. A line-item veto ("line items vetoed") — under Ky. Const. §88 only the disapproved items
  //      fail and the rest of the bill becomes law, so this is a became-law signal even when NO
  //      chapter number is present anywhere (KY's older records often omit it). (Regression: HB13
  //      2017RS "Acts, ch. 194"; HB193 2021RS / HB306 2016RS "line items vetoed" with no chapter.)
  //
  // Both must be checked across last_action AND every history entry, before the statusCode===5
  // fallback below — LegiScan codes a line-item veto the same (5) as a bill-killing full veto.
  const becameLawByChapter =
    ACTS_CHAPTER_RE.test(action) ||
    (history ? history.some((h) => ACTS_CHAPTER_RE.test((h.action || '').toLowerCase())) : false);
  const becameLawByLineItemVeto =
    legiscanActionIndicatesLineItemVeto(lastAction) ||
    (history ? legiscanHistoryIndicatesLineItemVeto(history) : false);

  if (legiscanActionIndicatesVetoOverride(lastAction) || statusCode === 7 || historyHasOverride) {
    return 'Veto Override';
  }

  if (action.includes('signed by governor')) return 'Signed';

  // Override and signing were ruled out above. "Acts Ch. NNN" appears ONLY when the bill actually
  // became law — after a signing, a veto override, or a line-item veto (the rest of the bill still
  // stands) — regardless of whether that chapter number lands on a "delivered to Secretary of
  // State" filing or directly on the veto action itself (e.g. "line items vetoed (Acts Ch. 239)",
  // which KY sometimes records with no separate SoS-filing step at all). A plain veto that is never
  // overridden carries no chapter number (e.g. SB70/SJR74 2026RS). Checking this before the
  // statusCode===5 fallback below matters because LegiScan codes both a line-item veto and a full
  // veto as 5 — the chapter designation is the only reliable way to tell them apart.
  // Also check history entries — the chapter number may not appear in last_action when the SoS
  // filing is a plain "delivered to Secretary of State" step that follows a "line items vetoed
  // (Acts Ch. NNN)" action — and treat a line-item veto itself as a became-law signal per §88,
  // since KY's older records sometimes omit the chapter number entirely. (See the two became-law
  // flags above.)
  if (becameLawByChapter || becameLawByLineItemVeto) return 'Chaptered';

  if (action.includes('delivered to secretary of state')) {
    if (statusCode === 5 || historyHasFullVeto) return 'Vetoed';
    return 'Chaptered';
  }

  if (legiscanActionIndicatesFullVeto(lastAction) || statusCode === 5) {
    return 'Vetoed';
  }

  if (action.includes('died') || action.includes('failed')) return 'Failed';
  if (action.includes('third reading, passed') || (action.includes('passed') && action.includes('third reading'))) {
    return 'Passed Chamber';
  }

  // Detect committee referrals: explicit keywords OR KY-specific "(H)"/"(S)" chamber suffix.
  const isCommitteeReferral =
    action.includes('committee') ||
    action.includes('referred to') ||
    /\([hs]\)\s*$/.test(action);

  // Bills with a "chamber-passed" status code (Engrossed=2, Enrolled=3, Passed=4) must not be
  // regressed to "In Committee" by a post-session interim-referral action text such as
  // "To: Interim Joint Committee on Health and Welfare" or a second-chamber "(H)"/"(S)" referral.
  // The status code is the authoritative milestone record; the latest action reflects the
  // most-recent procedural step.
  //
  // Exception: recommittals ("recommitted to House A&R (H)") are genuine backward steps — the bill
  // returns to the originating chamber's committee, so "In Committee" is correct. The guard does
  // not apply when the action text contains "recommit".
  // Expected: mapLegiScanBillStatus(2, 'recommitted to House Appropriations & Revenue (H)') → 'In Committee'
  //           mapLegiScanBillStatus(2, 'to Senate Agriculture (S)') → 'Engrossed'  (forward referral)
  const CHAMBER_PASSED_CODES = new Set([2, 3, 4]);
  const isRecommittal = /recommit/i.test(action);
  if (CHAMBER_PASSED_CODES.has(statusCode) && isCommitteeReferral && !isRecommittal) {
    return LEGISCAN_STATUS_MAP[statusCode] || 'Introduced';
  }

  if (isCommitteeReferral) return 'In Committee';
  if (action.includes('introduced') || action.includes('filed')) return 'Introduced';

  return LEGISCAN_STATUS_MAP[statusCode] || 'Introduced';
}
