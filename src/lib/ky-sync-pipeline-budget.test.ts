import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBudgetSkipResult } from './ky-sync-pipeline';
import { LegiscanRejectedError } from './ky-legiscan-client';
import { LegiscanQuotaHoldError } from './legiscan-quota';
import { LegiscanRunBudgetError, isLegiscanStopError } from './legiscan-run-budget';

// Seam tests only: dryRun keeps runBudgetSkipResult away from the database,
// and nothing here calls LegiScan.

test('runBudgetSkipResult with dryRun returns skipped with the exhausted message', async () => {
  const err = new LegiscanRunBudgetError({
    budget: 10,
    spent: 10,
    caller: 'sync-votes',
    reason: 'exhausted',
  });
  const result = await runBudgetSkipResult('votes', err, Date.now(), { dryRun: true });
  assert.ok(result);
  assert.equal(result.source, 'votes');
  assert.equal(result.status, 'skipped');
  assert.equal(result.itemsSynced, 0);
  assert.equal(result.error, 'LegiScan run budget reached (spent 10 of 10)');
});

test('runBudgetSkipResult with dryRun returns skipped with the no-budget message', async () => {
  const err = new LegiscanRunBudgetError({
    budget: 0,
    spent: 0,
    caller: 'sync-legislator-bios',
    reason: 'no-budget',
  });
  const result = await runBudgetSkipResult('legislator-bios', err, Date.now(), { dryRun: true });
  assert.equal(result?.status, 'skipped');
  assert.equal(
    result?.error,
    'No LegiScan budget for caller "sync-legislator-bios": pass --budget=N (see docs/data-budget.md)',
  );
});

test('runBudgetSkipResult returns null for any other error', async () => {
  const opts = { dryRun: true };
  assert.equal(await runBudgetSkipResult('bills', new Error('boom'), Date.now(), opts), null);
  assert.equal(
    await runBudgetSkipResult('bills', new LegiscanQuotaHoldError('hold', null), Date.now(), opts),
    null,
  );
});

test('isLegiscanStopError: true for quota holds and run-budget errors, false for rejections', () => {
  assert.equal(isLegiscanStopError(new LegiscanQuotaHoldError('hold', null)), true);
  assert.equal(
    isLegiscanStopError(
      new LegiscanRunBudgetError({ budget: 1, spent: 1, caller: 'x', reason: 'exhausted' }),
    ),
    true,
  );
  assert.equal(isLegiscanStopError(new LegiscanRejectedError('getBill', 'LegiScan: bad id')), false);
  assert.equal(isLegiscanStopError(new Error('timeout of 60000ms exceeded')), false);
  assert.equal(isLegiscanStopError('not an error'), false);
});
