#!/usr/bin/env npx tsx
/**
 * Set (or clear) ky_bills.editor_notes — the editor-verified facts channel that
 * feeds the AI summary prompt and its input hash (migration 038, FEEDBACK.md #4).
 *
 *   npx tsx scripts/set-bill-editor-note.ts --bill=HB904 --session="2026 Regular Session" \
 *     --note="Verified against 2026 Ky. Acts ch. 184, Section 29 (KRS 238.538): ..."
 *   npx tsx scripts/set-bill-editor-note.ts --bill=HB904 --session="2026 Regular Session" --clear
 *
 * RULES: verified facts ONLY, checked against the official bill/act text, section cited.
 * Never analysis, speculation, or advocacy. Log provenance in FEEDBACK.md / decisions.md.
 *
 * After setting a note, regenerate the summary:
 *   npm run backfill:bill-summaries -- --bill=HB904 --session="2026 Regular Session" --dry-run
 * then rerun without --dry-run once the output looks right. (Without a manual run, the
 * next sync-cron backfill pass also picks it up via the input-hash change.)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getCivicDataSessionName } from '../src/lib/ky-sessions';

const billArg = process.argv.find((a) => a.startsWith('--bill='));
const BILL = billArg ? (billArg.split('=')[1] ?? '').toUpperCase().replace(/\s+/g, '') : null;
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] ?? '' : null;
const noteArg = process.argv.find((a) => a.startsWith('--note='));
const NOTE = noteArg ? (noteArg.split(/=(.*)/s)[1] ?? '').trim() : null;
const CLEAR = process.argv.includes('--clear');

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!BILL) throw new Error('Missing --bill=HB904');
  if (!CLEAR && !NOTE) throw new Error('Missing --note="..." (or pass --clear to remove the note)');
  if (CLEAR && NOTE) throw new Error('Pass either --note or --clear, not both');

  const sessionName = SESSION ?? getCivicDataSessionName();

  const { data: rows, error } = await db
    .from('ky_bills')
    .select('id, bill_number, session, editor_notes')
    .eq('bill_number', BILL)
    .eq('session', sessionName);
  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error(`No bill ${BILL} in session "${sessionName}"`);
  if (rows.length > 1) throw new Error(`Ambiguous: ${rows.length} rows for ${BILL} in "${sessionName}"`);

  const row = rows[0];
  if (row.editor_notes) {
    console.log(`Existing note on ${row.bill_number} (will be replaced):\n  ${row.editor_notes}\n`);
  }

  const { error: uErr } = await db
    .from('ky_bills')
    .update({
      editor_notes: CLEAR ? null : NOTE,
      editor_notes_updated_at: CLEAR ? null : new Date().toISOString(),
    })
    .eq('id', row.id);
  if (uErr) throw new Error(uErr.message);

  console.log(
    CLEAR
      ? `Cleared editor_notes on ${row.bill_number} (${sessionName}).`
      : `Set editor_notes on ${row.bill_number} (${sessionName}):\n  ${NOTE}`,
  );
  console.log(
    `\nNext: npm run backfill:bill-summaries -- --bill=${BILL} --session="${sessionName}" --dry-run`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
