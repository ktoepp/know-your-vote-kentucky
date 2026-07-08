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
