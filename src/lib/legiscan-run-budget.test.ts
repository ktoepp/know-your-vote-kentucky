import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LegiscanRunBudgetError,
  chargeLegiscanRunBudget,
  isLegiscanRunBudgetError,
  legiscanRunBudgetRemaining,
  parseBudgetFlag,
  resetLegiscanRunBudgetFallback,
  resolveRunBudget,
  withLegiscanRunBudget,
} from './legiscan-run-budget';
import { withLegiscanCaller } from './legiscan-caller';

// Pure tests: no LegiScan client, no HTTP, no Supabase.

const savedArgv = process.argv;
const savedCaller = process.env.LEGISCAN_CALLER;
const savedVercel = process.env.VERCEL;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  process.argv = ['node', 'script.ts'];
  delete process.env.LEGISCAN_CALLER;
  delete process.env.VERCEL;
  resetLegiscanRunBudgetFallback();
});

afterEach(() => {
  process.argv = savedArgv;
  restoreEnv('LEGISCAN_CALLER', savedCaller);
  restoreEnv('VERCEL', savedVercel);
  resetLegiscanRunBudgetFallback();
});

function expectBudgetError(reason: 'exhausted' | 'no-budget') {
  return (err: unknown) => {
    assert.ok(err instanceof LegiscanRunBudgetError);
    assert.ok(isLegiscanRunBudgetError(err));
    assert.equal(err.reason, reason);
    return true;
  };
}

/** Charges `n` times; any throw fails the test. */
function chargeTimes(n: number): void {
  for (let i = 0; i < n; i++) chargeLegiscanRunBudget();
}

test('untagged with no flag: the first charge throws no-budget', () => {
  assert.throws(
    () => chargeLegiscanRunBudget(),
    (err: unknown) => {
      expectBudgetError('no-budget')(err);
      assert.equal(
        (err as Error).message,
        'No LegiScan budget for caller "untagged": pass --budget=N (see docs/data-budget.md)',
      );
      assert.equal((err as LegiscanRunBudgetError).caller, 'untagged');
      return true;
    },
  );
});

test('LEGISCAN_CALLER=accuracy-audit: 40 charges pass and the 41st throws exhausted', () => {
  process.env.LEGISCAN_CALLER = 'accuracy-audit';
  chargeTimes(40);
  assert.throws(() => chargeLegiscanRunBudget(), (err: unknown) => {
    expectBudgetError('exhausted')(err);
    assert.equal((err as Error).message, 'LegiScan run budget reached (spent 40 of 40)');
    return true;
  });
});

test('argv --budget=3: the 4th charge throws', () => {
  process.argv = ['node', 'script.ts', '--live', '--budget=3'];
  chargeTimes(3);
  assert.throws(() => chargeLegiscanRunBudget(), expectBudgetError('exhausted'));
});

test('argv --budget=N shares one counter across caller tags in the process', () => {
  process.argv = ['node', 'script.ts', '--budget=2'];
  withLegiscanCaller('dataset-sync', () => chargeLegiscanRunBudget());
  chargeLegiscanRunBudget();
  assert.throws(() => chargeLegiscanRunBudget(), expectBudgetError('exhausted'));
});

test('parseBudgetFlag reads the first --budget=N and rejects malformed values', () => {
  assert.equal(parseBudgetFlag([]), undefined);
  assert.equal(parseBudgetFlag(['--live']), undefined);
  assert.equal(parseBudgetFlag(['--budget=0']), 0);
  assert.equal(parseBudgetFlag(['--budget=25', '--budget=99']), 25);
  for (const bad of ['--budget=abc', '--budget=', '--budget=-1', '--budget=1.5', '--budget']) {
    assert.throws(() => parseBudgetFlag([bad]), /Malformed --budget/, bad);
  }
});

test('a malformed argv flag makes the fallback charge throw (fails closed)', () => {
  process.argv = ['node', 'script.ts', '--budget=abc'];
  assert.throws(() => chargeLegiscanRunBudget(), /Malformed --budget/);
});

test('a scope of 10 inside a scope of 3: 10 applies (replacement, not a minimum)', () => {
  withLegiscanRunBudget(3, () => {
    withLegiscanRunBudget(10, () => {
      chargeTimes(10);
      assert.throws(() => chargeLegiscanRunBudget(), expectBudgetError('exhausted'));
    });
    // The outer scope's counter is untouched by the inner one.
    assert.equal(legiscanRunBudgetRemaining(), 3);
  });
});

test('a null scope counts but never throws', () => {
  withLegiscanRunBudget(null, () => {
    chargeTimes(500);
    assert.equal(legiscanRunBudgetRemaining(), null);
  });
});

test('a 0 scope throws no-budget with the scoped caller tag', () => {
  withLegiscanCaller('sync-legislator-bios', () =>
    withLegiscanRunBudget(0, () => {
      assert.throws(() => chargeLegiscanRunBudget(), (err: unknown) => {
        expectBudgetError('no-budget')(err);
        assert.equal((err as LegiscanRunBudgetError).caller, 'sync-legislator-bios');
        return true;
      });
    }),
  );
});

test('two concurrent scopes do not share counts', async () => {
  const tick = () => new Promise<void>((r) => setImmediate(r));
  const run = (budget: number) =>
    withLegiscanRunBudget(budget, async () => {
      let passed = 0;
      for (let i = 0; i < 5; i++) {
        await tick();
        try {
          chargeLegiscanRunBudget();
          passed++;
        } catch (err) {
          if (!isLegiscanRunBudgetError(err)) throw err;
        }
      }
      return passed;
    });
  const [a, b] = await Promise.all([run(2), run(4)]);
  assert.equal(a, 2);
  assert.equal(b, 4);
});

test('legiscanRunBudgetRemaining tracks the scope and is null with no scope', () => {
  assert.equal(legiscanRunBudgetRemaining(), null);
  withLegiscanRunBudget(5, () => {
    chargeTimes(2);
    assert.equal(legiscanRunBudgetRemaining(), 3);
  });
});

test('resolveRunBudget: explicit 0 → 0, null key → null, missing key → 0, scheduled tag → its cap', () => {
  assert.equal(resolveRunBudget('accuracy-audit', 0), 0);
  assert.equal(resolveRunBudget('sync-bills', 7), 7);
  assert.equal(resolveRunBudget('sync-bills'), null);
  assert.equal(resolveRunBudget('no-such-tag'), 0);
  assert.equal(resolveRunBudget('untagged'), 0);
  assert.equal(resolveRunBudget('sync-legislator-bios'), 0);
  assert.equal(resolveRunBudget('toString'), 0, 'inherited object keys are not caps');
  for (const tag of ['sync-legislators', 'sync-votes', 'dataset-sync', 'accuracy-audit', 'session-preview', 'legislator-links']) {
    const cap = resolveRunBudget(tag);
    assert.ok(typeof cap === 'number' && cap > 0, `${tag} resolves to a non-zero cap`);
  }
});

test('VERCEL=1 with no scope: the fallback is 0 even for a scheduled tag or --budget', () => {
  process.env.VERCEL = '1';
  process.env.LEGISCAN_CALLER = 'accuracy-audit';
  process.argv = ['node', 'script.ts', '--budget=50'];
  const savedError = console.error;
  console.error = () => {};
  try {
    assert.throws(() => chargeLegiscanRunBudget(), expectBudgetError('no-budget'));
  } finally {
    console.error = savedError;
  }
  // A pipeline scope still works on Vercel.
  withLegiscanRunBudget(1, () => chargeLegiscanRunBudget());
});
