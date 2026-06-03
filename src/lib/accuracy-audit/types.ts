/**
 * Shared types + config for the KYVKY content-accuracy audit.
 *
 * Each checker re-fetches a primary source (LegiScan, Open States, LRC HTML)
 * and diffs it against what is stored in Supabase, returning a {@link CheckerResult}.
 * The orchestrator (`scripts/accuracy-audit.ts`) aggregates results and posts to Slack.
 */

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
  /** Checker-level crash; treated as a hard failure by the orchestrator. */
  error?: string;
}

export interface AuditConfig {
  /** Only consider content changed/active within this many days. */
  lookbackDays: number;
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

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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
  return {
    seed: resolveSeed(overrides.seed),
    lookbackDays: envInt('ACCURACY_DAYS', 14),
    billsLimit: envInt('ACCURACY_BILLS_LIMIT', 40),
    votesLimit: envInt('ACCURACY_VOTES_LIMIT', 15),
    materialsCommitteeLimit: envInt('ACCURACY_MATERIALS_COMMITTEE_LIMIT', 12),
    linkSampleLimit: envInt('ACCURACY_LINK_SAMPLE', 25),
    probeLinks: envBool('ACCURACY_PROBE_LINKS'),
    llmSample: envInt('ACCURACY_LLM_SAMPLE', 8),
    skipLlm: overrides.skipLlm ?? envBool('ACCURACY_SKIP_LLM'),
    llmModel: process.env.ACCURACY_LLM_MODEL?.trim() || 'claude-sonnet-4-6',
    legiscanQuotaStopPct: envInt('ACCURACY_LEGISCAN_QUOTA_STOP_PCT', 95),
    dryRun: overrides.dryRun ?? false,
    domains: overrides.domains ?? null,
  };
}

export function domainEnabled(cfg: AuditConfig, domain: AuditDomain): boolean {
  return cfg.domains == null || cfg.domains.has(domain);
}

/** Collapse whitespace + lowercase for tolerant text comparison. */
export function norm(v: string | null | undefined): string {
  return (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function diffFinding(
  severity: Severity,
  domain: string,
  entity: string,
  field: string,
  expected: string | null | undefined,
  actual: string | null | undefined,
  url?: string,
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
  };
}

/** Derive counts from findings and finalize a {@link CheckerResult}. */
export function summarizeResult(
  domain: string,
  checked: number,
  findings: Finding[],
  startedAtMs: number,
  extra: Partial<Pick<CheckerResult, 'skipped' | 'skipReason' | 'error'>> = {},
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
