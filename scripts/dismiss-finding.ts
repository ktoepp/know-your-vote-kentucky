#!/usr/bin/env npx tsx
/**
 * Manage accepted-noise fingerprints for the accuracy audit.
 *
 * Every audit finding carries a stable fingerprint (see history.ts). A row in
 * `ky_accuracy_dismissed_findings` tells the audit to filter that fingerprint
 * out of the digest, the history write, and the LLM triage — so a known-good
 * "advisory drift" stops burying real regressions in the weekly report.
 *
 * The fingerprint to dismiss is best copied from a recent digest (or queried
 * from `ky_accuracy_findings`). Every dismissal takes a short `--reason` so
 * the list stays readable; a longer `--note` and an optional `--expires-at`
 * are recorded when supplied.
 *
 * Usage:
 *   npx tsx scripts/dismiss-finding.ts list
 *   npx tsx scripts/dismiss-finding.ts add <fingerprint> --reason=<slug> \
 *     [--note="..."] [--expires-at=2026-12-31]
 *   npx tsx scripts/dismiss-finding.ts remove <fingerprint>
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 *
 * Exit: 0 on success, 1 on bad args / DB error.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

interface AddArgs {
  fingerprint: string;
  reason: string;
  note: string | null;
  expiresAt: string | null;
  addedBy: string | null;
}

function parseAddArgs(argv: string[]): AddArgs | { error: string } {
  const fingerprint = argv[0];
  if (!fingerprint || fingerprint.startsWith('--')) return { error: 'missing fingerprint' };
  const rest = argv.slice(1);
  const flag = (name: string) => rest.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
  const reason = flag('reason');
  if (!reason) return { error: 'missing --reason=<slug>' };
  return {
    fingerprint,
    reason,
    note: flag('note'),
    expiresAt: flag('expires-at'),
    addedBy: flag('added-by'),
  };
}

async function main(): Promise<void> {
  const db = supabaseAdmin;
  if (!db) {
    console.error('Supabase admin client unavailable. Set SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(1);
  }

  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'list') {
    const { data, error } = await db
      .from('ky_accuracy_dismissed_findings')
      .select('fingerprint, reason, note, added_by, dismissed_at, expires_at')
      .order('dismissed_at', { ascending: false });
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) {
      console.log('No dismissals recorded.');
      return;
    }
    for (const row of data) {
      const exp = row.expires_at ? ` (expires ${String(row.expires_at).slice(0, 10)})` : '';
      const by = row.added_by ? ` — ${row.added_by}` : '';
      console.log(`${row.fingerprint}  ${row.reason}${by}${exp}`);
      if (row.note) console.log(`  ${row.note}`);
    }
    return;
  }

  if (cmd === 'add') {
    const args = parseAddArgs(rest);
    if ('error' in args) {
      console.error(`dismiss-finding add: ${args.error}`);
      console.error('Usage: dismiss-finding add <fingerprint> --reason=<slug> [--note="..."] [--expires-at=YYYY-MM-DD] [--added-by=<who>]');
      process.exit(1);
    }
    const { error } = await db.from('ky_accuracy_dismissed_findings').upsert(
      {
        fingerprint: args.fingerprint,
        reason: args.reason,
        note: args.note,
        added_by: args.addedBy,
        expires_at: args.expiresAt,
      },
      { onConflict: 'fingerprint' },
    );
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    console.log(`Dismissed ${args.fingerprint} (${args.reason}).`);
    return;
  }

  if (cmd === 'remove') {
    const fingerprint = rest[0];
    if (!fingerprint) {
      console.error('Usage: dismiss-finding remove <fingerprint>');
      process.exit(1);
    }
    const { error } = await db
      .from('ky_accuracy_dismissed_findings')
      .delete()
      .eq('fingerprint', fingerprint);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    console.log(`Removed dismissal for ${fingerprint}.`);
    return;
  }

  console.error('Usage: dismiss-finding {list | add <fingerprint> --reason=<slug> [--note=…] [--expires-at=YYYY-MM-DD] | remove <fingerprint>}');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
