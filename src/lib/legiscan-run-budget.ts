/**
 * Per-run LegiScan budget (WS4-03a).
 *
 * Every HTTP attempt `KyLegiScanClient.request()` makes is charged here first.
 * A run gets its budget in this order (docs/data-budget.md, "How a run's
 * LegiScan budget is chosen"):
 *
 * 1. A scope opened by `withLegiscanRunBudget` (the four pipeline entry points
 *    open one from their caller tag, or from `--budget=N` via manual-sync).
 * 2. With no scope, `--budget=N` on the process command line. One counter is
 *    shared by the whole process.
 * 3. Otherwise the caller tag's default, `DATA_BUDGET.legiscan.perRunCap[tag]`,
 *    with one counter per tag. A tag that is not a key (including `untagged`)
 *    gets 0.
 * 4. A budget of 0 is denied on the first call, before any HTTP request.
 *
 * On Vercel (`VERCEL=1`) the no-scope fallback is always 0: every LegiScan call
 * made by a route must run inside a pipeline scope.
 *
 * `null` means counted but uncapped (for example `sync-bills` until WS4-06).
 *
 * No Supabase call is made here. The module keeps no global counter for scoped
 * calls; the process-level fallback counters only serve scripts.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { DATA_BUDGET } from './data-budget';
import { currentLegiscanCaller } from './legiscan-caller';
import { isLegiscanQuotaHoldError } from './legiscan-quota';

export type LegiscanRunBudgetErrorReason = 'exhausted' | 'no-budget';

export class LegiscanRunBudgetError extends Error {
  readonly budget: number;
  readonly spent: number;
  readonly caller: string;
  readonly reason: LegiscanRunBudgetErrorReason;
  constructor(args: {
    budget: number;
    spent: number;
    caller: string;
    reason: LegiscanRunBudgetErrorReason;
  }) {
    super(
      args.reason === 'no-budget'
        ? `No LegiScan budget for caller "${args.caller}": pass --budget=N (see docs/data-budget.md)`
        : `LegiScan run budget reached (spent ${args.spent} of ${args.budget})`,
    );
    this.name = 'LegiscanRunBudgetError';
    this.budget = args.budget;
    this.spent = args.spent;
    this.caller = args.caller;
    this.reason = args.reason;
  }
}

export function isLegiscanRunBudgetError(err: unknown): err is LegiscanRunBudgetError {
  return err instanceof Error && err.name === 'LegiscanRunBudgetError';
}

/**
 * True for the errors that must stop a whole run rather than one item: the
 * monthly quota hold and the per-run budget. Per-item catches re-throw these.
 */
export function isLegiscanStopError(err: unknown): boolean {
  return isLegiscanQuotaHoldError(err) || isLegiscanRunBudgetError(err);
}

const BUDGET_FLAG = '--budget';

/**
 * Reads the first `--budget=N` (N a non-negative integer). Returns `undefined`
 * when the flag is absent and throws when it is malformed, so a typo never
 * falls through to a different budget.
 */
export function parseBudgetFlag(argv: readonly string[]): number | undefined {
  const arg = argv.find((a) => a === BUDGET_FLAG || a.startsWith(`${BUDGET_FLAG}=`));
  if (arg === undefined) return undefined;
  const raw = arg === BUDGET_FLAG ? '' : arg.slice(BUDGET_FLAG.length + 1);
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n)) {
    throw new Error(
      `Malformed ${BUDGET_FLAG} value "${raw}": expected --budget=N with N a non-negative integer`,
    );
  }
  return n;
}

/**
 * `explicit` when it is a number; else the tag's `perRunCap` (a number, or
 * `null` for counted-but-uncapped); else 0.
 */
export function resolveRunBudget(tag: string, explicit?: number): number | null {
  if (typeof explicit === 'number') return explicit;
  const caps = DATA_BUDGET.legiscan.perRunCap;
  if (Object.prototype.hasOwnProperty.call(caps, tag)) return caps[tag];
  return 0;
}

type RunBudgetScope = { budget: number | null; spent: number };

const scopeStore = new AsyncLocalStorage<RunBudgetScope>();

/**
 * Runs `fn` with a fresh budget scope. It replaces any outer scope (no nested
 * minimum). `null` counts the calls and never stops them.
 */
export function withLegiscanRunBudget<T>(budget: number | null, fn: () => T): T {
  return scopeStore.run({ budget, spent: 0 }, fn);
}

/** Process-level counters for calls made outside any scope (scripts only). */
const fallbackSpent = new Map<string, number>();
const ARGV_FALLBACK_KEY = '\u0000argv';

/** Clears the process-level fallback counters. For tests. */
export function resetLegiscanRunBudgetFallback(): void {
  fallbackSpent.clear();
}

function charge(scope: RunBudgetScope, caller: string): void {
  const { budget, spent } = scope;
  if (budget !== null && spent >= budget) {
    throw new LegiscanRunBudgetError({
      budget,
      spent,
      caller,
      reason: budget === 0 ? 'no-budget' : 'exhausted',
    });
  }
  scope.spent = spent + 1;
}

/**
 * Charges one LegiScan attempt to the current run. Throws
 * `LegiscanRunBudgetError` instead of charging when the budget is used up or
 * there is none.
 */
export function chargeLegiscanRunBudget(): void {
  const caller = currentLegiscanCaller();
  const scope = scopeStore.getStore();
  if (scope) {
    charge(scope, caller);
    return;
  }

  if (process.env.VERCEL === '1') {
    console.error(
      `[LegiScanBudget] LegiScan call outside a pipeline budget scope on Vercel (caller "${caller}"): denied`,
    );
    throw new LegiscanRunBudgetError({ budget: 0, spent: 0, caller, reason: 'no-budget' });
  }

  const flag = parseBudgetFlag(process.argv);
  const key = flag !== undefined ? ARGV_FALLBACK_KEY : caller;
  const budget = flag !== undefined ? flag : resolveRunBudget(caller);
  const fallback: RunBudgetScope = { budget, spent: fallbackSpent.get(key) ?? 0 };
  charge(fallback, caller);
  fallbackSpent.set(key, fallback.spent);
}

/** Calls left in the current scope; `null` when uncapped or when no scope is open. */
export function legiscanRunBudgetRemaining(): number | null {
  const scope = scopeStore.getStore();
  if (!scope || scope.budget === null) return null;
  return Math.max(0, scope.budget - scope.spent);
}
