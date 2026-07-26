#!/usr/bin/env npx tsx
/**
 * Curate ky_bills.editorial_popular_names — the human-vetted media / advocacy names
 * for a bill (e.g. "the bathroom bill"), shown as "Also called" on the bill page and
 * matched in search (migration 043). This editorial gate IS the neutrality control:
 * add only names actually used in coverage; never invent or editorialize. Official
 * short titles come from the LRC sync (official_short_titles) and are NOT touched here.
 *
 *   npx tsx scripts/set-bill-popular-name.ts --bill=HB5 --session="2025 Regular Session" --add="Safer Kentucky Act"
 *   npx tsx scripts/set-bill-popular-name.ts --bill=HB5 --session="2025 Regular Session" --remove="Safer Kentucky Act"
 *   npx tsx scripts/set-bill-popular-name.ts --bill=HB5 --session="2025 Regular Session" --list
 *   npx tsx scripts/set-bill-popular-name.ts --bill=HB5 --session="2025 Regular Session" --clear
 *
 * One name per run (names can contain commas, so the value is never split). Add is
 * idempotent and case-insensitively de-duplicated; order of addition is preserved.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getCivicDataSessionName } from '../src/lib/ky-sessions';

function argVal(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a ? (a.split(/=(.*)/s)[1] ?? '').trim() : null;
}

const billArg = argVal('--bill');
const BILL = billArg ? billArg.toUpperCase().replace(/\s+/g, '') : null;
const SESSION = argVal('--session');
const ADD = argVal('--add');
const REMOVE = argVal('--remove');
const LIST = process.argv.includes('--list');
const CLEAR = process.argv.includes('--clear');

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!BILL) throw new Error('Missing --bill=HB5');

  const actions = [ADD, REMOVE, LIST ? '--list' : null, CLEAR ? '--clear' : null].filter(Boolean);
  if (actions.length !== 1) {
    throw new Error('Pass exactly one of --add="…", --remove="…", --list, or --clear');
  }

  const sessionName = SESSION ?? getCivicDataSessionName();

  const { data: rows, error } = await db
    .from('ky_bills')
    .select('id, bill_number, session, editorial_popular_names')
    .eq('bill_number', BILL)
    .eq('session', sessionName);
  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error(`No bill ${BILL} in session "${sessionName}"`);
  if (rows.length > 1) throw new Error(`Ambiguous: ${rows.length} rows for ${BILL} in "${sessionName}"`);

  const row = rows[0];
  const current: string[] = row.editorial_popular_names ?? [];

  if (LIST) {
    console.log(
      current.length
        ? `editorial_popular_names on ${row.bill_number} (${sessionName}):\n  ${current.map((n) => `"${n}"`).join('\n  ')}`
        : `No editorial_popular_names on ${row.bill_number} (${sessionName}).`,
    );
    return;
  }

  let next: string[] | null;
  if (CLEAR) {
    next = null;
  } else if (ADD) {
    if (current.some((n) => n.toLowerCase() === ADD.toLowerCase())) {
      console.log(`"${ADD}" already present on ${row.bill_number} — no change.`);
      return;
    }
    next = [...current, ADD];
  } else {
    // REMOVE
    const filtered = current.filter((n) => n.toLowerCase() !== REMOVE!.toLowerCase());
    if (filtered.length === current.length) {
      console.log(`"${REMOVE}" not found on ${row.bill_number} — no change.`);
      return;
    }
    next = filtered.length ? filtered : null;
  }

  const { error: uErr } = await db
    .from('ky_bills')
    .update({ editorial_popular_names: next })
    .eq('id', row.id);
  if (uErr) throw new Error(uErr.message);

  console.log(
    `Updated editorial_popular_names on ${row.bill_number} (${sessionName}):\n  ${
      next?.length ? next.map((n) => `"${n}"`).join('\n  ') : '(none)'
    }`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
