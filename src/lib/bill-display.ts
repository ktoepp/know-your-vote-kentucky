import type { KYBill } from '@/types/kentucky';
import { formatCivicDate } from '@/lib/civic-date';

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

/** Joint / concurrent resolutions (HJR, SJR, HCR, SCR) — not standard HB/SB bills. */
export function isKyJointResolutionBill(bill: { bill_number?: string | null }): boolean {
  const n = normalizeKyBillDesignation(bill.bill_number);
  return /^(HJR|HCR|SJR|SCR)\d/.test(n);
}

/** Collapse spaces and punctuation so "HB 23", "H.B.23", and "HB23" compare equal for search. */
export function normalizeKyBillDesignation(input: string | null | undefined): string {
  return String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-.]+/g, '');
}

/**
 * True when the bill designation's numeric suffix equals `digits` ("23" matches HB23/SB23;
 * avoids treating "23" as a substring of HB123).
 */
export function kyBillNumericPartEquals(
  billNumber: string | null | undefined,
  digits: string,
): boolean {
  if (!digits || !/^\d+$/.test(digits)) return false;
  const bn = normalizeKyBillDesignation(billNumber || '');
  const m = bn.match(/^([A-Z]+)(\d+)$/);
  return m !== null && m[2] === digits;
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

/**
 * Bill designation for links and headings (HB 23, SB 98, SR 224).
 * Uppercases the leading letter prefix only; preserves digits and spacing from the DB.
 * Do not use {@link formatBillLabelText} here — it title-cases prose and breaks designations (e.g. "Sb98").
 */
export function formatKyBillNumberDisplay(input: string | null | undefined): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  const m = s.match(/^([A-Za-z]+)(\s*)([\s\S]*)$/);
  if (!m) return s;
  return (m[1].toUpperCase() + m[2] + m[3]).trimEnd();
}

/** ISO calendar/date string → short US locale (same pattern as KYBillCard / BillsListTable). */
export function formatKyIsoDateShort(iso: string | null | undefined): string {
  return formatCivicDate(iso, { month: 'short', day: 'numeric', year: 'numeric' }) ?? '';
}

/**
 * "HB208" → "HB 208" for meta titles/descriptions — the spaced form matches how the
 * LRC and news phrase bill numbers in searchable text. On-page copy keeps the DB form.
 */
export function formatKyBillNumberSpaced(input: string | null | undefined): string {
  const s = formatKyBillNumberDisplay(input);
  const m = s.match(/^([A-Z]+)\s*(\d.*)$/);
  return m ? `${m[1]} ${m[2]}` : s;
}

/** Session year for meta titles ("2026 Regular Session" → "2026"); null when unparseable. */
export function kyBillSessionYear(session: string | null | undefined): string | null {
  const m = /^(\d{4})\b/.exec((session || '').trim());
  return m ? m[1] : null;
}

/**
 * Official catchlines open with enacting boilerplate ("AN ACT relating to …",
 * "A JOINT RESOLUTION directing …") that wastes the ~60 visible characters of a
 * <title>. Strip the opener for meta titles/OG only — page copy and JSON-LD keep
 * the official title as recorded.
 */
export function kyBillSeoCatchline(title: string | null | undefined, maxLen = 60): string {
  const raw = String(title ?? '').trim();
  if (!raw) return '';
  let s = raw
    .replace(/^AN?\s+ACT\s+(relating\s+to|to\s+amend|proposing\s+to\s+amend)\s+/i, '')
    .replace(/^AN?\s+ACT\s+/i, '')
    .replace(/^A\s+(JOINT|CONCURRENT)\s+RESOLUTION\s+/i, '')
    .replace(/^A\s+RESOLUTION\s+/i, '')
    .trim();
  if (!s) s = raw;
  s = s.replace(/\.\s*$/, '');
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length > maxLen) {
    const cut = s.slice(0, maxLen + 1);
    const lastSpace = cut.lastIndexOf(' ');
    s = `${(lastSpace > 20 ? cut.slice(0, lastSpace) : s.slice(0, maxLen)).replace(/[,;:\s]+$/, '')}…`;
  }
  return s;
}

/**
 * True when the status indicates a bill is still pending legislative action.
 * Used to decide whether to show "Adjourned Sine Die" once the session has ended.
 */
export function isActivePendingBillStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  if (!s) return false;
  return (
    s === 'introduced' ||
    s === 'in committee' ||
    s === 'referred' ||
    s === 'reported' ||
    s === 'draft' ||
    s.includes('prefiled') ||
    (s.includes('committee') && !s.includes('failed') && !s.includes('substitute'))
  );
}

/** SR / HR — a simple resolution, disposed of by a single chamber's adoption vote. */
function isKySimpleResolutionDesignation(billNumber: string | null | undefined): boolean {
  const m = /^([A-Z]+)/.exec(normalizeKyBillDesignation(billNumber));
  const prefix = m ? m[1] : '';
  return prefix === 'HR' || prefix === 'SR';
}

/**
 * True when an action string records a KY resolution's adoption by a recorded chamber
 * vote — "adopted 38-0", "passed 38-0" (roll call), or "adopted by voice vote".
 *
 * Kentucky disposes of a simple resolution with a single adoption vote that LegiScan
 * tags with `importance: 0` and frequently leaves coded as status 1 (Introduced), so
 * neither the numeric status nor the importance flag reflects the adoption — the action
 * wording is the reliable signal. Deliberately narrow: it requires an explicit vote
 * outcome (a "<yea>-<nay>" tally or "by voice vote") and rejects procedural text that
 * merely contains "adopted"/"passed" — "committee substitute adopted", "floor amendment
 * adopted", "passed over and retained on the orders of the day". That narrowness guards
 * the SR231 regression: a resolution still pending at sine die whose last action was such
 * procedural text must NOT read as adopted.
 */
export function actionIndicatesResolutionAdopted(action: string | null | undefined): boolean {
  const a = (action || '').trim().toLowerCase();
  if (!a) return false;
  if (a.includes('amendment') || a.includes('substitute') || a.includes('passed over') || a.includes('withdrawn')) {
    return false;
  }
  if (/\b(adopted|passed)\b[^.]*?\b\d{1,3}\s*-\s*\d{1,3}\b/.test(a)) return true;
  if (/\badopted by voice vote\b/.test(a)) return true;
  return false;
}

/**
 * Effective display status for a KY bill, correcting one systematic LegiScan gap: a
 * simple resolution adopted by a *roll-call* vote ("adopted 38-0") is tagged importance 0
 * and left coded as status 1 (Introduced), whereas a *voice-vote* adoption of the same
 * resolution is stored as "Passed". Left uncorrected, the roll-call form understates the
 * outcome and — once the session ends — reads as "Adjourned Sine Die" even though the
 * voting record shows it was adopted (e.g. SR252 2026RS, adopted 38-0).
 *
 * When the last action records that adoption and the stored status still understates it
 * (blank or a pending stage), report "Passed" — matching how voice-vote adoptions are
 * already stored, so the status chip, progress meter, and the detailed voting record all
 * agree. Every other bill returns its stored status unchanged. Scoped to simple
 * resolutions (SR/HR); regular bills and joint/concurrent resolutions get their passage
 * status from LegiScan directly (a one-chamber adoption is not final for a two-chamber
 * concurrent resolution).
 */
export function effectiveKyBillDisplayStatus(bill: {
  status?: string | null;
  last_action?: string | null;
  bill_number?: string | null;
}): string {
  const stored = (bill.status || '').trim();
  if (
    isKySimpleResolutionDesignation(bill.bill_number) &&
    actionIndicatesResolutionAdopted(bill.last_action) &&
    (stored === '' || isActivePendingBillStatus(stored))
  ) {
    return 'Passed';
  }
  return stored;
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

/** UI browse toggles in `BillsBrowse` (values match `status` param on search, not raw `ky_bills.status` strings). */
export type KyBillBrowseStatusFilterKey =
  | 'all'
  | 'introduced'
  | 'in_committee'
  | 'passed_one_chamber'
  | 'passed'
  | 'signed'
  | 'vetoed';

/**
 * Coarse stage for `ky_bills` rows from `mapLegiScanBillStatus` (see `map-legiscan-bill-status.ts`).
 * Used for client-side status filters: DB has "Engrossed", "Passed Chamber", "In Committee", not `passed_one_chamber`.
 */
export type KyBillBrowseBucket = Exclude<KyBillBrowseStatusFilterKey, 'all'> | 'other';

export const BROWSE_STATUS_BUCKETS: ReadonlySet<string> = new Set([
  'introduced',
  'in_committee',
  'passed_one_chamber',
  'passed',
  'signed',
  'vetoed',
]);

/**
 * One bucket per bill (first match wins, most advanced stage first) so every row maps to at most one filter.
 */
export function classifyKyBillBrowseBucket(bill: KYBill): KyBillBrowseBucket {
  const st = (bill.status || '').trim().toLowerCase();
  const act = (bill.last_action || '').trim().toLowerCase();

  if (isSignedByGovernorBillStatus(bill.status) || st.includes('chaptered') || st.includes('veto override')) {
    return 'signed';
  }
  if (st.includes('vetoed') && !st.includes('override')) {
    return 'vetoed';
  }

  if (st === 'enrolled' || (st === 'passed' && !st.includes('chamber')) || act.includes('delivered to the governor')) {
    return 'passed';
  }

  if (st.includes('engrossed') && !st.includes('enrolled')) {
    return 'passed_one_chamber';
  }
  if (st.includes('passed chamber')) {
    return 'passed_one_chamber';
  }
  if (act.includes('engrossed') && !st.includes('enrolled')) {
    return 'passed_one_chamber';
  }

  if (st === 'failed in committee') {
    return 'other';
  }
  if (st === 'in committee' || st === 'referred' || st === 'reported' || (st.includes('committee') && !st.includes('substitute'))) {
    return 'in_committee';
  }
  if (st.includes('committee substitute')) {
    return 'in_committee';
  }

  if (st === 'introduced' || st === 'draft' || st.includes('prefiled')) {
    return 'introduced';
  }
  if (st.includes('failed') || st.includes('died')) {
    return 'other';
  }
  return 'other';
}

/** Browse/search: filter key is a bucket; unknown strings fall back to case-insensitive `status` equality. */
export function billMatchesBrowseStatusFilter(bill: KYBill, filter: string | null | undefined): boolean {
  if (filter == null || filter === '' || filter === 'all') return true;
  const f = filter.trim();
  if (f === 'all') return true;
  if (!BROWSE_STATUS_BUCKETS.has(f)) {
    return (bill.status || '').trim().toLowerCase() === f.toLowerCase();
  }
  return classifyKyBillBrowseBucket(bill) === f;
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
 * Full party label (legacy / non-portrait contexts). Legislator UI uses portrait badge only — not separate party chips.
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

/**
 * Solid badge color for party chips (abbrev or full party name). Mirrors the
 * `--party-*` tokens in globals.css — kept as literal hex because this feeds a
 * MUI `bgcolor` that must resolve without CSS custom properties. Hues are
 * deliberately distinct from brand blue / error red (see the token comment).
 */
export function partyBadgeBackgroundColor(party: string | null | undefined): string {
  const DEM = '#4338CA'; // --party-d (indigo)
  const REP = '#BE123C'; // --party-r (rose)
  const IND = '#475569'; // --party-i (slate)
  if (party == null || String(party).trim() === '') return IND;
  const label = formatPartyLabel(party).toLowerCase();
  if (label.includes('democ')) return DEM;
  if (label.includes('republic')) return REP;
  const u = String(party).trim().toUpperCase();
  if (u === 'D' || u === 'DEM') return DEM;
  if (u === 'R') return REP;
  if (label.includes('independ')) return IND;
  return IND;
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
    const n = String(parseInt(raw, 10));
    if (leg.chamber === 'house') return `House District ${n}`;
    if (leg.chamber === 'senate') return `Senate District ${n}`;
  }
  return s || raw;
}

export interface KyBillNextAction {
  /** Plain-language description of the usual next legislative beat. */
  body: string;
}

/**
 * Infer a concise "next action" for KY GA cards when full LegiScan history is not loaded.
 * Uses mapped `status` and `last_action` text from sync (see `mapLegiScanBillStatus` in `map-legiscan-bill-status.ts`).
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
      body: 'Delivery to the governor for signature, veto, or line-item veto, then enrollment if signed.',
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

/**
 * Maps a LegiScan/KY GA bill status string to a key in `governmentTooltips`.
 * Returns null when no tooltip match exists (callers should skip showing a tooltip).
 */
export function billStatusToTooltipKey(status: string | null | undefined): string | null {
  if (!status) return null;
  const s = status.trim().toLowerCase();
  if (s.includes('chaptered')) return 'chaptered';
  if (s.includes('signed by governor') || s === 'signed') return 'signed_by_governor';
  if (s.includes('enacted') || s.includes('became law')) return 'enacted';
  if (s.includes('veto override') || s.includes('veto overridden')) return 'veto_override';
  if (s.includes('vetoed')) return 'vetoed';
  if (s.includes('enrolled')) return 'enrolled';
  if (s.includes('engrossed')) return 'engrossed';
  if (s.includes('committee substitute')) return 'committee_substitute';
  if (s.includes('reported favorably') || s.includes('reported')) return 'reported';
  if (s.includes('posted for passage')) return 'posted_for_passage';
  if (s.includes('passed')) return 'passed';
  if (s.includes('tabled')) return 'tabled';
  if (s.includes('recommitted')) return 'recommitted';
  if (s.includes('failed') || s.includes('died')) return 'failed';
  if (s.includes('adjourned sine die')) return 'adjourned_sine_die';
  if (s.includes('in committee') || s.includes('referred')) return 'in_committee';
  if (s.includes('prefiled')) return 'prefiled';
  if (s.includes('introduced')) return 'introduced';
  return null;
}

/**
 * Maps a KY bill number prefix (HB, SB, HJR, etc.) to a key in `governmentTooltips`.
 * Returns null when the prefix is unrecognized.
 */
export function billPrefixToTooltipKey(billNumber: string | null | undefined): string | null {
  const n = (billNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  if (n.startsWith('HJR')) return 'hjr';
  if (n.startsWith('SJR')) return 'sjr';
  if (n.startsWith('HCR')) return 'hcr';
  if (n.startsWith('SCR')) return 'scr';
  if (n.startsWith('HR')) return 'hr';
  if (n.startsWith('SR')) return 'sr';
  if (n.startsWith('HB')) return 'hb';
  if (n.startsWith('SB')) return 'sb';
  return null;
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
