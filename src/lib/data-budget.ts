/**
 * Data budget numbers that code reads. The prose budget (every vendor, the
 * "Running Kentucky today" estimates, free tiers, the kill switch) lives in
 * `docs/data-budget.md`; keep the two in step.
 *
 * Status: PROPOSED 2026-10-06, pending WS4-04 (owner adopts or edits).
 * Nothing reads this constant yet. WS4-03a wires `legiscan.perRunCap` into
 * `KyLegiScanClient`, WS4-08 reads the pace targets and WS4-09a the LRC
 * spacing. Do not change runtime thresholds from here until those WPs land.
 *
 * Only values that code will read belong here. Anthropic, Open States and
 * free-tier numbers stay in the doc because no code reads them.
 */
import { LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT } from './legiscan-quota';

export type DataBudget = {
  legiscan: {
    /** Vendor cap, queries per calendar month. */
    monthlyCap: number;
    /** Planning target, queries per month. */
    planningTargetPerMonth: number;
    /** Paid-tier trigger: month-to-date queries on the 15th at or above this. */
    paidTierTriggerByDay15: number;
    /**
     * `null` = counted, no cap. Keys are LegiScan caller tags
     * (`src/lib/legiscan-caller.ts`). Any caller not listed gets 0 and must
     * pass `--budget=N` (enforced from WS4-03a).
     */
    perRunCap: Record<string, number | null>;
    /** A single run budget above this needs owner approval. */
    manualApprovalAbove: number;
  };
  lrc: {
    /** Minimum gap between request starts to one host, in ms. */
    minSpacingMs: number;
    /** Requests in flight to one host at a time. */
    maxConcurrencyPerHost: number;
    /** The LRC hosts fetched from `src/` and `scripts/`. */
    hosts: readonly string[];
  };
};

export const DATA_BUDGET: DataBudget = {
  legiscan: {
    // D1; LegiScan's 2026-10-01 Public API change. Single source: legiscan-quota.ts.
    monthlyCap: LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT,
    // PROPOSED, WS4-04: 50% of the cap; decisions.md § 2026-10-06 projects a 3,500–5,500 peak.
    planningTargetPerMonth: 5000,
    // decisions.md § 2026-09-29 (option d), "Revisit if" trigger. PROPOSED, WS4-04.
    paidTierTriggerByDay15: 5000,
    perRunCap: {
      // PROPOSED, WS4-04: counted and uncapped until WS4-06 makes the sync resumable and sets 250.
      'sync-bills': null,
      // PROPOSED, WS4-04: getSessionList + getSessionPeople per run (decisions.md § 2026-10-06).
      'sync-legislators': 10,
      // PROPOSED, WS4-04: ~5 getBill/day plus new roll calls in session (decisions.md § 2026-09-30).
      'sync-votes': 60,
      // PROPOSED, WS4-04: 1 list + hash-gated getDataset, ~26 worst case (scripts/check-quota.ts history).
      'dataset-sync': 40,
      // PROPOSED, WS4-04: hash-gated getDataset per run (decisions.md § 2026-09-29, item 2).
      'accuracy-audit': 40,
      // PROPOSED, WS4-04: 1 measured per dry run (decisions.md § 2026-09-30).
      'session-preview': 5,
      // PROPOSED, WS4-04: 2 getSessionPeople measured 2026-10-06 (decisions.md § 2026-10-06).
      'legislator-links': 40,
    },
    // Operating manual §4: no WP spends more than 1,000 queries without owner approval.
    manualApprovalAbove: 1000,
  },
  lrc: {
    // Operating manual §4 (policy): at most 1 request per second per host (D3).
    minSpacingMs: 1000,
    // Operating manual §4 (policy): requests are serial (D3).
    maxConcurrencyPerHost: 1,
    // grep of src/ and scripts/ on 2026-10-06 (D3).
    hosts: ['apps.legislature.ky.gov', 'legislature.ky.gov'],
  },
};
