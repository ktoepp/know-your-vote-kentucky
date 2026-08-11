/**
 * Votes accuracy checker — a seeded random sample of `ky_votes` roll calls vs
 * LegiScan `getRollCall`.
 *
 * Re-fetches each roll call by `roll_call_id` and compares the authoritative
 * yea/nay/absent summary to the stored counts, and tallies the stored per-member
 * `roll_call` rows against that summary (reusing `legiscan-vote-tally` helpers).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getKyLegiScanClient } from '../../ky-legiscan-client';
import {
  mismatchesAgainstRollCallSummary,
  tallyRollCallVoteRows,
} from '../../legiscan-vote-tally';
import { sampleTable } from '../sampling';
import {
  diffFinding,
  errorMessage,
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
  ky_bills: { bill_number: string | null } | { bill_number: string | null }[] | null;
}

function billLabel(row: VoteRow): string {
  const b = Array.isArray(row.ky_bills) ? row.ky_bills[0] : row.ky_bills;
  const num = b?.bill_number?.trim();
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
        'id, roll_call_id, date, description, yea_count, nay_count, absent_count, nv_count, roll_call, ky_bills ( bill_number )',
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

  const client = getKyLegiScanClient();
  let checked = 0;
  let upstreamFailures = 0;

  for (const row of rows) {
    const label = billLabel(row);

    if (row.roll_call_id == null) {
      findings.push({
        severity: 'warn',
        domain: 'votes',
        entity: label,
        message: 'stored vote has no roll_call_id; cannot verify against LegiScan',
      });
      continue;
    }

    let rc;
    try {
      rc = await client.fetchRollCall(row.roll_call_id);
    } catch (e) {
      findings.push({
        severity: 'warn',
        domain: 'votes',
        entity: label,
        message: `LegiScan getRollCall failed: ${errorMessage(e)}`,
      });
      upstreamFailures += 1;
      continue;
    }

    if (!rc) {
      findings.push({
        severity: 'fail',
        domain: 'votes',
        entity: label,
        message: `LegiScan returned no roll call for id ${row.roll_call_id}`,
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

  return summarizeResult('votes', checked, findings, started, { upstreamFailures });
}
