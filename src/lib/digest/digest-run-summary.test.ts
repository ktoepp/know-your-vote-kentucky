import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatDigestRunSummary } from './digest-run-summary';

describe('digest run summary', () => {
  test('reports counts for a run with nothing to send', () => {
    const line = formatDigestRunSummary(
      { ok: true, dryRun: false, usersConsidered: 4, emailsSent: 0, skippedNoEvents: 4, errors: [] },
      1234.6,
    );
    assert.equal(
      line,
      '[cron/notify] done ok=true dryRun=false usersConsidered=4 emailsSent=0 skippedNoEvents=4 errors=0 durationMs=1235',
    );
  });

  test('counts errors without printing them, and includes the trim count when present', () => {
    const line = formatDigestRunSummary(
      {
        ok: true,
        dryRun: false,
        usersConsidered: 2,
        emailsSent: 1,
        skippedNoEvents: 0,
        errors: ['No email for user 8f1c-secret-id'],
        logRowsTrimmed: 3,
      },
      50,
    );
    assert.ok(line.includes('errors=1'));
    assert.ok(line.includes('logRowsTrimmed=3'));
    assert.ok(!line.includes('secret-id'));
  });

  test('marks dry runs and clamps a negative duration to zero', () => {
    const line = formatDigestRunSummary(
      { ok: true, dryRun: true, usersConsidered: 1, emailsSent: 0, skippedNoEvents: 1, errors: [] },
      -5,
    );
    assert.ok(line.includes('dryRun=true'));
    assert.ok(line.endsWith('durationMs=0'));
  });
});
