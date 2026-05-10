#!/usr/bin/env npx tsx
/**
 * POST one test message per Slack webhook (status-reports, errors, support).
 * Loads `.env.local` via scripts/load-env.ts — run from repo root.
 */
import './load-env';
import { runSlackSmokeTest } from '../src/lib/slack-webhook';

async function main() {
  const results = await runSlackSmokeTest({
    triggeredBy: 'scripts/slack-smoke-test.ts',
  });
  console.log(JSON.stringify(results, null, 2));
  const failed = results.some((r) => r.ok === false);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
