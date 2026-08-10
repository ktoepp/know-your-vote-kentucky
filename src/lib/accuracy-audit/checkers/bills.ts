/**
 * Bills accuracy checker — a seeded random sample of `ky_bills` vs LegiScan
 * `getBill`.
 *
 * Diffs bill_number, title, status (recomputed via the same mapper the sync uses),
 * last_action, bill_text_url, and sponsor identity (people_id set). Bounded by
 * ACCURACY_BILLS_LIMIT; the sampled rows vary per run (reproducible via seed).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getKyLegiScanClient,
  type LegiScanBillDetail,
  type LegiScanHistoryEntry,
} from '../../ky-legiscan-client';
import { mapLegiScanBillStatus } from '../../map-legiscan-bill-status';
import { sampleTableSplit } from '../sampling';
import {
  diffFinding,
  norm,
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';

interface BillRow {
  id: string;
  legiscan_id: number | null;
  bill_number: string;
  title: string;
  status: string | null;
  last_action: string | null;
  bill_text_url: string | null;
  sponsors: unknown;
}

/**
 * KYVKY intentionally stores the official KY legislature record URL (e.g.
 * apps.legislature.ky.gov / lrc.ky.gov), which differs from LegiScan's own
 * `bill.url` (a legiscan.com page). So we don't compare for string equality —
 * we only confirm a usable URL is stored and its host is one we trust.
 */
function isAcceptableBillTextHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'legiscan.com' || host === 'ky.gov' || host.endsWith('.ky.gov');
  } catch {
    return false;
  }
}

/**
 * Extract the bill identifier a stored `bill_text_url` points at, as
 * `{ letters, digits }`.
 *
 * Two URL families are in the corpus, and both embed the bill in the path:
 *   - KY record pages: .../record/23RS/hb377.html, .../record/12RS/HC148.htm
 *   - LegiScan pages:  https://legiscan.com/KY/bill/HB118/2025
 * Anything else (or a path with no bill-shaped token) yields null, meaning
 * "cannot assert" — silence, not a finding.
 */
function billIdentifierFromUrl(url: string): { letters: string; digits: string } | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  // Scan right-to-left: the bill token is the last letters+digits segment
  // (`hb377`, `HC148`, `HB118`); trailing year/session segments are digits-only
  // or digits+letters ("23RS") and so don't match the letters-first shape.
  const segments = path.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const token = segments[i].replace(/\.(?:html?|htm)$/i, '');
    const m = token.match(/^([a-z]{1,3})0*(\d{1,4})$/i);
    if (m) return { letters: m[1].toLowerCase(), digits: m[2] };
  }
  return null;
}

/**
 * True when a stored bill_text_url plausibly points at *this* bill.
 *
 * The digit part must match exactly — that is the check that catches the real
 * hazard (a correct host serving the wrong bill's text). The letter part is
 * compared prefix-tolerantly because the LRC record pages abbreviate resolution
 * prefixes: HCR148 lives at /record/12RS/HC148.htm and SCR279 at SC279.htm.
 * Requiring exact letters would false-flag every concurrent/joint resolution.
 */
function urlMatchesBillNumber(url: string, billNumber: string): boolean | null {
  const fromUrl = billIdentifierFromUrl(url);
  const m = (billNumber || '').trim().match(/^([a-z]{1,3})0*(\d{1,4})$/i);
  if (!fromUrl || !m) return null;
  const letters = m[1].toLowerCase();
  if (fromUrl.digits !== m[2]) return false;
  return letters.startsWith(fromUrl.letters) || fromUrl.letters.startsWith(letters);
}

/**
 * `getBill` (the detail endpoint) does NOT return a top-level `last_action` —
 * that field only comes from `getMasterList`/`getSearch`, which is what the sync
 * stores from. The detail response instead carries the action log in `history[]`.
 * Reconstruct the latest action so status mapping matches how the row was stored.
 */
function latestAction(bill: LegiScanBillDetail): { action: string; date: string } {
  if (bill.last_action) {
    return { action: bill.last_action, date: bill.last_action_date || '' };
  }
  const history = Array.isArray(bill.history) ? bill.history : [];
  let latest: LegiScanHistoryEntry | null = null;
  for (const h of history) {
    if (!h?.action) continue;
    if (latest == null) {
      latest = h;
      continue;
    }
    const tNew = h.date ? new Date(h.date).getTime() : 0;
    const tCur = latest.date ? new Date(latest.date).getTime() : 0;
    // Ties resolve to the later array index (LegiScan history is chronological).
    if (tNew >= tCur) latest = h;
  }
  return { action: latest?.action ?? '', date: latest?.date ?? '' };
}

function sponsorIdSet(value: unknown): Set<number> {
  const ids = new Set<number>();
  if (!Array.isArray(value)) return ids;
  for (const s of value as Array<{ people_id?: unknown }>) {
    const n = Number(s?.people_id);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return ids;
}

export async function checkBills(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  let rows: BillRow[];
  try {
    // Weighted toward bills that can still change. A uniform draw over the
    // ~22.5k-row corpus spent most of the LegiScan budget re-verifying closed
    // sessions whose upstream record is frozen; the remainder of the sample
    // still rotates across history.
    const activeCutoff = new Date(Date.now() - cfg.activeDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows = await sampleTableSplit<BillRow>(
      db,
      {
        table: 'ky_bills',
        select: 'id, legiscan_id, bill_number, title, status, last_action, bill_text_url, sponsors',
        seed: cfg.seed,
        limit: cfg.billsLimit,
        filter: (q) => q.not('legiscan_id', 'is', null),
        cacheKey: 'legiscan_id_not_null',
        activeFilter: (q) => q.gte('last_action_date', activeCutoff),
        activeCacheKey: `legiscan_id_not_null|active>=${activeCutoff}`,
        activeShare: cfg.activeShare,
        // Oldest-first rotation (migration 049): the seed still shuffles ties,
        // but rows that have gone longest without a check take priority. Same
        // scope for both halves of the split so an active-window pick still
        // counts as coverage against the whole corpus's rotation.
        rotation: { scope: 'bills' },
      },
      (r) => r.id,
    );
  } catch (e) {
    return summarizeResult('bills', 0, findings, started, {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  if (rows.length === 0) {
    return summarizeResult('bills', 0, findings, started, {
      skipped: true,
      skipReason: 'no bills with legiscan_id to sample',
    });
  }

  const client = getKyLegiScanClient();
  let checked = 0;
  let upstreamFailures = 0;

  for (const row of rows) {
    if (row.legiscan_id == null) continue;

    let bill;
    try {
      bill = await client.fetchBillDetail(row.legiscan_id);
    } catch (e) {
      findings.push({
        severity: 'warn',
        domain: 'bills',
        entity: row.bill_number,
        message: `LegiScan fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      upstreamFailures += 1;
      continue;
    }

    if (!bill) {
      findings.push({
        severity: 'fail',
        domain: 'bills',
        entity: row.bill_number,
        message: `LegiScan returned no bill for legiscan_id ${row.legiscan_id}`,
      });
      continue;
    }

    checked += 1;

    if (norm(bill.number) && norm(bill.number) !== norm(row.bill_number)) {
      findings.push(diffFinding('fail', 'bills', row.bill_number, 'bill_number', bill.number, row.bill_number));
    }

    if (norm(bill.title) && norm(bill.title) !== norm(row.title)) {
      findings.push(diffFinding('warn', 'bills', row.bill_number, 'title', bill.title, row.title));
    }

    const lastAction = latestAction(bill);

    const expectedStatus = mapLegiScanBillStatus(
      bill.status,
      lastAction.action,
      Array.isArray(bill.history) ? bill.history : undefined,
    );
    const statusMismatch = !!expectedStatus && norm(expectedStatus) !== norm(row.status);
    if (statusMismatch) {
      findings.push(diffFinding('fail', 'bills', row.bill_number, 'status', expectedStatus, row.status));
    }

    // last_action is reconstructed here from `getBill`'s history[], but the sync
    // stores it from `getMasterList`/`getSearch`, which phrases the *same* action
    // differently (e.g. "To: Interim Joint Committee on Appropriations and Revenue"
    // vs "to Appropriations & Revenue (H)"). A raw string diff therefore false-flags
    // on phrasing alone — see HB48 in the 2026-07-19 run. `status` (a `fail`, mapped
    // through the tolerant status mapper) is the reliable staleness signal; only
    // surface the last_action text as supporting context when status *also* diverged.
    if (statusMismatch && norm(lastAction.action) && norm(lastAction.action) !== norm(row.last_action)) {
      findings.push(
        diffFinding('warn', 'bills', row.bill_number, 'last_action', lastAction.action, row.last_action),
      );
    }

    if (bill.url && !row.bill_text_url) {
      findings.push({
        severity: 'warn',
        domain: 'bills',
        entity: row.bill_number,
        field: 'bill_text_url',
        message: 'LegiScan has a bill text URL but none is stored',
        expected: bill.url,
      });
    } else if (row.bill_text_url && !isAcceptableBillTextHost(row.bill_text_url)) {
      findings.push({
        severity: 'warn',
        domain: 'bills',
        entity: row.bill_number,
        field: 'bill_text_url',
        message: 'stored bill text URL is malformed or from an unexpected host',
        actual: row.bill_text_url,
      });
    } else if (row.bill_text_url) {
      // A full value comparison against upstream is NOT possible here: `getBill`
      // exposes only legiscan.com-hosted links (`bill.url`, `texts[].url`), while
      // KYVKY deliberately stores the official KY legislature record page. The
      // doc_id in texts[] identifies a LegiScan text document, not anything present
      // in the stored URL, so there is nothing to equate.
      //
      // What we *can* assert without inventing a comparison: the bill identifier
      // embedded in the stored path must be this bill. That closes the actual gap —
      // a right-host/wrong-bill URL (e.g. HB377's row linking to hb337.html) used to
      // pass the host allowlist silently. `null` means the URL shape carries no
      // bill token to check, so we stay quiet rather than guess.
      const matches = urlMatchesBillNumber(row.bill_text_url, row.bill_number);
      if (matches === false) {
        findings.push({
          severity: 'warn',
          domain: 'bills',
          entity: row.bill_number,
          field: 'bill_text_url',
          message: 'stored bill text URL points at a different bill than this row',
          expected: row.bill_number,
          actual: row.bill_text_url,
        });
      }
    }

    const apiIds = sponsorIdSet(bill.sponsors);
    const dbIds = sponsorIdSet(row.sponsors);
    if (apiIds.size > 0 || dbIds.size > 0) {
      const missing = [...apiIds].filter((id) => !dbIds.has(id));
      const extra = [...dbIds].filter((id) => !apiIds.has(id));
      if (missing.length > 0 || extra.length > 0) {
        const detail = [
          missing.length ? `${missing.length} on LegiScan not stored` : '',
          extra.length ? `${extra.length} stored not on LegiScan` : '',
        ]
          .filter(Boolean)
          .join(', ');
        findings.push({
          severity: 'warn',
          domain: 'bills',
          entity: row.bill_number,
          field: 'sponsors',
          message: `sponsor list differs (${detail})`,
          expected: `${apiIds.size} sponsors`,
          actual: `${dbIds.size} sponsors`,
        });
      }
    }
  }

  return summarizeResult('bills', checked, findings, started, { upstreamFailures });
}
