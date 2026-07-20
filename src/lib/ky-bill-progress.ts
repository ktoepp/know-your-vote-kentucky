/**
 * Generalized 4-stage legislative-progress model for a KY bill, shared by every
 * surface that shows "how far along is this?" — bill cards, the bill detail page,
 * and digest emails. Derives purely from the already-mapped `ky_bills.status`
 * (see `mapLegiScanBillStatus`) plus the bill designation, so it needs no extra
 * data fetch and stays consistent with the status chip and browse filters.
 *
 * The stages generalize the real KY path (introduce → committee → floor votes in
 * each chamber → governor) into four legible steps, echoing how services like
 * GovTrack communicate progress at a glance:
 *
 *   ① Introduced  ② Passed {origin chamber}  ③ Passed {second chamber}  ④ Became law
 *
 * "Became law" (not "Signed") because a KY bill can be enacted without a
 * signature — signed, unsigned after 10 days, veto overridden, or line-item
 * vetoed (the rest still becomes law). The meter fills to the furthest stage the
 * bill has reached (the status mapper already preserves furthest progress), and a
 * terminal state — vetoed or failed/dead — is reported separately so a surface can
 * show the bill stopped rather than pretending it will still advance.
 *
 * Bill types that don't take the full path adapt their stage list:
 *   - Bills + joint resolutions (HB/SB/HJR/SJR) — full four stages (JRs have the
 *     force of law and are presented to the governor).
 *   - Concurrent resolutions (HCR/SCR) — three stages ending at "Adopted by both
 *     chambers"; they are not signed into law.
 *   - Simple resolutions (HR/SR) — a single chamber acts; two stages.
 */
import type { KYBill } from '@/types/kentucky';
import {
  classifyKyBillBrowseBucket,
  effectiveBillChamber,
  normalizeKyBillDesignation,
} from '@/lib/bill-display';

export type BillProgressKind = 'bill' | 'concurrent_resolution' | 'simple_resolution';

/** A bill that stopped advancing: vetoed (and not overridden) or failed/dead. */
export type BillTerminalState = 'vetoed' | 'failed' | null;

export interface BillProgressStage {
  key: string;
  /** Full label for the detail page (e.g. "Passed House"). */
  label: string;
  /** Compact label for cards / emails (e.g. "House"). */
  shortLabel: string;
}

export interface BillProgress {
  kind: BillProgressKind;
  /** Ordered stages for this bill type. */
  stages: BillProgressStage[];
  /** 0-based index of the furthest stage reached; -1 when nothing has happened yet. */
  reachedIndex: number;
  /** vetoed / failed when the bill has stopped advancing, else null. */
  terminal: BillTerminalState;
  /** Human status label for the meter caption (e.g. "Vetoed", "In committee"). */
  statusLabel: string;
}

function billDesignationPrefix(billNumber: string | null | undefined): string {
  const m = /^([A-Z]+)/.exec(normalizeKyBillDesignation(billNumber));
  return m ? m[1] : '';
}

export function billProgressKind(billNumber: string | null | undefined): BillProgressKind {
  const prefix = billDesignationPrefix(billNumber);
  if (prefix === 'HCR' || prefix === 'SCR') return 'concurrent_resolution';
  if (prefix === 'HR' || prefix === 'SR') return 'simple_resolution';
  // HB, SB, HJR, SJR, and anything unrecognized default to the full bill path.
  return 'bill';
}

function chamberLabel(chamber: 'house' | 'senate' | null, fallback: string): string {
  if (chamber === 'house') return 'House';
  if (chamber === 'senate') return 'Senate';
  return fallback;
}

function stagesFor(kind: BillProgressKind, bill: KYBill): BillProgressStage[] {
  const origin = effectiveBillChamber(bill);
  const originName = chamberLabel(origin, 'first chamber');
  const otherName = origin ? chamberLabel(origin === 'house' ? 'senate' : 'house', 'second chamber') : 'second chamber';

  if (kind === 'simple_resolution') {
    return [
      { key: 'introduced', label: 'Introduced', shortLabel: 'Introduced' },
      { key: 'adopted', label: `Adopted by ${originName}`, shortLabel: 'Adopted' },
    ];
  }
  if (kind === 'concurrent_resolution') {
    return [
      { key: 'introduced', label: 'Introduced', shortLabel: 'Introduced' },
      { key: 'passed_origin', label: `Passed ${originName}`, shortLabel: originName },
      { key: 'adopted_both', label: 'Adopted by both chambers', shortLabel: 'Both chambers' },
    ];
  }
  return [
    { key: 'introduced', label: 'Introduced', shortLabel: 'Introduced' },
    { key: 'passed_origin', label: `Passed ${originName}`, shortLabel: originName },
    { key: 'passed_second', label: `Passed ${otherName}`, shortLabel: otherName },
    { key: 'became_law', label: 'Became law', shortLabel: 'Law' },
  ];
}

/** True when the status/last-action clearly indicate the bill died (not merely pending). */
function isFailedBill(bill: KYBill): boolean {
  const s = (bill.status || '').trim().toLowerCase();
  const a = (bill.last_action || '').trim().toLowerCase();
  if (s.includes('failed') || s === 'dead' || s.includes('died')) return true;
  if (a.includes('died in committee') || a.includes('bill failed') || a.includes('failed to pass')) return true;
  return false;
}

/**
 * Compute the generalized progress model for a bill. Pure — derives from the
 * already-synced `status` / `last_action` / `bill_number`, no I/O.
 */
export function getBillProgress(bill: KYBill): BillProgress {
  const kind = billProgressKind(bill.bill_number);
  const stages = stagesFor(kind, bill);
  const lastIndex = stages.length - 1;
  const bucket = classifyKyBillBrowseBucket(bill);
  const statusLabel = (bill.status || '').trim() || 'Introduced';

  // Map the coarse status onto this bill type's stage list. Indices are clamped
  // to the bill type's own stage count (resolutions have fewer stages).
  let reachedIndex = 0;
  let terminal: BillTerminalState = null;

  if (kind === 'bill') {
    // HB/SB/HJR/SJR — the full path through both chambers to the governor.
    switch (bucket) {
      case 'signed':
        // Became law (signed / chaptered / veto override / line-item veto).
        reachedIndex = lastIndex;
        break;
      case 'vetoed':
        // Vetoed and not overridden: cleared both chambers, then stopped before
        // enactment. Fill through "passed both chambers" and mark the veto.
        reachedIndex = Math.max(0, lastIndex - 1);
        terminal = 'vetoed';
        break;
      case 'passed':
        // Passed both chambers, awaiting the governor.
        reachedIndex = Math.max(0, lastIndex - 1);
        break;
      case 'passed_one_chamber':
        reachedIndex = Math.min(1, lastIndex);
        break;
      case 'in_committee':
      case 'introduced':
        reachedIndex = 0;
        break;
      case 'other':
      default:
        reachedIndex = 0;
        if (isFailedBill(bill)) terminal = 'failed';
        break;
    }
  } else {
    // Resolutions use "adopted" vocabulary and never go to the governor, so the
    // bill-centric bucket classifier can land an adopted resolution in "other"
    // (status text like "Adopted") — handle the adoption signals directly.
    const statusText = `${bill.status ?? ''} ${bill.last_action ?? ''}`.toLowerCase();
    const isAdopted =
      bucket === 'signed' ||
      bucket === 'passed' ||
      /\b(adopted|enrolled|passed|chaptered)\b/.test(statusText);
    if (isFailedBill(bill)) {
      reachedIndex = 0;
      terminal = 'failed';
    } else if (isAdopted) {
      // Final stage: "Adopted by both chambers" (CR) or "Adopted by {chamber}" (SR).
      reachedIndex = lastIndex;
    } else if (bucket === 'passed_one_chamber') {
      reachedIndex = Math.min(1, lastIndex);
    } else {
      reachedIndex = 0;
    }
  }

  return { kind, stages, reachedIndex, terminal, statusLabel };
}
