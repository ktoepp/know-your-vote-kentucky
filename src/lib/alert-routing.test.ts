import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isPageRule, sentrySlackTargets } from './alert-routing';

// Placeholder URLs only; tests never call Slack.
const ERRORS = 'https://hooks.example.com/errors';
const SUPPORT = 'https://hooks.example.com/support';

describe('isPageRule', () => {
  test('"[page] digest" pages', () => {
    assert.equal(isPageRule('[page] digest'), true);
  });
  test('"[PAGE]x" pages (case-insensitive, no space needed)', () => {
    assert.equal(isPageRule('[PAGE]x'), true);
  });
  test('"digest [page]" does not page (prefix only)', () => {
    assert.equal(isPageRule('digest [page]'), false);
  });
  test('undefined does not page', () => {
    assert.equal(isPageRule(undefined), false);
  });
});

describe('sentrySlackTargets', () => {
  test('support URL unset: #errors only, even for a [page] rule', () => {
    assert.deepEqual(sentrySlackTargets('[page] digest', { SLACK_WEBHOOK_ERRORS: ERRORS }), [ERRORS]);
  });
  test('support URL equal to errors URL: one URL', () => {
    assert.deepEqual(
      sentrySlackTargets('[page] digest', { SLACK_WEBHOOK_ERRORS: ERRORS, SLACK_WEBHOOK_SUPPORT: ERRORS }),
      [ERRORS],
    );
  });
  test('[page] rule with both set: #errors then support', () => {
    assert.deepEqual(
      sentrySlackTargets(' [page] digest', { SLACK_WEBHOOK_ERRORS: ERRORS, SLACK_WEBHOOK_SUPPORT: SUPPORT }),
      [ERRORS, SUPPORT],
    );
  });
  test('non-page rule with both set: #errors only', () => {
    assert.deepEqual(
      sentrySlackTargets('digest', { SLACK_WEBHOOK_ERRORS: ERRORS, SLACK_WEBHOOK_SUPPORT: SUPPORT }),
      [ERRORS],
    );
  });
  test('#errors falls back to SLACK_WEBHOOK_ALERTS, then SLACK_WEBHOOK_URL', () => {
    assert.deepEqual(sentrySlackTargets(undefined, { SLACK_WEBHOOK_ALERTS: ERRORS }), [ERRORS]);
    assert.deepEqual(sentrySlackTargets(undefined, { SLACK_WEBHOOK_URL: ERRORS }), [ERRORS]);
  });
  test('nothing configured: no targets', () => {
    assert.deepEqual(sentrySlackTargets('[page] x', {}), []);
  });
});
