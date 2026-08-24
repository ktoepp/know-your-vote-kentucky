/**
 * Votes accuracy checker — a seeded random sample of `ky_votes` roll calls vs
 * the LegiScan bulk dataset for the sessions that sample lands in.
 *
 * Compares the authoritative yea/nay/absent summary to the stored counts, and
 * tallies the stored per-member `roll_call` rows against that summary (reusing
 * `legiscan-vote-tally` helpers).
 *
 * The reference used to be one `getRollCall` per sampled row. It is now the
 * session dataset, which the bills checker has usually already paid for, so
 * this checker's marginal quota cost is typically zero.
 *
 * Freshness works differently here than for bills. `ky_votes` has no
 * `updated_at`, but a recorded roll call is immutable — a past vote does not
 * change. The failure mode is therefore not drift but a roll call that is too
 * *new* to be in a weekly snapshot, which is why a miss is only a finding when
 * the vote predates the snapshot date.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { type LegiScanVote } from '../../ky-legiscan-client';
import { loadDatasetCorpus, rankSessionsByRowCount } from '../legiscan-dataset-corpus';
import {
  mismatchesAgainstRollCallSummary,
  tallyRollCallVoteRows,
} from '../../legiscan-vote-tally';
import { sampleTable } from '../sampling';
import {
  diffFinding,
  summarizeResult,
  terminalResultFrom,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';

interface StoredRollCallEntry {
  legislator_id?: string;
  vote?: string | null;
}

interface VoteRow {
  id: string;
  roll_call_id: number | null;
  date: string | null;
  description: string | null;
  yea_count: number | null;
  nay_count: number | null;
  absent_count: number | null;
  /** NULL on rows synced before migration 035 (see the nv_count check below). */
  nv_count: number | null;
  roll_call: StoredRollCallEntry[] | null;
  ky_bills:
    | { bill_number: string | null; legiscan_session_id: number | null }
    | { bill_number: string | null; legiscan_session_id: number | null }[]
    | null;
}

/** The joined bill row, which PostgREST returns as an object or a one-element array. */
function joinedBill(row: VoteRow): { bill_number: string | null; legiscan_session_id: number | null } | null {
  return (Array.isArray(row.ky_bills) ? row.ky_bills[0] : row.ky_bills) ?? null;
}

function billLabel(row: VoteRow): string {
  const num = joinedBill(row)?.bill_number?.trim();
  return num ? `${num} (RC ${row.roll_call_id})` : `RC ${row.roll_call_id ?? '?'}`;
}

export async function checkVotes(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  let rows: VoteRow[];
  try {
    rows = await sampleTable<VoteRow>(db, {
      table: 'ky_votes',
      select:
        'id, roll_call_id, date, description, yea_count, nay_count, absent_count, nv_count, roll_call, ky_bills ( bill_number, legiscan_session_id )',
      seed: cfg.seed,
      limit: cfg.votesLimit,
      filter: (q) => q.not('roll_call_id', 'is', null),
    });
  } catch (e) {
    return terminalResultFrom('votes', 'Supabase', e, started, { crashPrefix: 'sample query failed' });
  }

  if (rows.length === 0) {
    return summarizeResult('votes', 0, findings, started, {
      skipped: true,
      skipReason: 'no roll calls with roll_call_id to sample',
    });
  }

  // One dataset per session, capped the same way as the bills checker. The
  // bills checker usually ran first and its sessions are already cached, so
  // this is often 0 extra queries.
  const sessionsToLoad = rankSessionsByRowCount(
    rows.map((r) => joinedBill(r)?.legiscan_session_id),
    cfg.datasetSessionLimit,
  );
  let corpus;
  try {
    corpus = await loadDatasetCorpus(sessionsToLoad);
  } catch (e) {
    return terminalResultFrom('votes', 'LegiScan', e, started, { crashPrefix: 'dataset list failed' });
  }

  const unavailableSessions = new Map(corpus.sessionsUnavailable.map((u) => [u.sessionId, u.reason]));
  let checked = 0;
  let upstreamFailures = 0;
  let skippedUncovered = 0;
  let skippedNewerThanSnapshot = 0;

  for (const row of rows) {
    const label = billLabel(row);
    const sessionId = joinedBill(row)?.legiscan_session_id ?? null;

    if (row.roll_call_id == null) {
      findings.push({
        severity: 'warn',
        domain: 'votes',
        entity: label,
        message: 'stored vote has no roll_call_id; cannot verify against LegiScan',
      });
      continue;
    }

    // Same rule as the bills checker: no covering dataset means no reference,
    // so skip rather than judge. Only a real load failure is an upstream
    // failure; falling outside the session cap is our own budgeting.
    if (sessionId == null || !corpus.snapshotDateBySession.has(sessionId)) {
      skippedUncovered += 1;
      if (sessionId != null && unavailableSessions.has(sessionId)) upstreamFailures += 1;
      continue;
    }

    const rc = corpus.rollCallsById.get(row.roll_call_id) as LegiScanVote | undefined;

    if (!rc) {
      // A roll call taken after the snapshot was cut is legitimately absent
      // from it. Only treat a miss as a discrepancy when the vote predates the
      // snapshot and therefore should have been included.
      const snapshot = corpus.snapshotDateBySession.get(sessionId);
      const voteAfterSnapshot =
        !!snapshot && !!row.date && Date.parse(row.date) > Date.parse(`${snapshot}T23:59:59Z`);
      if (voteAfterSnapshot) {
        skippedNewerThanSnapshot += 1;
        continue;
      }
      findings.push({
        severity: 'fail',
        domain: 'votes',
        entity: label,
        message: `LegiScan dataset for session ${sessionId} contains no roll call with id ${row.roll_call_id}`,
      });
      continue;
    }

    checked += 1;

    if (Number(row.yea_count ?? 0) !== rc.yea) {
      findings.push(diffFinding('fail', 'votes', label, 'yea_count', String(rc.yea), String(row.yea_count ?? 0)));
    }
    if (Number(row.nay_count ?? 0) !== rc.nay) {
      findings.push(diffFinding('fail', 'votes', label, 'nay_count', String(rc.nay), String(row.nay_count ?? 0)));
    }
    if (Number(row.absent_count ?? 0) !== rc.absent) {
      findings.push(
        diffFinding('warn', 'votes', label, 'absent_count', String(rc.absent), String(row.absent_count ?? 0)),
      );
    }

    // nv_count is rendered as the "NV" chip on bill detail (ky-bill-detail-server.ts),
    // so a wrong value is user-visible — but it is only *populated* for rows synced
    // after migration 035. Older rows are NULL, which means "not yet backfilled",
    // not "zero NV votes": comparing them would flag the entire pre-035 corpus as a
    // mismatch. Skip NULL and only diff rows that actually carry a stored value.
    // Severity mirrors absent_count (`warn`): NV/absent are the soft half of the
    // tally — advisory drift, not a wrong pass/fail outcome for the bill.
    if (row.nv_count != null && Number(row.nv_count) !== rc.nv) {
      findings.push(
        diffFinding('warn', 'votes', label, 'nv_count', String(rc.nv), String(row.nv_count)),
      );
    }

    if (Array.isArray(row.roll_call) && row.roll_call.length > 0) {
      const tally = tallyRollCallVoteRows(row.roll_call.map((r) => ({ vote_text: r.vote })));
      const issues = mismatchesAgainstRollCallSummary(tally, {
        yea: rc.yea,
        nay: rc.nay,
        nv: rc.nv,
        absent: rc.absent,
      });
      for (const issue of issues) {
        findings.push({
          severity: 'fail',
          domain: 'votes',
          entity: label,
          field: 'roll_call',
          message: `stored per-member rows disagree with LegiScan summary — ${issue}`,
        });
      }
    }
  }

  console.log(
    `[audit:votes] ${checked} checked from ${corpus.sessionsLoaded.length} session dataset(s), ` +
      `${corpus.quotaCost} LegiScan quer${corpus.quotaCost === 1 ? 'y' : 'ies'} spent` +
      (skippedUncovered ? `, ${skippedUncovered} skipped (no dataset covering row)` : '') +
      (skippedNewerThanSnapshot ? `, ${skippedNewerThanSnapshot} skipped (vote newer than snapshot)` : ''),
  );

  return summarizeResult('votes', checked, findings, started, { upstreamFailures });
}
