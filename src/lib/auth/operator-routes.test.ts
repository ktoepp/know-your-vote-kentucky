/**
 * Route-level checks for the shared operator guard and the /admin check.
 *
 * Only the unauthorized paths of operator routes are exercised. Never call an
 * operator handler with a valid token here: that would run the operation (for
 * slack-test, a real Slack post).
 */
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/api/cron/slack-test/route';
import { middleware } from '../../middleware';

// Dummy values only. Never put a real secret in a test.
const SYNC = 'dummy-sync-key-0123456789abcdef';
const CRON = 'dummy-cron-secret-fedcba9876543210';
const ADMIN = 'dummy-admin-token-00112233445566778899';

const ENV_KEYS = ['SYNC_API_KEY', 'CRON_SECRET', 'ADMIN_TOKEN'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('/api/cron/slack-test', () => {
  const url = 'http://localhost/api/cron/slack-test';

  beforeEach(() => {
    process.env.SYNC_API_KEY = SYNC;
    process.env.CRON_SECRET = CRON;
  });

  for (const [name, handler] of [
    ['GET', GET],
    ['POST', POST],
  ] as const) {
    test(`${name} returns 401 without an Authorization header`, async () => {
      const res = await handler(new NextRequest(url, { method: name }));
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: 'Unauthorized' });
    });

    test(`${name} returns 401 with a wrong bearer token`, async () => {
      const res = await handler(
        new NextRequest(url, { method: name, headers: { authorization: 'Bearer not-the-secret' } }),
      );
      assert.equal(res.status, 401);
    });
  }
});

describe('middleware /admin access', () => {
  const adminRequest = (headers?: Record<string, string>) =>
    new NextRequest('http://localhost/admin/sync-status', { headers });

  const continues = (res: Response) => res.headers.get('x-middleware-next') === '1';

  test('responds 404 when ADMIN_TOKEN is not configured', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await middleware(adminRequest({ 'x-admin-token': ADMIN }));
    assert.equal(res.status, 404);
    assert.equal(continues(res), false);
  });

  test('responds 401 when ADMIN_TOKEN is set and no header is sent', async () => {
    process.env.ADMIN_TOKEN = ADMIN;
    const res = await middleware(adminRequest());
    assert.equal(res.status, 401);
    assert.equal(continues(res), false);
  });

  test('responds 401 for a wrong x-admin-token header', async () => {
    process.env.ADMIN_TOKEN = ADMIN;
    const res = await middleware(adminRequest({ 'x-admin-token': 'wrong-token' }));
    assert.equal(res.status, 401);
    assert.equal(continues(res), false);
  });

  test('continues to the page for the correct x-admin-token header', async () => {
    process.env.ADMIN_TOKEN = ADMIN;
    const res = await middleware(adminRequest({ 'x-admin-token': ADMIN }));
    assert.equal(res.status, 200);
    assert.equal(continues(res), true);
  });

  test('leaves non-admin paths alone', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await middleware(new NextRequest('http://localhost/bills'));
    assert.equal(continues(res), true);
  });
});
