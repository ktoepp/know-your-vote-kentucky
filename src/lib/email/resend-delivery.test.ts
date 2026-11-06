import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedPredecessors,
  classifyEvent,
  NOTIFICATION_LOG_STATUS_ORDER,
} from './resend-delivery';

describe('classifyEvent', () => {
  test('email.delivered does not write to the log', () => {
    assert.deepEqual(classifyEvent({ type: 'email.delivered' }), {
      logStatus: null,
      bounceState: null,
      suppress: false,
      reason: null,
    });
  });

  test('email.delivery_delayed does not write to the log', () => {
    assert.deepEqual(classifyEvent({ type: 'email.delivery_delayed' }), {
      logStatus: null,
      bounceState: null,
      suppress: false,
      reason: null,
    });
  });

  test('hard bounce is bounced and suppresses', () => {
    for (const type of ['hard', 'Permanent', 'permanent']) {
      assert.deepEqual(
        classifyEvent({ type: 'email.bounced', data: { bounce: { type } } }),
        { logStatus: 'bounced', bounceState: 'hard', suppress: true, reason: 'hard_bounce' },
        type,
      );
    }
  });

  test('soft bounce is bounced and does not suppress', () => {
    assert.deepEqual(
      classifyEvent({ type: 'email.bounced', data: { bounce: { type: 'Transient' } } }),
      { logStatus: 'bounced', bounceState: 'soft', suppress: false, reason: null },
    );
  });

  test('email.complained is recorded as complained and suppresses', () => {
    assert.deepEqual(classifyEvent({ type: 'email.complained' }), {
      logStatus: 'complained',
      bounceState: 'complained',
      suppress: true,
      reason: 'spam_complaint',
    });
  });

  test('unknown event types are ignored', () => {
    for (const type of ['email.sent', 'email.opened', 'email.clicked', 'contact.created', '']) {
      assert.deepEqual(
        classifyEvent({ type }),
        { logStatus: null, bounceState: null, suppress: false, reason: null },
        type,
      );
    }
  });
});

describe('allowedPredecessors', () => {
  test('precedence order is sent < failed < bounced < complained', () => {
    assert.deepEqual([...NOTIFICATION_LOG_STATUS_ORDER], ['sent', 'failed', 'bounced', 'complained']);
  });

  test('sent has no predecessors', () => {
    assert.deepEqual(allowedPredecessors('sent'), []);
  });

  test('failed may replace sent only', () => {
    assert.deepEqual(allowedPredecessors('failed'), ['sent']);
  });

  test('bounced may replace sent or failed', () => {
    assert.deepEqual(allowedPredecessors('bounced'), ['sent', 'failed']);
  });

  test('complained may replace every lower status', () => {
    assert.deepEqual(allowedPredecessors('complained'), ['sent', 'failed', 'bounced']);
  });

  test('a status never lists itself, so replays do not rewrite the row', () => {
    for (const s of NOTIFICATION_LOG_STATUS_ORDER) {
      assert.equal(allowedPredecessors(s).includes(s), false, s);
    }
  });
});
