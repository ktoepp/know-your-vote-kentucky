/**
 * Bills accuracy checker — recently-updated `ky_bills` vs LegiScan `getBill`.
 *
 * Diffs bill_number, title, status (recomputed via the same mapper the sync uses),
 * last_action, bill_text_url, and sponsor count. Bounded by ACCURACY_BILLS_LIMIT.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getKyLegiScanClient } from '../../ky-legiscan-client';
import { mapLegiScanBillStatus } from '../../map-legiscan-bill-status';
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
  updated_from_legiscan_at: string | null;
}

export async function checkBills(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];
  const sinceIso = new Date(Date.now() - cfg.lookbackDays * 86_400_000).toISOString();

  const { data, error } = await db
    .from('ky_bills')
    .select(
      'id, legiscan_id, bill_number, title, status, last_action, bill_text_url, sponsors, updated_from_legiscan_at',
    )
    .not('legiscan_id', 'is', null)
    .gte('updated_from_legiscan_at', sinceIso)
    .order('updated_from_legiscan_at', { ascending: false })
    .limit(cfg.billsLimit);

  if (error) {
    return summarizeResult('bills', 0, findings, started, { error: error.message });
  }

  const rows = (data ?? []) as BillRow[];
  if (rows.length === 0) {
    return summarizeResult('bills', 0, findings, started, {
      skipped: true,
      skipReason: `no bills updated in last ${cfg.lookbackDays}d`,
    });
  }

  const client = getKyLegiScanClient();
  let checked = 0;

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

    const expectedStatus = mapLegiScanBillStatus(bill.status, bill.last_action || '');
    if (expectedStatus && norm(expectedStatus) !== norm(row.status)) {
      findings.push(diffFinding('fail', 'bills', row.bill_number, 'status', expectedStatus, row.status));
    }

    if (norm(bill.last_action) && norm(bill.last_action) !== norm(row.last_action)) {
      findings.push(diffFinding('warn', 'bills', row.bill_number, 'last_action', bill.last_action, row.last_action));
    }

    if (bill.url && row.bill_text_url && bill.url !== row.bill_text_url) {
      findings.push(diffFinding('warn', 'bills', row.bill_number, 'bill_text_url', bill.url, row.bill_text_url));
    }

    const apiSponsors = Array.isArray(bill.sponsors) ? bill.sponsors.length : 0;
    const dbSponsors = Array.isArray(row.sponsors) ? (row.sponsors as unknown[]).length : 0;
    if (apiSponsors > 0 && apiSponsors !== dbSponsors) {
      findings.push(
        diffFinding('warn', 'bills', row.bill_number, 'sponsors', `${apiSponsors} sponsors`, `${dbSponsors} sponsors`),
      );
    }
  }

  return summarizeResult('bills', checked, findings, started);
}
