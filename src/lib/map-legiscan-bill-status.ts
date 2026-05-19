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
 * Map LegiScan status code + last_action into `ky_bills.status` display text.
 * Kentucky: filing with the Secretary of State follows both governor signing and veto override,
 * so it must not be stored as `Signed` unless the action explicitly says the governor signed.
 */
export function mapLegiScanBillStatus(statusCode: number, lastAction: string): string {
  const action = (lastAction || '').toLowerCase();

  if (legiscanActionIndicatesVetoOverride(lastAction) || statusCode === 7) {
    return 'Veto Override';
  }

  if (action.includes('signed by governor')) return 'Signed';

  if (action.includes('delivered to secretary of state')) {
    return 'Chaptered';
  }

  if (action.includes('vetoed by governor') || (action.includes('veto') && !action.includes('override'))) {
    return 'Vetoed';
  }

  if (action.includes('died') || action.includes('failed')) return 'Failed';
  if (action.includes('third reading, passed') || (action.includes('passed') && action.includes('third reading'))) {
    return 'Passed Chamber';
  }
  if (action.includes('committee') || action.includes('referred to')) return 'In Committee';
  if (action.includes('introduced') || action.includes('filed')) return 'Introduced';

  return LEGISCAN_STATUS_MAP[statusCode] || 'Introduced';
}
