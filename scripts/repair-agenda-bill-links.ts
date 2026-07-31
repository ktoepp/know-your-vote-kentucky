/**
 * Re-resolve `bill_session_label` + `ky_bill_id` on stored ky_committee_agenda_items.
 *
 * Root cause: rows written before session inference landed stored a NULL
 * `bill_session_label`, so the bill lookup key missed and the line renders as
 * plain text instead of a link.
 *
 * Why not just re-sync those meetings: the LRC live calendar only publishes the
 * current week, so June/July meetings are unreachable without a Wayback pass —
 * and the calendar sync DELETEs a meeting's agenda rows before re-inserting, so
 * a partial capture destroys good rows. This pass re-derives the two broken
 * fields from the `raw_text` already stored, touching nothing else and deleting
 * nothing. It calls `deriveAgendaBillRef`, the same derivation the sync uses, so
 * the two cannot drift.
 *
 * It does NOT rewrite `raw_text`, `sort_order`, `item_kind`, or `depth` — a
 * disagreement there means the stored line itself is stale, which is a re-sync
 * question, not a repair one.
 *
 * DRY-RUN BY DEFAULT — pass --live to write. Every run prints the full plan,
 * including any row whose *existing* link would change (which wants a human
 * look, since something already resolved it differently).
 *
 * Usage:
 *   npm run repair:agenda-bill-links                    # dry-run, whole corpus
 *   npm run repair:agenda-bill-links -- --meeting=<id>  # scope to one meeting
 *   npm run repair:agenda-bill-links:live               # apply
 */
import './load-env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { deriveAgendaBillRef } from '../src/lib/ky-lrc-calendar-sync';
import {
  billSessionLookupKey,
  normalizeBillNumberForLookup,
  normalizeKySessionLabel,
} from '../src/lib/lrc-session-label';

const args = process.argv.slice(2);
const live = args.includes('--live');
const meetingFilter = args.find((a) => a.startsWith('--meeting='))?.slice('--meeting='.length);

/** Bill-request numbers are pre-filed drafts with no ky_bills row by design. */
const BILL_REQUEST_PREFIX = 'BR ';

interface AgendaRow {
  id: string;
  meeting_id: string;
  raw_text: string;
  bill_number: string | null;
  bill_session_label: string | null;
  ky_bill_id: string | null;
  ky_committee_meetings: { meeting_date: string | null } | null;
}

interface Plan {
  row: AgendaRow;
  meetingDate: string | null;
  nextSession: string | null;
  nextBillId: string | null;
  kind:
    | 'newly-resolved'
    | 'link-changed'
    | 'still-unresolved'
    | 'underivable'
    | 'unchanged';
}

async function fetchAgendaRows(db: SupabaseClient): Promise<AgendaRow[]> {
  const out: AgendaRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = db
      .from('ky_committee_agenda_items')
      .select('id, meeting_id, raw_text, bill_number, bill_session_label, ky_bill_id, ky_committee_meetings(meeting_date)')
      .not('bill_number', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (meetingFilter) q = q.eq('meeting_id', meetingFilter);

    const { data, error } = await q;
    if (error) {
      console.error('Fetch failed:', error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as unknown as AgendaRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** Resolve (bill number, session) → ky_bills.id for every pair the plan needs. */
async function resolveBillIds(
  db: SupabaseClient,
  pairs: Array<{ billNumber: string; sessionLabel: string | null }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const bySession = new Map<string, Set<string>>();
  for (const p of pairs) {
    const sess = normalizeKySessionLabel(p.sessionLabel);
    if (!bySession.has(sess)) bySession.set(sess, new Set());
    bySession.get(sess)!.add(normalizeBillNumberForLookup(p.billNumber));
  }

  for (const [sessionLabel, numbers] of bySession) {
    const nums = [...numbers];
    for (let i = 0; i < nums.length; i += 200) {
      const chunk = nums.slice(i, i + 200);
      let query = db.from('ky_bills').select('id, bill_number, session').in('bill_number', chunk);
      if (sessionLabel) query = query.ilike('session', sessionLabel);
      const { data, error } = await query.limit(1000);
      if (error) {
        console.error(`Bill resolve failed (${sessionLabel || 'any session'}): ${error.message}`);
        continue;
      }
      for (const row of (data ?? []) as { id: string; bill_number: string; session: string }[]) {
        out.set(billSessionLookupKey(row.bill_number, row.session), row.id);
      }
    }
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }
  const db = createClient(url, key);

  const rows = await fetchAgendaRows(db);
  const candidates = rows.filter(
    (r) => !(r.bill_number ?? '').trim().toUpperCase().startsWith(BILL_REQUEST_PREFIX),
  );
  console.log(
    `[repair] ${rows.length} agenda row(s) naming a bill` +
      ` (${rows.length - candidates.length} BR bill-request row(s) excluded by design)` +
      `${meetingFilter ? ` — meeting ${meetingFilter}` : ''}${live ? '' : ' — DRY RUN (no writes)'}`,
  );

  const derived = candidates.map((row) => {
    const meetingDate = row.ky_committee_meetings?.meeting_date ?? null;
    return { row, meetingDate, ref: deriveAgendaBillRef(row.raw_text, meetingDate) };
  });

  const billIds = await resolveBillIds(
    db,
    derived
      .filter((d) => d.ref.bill_number)
      .map((d) => ({ billNumber: d.ref.bill_number!, sessionLabel: d.ref.bill_session_label })),
  );

  const plans: Plan[] = derived.map(({ row, meetingDate, ref }) => {
    const nextBillId = ref.billLookupKey ? billIds.get(ref.billLookupKey) ?? null : null;

    // `raw_text` is stored title-cased for display (normalizeKyGaAgendaLine), so a
    // line LRC sent in ALL CAPS reads back as "2025 Rs Sb 253" — which the
    // case-sensitive bill patterns cannot match. The original casing is gone, so
    // re-derivation legitimately finds no bill on rows the sync resolved fine at
    // write time from the raw HTML. Never let that look like a reason to clear
    // one: this pass only ever fills in or corrects, it does not erase.
    if (!ref.bill_number && row.bill_number) {
      return { row, meetingDate, nextSession: row.bill_session_label, nextBillId: row.ky_bill_id, kind: 'underivable' };
    }

    const kind: Plan['kind'] =
      nextBillId && !row.ky_bill_id
        ? 'newly-resolved'
        : nextBillId && row.ky_bill_id && nextBillId !== row.ky_bill_id
          ? 'link-changed'
          : !nextBillId && !row.ky_bill_id
            ? 'still-unresolved'
            : 'unchanged';
    return { row, meetingDate, nextSession: ref.bill_session_label, nextBillId, kind };
  });

  const writable = plans.filter(
    (p) =>
      p.kind !== 'unchanged' &&
      p.kind !== 'underivable' &&
      (p.nextBillId !== p.row.ky_bill_id ||
        normalizeKySessionLabel(p.nextSession) !==
          normalizeKySessionLabel(p.row.bill_session_label)),
  );

  const byKind = (k: Plan['kind']) => plans.filter((p) => p.kind === k);

  for (const p of byKind('newly-resolved')) {
    console.log(
      `  RESOLVE   ${p.meetingDate} ${p.row.bill_number} → session=${p.nextSession} | ${p.row.raw_text.slice(0, 72)}`,
    );
  }
  for (const p of byKind('link-changed')) {
    console.log(
      `  ** CHANGED LINK ** ${p.meetingDate} ${p.row.bill_number}: ${p.row.ky_bill_id} → ${p.nextBillId}` +
        ` (session ${p.row.bill_session_label} → ${p.nextSession}) | ${p.row.raw_text.slice(0, 72)}`,
    );
  }
  for (const p of byKind('still-unresolved')) {
    console.log(
      `  unresolved ${p.meetingDate} ${p.row.bill_number} (session=${p.nextSession}) — no ky_bills row | ${p.row.raw_text.slice(0, 60)}`,
    );
  }

  for (const p of byKind('underivable')) {
    console.log(
      `  skip      ${p.meetingDate} ${p.row.bill_number} — stored line is case-normalized, left as-is | ${p.row.raw_text.slice(0, 60)}`,
    );
  }

  console.log(
    `\n[repair] newly-resolved=${byKind('newly-resolved').length}` +
      ` link-changed=${byKind('link-changed').length}` +
      ` still-unresolved=${byKind('still-unresolved').length}` +
      ` underivable-skipped=${byKind('underivable').length}` +
      ` unchanged=${byKind('unchanged').length}` +
      ` | ${writable.length} row(s) would be written`,
  );

  if (byKind('link-changed').length > 0) {
    console.log(
      '\n[repair] Rows marked ** CHANGED LINK ** already pointed somewhere else.\n' +
        '        Re-read those lines before applying — a changed link is a correction OR a regression.',
    );
  }

  if (!live) {
    console.log('\n[repair] Dry run — nothing written. Re-run with --live to apply.');
    return;
  }

  let written = 0;
  for (const p of writable) {
    const { error } = await db
      .from('ky_committee_agenda_items')
      .update({ bill_session_label: p.nextSession, ky_bill_id: p.nextBillId })
      .eq('id', p.row.id);
    if (error) {
      console.error(`  update failed (${p.row.id}): ${error.message}`);
      continue;
    }
    written++;
  }
  console.log(`[repair] wrote ${written}/${writable.length} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
