/**
 * Bills accuracy checker — a seeded random sample of `ky_bills` vs the LegiScan
 * bulk dataset for the sessions that sample lands in.
 *
 * Diffs bill_number, title, status (recomputed via the same mapper the sync uses),
 * last_action, bill_text_url, and sponsor identity (people_id set). Bounded by
 * ACCURACY_BILLS_LIMIT; the sampled rows vary per run (reproducible via seed).
 *
 * The reference used to be one `getBill` per sampled row — 40 quota points to
 * check 40 bills. It is now the session dataset, which costs one point per
 * session however many rows are drawn from it, so the sample size and the
 * quota bill are no longer the same number. Raising ACCURACY_BILLS_LIMIT is
 * now free in quota terms.
 *
 * Two cases the per-bill path did not have, both skips rather than findings:
 * a session whose dataset could not be loaded, and a bill whose latest action
 * postdates the dataset snapshot (see `isRowNewerThanSnapshot` — the snapshot
 * is weekly, our sync is 6-hourly, so the reference can legitimately be the
 * older side and judging against it would invent drift).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { type LegiScanBillDetail, type LegiScanHistoryEntry } from '../../ky-legiscan-client';
import {
  isRowNewerThanSnapshot,
  loadDatasetCorpus,
  rankSessionsByRowCount,
} from '../legiscan-dataset-corpus';
import { mapLegiScanBillStatus } from '../../map-legiscan-bill-status';
import { releaseRotationStamp, sampleTableSplit } from '../sampling';
import {
  diffFinding,
  norm,
  summarizeResult,
  terminalResultFrom,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';

interface BillRow {
  id: string;
  legiscan_id: number | null;
  /** Which dataset covers this bill. Null rows can't be checked and are skipped. */
  legiscan_session_id: number | null;
  /**
   * Date of the bill's most recent legislative action, compared against the
   * dataset snapshot date by the freshness guard. Must be an *event* date, not
   * a sync-write timestamp — see `isRowNewerThanSnapshot`.
   */
  last_action_date: string | null;
  bill_number: string;
  /**
   * Session label (e.g. `"2026RS"`). Stamped onto every finding so the
   * fingerprint distinguishes HB100/2024 from HB100/2026 in the recurrence map.
   * Not rendered on the digest label — it stays scannable.
   */
  session: string | null;
  title: string;
  status: string | null;
  last_action: string | null;
  bill_text_url: string | null;
  sponsors: unknown;
}

/**
 * KYvKY intentionally stores the official KY legislature record URL (e.g.
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
        select:
          'id, legiscan_id, legiscan_session_id, last_action_date, bill_number, session, title, status, last_action, bill_text_url, sponsors',
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
        //
        // `stamp: 'defer'` — the sample here is only a *candidate list*. The
        // orchestrator commits the rotation stamps after the checker returns,
        // and only when the domain actually verified its sample. An outage
        // week (LegiScan 5xx across the whole draw) now discards its stamps
        // instead of shoving unverified rows to the back of the queue.
        rotation: { scope: 'bills', stamp: 'defer' },
      },
      (r) => r.id,
    );
  } catch (e) {
    // The sample query is against our own DB; a failure here is a crash, not an
    // upstream outage. Classify anyway so a transient PostgREST 5xx doesn't red-page.
    return terminalResultFrom('bills', 'Supabase', e, started, { crashPrefix: 'sample query failed' });
  }

  if (rows.length === 0) {
    return summarizeResult('bills', 0, findings, started, {
      skipped: true,
      skipReason: 'no bills with legiscan_id to sample',
    });
  }

  // One dataset per session, not one call per row — capped, because the
  // sample's historical half spans up to 12 of the 25 sessions and an uncapped
  // run would pull a dozen full-session ZIPs for a handful of rows each.
  // Sessions covering the most sampled rows win.
  const sessionsToLoad = rankSessionsByRowCount(
    rows.map((r) => r.legiscan_session_id),
    cfg.datasetSessionLimit,
  );
  let corpus;
  try {
    corpus = await loadDatasetCorpus(sessionsToLoad);
  } catch (e) {
    // Losing the dataset list means there is no reference at all. Classify as
    // an upstream failure rather than returning zero findings, which would
    // read as "everything checked out".
    return terminalResultFrom('bills', 'LegiScan', e, started, { crashPrefix: 'dataset list failed' });
  }

  const unavailableSessions = new Map(corpus.sessionsUnavailable.map((u) => [u.sessionId, u.reason]));
  let checked = 0;
  let upstreamFailures = 0;
  let skippedUncovered = 0;
  let skippedFresherThanSnapshot = 0;

  for (const row of rows) {
    if (row.legiscan_id == null) continue;

    // Every finding produced for this row carries `row.session` so the
    // fingerprint distinguishes same-numbered bills across sessions. Wrapping
    // the push at the row level keeps the individual finding call sites clean
    // and prevents a new comparison from forgetting to attach it.
    const sess = row.session ?? undefined;
    const push = (f: Finding) => findings.push(sess ? { ...f, session: sess } : f);

    // No dataset covering this row: either its session fell outside the cap or
    // the download failed. Either way there is nothing to compare against, so
    // it is a skip, not a finding — the bill is not wrong, we have no reference.
    // Only a genuine load *failure* counts as an upstream failure; falling
    // outside the cap is our own budgeting, not an upstream problem.
    const sessionId = row.legiscan_session_id;
    if (sessionId == null || !corpus.snapshotDateBySession.has(sessionId)) {
      skippedUncovered += 1;
      if (sessionId != null && unavailableSessions.has(sessionId)) upstreamFailures += 1;
      // Unverified: give the row its turn back rather than stamping it audited.
      releaseRotationStamp('bills', row.id);
      continue;
    }

    // The bill saw action after the snapshot was cut, so any difference is the
    // reference lagging, not our data drifting. Compared on `last_action_date`
    // (an event date) rather than `updated_from_legiscan_at` (a write
    // timestamp) — the dataset import rewrites every row in a session whether
    // or not it changed, so the write timestamp said "fresher than the
    // snapshot" for all 22,547 rows and this guard skipped the entire sample.
    if (isRowNewerThanSnapshot(corpus, row.legiscan_session_id, row.last_action_date)) {
      skippedFresherThanSnapshot += 1;
      releaseRotationStamp('bills', row.id);
      continue;
    }

    const bill = corpus.billsByLegiscanId.get(row.legiscan_id) as LegiScanBillDetail | undefined;

    if (!bill) {
      // The session's dataset loaded and this bill_id is not in it — that is a
      // real discrepancy, same as getBill returning nothing.
      push({
        severity: 'fail',
        domain: 'bills',
        entity: row.bill_number,
        message: `LegiScan dataset for session ${row.legiscan_session_id} contains no bill with legiscan_id ${row.legiscan_id}`,
      });
      continue;
    }

    checked += 1;

    if (norm(bill.number) && norm(bill.number) !== norm(row.bill_number)) {
      push(diffFinding('fail', 'bills', row.bill_number, 'bill_number', bill.number, row.bill_number));
    }

    if (norm(bill.title) && norm(bill.title) !== norm(row.title)) {
      push(diffFinding('warn', 'bills', row.bill_number, 'title', bill.title, row.title));
    }

    const lastAction = latestAction(bill);

    const expectedStatus = mapLegiScanBillStatus(
      bill.status,
      lastAction.action,
      Array.isArray(bill.history) ? bill.history : undefined,
    );
    const statusMismatch = !!expectedStatus && norm(expectedStatus) !== norm(row.status);
    if (statusMismatch) {
      push(diffFinding('fail', 'bills', row.bill_number, 'status', expectedStatus, row.status));
    }

    // last_action is reconstructed here from `getBill`'s history[], but the sync
    // stores it from `getMasterList`/`getSearch`, which phrases the *same* action
    // differently (e.g. "To: Interim Joint Committee on Appropriations and Revenue"
    // vs "to Appropriations & Revenue (H)"). A raw string diff therefore false-flags
    // on phrasing alone — see HB48 in the 2026-07-19 run. `status` (a `fail`, mapped
    // through the tolerant status mapper) is the reliable staleness signal; only
    // surface the last_action text as supporting context when status *also* diverged.
    if (statusMismatch && norm(lastAction.action) && norm(lastAction.action) !== norm(row.last_action)) {
      push(
        diffFinding('warn', 'bills', row.bill_number, 'last_action', lastAction.action, row.last_action),
      );
    }

    if (bill.url && !row.bill_text_url) {
      push({
        severity: 'warn',
        domain: 'bills',
        entity: row.bill_number,
        field: 'bill_text_url',
        message: 'LegiScan has a bill text URL but none is stored',
        expected: bill.url,
      });
    } else if (row.bill_text_url && !isAcceptableBillTextHost(row.bill_text_url)) {
      push({
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
      // KYvKY deliberately stores the official KY legislature record page. The
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
        push({
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
        push({
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

  console.log(
    `[audit:bills] ${checked} checked from ${corpus.sessionsLoaded.length} session dataset(s), ` +
      `${corpus.quotaCost} LegiScan quer${corpus.quotaCost === 1 ? 'y' : 'ies'} spent` +
      (skippedUncovered ? `, ${skippedUncovered} skipped (no dataset covering row)` : '') +
      (skippedFresherThanSnapshot ? `, ${skippedFresherThanSnapshot} skipped (row newer than snapshot)` : ''),
  );

  return summarizeResult('bills', checked, findings, started, { upstreamFailures });
}
