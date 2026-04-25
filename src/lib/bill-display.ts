import type { KYBill } from '@/types/kentucky';

/**
 * Chamber from DB, or inferred from Kentucky bill number (HB/HR/… vs SB/SR/…).
 * Matches sync logic in ky-sync-pipeline when `chamber` was not stored.
 */
export function effectiveBillChamber(bill: {
  chamber?: 'house' | 'senate' | string | null;
  bill_number?: string | null;
}): 'house' | 'senate' | null {
  if (bill.chamber === 'house' || bill.chamber === 'senate') return bill.chamber;
  const n = (bill.bill_number || '').trim().toUpperCase();
  if (n.startsWith('H')) return 'house';
  if (n.startsWith('S')) return 'senate';
  return null;
}

/**
 * Title-case LegiScan/GAE-style bill strings for display (status, last action, history).
 * APIs often return mixed fragments like "recommitted to Appropriations & Revenue (H)".
 */
export function formatBillLabelText(input: string | null | undefined): string {
  if (input == null || input === '') return '';
  const s = String(input).trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  return lower.replace(/(^|[\s\-/([{&])([a-z])/g, (_m, sep: string, letter: string) => sep + letter.toUpperCase());
}

/** Governor has signed the bill (KY sync often stores short label "Signed"). */
export function isSignedByGovernorBillStatus(status: string | null | undefined): boolean {
  if (status == null) return false;
  const s = String(status).trim().toLowerCase();
  if (!s) return false;
  if (s.includes('signed by governor')) return true;
  if (s === 'signed') return true;
  if (/\bsigned\b/.test(s) && s.includes('governor')) return true;
  return false;
}

/**
 * Home “recently passed” curation: clearly advanced / enacted (signed, chaptered, enrolled, veto override).
 */
export function isRecentlyPassedBillStatus(status: string | null | undefined): boolean {
  if (status == null) return false;
  if (isSignedByGovernorBillStatus(status)) return true;
  const s = String(status).trim().toLowerCase();
  if (s === '') return false;
  if (s.includes('chaptered')) return true;
  if (s === 'veto override') return true;
  if (s.includes('enrolled')) return true;
  return false;
}

/**
 * Label for status chips: use full "Signed by Governor" when the DB has only "Signed".
 */
export function billStatusChipLabel(status: string | null | undefined): string {
  if (status == null || String(status).trim() === '') return '';
  if (isSignedByGovernorBillStatus(status)) {
    const t = String(status).trim().toLowerCase();
    if (t === 'signed' || !t.includes('governor')) return 'Signed by Governor';
  }
  return formatBillLabelText(status);
}

/** Party abbrev or API string → full word for chips (R/D, Dem, Open States names). */
export function formatPartyLabel(party: string | null | undefined): string {
  if (party == null || String(party).trim() === '') return '';
  const raw = String(party).trim();
  const u = raw.toUpperCase();
  if (u === 'R' || u === 'GOP' || u === 'REPUBLICAN' || u.startsWith('REPUB')) return 'Republican';
  if (u === 'D' || u === 'DEM' || u === 'DEMOCRAT' || u.startsWith('DEMO')) return 'Democrat';
  if (u === 'I' || u === 'IND' || u.startsWith('INDEP')) return 'Independent';
  if (u === 'L' || u === 'LIB' || u.startsWith('LIBERT')) return 'Libertarian';
  if (u === 'G' || u === 'GREEN' || u.startsWith('GREEN')) return 'Green';
  return raw;
}

/** Single-letter (or short) party code for compact chips, e.g. R / D / I. */
export function formatPartyLetterAbbrev(party: string | null | undefined): string {
  if (party == null || String(party).trim() === '') return '';
  const full = formatPartyLabel(party);
  if (!full) return '';

  const raw = String(party).trim();
  const u = raw.toUpperCase();

  if (u === 'R' || u === 'GOP' || full === 'Republican' || u.startsWith('REPUB')) return 'R';
  if (u === 'D' || u === 'DEM' || full === 'Democrat' || u.startsWith('DEMO')) return 'D';
  if (u === 'I' || u === 'IND' || full === 'Independent' || u.startsWith('INDEP')) return 'I';
  if (full === 'Libertarian' || u.startsWith('LIBERT')) return 'L';
  if (full === 'Green' || u.startsWith('GREEN')) return 'G';
  return full.length ? full.charAt(0).toUpperCase() : '?';
}

/**
 * Party text for representative/sponsor chips: full name plus letter, e.g. "Democrat (D)", "Republican (R)".
 */
export function formatRepresentativePartyChipLabel(party: string | null | undefined): string {
  const abbrev = formatPartyLetterAbbrev(party);
  if (!abbrev) return '';
  const full = formatPartyLabel(party);
  return `${full} (${abbrev})`;
}

/** LegiScan sponsor role (Rep, Sen) → full word. */
export function formatLegislativeRoleLabel(role: string | null | undefined): string {
  if (role == null || String(role).trim() === '') return '';
  const raw = String(role).trim();
  const u = raw.toUpperCase().replace(/\.$/, '');
  if (u === 'REP' || u === 'REPRESENTATIVE') return 'Representative';
  if (u === 'SEN' || u === 'SENATOR') return 'Senator';
  if (u === 'DEL' || u === 'DELEGATE') return 'Delegate';
  return formatBillLabelText(raw);
}

/** Solid badge color for party chips (abbrev or full party name). */
export function partyBadgeBackgroundColor(party: string | null | undefined): string {
  if (party == null || String(party).trim() === '') return '#555';
  const label = formatPartyLabel(party).toLowerCase();
  if (label.includes('democ')) return '#1565c0';
  if (label.includes('republic')) return '#c62828';
  const u = String(party).trim().toUpperCase();
  if (u === 'D' || u === 'DEM') return '#1565c0';
  if (u === 'R') return '#c62828';
  if (label.includes('independ')) return '#555';
  return '#555';
}

/**
 * HD-26 / SD-12 / "House Dist." → "House District …"
 * `House Dist` must NOT match the prefix of "District" (else you get "House District rict 63").
 */
export function formatSponsorDistrictLine(district: string | null | undefined): string {
  if (district == null || String(district).trim() === '') return '';
  let s = String(district).trim();
  s = s.replace(/^HD-?\s*/i, 'House District ');
  s = s.replace(/^SD-?\s*/i, 'Senate District ');
  s = s.replace(/\bHouse\s+Dist(?!rict)\.?\s*/gi, 'House District ');
  s = s.replace(/\bSenate\s+Dist(?!rict)\.?\s*/gi, 'Senate District ');
  s = s.replace(/\bHouse District\s+rict\s+/gi, 'House District ');
  s = s.replace(/\bSenate District\s+rict\s+/gi, 'Senate District ');
  return s.trim();
}

/** e.g. OCD id segments `sldl:063` / `sldu:9` from Open States or census strings. */
function tryFormatDistrictFromOcdFragment(
  raw: string,
  chamber: 'house' | 'senate' | null,
): string | null {
  const t = raw.trim();
  if (!t) return null;
  const sl = t.match(/sldl[:\s/]+0*(\d{1,3})/i);
  const su = t.match(/sldu[:\s/]+0*(\d{1,3})/i);
  if (sl && su) {
    if (chamber === 'senate') return `Senate District ${parseInt(su[1]!, 10)}`;
    if (chamber === 'house') return `House District ${parseInt(sl[1]!, 10)}`;
    return `House District ${parseInt(sl[1]!, 10)}`;
  }
  if (sl) return `House District ${parseInt(sl[1]!, 10)}`;
  if (su) return `Senate District ${parseInt(su[1]!, 10)}`;
  return null;
}

/**
 * Member roster cards: human-readable district with chamber when the DB has a bare number (e.g. "45").
 */
export function formatKyLegislatorDistrict(leg: {
  chamber: 'house' | 'senate' | null;
  district: string | null | undefined;
}): string {
  const raw = (leg.district || '').trim();
  if (!raw) return '';
  if (/sld[lu][:\s/]|[/]sld[lu][:\s/]|ocd-division/i.test(raw)) {
    const ocd = tryFormatDistrictFromOcdFragment(raw, leg.chamber);
    if (ocd) return ocd;
  }
  let s = formatSponsorDistrictLine(raw);
  if (s.includes('House District') || s.includes('Senate District')) return s;
  if (/^\d+$/.test(raw)) {
    if (leg.chamber === 'house') return `House District ${raw}`;
    if (leg.chamber === 'senate') return `Senate District ${raw}`;
  }
  return s || raw;
}

export interface KyBillNextAction {
  /** Plain-language description of the usual next legislative beat. */
  body: string;
}

/**
 * Infer a concise "next action" for KY GA cards when full LegiScan history is not loaded.
 * Uses mapped `status` and `last_action` text from sync (see ky-sync-pipeline mapLegiScanStatus).
 * Returns null when the bill has finished the legislative process (nothing to show on the card).
 */
export function getKyBillNextAction(bill: {
  status?: string | null;
  last_action?: string | null;
  bill_number?: string | null;
  chamber?: string | null;
}): KyBillNextAction | null {
  const st = (bill.status || '').trim().toLowerCase();
  const action = (bill.last_action || '').trim().toLowerCase();
  const chamber = effectiveBillChamber(bill);

  const terminal =
    st.includes('signed') ||
    st.includes('chapter') ||
    st.includes('vetoed') ||
    st.includes('failed') ||
    action.includes('signed by governor') ||
    action.includes('delivered to secretary of state') ||
    action.includes('became law without') ||
    action.includes('vetoed by governor') ||
    action.includes('sustained the governor') ||
    action.includes('failed to pass') ||
    action.includes('died on');

  if (terminal) {
    return null;
  }

  if (st.includes('enrolled') || action.includes('enrolled')) {
    return {
      body: 'Delivery to the governor for signature, veto, or line-item veto; then enrollment if signed.',
    };
  }

  if (st.includes('passed chamber') || (action.includes('third reading') && action.includes('passed'))) {
    if (chamber === 'house') {
      return {
        body: 'Message to the Senate: Senate committee and floor action, or concurrence if both chambers already passed compatible versions.',
      };
    }
    if (chamber === 'senate') {
      return {
        body: 'Message to the House: House committee and floor action, or concurrence.',
      };
    }
    return {
      body: 'Consideration in the other chamber, or a conference committee if the chambers passed different versions.',
    };
  }

  if (
    st.includes('reported') ||
    action.includes('reported favorably') ||
    action.includes('posted for passage') ||
    action.includes('ready for floor')
  ) {
    return {
      body: 'Calendar placement and remaining readings; then a vote on final passage in this chamber.',
    };
  }

  if (
    st.includes('committee') ||
    action.includes('referred to') ||
    action.includes('in committee') ||
    action.includes('recommitted')
  ) {
    return {
      body: 'Committee work: hearings, possible amendments, and a vote to report the bill favorably to the floor.',
    };
  }

  if (st.includes('engrossed') || action.includes('engrossed')) {
    return {
      body: 'Final chamber passage steps (if not complete) or transmission to the other chamber.',
    };
  }

  if (
    st.includes('introduced') ||
    st.includes('draft') ||
    action.includes('introduced') ||
    action.includes('prefiled') ||
    action.includes('filed for introduction')
  ) {
    return {
      body: 'Committee referral and committee review before the bill is eligible for floor action.',
    };
  }

  if (st.includes('veto override') || action.includes('veto override')) {
    return {
      body: "Chamber vote(s) on whether to override the governor's veto.",
    };
  }

  return {
    body: 'Further committee and floor action as the session schedule allows.',
  };
}

export type KyBillSortKey =
  | 'bill_number'
  | 'title'
  | 'chamber'
  | 'status'
  | 'session'
  | 'introduced_date'
  | 'last_action_date';

/** Prefix + numeric part for natural ordering of designations like HB 6 vs HB 123. */
export function billNumberSortParts(billNumber: string | null | undefined): {
  prefix: string;
  num: number;
  raw: string;
} {
  const raw = (billNumber || '').trim();
  const m = raw.match(/^([A-Za-z]+)\s*0*(\d+)\s*$/);
  if (m) return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10), raw };
  const m2 = raw.match(/^([A-Za-z]+)/);
  return { prefix: m2 ? m2[1].toUpperCase() : raw.toUpperCase(), num: 0, raw };
}

function compareStringsLoose(a: string | null | undefined, b: string | null | undefined): number {
  const sa = (a || '').toLowerCase();
  const sb = (b || '').toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function compareIsoDates(a: string | null | undefined, b: string | null | undefined): number {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
}

/** Comparator for one sort key (ascending). Multiply result by -1 for descending. */
export function compareKyBills(a: KYBill, b: KYBill, key: KyBillSortKey): number {
  switch (key) {
    case 'bill_number': {
      const pa = billNumberSortParts(a.bill_number);
      const pb = billNumberSortParts(b.bill_number);
      const prefixCmp = pa.prefix.localeCompare(pb.prefix);
      if (prefixCmp !== 0) return prefixCmp;
      return pa.num - pb.num;
    }
    case 'title':
      return compareStringsLoose(a.title, b.title);
    case 'chamber': {
      const ca = effectiveBillChamber(a) || '';
      const cb = effectiveBillChamber(b) || '';
      return ca.localeCompare(cb);
    }
    case 'status':
      return compareStringsLoose(a.status, b.status);
    case 'session':
      return compareStringsLoose(a.session, b.session);
    case 'introduced_date':
      return compareIsoDates(a.introduced_date, b.introduced_date);
    case 'last_action_date':
      return compareIsoDates(a.last_action_date, b.last_action_date);
    default:
      return 0;
  }
}
