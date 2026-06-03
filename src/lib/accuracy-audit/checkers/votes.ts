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
  summarizeResult,
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
        'id, roll_call_id, date, description, yea_count, nay_count, absent_count, roll_call, ky_bills ( bill_number )',
      seed: cfg.seed,
      limit: cfg.votesLimit,
      filter: (q) => q.not('roll_call_id', 'is', null),
    });
  } catch (e) {
    return summarizeResult('votes', 0, findings, started, {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  if (rows.length === 0) {
    return summarizeResult('votes', 0, findings, started, {
      skipped: true,
      skipReason: 'no roll calls with roll_call_id to sample',
    });
  }

  const client = getKyLegiScanClient();
  let checked = 0;

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
        message: `LegiScan getRollCall failed: ${e instanceof Error ? e.message : String(e)}`,
      });
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

  return summarizeResult('votes', checked, findings, started);
}
