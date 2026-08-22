/**
 * Shared types + config for the KYvKY content-accuracy audit.
 *
 * Each checker re-fetches a primary source (LegiScan, Open States, LRC HTML)
 * and diffs it against what is stored in Supabase, returning a {@link CheckerResult}.
 * The orchestrator (`scripts/accuracy-audit.ts`) aggregates results and posts to Slack.
 */
import { KY_DEFAULT_ANTHROPIC_MODEL } from '../anthropic-model';

export type Severity = 'fail' | 'warn' | 'info';

export interface Finding {
  severity: Severity;
  /** Checker domain (bills, votes, legislators, committees, materials, llm). */
  domain: string;
  /** Human label for the affected entity, e.g. "HB 100" or "Rep. Jane Doe". */
  entity?: string;
  /** Field that diverged, e.g. "status". */
  field?: string;
  message: string;
  /** Source-of-truth value (LegiScan / Open States / LRC). */
  expected?: string;
  /** Value currently stored in Supabase. */
  actual?: string;
  url?: string;
  /**
   * Legislative session key, e.g. `"2026RS"`. Included in the fingerprint so
   * `HB100 / 2024` and `HB100 / 2026` — the same human label pointing at
   * different bills — are treated as distinct findings for recurrence. Left
   * off the rendered digest label so the display stays scannable. Only bills
   * checkers populate this today; other domains have globally-unique entity
   * keys already (roll_call_id, legislator id, committee slug) so they don't
   * collide across sessions.
   */
  session?: string;
}

export interface CheckerResult {
  domain: string;
  /** Entities examined against their source of truth. */
  checked: number;
  passed: number;
  warnings: number;
  failures: number;
  findings: Finding[];
  durationMs: number;
  /** True when the checker had nothing to do (e.g. no recent rows, missing key). */
  skipped?: boolean;
  skipReason?: string;
  /**
   * Checker-level crash — a bug on our side, or a source of truth returning
   * something we cannot parse. Fails CI and escalates to #errors.
   */
  error?: string;
  /**
   * Whole-checker upstream outage — the source of truth (LegiScan, Open States,
   * LRC, Anthropic) was unreachable for this run. Reported visibly in the digest
   * but does NOT fail CI: an outage we cannot control should not turn a green
   * check red every time the upstream hiccups. Distinct from {@link error}
   * (our bug) and {@link skipped} (nothing to do).
   */
  outage?: boolean;
  /** Which upstream was out — displayed in the digest so operators know what to check. */
  outageSource?: string;
  /**
   * Items whose upstream fetch failed outright (network, 5xx, quota mid-run).
   *
   * Used by checkers that fan out many small fetches (bills, votes): a single
   * hiccup shows as one `warn` and one `upstreamFailures++`; a total outage
   * pushes the ratio past {@link UPSTREAM_OUTAGE_RATIO} and the report layer
   * escalates the domain to `outage` instead of surfacing it as drift.
   */
  upstreamFailures?: number;
  /**
   * The domain ostensibly succeeded (no error, no outage, no skip) but verified
   * fewer items than the configured floor. Silent "checked=0" runs used to be
   * indistinguishable from clean ones — a Supabase auth token that quietly
   * returned an empty set headlined "all clear". Reported visibly in the digest;
   * exits 0 (it's a warning, not a crash).
   */
  underCoverage?: boolean;
  /** Floor consulted for {@link underCoverage}. Rendered on the status line. */
  coverageFloor?: number;
  /**
   * Optional per-pass split of `checked` when the checker examines things in
   * different units (materials examines committee pages AND link targets).
   * The sum still lives in `checked` — pass-rate math and the outage ratio
   * both depend on it — but the digest renders the breakdown instead of a
   * single uninterpretable total, so a reader can tell how many committees
   * vs how many links were examined.
   */
  checkedBreakdown?: Array<{ label: string; count: number }>;
}

export interface AuditConfig {
  /**
   * A bill counts as "active" — still capable of drifting upstream — when its
   * `last_action_date` falls within this many days. Defaults to a full year so
   * the current session stays in the window through the interim.
   *
   * Replaces the former `lookbackDays` / `ACCURACY_DAYS`, which was defined,
   * documented as a lookback, and read by no checker. `ACCURACY_DAYS` is still
   * honoured as an alias so existing configuration keeps working.
   */
  activeDays: number;
  /**
   * Fraction of the bills sample drawn from the active window; the remainder
   * rotates across the full corpus.
   */
  activeShare: number;
  /** Max bills re-fetched from LegiScan per run. */
  billsLimit: number;
  /** Max roll calls re-fetched from LegiScan per run. */
  votesLimit: number;
  /** Max committees re-scraped for materials per run. */
  materialsCommitteeLimit: number;
  /** Max stored URLs checked per run. */
  linkSampleLimit: number;
  /**
   * When true, links are checked with live HTTP probes (slower, network-bound).
   * Default false: links are validated statically against expected canonical
   * hosts / URL shape (a cheap, deterministic source-of-truth check).
   */
  probeLinks: boolean;
  /** Sample size for each LLM review pass. */
  llmSample: number;
  /** Skip the Anthropic LLM pass entirely. */
  skipLlm: boolean;
  /** Anthropic model for the LLM pass. */
  llmModel: string;
  /** Stop LegiScan-dependent checks when monthly usage is at/above this percent. */
  legiscanQuotaStopPct: number;
  /** Read-only: run all checks but never post to Slack. */
  dryRun: boolean;
  /** When set, only run these domains. `null` runs all. */
  domains: Set<string> | null;
  /** Seed for randomized sampling; reuse to reproduce a run's exact selection. */
  seed: number;
  /**
   * Per-domain lower bound on `CheckerResult.checked` before the domain is
   * flagged `underCoverage`. Applied only when the checker ostensibly succeeded
   * — an outage/crash/skip has its own signal and is not double-flagged.
   * Defaults live in {@link DEFAULT_COVERAGE_FLOORS}; overridable via
   * `ACCURACY_<DOMAIN>_MIN_CHECKED` env vars.
   */
  coverageFloors: Record<AuditDomain, number>;
}

export const ALL_DOMAINS = [
  'bills',
  'votes',
  'legislators',
  'committees',
  'materials',
  'llm',
] as const;

export type AuditDomain = (typeof ALL_DOMAINS)[number];

/**
 * Minimum `checked` per domain before the run is flagged `underCoverage`.
 *
 * Sized against real production totals: sample-based checkers get a floor well
 * below their configured limit so ordinary variance never trips it, and the
 * whole-corpus checkers (legislators, committees) get a floor tied to something
 * that can't legitimately be zero (100 House + 38 Senate = 138 active
 * legislators, and the stored-corpus invariants alone touch every meeting).
 *
 * A floor of 0 opts the domain out. Individual values are overridable via env,
 * e.g. `ACCURACY_BILLS_MIN_CHECKED=10`.
 */
export const DEFAULT_COVERAGE_FLOORS: Record<AuditDomain, number> = {
  bills: 5,
  votes: 2,
  legislators: 100,
  committees: 5,
  materials: 3,
  llm: 5,
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

function envBool(name: string): boolean {
  return (process.env[name]?.trim() || '').toLowerCase() === 'true';
}

export interface AuditConfigOverrides {
  dryRun?: boolean;
  skipLlm?: boolean;
  domains?: Set<string> | null;
  seed?: number;
}

function resolveSeed(override?: number): number {
  if (override != null && Number.isFinite(override)) return override >>> 0;
  const env = process.env.ACCURACY_SEED?.trim();
  if (env) {
    const n = parseInt(env, 10);
    if (Number.isFinite(n)) return n >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Build an {@link AuditConfig} from `ACCURACY_*` env vars, applying CLI overrides. */
export function buildAuditConfig(overrides: AuditConfigOverrides = {}): AuditConfig {
  const dryRun = overrides.dryRun ?? false;
  // Dry-run is a preview: never post, never persist, never spend on non-essentials.
  // Anthropic tokens are the biggest discretionary cost in a run — a `npm run
  // audit:accuracy:dry` shouldn't burn them just to eyeball the deterministic
  // diff. Explicit CLI override still wins so an operator debugging the LLM
  // pass can force it back on with `--dry-run` (they'd need to unset skipLlm
  // via the env in that unusual case).
  const skipLlm = overrides.skipLlm ?? (dryRun || envBool('ACCURACY_SKIP_LLM'));
  return {
    seed: resolveSeed(overrides.seed),
    activeDays: envInt('ACCURACY_ACTIVE_DAYS', envInt('ACCURACY_DAYS', 365)),
    activeShare: envFloat('ACCURACY_ACTIVE_SHARE', 0.75),
    billsLimit: envInt('ACCURACY_BILLS_LIMIT', 40),
    votesLimit: envInt('ACCURACY_VOTES_LIMIT', 15),
    materialsCommitteeLimit: envInt('ACCURACY_MATERIALS_COMMITTEE_LIMIT', 12),
    linkSampleLimit: envInt('ACCURACY_LINK_SAMPLE', 25),
    probeLinks: envBool('ACCURACY_PROBE_LINKS'),
    llmSample: envInt('ACCURACY_LLM_SAMPLE', 8),
    skipLlm,
    llmModel: process.env.ACCURACY_LLM_MODEL?.trim() || KY_DEFAULT_ANTHROPIC_MODEL,
    legiscanQuotaStopPct: envInt('ACCURACY_LEGISCAN_QUOTA_STOP_PCT', 95),
    dryRun,
    domains: overrides.domains ?? null,
    coverageFloors: Object.fromEntries(
      ALL_DOMAINS.map((d) => [
        d,
        envInt(`ACCURACY_${d.toUpperCase()}_MIN_CHECKED`, DEFAULT_COVERAGE_FLOORS[d]),
      ]),
    ) as Record<AuditDomain, number>,
  };
}

export function domainEnabled(cfg: AuditConfig, domain: AuditDomain): boolean {
  return cfg.domains == null || cfg.domains.has(domain);
}

/** Collapse whitespace + lowercase for tolerant text comparison. */
export function norm(v: string | null | undefined): string {
  return (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ERR_NETWORK',
  'ERR_BAD_RESPONSE',
]);

/**
 * True when an error looks like a *transient upstream outage* — an HTTP 5xx / 429,
 * a request timeout, or a low-level network failure — rather than a problem on our
 * side (an auth 4xx, schema drift, or a logic bug).
 *
 * Checkers whose whole run hinges on a single upstream fetch (the Open States
 * roster, the LRC calendar) use this to degrade that fetch to a `skipped` result
 * instead of a checker-level `error`. A `skipped` domain is quiet; an `error`
 * red-pages #errors and fails CI. Reclassifying an outage we can't control mirrors
 * the skip-not-error policy already applied to the LegiScan quota stop
 * (decisions.md § 2026-06-28) — a genuine bug (4xx/auth/schema) still pages.
 */
export function isTransientUpstreamError(e: unknown): boolean {
  const err = e as
    | { response?: { status?: number }; status?: number; code?: unknown; message?: unknown }
    | null
    | undefined;

  const status =
    err?.response?.status ?? (typeof err?.status === 'number' ? err.status : undefined);
  if (typeof status === 'number') return status >= 500 || status === 429;

  const code = typeof err?.code === 'string' ? err.code.toUpperCase() : '';
  if (TRANSIENT_NETWORK_CODES.has(code)) return true;

  // Fall back to the message for errors that wrap the upstream status as text
  // (e.g. the Open States client throws `Error("OpenStates API 504: …")`).
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(e ?? '');
  if (/(?:status(?:\s+code)?\s+|\bapi\s+|\bhttp\s+)(?:429|5\d\d)\b/i.test(msg)) return true;
  return /\b(?:gateway time-?out|timed?\s*out|socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/i.test(
    msg,
  );
}

export function diffFinding(
  severity: Severity,
  domain: string,
  entity: string,
  field: string,
  expected: string | null | undefined,
  actual: string | null | undefined,
  url?: string,
  session?: string | null,
): Finding {
  const clip = (s: string | null | undefined) => {
    const t = (s ?? '').toString();
    return t.length > 160 ? `${t.slice(0, 157)}…` : t;
  };
  return {
    severity,
    domain,
    entity,
    field,
    message: `${field} mismatch`,
    expected: clip(expected),
    actual: clip(actual),
    url,
    ...(session ? { session } : {}),
  };
}

/**
 * Terminal disposition of a caught error.
 *
 * `upstream_outage` — a 5xx / 429 / gateway timeout / network failure on a
 * source of truth we cannot control. Reported as `outage`, exits 0.
 * `crash` — anything else (auth 4xx, schema drift, our own bug). Reported as
 * `error`, exits 1, pages #errors.
 *
 * Every checker's catch block routes through this so the outage-vs-drift
 * boundary is enforced in one place instead of five ad-hoc paths.
 */
export type CheckerErrorKind = 'upstream_outage' | 'crash';

export function classifyCheckerError(e: unknown): CheckerErrorKind {
  return isTransientUpstreamError(e) ? 'upstream_outage' : 'crash';
}

/**
 * Message off a caught error. Uniform across every checker so the report layer
 * can pattern-match "…transient" reasons consistently and clip them the same way.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Derive counts from findings and finalize a {@link CheckerResult}. */
export function summarizeResult(
  domain: string,
  checked: number,
  findings: Finding[],
  startedAtMs: number,
  extra: Partial<
    Pick<
      CheckerResult,
      | 'skipped'
      | 'skipReason'
      | 'error'
      | 'outage'
      | 'outageSource'
      | 'upstreamFailures'
      | 'checkedBreakdown'
    >
  > = {},
): CheckerResult {
  const failures = findings.filter((f) => f.severity === 'fail').length;
  const warnings = findings.filter((f) => f.severity === 'warn').length;

  const flagged = new Set<string>();
  let anon = 0;
  for (const f of findings) {
    if (f.severity === 'info') continue;
    if (f.entity) flagged.add(f.entity);
    else anon += 1;
  }
  const passed = Math.max(0, checked - flagged.size - anon);

  return {
    domain,
    checked,
    passed,
    warnings,
    failures,
    findings,
    durationMs: Date.now() - startedAtMs,
    ...extra,
  };
}

/**
 * Terminal result for a checker whose upstream source of truth is unreachable.
 *
 * Any findings already gathered before the outage (e.g. corpus invariants that
 * ran without upstream) are preserved so partial progress is not thrown away.
 */
export function outageResult(
  domain: string,
  source: string,
  e: unknown,
  startedAtMs: number,
  opts: { checked?: number; findings?: Finding[] } = {},
): CheckerResult {
  return summarizeResult(domain, opts.checked ?? 0, opts.findings ?? [], startedAtMs, {
    outage: true,
    outageSource: source,
    skipped: true,
    skipReason: `${source} unavailable (transient): ${errorMessage(e)}`,
  });
}

/** Terminal result for a checker that crashed on something that isn't a transient upstream failure. */
export function crashResult(
  domain: string,
  e: unknown,
  startedAtMs: number,
  opts: { checked?: number; findings?: Finding[]; prefix?: string } = {},
): CheckerResult {
  const msg = opts.prefix ? `${opts.prefix}: ${errorMessage(e)}` : errorMessage(e);
  return summarizeResult(domain, opts.checked ?? 0, opts.findings ?? [], startedAtMs, {
    error: msg,
  });
}

/**
 * Route a caught error to the right terminal result.
 *
 * Convenience over the (classify → outageResult | crashResult) idiom so every
 * catch site in the checkers looks identical.
 */
export function terminalResultFrom(
  domain: string,
  source: string,
  e: unknown,
  startedAtMs: number,
  opts: { checked?: number; findings?: Finding[]; crashPrefix?: string } = {},
): CheckerResult {
  if (classifyCheckerError(e) === 'upstream_outage') {
    return outageResult(domain, source, e, startedAtMs, opts);
  }
  return crashResult(domain, e, startedAtMs, { ...opts, prefix: opts.crashPrefix });
}
