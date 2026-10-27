import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAdminAccess,
  extractBearerToken,
  isOperatorRequestAuthorized,
  secretsMatch,
} from './shared-secret';
import { rejectUnlessOperator } from './operator-guard';

// Dummy values only. Never put a real secret in a test.
const SYNC = 'dummy-sync-key-0123456789abcdef';
const CRON = 'dummy-cron-secret-fedcba9876543210';
const ADMIN = 'dummy-admin-token-00112233445566778899';

const bearer = (token: string, scheme = 'Bearer') => new Headers({ authorization: `${scheme} ${token}` });
const adminHeader = (token: string) => new Headers({ 'x-admin-token': token });

describe('extractBearerToken', () => {
  test('returns null when there is no Authorization header', () => {
    assert.equal(extractBearerToken(new Headers()), null);
  });

  test('strips the Bearer prefix and trims', () => {
    assert.equal(extractBearerToken(new Headers({ authorization: 'Bearer   abc  ' })), 'abc');
  });

  test('accepts a lowercase bearer prefix', () => {
    assert.equal(extractBearerToken(bearer('abc', 'bearer')), 'abc');
  });

  test('returns null for an empty Authorization header', () => {
    assert.equal(extractBearerToken(new Headers({ authorization: '' })), null);
  });
});

describe('secretsMatch', () => {
  test('matches identical values', async () => {
    assert.equal(await secretsMatch('same-value', 'same-value'), true);
  });

  test('denies a different value of the same length', async () => {
    assert.equal(await secretsMatch('value-a', 'value-b'), false);
  });

  test('denies a value of a different length', async () => {
    assert.equal(await secretsMatch('short', 'a-much-longer-value'), false);
    assert.equal(await secretsMatch('same-value-plus', 'same-value'), false);
  });

  test('denies when either side is empty or missing', async () => {
    assert.equal(await secretsMatch('', ''), false);
    assert.equal(await secretsMatch(null, 'x'), false);
    assert.equal(await secretsMatch('x', undefined), false);
    assert.equal(await secretsMatch('x', ''), false);
  });
});

describe('isOperatorRequestAuthorized', () => {
  const both = { SYNC_API_KEY: SYNC, CRON_SECRET: CRON };

  test('denies when no operator secrets are configured', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC), {}), false);
    assert.equal(await isOperatorRequestAuthorized(bearer(''), { SYNC_API_KEY: '', CRON_SECRET: '' }), false);
  });

  test('denies when the configured secrets are whitespace only', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer('x'), { SYNC_API_KEY: '   ', CRON_SECRET: '\n' }), false);
  });

  test('denies when no token is presented', async () => {
    assert.equal(await isOperatorRequestAuthorized(new Headers(), both), false);
  });

  test('denies a wrong token', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer('not-the-secret'), both), false);
  });

  test('denies a token of a different length', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(`${SYNC}x`), both), false);
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC.slice(0, -1)), both), false);
  });

  test('accepts SYNC_API_KEY', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC), both), true);
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC), { SYNC_API_KEY: SYNC }), true);
  });

  test('accepts CRON_SECRET', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(CRON), both), true);
    assert.equal(await isOperatorRequestAuthorized(bearer(CRON), { CRON_SECRET: CRON }), true);
  });

  test('trims surrounding whitespace in env values', async () => {
    const padded = { SYNC_API_KEY: `  ${SYNC}\n`, CRON_SECRET: `\t${CRON} ` };
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC), padded), true);
    assert.equal(await isOperatorRequestAuthorized(bearer(CRON), padded), true);
  });

  test('accepts a lowercase bearer prefix', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(SYNC, 'bearer'), both), true);
  });

  test('does not accept the admin token as an operator token', async () => {
    assert.equal(await isOperatorRequestAuthorized(bearer(ADMIN), { ...both, ADMIN_TOKEN: ADMIN }), false);
  });
});

describe('checkAdminAccess', () => {
  test("returns 'not-configured' when ADMIN_TOKEN is unset", async () => {
    assert.equal(await checkAdminAccess(new Headers(), {}), 'not-configured');
    assert.equal(await checkAdminAccess(adminHeader(ADMIN), {}), 'not-configured');
  });

  test("returns 'not-configured' when ADMIN_TOKEN is empty or whitespace", async () => {
    assert.equal(await checkAdminAccess(adminHeader(''), { ADMIN_TOKEN: '' }), 'not-configured');
    assert.equal(await checkAdminAccess(adminHeader(' '), { ADMIN_TOKEN: '   ' }), 'not-configured');
  });

  test("returns 'denied' when ADMIN_TOKEN is set and no header is sent", async () => {
    assert.equal(await checkAdminAccess(new Headers(), { ADMIN_TOKEN: ADMIN }), 'denied');
  });

  test("returns 'denied' for an empty header", async () => {
    assert.equal(await checkAdminAccess(adminHeader(''), { ADMIN_TOKEN: ADMIN }), 'denied');
  });

  test("returns 'denied' for a wrong header", async () => {
    assert.equal(await checkAdminAccess(adminHeader('wrong-token'), { ADMIN_TOKEN: ADMIN }), 'denied');
    assert.equal(await checkAdminAccess(adminHeader(`${ADMIN}0`), { ADMIN_TOKEN: ADMIN }), 'denied');
  });

  test("returns 'denied' when only an operator bearer token is sent", async () => {
    const env = { ADMIN_TOKEN: ADMIN, SYNC_API_KEY: SYNC };
    assert.equal(await checkAdminAccess(bearer(SYNC), env), 'denied');
  });

  test("returns 'ok' for the correct header", async () => {
    assert.equal(await checkAdminAccess(adminHeader(ADMIN), { ADMIN_TOKEN: ADMIN }), 'ok');
  });

  test('trims surrounding whitespace in ADMIN_TOKEN', async () => {
    assert.equal(await checkAdminAccess(adminHeader(ADMIN), { ADMIN_TOKEN: `  ${ADMIN}\n` }), 'ok');
  });
});

describe('rejectUnlessOperator', () => {
  const saved: Record<string, string | undefined> = {};
  const keys = ['SYNC_API_KEY', 'CRON_SECRET'] as const;

  beforeEach(() => {
    for (const k of keys) saved[k] = process.env[k];
    process.env.SYNC_API_KEY = SYNC;
    process.env.CRON_SECRET = CRON;
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const req = (headers?: HeadersInit) => new Request('http://localhost/api/cron/example', { headers });

  test('returns a 401 Unauthorized response when no Authorization header is sent', async () => {
    const denied = await rejectUnlessOperator(req());
    assert.ok(denied);
    assert.equal(denied.status, 401);
    assert.deepEqual(await denied.json(), { error: 'Unauthorized' });
  });

  test('returns a 401 response for a wrong token', async () => {
    const denied = await rejectUnlessOperator(req({ authorization: 'Bearer wrong' }));
    assert.equal(denied?.status, 401);
  });

  test('returns null for SYNC_API_KEY and for CRON_SECRET', async () => {
    assert.equal(await rejectUnlessOperator(req({ authorization: `Bearer ${SYNC}` })), null);
    assert.equal(await rejectUnlessOperator(req({ authorization: `Bearer ${CRON}` })), null);
  });

  test('returns a 401 response when no operator secrets are configured', async () => {
    delete process.env.SYNC_API_KEY;
    delete process.env.CRON_SECRET;
    const denied = await rejectUnlessOperator(req({ authorization: `Bearer ${SYNC}` }));
    assert.equal(denied?.status, 401);
  });

  test('the un-awaited result is truthy, so the handler shape still returns early', async () => {
    const pending = rejectUnlessOperator(req({ authorization: `Bearer ${SYNC}` }));
    assert.ok(pending);
    await pending;
  });
});
