#!/usr/bin/env npx tsx
/**
 * Evaluate sync-source health from the CLI / GitHub Actions.
 *
 * Runs exactly the same evaluator as `GET /api/cron/health-check`
 * (`src/lib/source-health.ts`) against the same `ky_sources` rows, but from a
 * scheduler that does not depend on Vercel.
 *
 * Why a second caller: the Vercel cron is itself unmonitored — if it stops
 * firing, or `CRON_SECRET` is rotated and every request 401s, the endpoint goes
 * quiet and nothing notices, because the only thing that would have complained
 * *is* the thing that stopped. A GitHub Actions run evaluating the same data on
 * its own schedule closes that loop: whichever scheduler survives still reports.
 * Both paths share one evaluator, so they cannot disagree about what "healthy"
 * means.
 *
 * Usage:
 *   npx tsx scripts/check-source-health.ts
 *   npx tsx scripts/check-source-health.ts --json
 *   npx tsx scripts/check-source-health.ts --strict   # exit 1 on any breach
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 * Optional: SLACK_WEBHOOK_ERRORS / SLACK_WEBHOOK_URL, plus
 *           SLACK_SYNC_NOTIFY_CLI=true to actually post.
 *
 * Exit: 0 normally (breaches are reported, not fatal, so a late weekly sync does
 *       not fail a workflow); 1 on a breach only with `--strict`; 1 always when
 *       the DB itself is unreachable, which is a genuine operational failure.
 */
import './load-env';
import {
  evaluateSourceHealth,
  fetchSourceRows,
  formatSourceHealth,
  shouldAlertOnHealth,
  MONITORED_SOURCES,
  UNMONITORED_SOURCES,
} from '../src/lib/source-health';
import { markSlackErrorNotified, notifySourceHealthSlack } from '../src/lib/slack-webhook';

function parseArgs(argv: string[]) {
  return {
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
    /** Evaluate and print, but never post to Slack. */
    dryRun: argv.includes('--dry-run'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let rows;
  try {
    rows = await fetchSourceRows();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[source-health] could not read ky_sources: ${detail}`);
    // Unlike a stale source, this means we learned nothing at all — fail loudly.
    process.exit(1);
  }

  const health = evaluateSourceHealth(rows);
  const body = formatSourceHealth(health);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ...health,
          monitored: Object.keys(MONITORED_SOURCES),
          unmonitored: UNMONITORED_SOURCES,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(body);
    if (health.unknownSources.length > 0) {
      console.log(
        `\nUnregistered sources present in ky_sources: ${health.unknownSources.join(', ')}\n` +
          '(add them to MONITORED_SOURCES or UNMONITORED_SOURCES in src/lib/source-health.ts)',
      );
    }
  }

  if (!args.dryRun && health.breaches.length > 0) {
    // Edge-triggered on the same fingerprint the cron uses, so running both
    // schedulers does not double-page for one breach.
    if (await shouldAlertOnHealth(health)) {
      // `notifySourceHealthSlack` reports whether the post actually landed —
      // resolving successfully is not the same as being delivered, since the
      // underlying webhook call never throws.
      const delivered = await notifySourceHealthSlack(body).catch((e) => {
        console.error('[source-health] Slack notify failed:', e);
        return false;
      });
      if (!delivered) {
        console.error('[source-health] Slack post was not delivered — leaving the failure sentinel unset');
      }
      markSlackErrorNotified(delivered);
    } else {
      console.log('\n(breach set unchanged since the last alert — not re-posting)');
    }
  } else if (!args.dryRun) {
    // Clear the fingerprint on recovery so the next breach alerts again.
    await shouldAlertOnHealth(health).catch(() => {});
  }

  process.exit(args.strict && health.breaches.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
