/**
 * Regression guard for the "delivered to Secretary of State" veto/chaptered disambiguation in
 * mapLegiScanBillStatus. A bill vetoed and never overridden must map to `Vetoed`, not `Chaptered`,
 * even though KY files it with the SoS just like a signed bill (regression: SB70 2026RS).
 *
 * Run: npm run verify:bill-status
 */
import { mapLegiScanBillStatus } from '../src/lib/map-legiscan-bill-status';

type Case = {
  name: string;
  statusCode: number;
  lastAction: string;
  history?: Array<{ action?: string | null }>;
  expected: string;
};

const cases: Case[] = [
  {
    name: 'SB70 26RS — vetoed, not overridden (regression)',
    statusCode: 5,
    lastAction: 'delivered to Secretary of State',
    history: [{ action: '3rd reading, passed 97-1' }, { action: 'Vetoed' }, { action: 'delivered to Secretary of State' }],
    expected: 'Vetoed',
  },
  {
    name: 'SB70 — veto detected from history even if status code not 5',
    statusCode: 4,
    lastAction: 'delivered to Secretary of State',
    history: [{ action: 'Vetoed' }, { action: 'delivered to Secretary of State' }],
    expected: 'Vetoed',
  },
  {
    name: 'SB70 — master-list path (no history) relies on status code 5',
    statusCode: 5,
    lastAction: 'delivered to Secretary of State',
    expected: 'Vetoed',
  },
  {
    name: 'SB251 26RS — vetoed then overridden (still law)',
    statusCode: 4,
    lastAction: 'delivered to Secretary of State (Acts Ch. 181)',
    history: [{ action: 'Vetoed' }, { action: 'veto overridden' }, { action: 'delivered to Secretary of State (Acts Ch. 181)' }],
    expected: 'Veto Override',
  },
  {
    name: 'SB197 26RS — line-item veto only (still chaptered/law)',
    statusCode: 8,
    lastAction: 'delivered to Secretary of State (Acts Ch. 202)',
    history: [{ action: 'line item vetoed by Governor' }, { action: 'delivered to Secretary of State (Acts Ch. 202)' }],
    expected: 'Chaptered',
  },
  {
    // Real-world shape where "Acts Ch." appears only on the line-item-veto action, not on the
    // subsequent SoS filing step. statusCode=5 (LegiScan codes line-item vetoes as code 5,
    // same as full vetoes) would previously cause a false "Vetoed". (Regression: SB197 2026RS
    // stored with last_action="delivered to Secretary of State" and status "Vetoed" in prod.)
    name: 'SB197-like — Acts Ch. in history only, last_action bare SoS filing (regression)',
    statusCode: 5,
    lastAction: 'delivered to Secretary of State',
    history: [
      { action: 'line items vetoed (Acts Ch. 202)' },
      { action: 'delivered to Secretary of State' },
    ],
    expected: 'Chaptered',
  },
  {
    // Appropriations bills use PLURAL "vetoes overridden" + "line items vetoed" and DID become law
    // (Acts Ch.). Must NOT be labeled "Vetoed". (Regression: HB2/HB500/HB501/HB503/HB504/HB757 26RS.)
    name: 'HB757 26RS — line items vetoed then vetoes overridden (still law)',
    statusCode: 0,
    lastAction: 'delivered to Secretary of State (Acts Ch. 161)',
    history: [
      { action: 'line items vetoed' },
      { action: "posted for consideration of Governor's line vetoes" },
      { action: 'vetoes overridden' },
      { action: 'delivered to Secretary of State (Acts Ch. 161)' },
    ],
    expected: 'Veto Override',
  },
  {
    // "Acts Ch." on the SoS filing is the authoritative became-law signal: even if a stray veto
    // action slips through the full-veto filter, an enacted bill must never read "Vetoed".
    name: 'Enacted bill with Acts Ch. is never Vetoed (became-law backstop)',
    statusCode: 5,
    lastAction: 'delivered to Secretary of State (Acts Ch. 300)',
    history: [{ action: 'delivered to Secretary of State (Acts Ch. 300)' }],
    expected: 'Chaptered',
  },
  {
    name: 'Plural "vetoes overridden" on last action alone → Veto Override',
    statusCode: 4,
    lastAction: 'vetoes overridden',
    expected: 'Veto Override',
  },
  {
    // The veto action is the bill's only recorded action after "delivered to Governor" — KY never
    // filed a separate "delivered to Secretary of State" step for this bill, so the chapter number
    // must be read directly off the veto action text. (Regression: HB604/HB92 2022RS, HB1/HB3
    // 2010SS mapped to "Vetoed" via the statusCode===5 fallback before this case was fixed.)
    name: 'HB604 22RS — line-item veto is the final action, no SoS filing step (still law)',
    statusCode: 5,
    lastAction: 'line items vetoed (Acts Ch. 239)',
    expected: 'Chaptered',
  },
  {
    // KY's pre-~2018 records write the chapter citation with a comma ("Acts, ch. 194") — the old
    // literal "acts ch" substring check did NOT match this, so the bill fell through to the
    // statusCode===5 fallback and read "Vetoed" despite becoming law. (Regression: HB13 2017RS.)
    name: 'HB13 17RS — line-item veto with comma-form "Acts, ch. 194" (still law)',
    statusCode: 5,
    lastAction: 'line items vetoed (Acts, ch. 194)',
    expected: 'Chaptered',
  },
  {
    // Comma form with no space before the number ("Acts, ch.149"). (Regression: HB303/HB304/HB10/
    // HB129 2016RS.)
    name: 'HB303 16RS — comma-form "Acts, ch.149" no space (still law)',
    statusCode: 5,
    lastAction: 'line items vetoed (Acts, ch.149)',
    expected: 'Chaptered',
  },
  {
    // A line-item veto is a became-law signal in its own right (Ky. Const. §88 strikes only distinct
    // items; the rest of the appropriations bill becomes law) EVEN WHEN no chapter number is
    // recorded anywhere. Previously this fell through to LEGISCAN_STATUS_MAP and the stored "Vetoed"
    // was never corrected. (Regression: HB193 2021RS, HB306 2016RS.)
    name: 'HB193 21RS — "line items vetoed" with no chapter number anywhere (still law)',
    statusCode: 5,
    lastAction: 'line items vetoed',
    history: [{ action: 'passed' }, { action: 'line items vetoed' }],
    expected: 'Chaptered',
  },
  {
    // Guard: the broadened line-item became-law rule must NOT swallow a genuine FULL veto. A full
    // veto that is never overridden and carries no chapter number still dies → "Vetoed".
    name: 'Full veto, not overridden, no chapter → still Vetoed (guard)',
    statusCode: 5,
    lastAction: 'Vetoed and delivered with Veto Message to Secretary of State',
    history: [{ action: 'passed' }, { action: 'Vetoed and delivered with Veto Message to Secretary of State' }],
    expected: 'Vetoed',
  },
  {
    name: 'HB869 26RS — signed then chaptered',
    statusCode: 8,
    lastAction: 'delivered to Secretary of State (Acts Ch. 198)',
    history: [{ action: 'signed by Governor (Acts Ch. 198)' }, { action: 'delivered to Secretary of State (Acts Ch. 198)' }],
    expected: 'Chaptered',
  },
  {
    name: 'Signed bill — last action is the signing',
    statusCode: 8,
    lastAction: 'signed by Governor',
    expected: 'Signed',
  },
  {
    name: 'Bare veto — last action is the veto itself',
    statusCode: 5,
    lastAction: 'Vetoed',
    expected: 'Vetoed',
  },
  {
    name: 'Engrossed forward-referral not regressed (existing behavior preserved)',
    statusCode: 2,
    lastAction: 'to Senate Agriculture (S)',
    expected: 'Engrossed',
  },
];

let failures = 0;
for (const c of cases) {
  const got = mapLegiScanBillStatus(c.statusCode, c.lastAction, c.history);
  const ok = got === c.expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}\n      expected=${c.expected}  got=${got}`);
}
console.log(`\n${cases.length - failures}/${cases.length} passed`);
process.exit(failures === 0 ? 0 : 1);
