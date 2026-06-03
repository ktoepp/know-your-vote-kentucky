/**
 * Legislators accuracy checker — `ky_legislators` vs Open States roster.
 *
 * Cheap full-roster pass (no LegiScan quota): verifies seat coverage
 * (100 House + 38 Senate) and diffs party / district / name for stored rows
 * matched by `openstates_id`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractOpenStatesContactDetails,
  getKyOpenStatesClient,
  openStatesCurrentRole,
  type OpenStatesLegislator,
} from '../../ky-openstates-client';
import {
  diffFinding,
  norm,
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';

const EXPECTED_SEATS: Record<'house' | 'senate', number> = { house: 100, senate: 38 };

interface LegislatorRow {
  id: string;
  name: string;
  party: string | null;
  chamber: 'house' | 'senate' | null;
  district: string | null;
  openstates_id: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  active: boolean;
}

/** Compare phone numbers by digits only (formatting varies between sources). */
function phoneDigits(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

function partyCode(party: string | null | undefined): string {
  const p = norm(party);
  if (!p) return '';
  if (p.startsWith('rep')) return 'r';
  if (p.startsWith('dem')) return 'd';
  if (p.startsWith('ind')) return 'i';
  return p.charAt(0);
}

function chamberFromOrgClass(orgClass: string | undefined): 'house' | 'senate' | null {
  const c = (orgClass || '').toLowerCase();
  if (c === 'lower') return 'house';
  if (c === 'upper') return 'senate';
  return null;
}

/**
 * Normalize a district to its numeric value for comparison.
 * Stored districts are prefixed/zero-padded ("HD-032", "SD-06"); Open States
 * returns the bare number ("32", "6"). Strip the chamber prefix + leading zeros
 * so they compare equal. Chamber is verified separately via org_classification.
 */
function districtNumber(d: string | number | null | undefined): string {
  if (d == null) return '';
  const m = String(d).match(/\d+/);
  return m ? String(parseInt(m[0], 10)) : String(d).trim().toLowerCase();
}

export async function checkLegislators(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  const { data, error } = await db
    .from('ky_legislators')
    .select('id, name, party, chamber, district, openstates_id, email, phone, photo_url, active')
    .eq('active', true);

  if (error) {
    return summarizeResult('legislators', 0, findings, started, { error: error.message });
  }

  const rows = (data ?? []) as LegislatorRow[];

  let roster: OpenStatesLegislator[];
  try {
    roster = await getKyOpenStatesClient().fetchLegislators();
  } catch (e) {
    return summarizeResult('legislators', 0, findings, started, {
      error: `Open States roster fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Seat coverage: stored active rows vs constitutional seat counts.
  const dbByChamber: Record<'house' | 'senate', number> = { house: 0, senate: 0 };
  for (const r of rows) {
    if (r.chamber === 'house' || r.chamber === 'senate') dbByChamber[r.chamber] += 1;
  }
  for (const chamber of ['house', 'senate'] as const) {
    const expected = EXPECTED_SEATS[chamber];
    const got = dbByChamber[chamber];
    if (got !== expected) {
      findings.push({
        severity: 'warn',
        domain: 'legislators',
        entity: `${chamber} seats`,
        field: 'seat_count',
        message: `active ${chamber} legislators = ${got}, expected ${expected} (vacancies or roster drift)`,
        expected: String(expected),
        actual: String(got),
      });
    }
  }

  const osById = new Map<string, OpenStatesLegislator>();
  for (const p of roster) if (p.id) osById.set(p.id, p);

  let checked = 0;
  for (const row of rows) {
    const label = `${row.name}${row.district ? ` (${row.chamber ?? '?'} ${row.district})` : ''}`;

    if (!row.openstates_id) {
      findings.push({
        severity: 'warn',
        domain: 'legislators',
        entity: label,
        field: 'openstates_id',
        message: 'active legislator has no openstates_id; cannot verify against Open States',
      });
      continue;
    }

    const os = osById.get(row.openstates_id);
    if (!os) {
      findings.push({
        severity: 'fail',
        domain: 'legislators',
        entity: label,
        field: 'openstates_id',
        message: `openstates_id ${row.openstates_id} not found in current Open States roster`,
      });
      continue;
    }

    checked += 1;
    const role = openStatesCurrentRole(os);

    if (partyCode(os.party) && partyCode(os.party) !== partyCode(row.party)) {
      findings.push(diffFinding('fail', 'legislators', label, 'party', os.party, row.party));
    }

    const osChamber = chamberFromOrgClass(role?.org_classification);
    if (osChamber && row.chamber && osChamber !== row.chamber) {
      findings.push(diffFinding('fail', 'legislators', label, 'chamber', osChamber, row.chamber));
    }

    const osDistrict = districtNumber(role?.district);
    const dbDistrict = districtNumber(row.district);
    if (osDistrict && dbDistrict && osDistrict !== dbDistrict) {
      findings.push(diffFinding('fail', 'legislators', label, 'district', String(role?.district), row.district));
    }

    if (norm(os.name) && norm(os.name) !== norm(row.name)) {
      findings.push(diffFinding('warn', 'legislators', label, 'name', os.name, row.name));
    }

    const contact = extractOpenStatesContactDetails(os);
    if (contact.email && norm(contact.email) !== norm(row.email)) {
      findings.push(diffFinding('warn', 'legislators', label, 'email', contact.email, row.email));
    }
    if (contact.phone && phoneDigits(contact.phone) !== phoneDigits(row.phone)) {
      findings.push(diffFinding('warn', 'legislators', label, 'phone', contact.phone, row.phone));
    }
    if (os.image && !row.photo_url) {
      findings.push({
        severity: 'warn',
        domain: 'legislators',
        entity: label,
        field: 'photo_url',
        message: 'Open States has a photo but none is stored',
      });
    }
  }

  return summarizeResult('legislators', checked, findings, started);
}
