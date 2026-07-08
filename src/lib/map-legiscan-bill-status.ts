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

/** True when action text reflects a completed or attempted veto override (not a bare veto). */
export function legiscanActionIndicatesVetoOverride(action: string | null | undefined): boolean {
  const a = (action || '').toLowerCase();
  if (!a) return false;
  return (
    a.includes('veto override') ||
    a.includes('veto overridden') ||
    a.includes('overrode the veto') ||
    a.includes('override of the veto') ||
    a.includes('override the veto') ||
    a.includes('override of veto')
  );
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
 *   - veto overrides ("override" — the bill still becomes law), and
 *   - line-item vetoes ("line item" — only appropriations lines are struck; the bill still
 *     becomes law and is chaptered, e.g. SB197 2026RS → Acts Ch. 202).
 */
export function legiscanActionIndicatesFullVeto(action: string | null | undefined): boolean {
  const a = (action || '').toLowerCase();
  if (!a.includes('veto')) return false;
  if (a.includes('override')) return false;
  if (a.includes('line item') || a.includes('line-item')) return false;
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

  if (legiscanActionIndicatesVetoOverride(lastAction) || statusCode === 7 || historyHasOverride) {
    return 'Veto Override';
  }

  if (action.includes('signed by governor')) return 'Signed';

  if (action.includes('delivered to secretary of state')) {
    // Override was ruled out above. A veto (status code 5, or a full-veto action anywhere in
    // history) means the bill did NOT become law, even though it was filed with the SoS.
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
