/**
 * Effective-date notice for enacted Kentucky bills.
 *
 * Ky. Const. §55: an act takes effect 90 days after the session's sine die
 * adjournment unless it carries an emergency clause (effective the moment it
 * becomes law) or is a general appropriation act / sets its own dates in the
 * body. The 90-day date comes from `KY_SESSIONS` milestones (the AG's published
 * count), never computed here. Own-date acts can't be detected from metadata,
 * so the default wording hedges for them.
 */
import { formatCivicDate } from '@/lib/civic-date';
import { getKySessionActsEffectiveDate } from '@/lib/ky-sessions';
import { isSignedByGovernorBillStatus } from '@/lib/bill-display';
import { legiscanActionIndicatesVetoOverride } from '@/lib/map-legiscan-bill-status';

export interface KyBillEffectiveDateNotice {
  kind: 'emergency' | 'own_schedule' | 'default';
  /** ISO date the act took / takes effect, when known. */
  dateIso: string | null;
  /** Short lead line, e.g. "Takes effect July 15, 2026". */
  headline: string;
  /** One-sentence explanation of where the date comes from. */
  detail: string;
}

interface HistoryEntryLike {
  date: string;
  action: string;
}

/**
 * LRC bill summaries (stored in `description`) end with all-caps flags:
 * "…; APPROPRIATION; EMERGENCY." or "…; EFFECTIVE, in part, August 1, 2026".
 * The flag checks are case-SENSITIVE on purpose — prose like "emergency
 * medical transportation" or "effective date" must not match. The lowercase
 * phrase patterns cover long titles ("… and declaring an emergency") for rows
 * where the LRC flags aren't present.
 */
function textIndicatesEmergencyClause(text: string | null | undefined): boolean {
  const raw = text || '';
  if (!raw) return false;
  if (/\bEMERGENCY\b/.test(raw)) return true;
  const t = raw.toLowerCase();
  return /declar\w*\s+an\s+emergency/.test(t) || t.includes('emergency clause');
}

/** LRC "EFFECTIVE" flag: the act sets its own effective date(s), possibly only in part. */
function textIndicatesOwnEffectiveDates(text: string | null | undefined): boolean {
  return /\bEFFECTIVE\b/.test(text || '');
}

/**
 * General appropriation acts are exempt from the 90-day rule (§55) and follow
 * their own fiscal-year schedule. Match only the branch-budget title pattern
 * ("AN ACT relating to appropriations …"); substantive bills that merely make
 * an appropriation (LRC "APPROPRIATION" flag) still get the default 90-day
 * date and must NOT match here.
 */
function textIndicatesGeneralAppropriationAct(text: string | null | undefined): boolean {
  const t = (text || '').toLowerCase();
  if (!t) return false;
  return /an act relating to appropriations\b/.test(t) || /\b(executive|judicial|legislative) branch budget\b/.test(t);
}

/**
 * The bill is law. "Veto Override" alone can be a single chamber's vote, so it
 * also requires the post-enactment Secretary of State filing in the history.
 */
function isEnactedKyBill(
  effectiveStatus: string | null | undefined,
  history: ReadonlyArray<HistoryEntryLike>,
): boolean {
  const s = (effectiveStatus || '').trim().toLowerCase();
  if (!s) return false;
  if (s.includes('chaptered') || s.includes('enacted') || s.includes('became law')) return true;
  if (isSignedByGovernorBillStatus(effectiveStatus)) return true;
  if (s.includes('veto override')) {
    return history.some((h) => /delivered to (the )?secretary of state|became law/i.test(h.action || ''));
  }
  return false;
}

/** Date the act became law (signature, no-signature lapse, or final override vote). */
function becameLawDateIso(history: ReadonlyArray<HistoryEntryLike>): string | null {
  let latest: string | null = null;
  for (const h of history) {
    const a = (h.action || '').toLowerCase();
    const becameLaw =
      a.includes('signed by governor') ||
      a.includes('became law without') ||
      legiscanActionIndicatesVetoOverride(h.action);
    if (!becameLaw) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(h.date) && (!latest || h.date > latest)) latest = h.date;
  }
  return latest;
}

/**
 * Effective-date notice for the bill detail page, or null when the bill isn't
 * enacted or the session has no confirmed default date yet.
 *
 * `asOf` comparisons use the UTC calendar day (like `sessionHasEnded`) so the
 * server render and client hydration agree in any timezone.
 */
export function getKyEnactedBillEffectiveDateNotice(params: {
  bill: { session?: string | null; title?: string | null; description?: string | null };
  effectiveStatus: string | null | undefined;
  history: ReadonlyArray<HistoryEntryLike>;
  asOf?: Date;
}): KyBillEffectiveDateNotice | null {
  const { bill, effectiveStatus, history } = params;
  if (!isEnactedKyBill(effectiveStatus, history)) return null;

  const titleText = `${bill.title || ''} ${bill.description || ''}`;

  // Own dates win over the emergency branch: acts flagged both EFFECTIVE and
  // EMERGENCY (common) stagger their sections, so one became-law date would mislead.
  if (textIndicatesOwnEffectiveDates(titleText)) {
    return {
      kind: 'own_schedule',
      dateIso: null,
      headline: 'Effective date: set within the act',
      detail:
        'This act specifies its own effective date(s) for some or all of its sections instead of following the standard 90-day rule (Ky. Constitution § 55). See the act text for the exact dates.',
    };
  }

  if (textIndicatesEmergencyClause(titleText)) {
    const dateIso = becameLawDateIso(history);
    const formatted = dateIso ? formatCivicDate(dateIso) : null;
    return {
      kind: 'emergency',
      dateIso,
      headline: formatted ? `In effect since ${formatted}` : 'In effect now',
      detail:
        'This act carries an emergency clause, so it took effect as soon as it became law instead of waiting the usual 90 days after the session adjourned (Ky. Constitution § 55).',
    };
  }

  if (textIndicatesGeneralAppropriationAct(titleText)) {
    return {
      kind: 'own_schedule',
      dateIso: null,
      headline: 'Effective date: set by the act',
      detail:
        'Appropriations acts follow the schedule written into the act itself rather than the standard 90-day rule (Ky. Constitution § 55).',
    };
  }

  const dateIso = getKySessionActsEffectiveDate(bill.session);
  if (!dateIso) return null;
  const formatted = formatCivicDate(dateIso);
  const asOf = params.asOf ?? new Date();
  const inEffect = asOf.toISOString().slice(0, 10) >= dateIso;
  const sessionLabel = (bill.session || '').trim() || 'this session';
  return {
    kind: 'default',
    dateIso,
    headline: inEffect ? `In effect since ${formatted}` : `Takes effect ${formatted}`,
    detail: `Acts from the ${sessionLabel} that don't carry an emergency clause or set their own effective date ${inEffect ? 'took' : 'take'} effect 90 days after the session adjourned (Ky. Constitution § 55).`,
  };
}
