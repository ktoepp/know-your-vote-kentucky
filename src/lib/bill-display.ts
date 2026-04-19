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

/**
 * Party text for representative/sponsor chips: full name plus letter, e.g. "Democrat (D)", "Republican (R)".
 */
export function formatRepresentativePartyChipLabel(party: string | null | undefined): string {
  if (party == null || String(party).trim() === '') return '';
  const full = formatPartyLabel(party);
  if (!full) return '';

  const raw = String(party).trim();
  const u = raw.toUpperCase();

  let abbrev: string;
  if (u === 'R' || u === 'GOP' || full === 'Republican' || u.startsWith('REPUB')) abbrev = 'R';
  else if (u === 'D' || u === 'DEM' || full === 'Democrat' || u.startsWith('DEMO')) abbrev = 'D';
  else if (u === 'I' || u === 'IND' || full === 'Independent' || u.startsWith('INDEP')) abbrev = 'I';
  else if (full === 'Libertarian' || u.startsWith('LIBERT')) abbrev = 'L';
  else if (full === 'Green' || u.startsWith('GREEN')) abbrev = 'G';
  else abbrev = full.length ? full.charAt(0).toUpperCase() : '?';

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

/** HD-26 / SD-12 / legacy "House Dist." → "House District …" */
export function formatSponsorDistrictLine(district: string | null | undefined): string {
  if (district == null || String(district).trim() === '') return '';
  let s = String(district).trim();
  s = s.replace(/^HD-?\s*/i, 'House District ');
  s = s.replace(/^SD-?\s*/i, 'Senate District ');
  s = s.replace(/\bHouse\s+Dist\.?\s*/gi, 'House District ');
  s = s.replace(/\bSenate\s+Dist\.?\s*/gi, 'Senate District ');
  return s.trim();
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
