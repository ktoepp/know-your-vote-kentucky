import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AxiosInstance } from 'axios';
import {
  KyLegiScanClient,
  LegiscanMissingKeyError,
  LegiscanRejectedError,
  type KyLegiScanClientDeps,
} from './ky-legiscan-client';
import { LegiscanQuotaHoldError } from './legiscan-quota';
import { LegiscanRunBudgetError, withLegiscanRunBudget } from './legiscan-run-budget';

// Every test stubs HTTP: no request ever reaches api.legiscan.com.

/**
 * Since WS4-03a every attempt is charged to a per-run budget, and a process
 * with no budget is denied. These tests are about attempt counting, so each
 * runs inside an uncapped (`null`) budget scope unless it says otherwise.
 */
function budgetedTest(name: string, fn: () => Promise<void>): void {
  test(name, () => withLegiscanRunBudget(null, fn));
}

type Reply = { status: number; data: unknown } | Error;

function timeoutError(): Error {
  return Object.assign(new Error('timeout of 60000ms exceeded'), { code: 'ECONNABORTED' });
}

function httpError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });
}

const OK = { status: 200, data: { status: 'OK', bill: { bill_id: 1 } } };

/** A client whose HTTP replies come from `replies` in order, with spies on every seam. */
function harness(replies: Reply[], opts: { apiKey?: string; deps?: KyLegiScanClientDeps } = {}) {
  const calls = { get: 0, recordAttempt: [] as (string | undefined)[], recordFailure: 0, checkQuota: 0 };
  const queue = [...replies];
  const http = {
    get: async () => {
      calls.get += 1;
      const next = queue.shift();
      if (!next) throw new Error('stub: no reply queued');
      if (next instanceof Error) throw next;
      return next;
    },
  } as unknown as Pick<AxiosInstance, 'get'>;
  const deps: KyLegiScanClientDeps = {
    http,
    recordAttempt: async (op) => {
      calls.recordAttempt.push(op);
    },
    recordFailure: async () => {
      calls.recordFailure += 1;
    },
    checkQuota: async () => {
      calls.checkQuota += 1;
      return { blocked: false, summary: null };
    },
    sleep: async () => {},
    ...opts.deps,
  };
  const client = new KyLegiScanClient(opts.apiKey ?? 'test-key', deps);
  return { client, calls };
}

/** Runs `fn` with `LEGISCAN_API_KEY` unset, restoring it afterwards. */
async function withoutEnvKey<T>(fn: () => Promise<T>): Promise<T> {
  const had = Object.prototype.hasOwnProperty.call(process.env, 'LEGISCAN_API_KEY');
  const saved = process.env.LEGISCAN_API_KEY;
  delete process.env.LEGISCAN_API_KEY;
  try {
    return await fn();
  } finally {
    if (had) process.env.LEGISCAN_API_KEY = saved;
    else delete process.env.LEGISCAN_API_KEY;
  }
}

budgetedTest('a 2xx OK reply records one attempt, no failure, and returns the data', async () => {
  const { client, calls } = harness([OK]);
  const bill = await client.fetchBillDetail(1);
  assert.deepEqual(bill, { bill_id: 1 });
  assert.deepEqual(calls.recordAttempt, ['getBill']);
  assert.equal(calls.recordFailure, 0);
  assert.equal(calls.get, 1);
});

budgetedTest('a timeout then OK records two attempts and one failure', async () => {
  const { client, calls } = harness([timeoutError(), OK]);
  const bill = await client.fetchBillDetail(1);
  assert.deepEqual(bill, { bill_id: 1 });
  assert.equal(calls.recordAttempt.length, 2);
  assert.equal(calls.recordFailure, 1);
  assert.equal(calls.get, 2);
});

budgetedTest('an ERROR payload is a rejection: one attempt, no failure, no retry', async () => {
  const { client, calls } = harness([
    { status: 200, data: { status: 'ERROR', alert: { message: 'Unknown bill id' } } },
    OK,
  ]);
  await assert.rejects(client.fetchBillDetail(1), (err: unknown) => {
    assert.ok(err instanceof LegiscanRejectedError);
    assert.equal(err.op, 'getBill');
    assert.match(err.message, /Unknown bill id/);
    return true;
  });
  assert.equal(calls.recordAttempt.length, 1);
  assert.equal(calls.recordFailure, 0);
  assert.equal(calls.get, 1);
});

budgetedTest('HTTP 400 records one attempt and one failure and is thrown at once', async () => {
  const { client, calls } = harness([httpError(400), OK]);
  await assert.rejects(client.fetchBillDetail(1), /status code 400/);
  assert.equal(calls.recordAttempt.length, 1);
  assert.equal(calls.recordFailure, 1);
  assert.equal(calls.get, 1);
});

budgetedTest('five timeouts record five attempts and five failures, then throw the last error', async () => {
  const errors = [1, 2, 3, 4, 5].map((n) =>
    Object.assign(new Error(`timeout of 60000ms exceeded (#${n})`), { code: 'ECONNABORTED' }),
  );
  const { client, calls } = harness(errors);
  await assert.rejects(client.fetchBillDetail(1), (err: unknown) => err === errors[4]);
  assert.equal(calls.recordAttempt.length, 5);
  assert.equal(calls.recordFailure, 5);
  assert.equal(calls.get, 5);
});

budgetedTest('a recordAttempt that throws does not stop the request being sent', async () => {
  const { client, calls } = harness([OK], {
    deps: {
      recordAttempt: async () => {
        throw new Error('counter unavailable');
      },
    },
  });
  const bill = await client.fetchBillDetail(1);
  assert.deepEqual(bill, { bill_id: 1 });
  assert.equal(calls.get, 1);
});

budgetedTest('a cached second identical call records no new attempt', async () => {
  const { client, calls } = harness([OK]);
  await client.fetchBillDetail(1);
  const again = await client.fetchBillDetail(1);
  assert.deepEqual(again, { bill_id: 1 });
  assert.equal(calls.recordAttempt.length, 1);
  assert.equal(calls.get, 1);
});

for (const [label, key] of [
  ['an empty key', ''],
  ['a whitespace-only key', '   '],
] as const) {
  budgetedTest(`${label} sends nothing, records nothing and skips the quota check`, async () => {
    await withoutEnvKey(async () => {
      const { client, calls } = harness([OK], { apiKey: key });
      await assert.rejects(client.fetchBillDetail(1), (err: unknown) => {
        assert.ok(err instanceof LegiscanMissingKeyError);
        assert.equal(err.op, 'getBill');
        assert.equal(
          err.message,
          'LegiScan API key is empty: refusing to send (see docs/data-budget.md)',
        );
        return true;
      });
      assert.equal(calls.get, 0);
      assert.equal(calls.recordAttempt.length, 0);
      assert.equal(calls.recordFailure, 0);
      assert.equal(calls.checkQuota, 0);
    });
  });
}

budgetedTest('constructing with an empty or blank key does not throw (eager construction keeps working)', async () => {
  await withoutEnvKey(async () => {
    assert.doesNotThrow(() => new KyLegiScanClient(''));
    assert.doesNotThrow(() => new KyLegiScanClient('   '));
    assert.doesNotThrow(() => new KyLegiScanClient());
  });
});

test('budget 2 and three timeouts in a row: the third attempt throws LegiscanRunBudgetError and get ran twice', async () => {
  const { client, calls } = harness([timeoutError(), timeoutError(), timeoutError(), OK]);
  await withLegiscanRunBudget(2, async () => {
    await assert.rejects(client.fetchBillDetail(1), (err: unknown) => {
      assert.ok(err instanceof LegiscanRunBudgetError);
      assert.equal(err.reason, 'exhausted');
      assert.equal(err.message, 'LegiScan run budget reached (spent 2 of 2)');
      return true;
    });
  });
  assert.equal(calls.get, 2);
  // The denied third attempt is neither counted nor sent.
  assert.equal(calls.recordAttempt.length, 2);
  assert.equal(calls.recordFailure, 2);
});

test('no budget in scope or process: the first call is denied before any count or send', async () => {
  const { client, calls } = harness([OK]);
  const savedArgv = process.argv;
  const savedCaller = process.env.LEGISCAN_CALLER;
  process.argv = ['node', 'script.ts'];
  delete process.env.LEGISCAN_CALLER;
  try {
    await assert.rejects(client.fetchBillDetail(1), (err: unknown) => {
      assert.ok(err instanceof LegiscanRunBudgetError);
      assert.equal(err.reason, 'no-budget');
      return true;
    });
  } finally {
    process.argv = savedArgv;
    if (savedCaller === undefined) delete process.env.LEGISCAN_CALLER;
    else process.env.LEGISCAN_CALLER = savedCaller;
  }
  assert.equal(calls.get, 0);
  assert.equal(calls.recordAttempt.length, 0);
});

test('a blocked quota check (kill switch) throws LegiscanQuotaHoldError before any charge or get', async () => {
  const { client, calls } = harness([OK], {
    deps: {
      checkQuota: async () => ({ blocked: true, reason: 'LegiScan quota hold (test)', summary: null }),
    },
  });
  // A budget of 0 would throw on the first charge, so reaching the quota
  // error proves the charge never ran.
  await withLegiscanRunBudget(0, async () => {
    await assert.rejects(client.fetchBillDetail(1), (err: unknown) => {
      assert.ok(err instanceof LegiscanQuotaHoldError);
      assert.match(err.message, /quota hold \(test\)/);
      return true;
    });
  });
  assert.equal(calls.get, 0);
  assert.equal(calls.recordAttempt.length, 0);
});

budgetedTest('a cache hit is not charged', async () => {
  const { client } = harness([OK]);
  await withLegiscanRunBudget(1, async () => {
    await client.fetchBillDetail(1);
    // The budget is spent, but the cached reply needs no attempt.
    assert.deepEqual(await client.fetchBillDetail(1), { bill_id: 1 });
  });
});
