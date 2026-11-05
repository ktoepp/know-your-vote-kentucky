import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTIFICATION_LOG_RETENTION_DAYS,
  retentionCutoff,
  shouldTrimLog,
} from './notification-log-retention';

describe('notification log retention', () => {
  test('keeps rows for 365 days, as /privacy promises', () => {
    assert.equal(NOTIFICATION_LOG_RETENTION_DAYS, 365);
  });

  test('retentionCutoff is 365 days before now', () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    assert.equal(retentionCutoff(now).toISOString(), '2025-11-05T12:00:00.000Z');
  });

  test('retentionCutoff across a leap day counts days, not calendar years', () => {
    const now = new Date('2028-03-01T00:00:00.000Z');
    assert.equal(retentionCutoff(now).toISOString(), '2027-03-02T00:00:00.000Z');
  });

  test('retentionCutoff does not mutate its input', () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    retentionCutoff(now);
    assert.equal(now.toISOString(), '2026-11-05T12:00:00.000Z');
  });

  test('shouldTrimLog is false on dry runs', () => {
    assert.equal(shouldTrimLog({ dryRun: true }), false);
  });

  test('shouldTrimLog is true on real runs', () => {
    assert.equal(shouldTrimLog({ dryRun: false }), true);
  });
});
