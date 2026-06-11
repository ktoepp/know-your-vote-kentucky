#!/usr/bin/env npx tsx
/**
 * Re-fetch LegiScan bill detail and recompute `status` + `last_action` from
 * `history[]` using the current mapper. Use after mapper fixes when hash-gated
 * sync skips unchanged bills (change_hash unchanged on LegiScan side).
 *
 *   npm run refresh:bill-status:dry
 *   npm run refresh:bill-status
 *   npm run refresh:bill-status -- --session="2026 Regular Session"
 *   npm run refresh:bill-status -- --limit=100
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { getKyLegiScanClient, type LegiScanBillDetail, type LegiScanHistoryEntry } from '../src/lib/ky-legiscan-client';
import { mapLegiScanBillStatus } from '../src/lib/map-legiscan-bill-status';

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg?.split('=')[1] ?? '2026 Regular Session';

function latestAction(bill: LegiScanBillDetail): { action: string; date: string | null } {
  if (bill.last_action) {
    return { action: bill.last_action, date: bill.last_action_date || null };
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
    if (tNew >= tCur) latest = h;
  }
  return { action: latest?.action ?? '', date: latest?.date ?? null };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }

  const db = createClient(url, key);
  const client = getKyLegiScanClient();
  const PAGE = 500;
  let from = 0;
  let scanned = 0;
  let updated = 0;
  const samples: string[] = [];

  for (;;) {
    if (scanned >= LIMIT) break;
    const { data, error } = await db
      .from('ky_bills')
      .select('id, bill_number, session, status, last_action, last_action_date, legiscan_id')
      .eq('session', SESSION)
      .not('legiscan_id', 'is', null)
      .order('bill_number', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (scanned >= LIMIT) break;
      scanned += 1;
      const legiscanId = Number(row.legiscan_id);
      if (!Number.isFinite(legiscanId)) continue;

      let detail;
      try {
        detail = await client.fetchBillDetail(legiscanId);
      } catch (e) {
        console.error(`${row.bill_number}: fetch failed — ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      if (!detail) continue;

      const last = latestAction(detail);
      const nextStatus = mapLegiScanBillStatus(Number(detail.status) || 0, last.action);
      const nextAction = last.action || null;
      const nextActionDate = last.date || detail.last_action_date || null;

      const statusChanged = (row.status ?? '') !== nextStatus;
      const actionChanged = (row.last_action ?? '') !== (nextAction ?? '');
      if (!statusChanged && !actionChanged) continue;

      updated += 1;
      if (samples.length < 20) {
        samples.push(
          `${row.bill_number}: status ${JSON.stringify(row.status)} → ${JSON.stringify(nextStatus)}` +
            (actionChanged ? `; last_action updated` : ''),
        );
      }

      if (!DRY_RUN) {
        const { error: uErr } = await db
          .from('ky_bills')
          .update({
            status: nextStatus,
            last_action: nextAction,
            last_action_date: nextActionDate,
            updated_from_legiscan_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        if (uErr) console.error(`${row.bill_number}: update failed — ${uErr.message}`);
      }
    }

    from += PAGE;
  }

  if (samples.length > 0) {
    console.log('Sample updates:');
    console.log(samples.join('\n'));
  }
  console.log(`\nscanned=${scanned} updated=${updated} ${DRY_RUN ? '[DRY RUN]' : '[APPLIED]'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
