/**
 * Persistence + recurrence lookup for accuracy-audit runs.
 *
 * Each run used to be discarded after printing, so the digest could not say
 * whether a finding was new or had been open for months — every week reported
 * the same drift identically. Writing runs and fingerprinted findings gives the
 * report a "new this run" vs "recurring since <date>" split and leaves a trend
 * history behind.
 *
 * Best-effort by design: a failure to record history must never fail an audit
 * run or suppress its Slack report.
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditSummary } from './report';
import type { Finding } from './types';

/**
 * Stable identity of "the same finding" across runs.
 *
 * Deliberately excludes `expected` / `actual`: a status that drifts from one
 * wrong value to another is still the same open issue, and including the values
 * would make every re-drift look new.
 *
 * Includes `session` so that HB100 in 2024 and HB100 in 2026 — the same human
 * label pointing at different bills — do not collide in the recurrence map.
 * Findings without a session (legislators, committees, materials, votes, glossary
 * items) hash on an empty session component, so their fingerprints are stable
 * both before and after this field was introduced.
 */
export function findingFingerprint(f: Finding): string {
  const payload = [f.domain, f.entity ?? '', f.field ?? '', f.message, f.session ?? ''].join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

export interface RecurrenceInfo {
  /** Fingerprints seen in an earlier run, mapped to their first-seen timestamp. */
  firstSeenByFingerprint: Map<string, string>;
}

/**
 * Fingerprints an operator has explicitly accepted as noise. Populated from
 * `ky_accuracy_dismissed_findings` (migration 052). Returns an empty set if
 * the table doesn't exist yet — the audit degrades to reporting everything,
 * which is the correct behavior when dismissals aren't configured.
 */
export async function fetchDismissedFingerprints(db: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const { data, error } = await db
      .from('ky_accuracy_dismissed_findings')
      .select('fingerprint, expires_at');
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      // Migration not yet applied → treat as "no dismissals configured".
      if (msg.includes('ky_accuracy_dismissed_findings') || msg.includes('does not exist')) {
        return out;
      }
      throw new Error(error.message);
    }
    const now = Date.now();
    for (const row of (data ?? []) as Array<{ fingerprint: string; expires_at: string | null }>) {
      const exp = row.expires_at ? Date.parse(row.expires_at) : null;
      if (exp != null && Number.isFinite(exp) && exp <= now) continue;
      out.add(row.fingerprint);
    }
  } catch (e) {
    // Never let dismissal lookup fail the audit — worst case we report a known
    // noise finding this run, which is the pre-dismissal behavior.
    console.error(
      '[accuracy-audit] dismissed-findings lookup failed:',
      e instanceof Error ? e.message : e,
    );
  }
  return out;
}

/**
 * Default recurrence-lookback window. A finding first seen more than this many
 * days ago no longer contributes to the "recurring for N days" label — practical
 * usefulness of that label peaks in weeks, not years, and unbounded scans over
 * `ky_accuracy_findings.fingerprint` grow linearly with retention. Overridable
 * via `ACCURACY_RECURRENCE_LOOKBACK_DAYS`; `0` disables the bound (back-compat).
 */
const DEFAULT_RECURRENCE_LOOKBACK_DAYS = 365;

function recurrenceLookbackDays(): number {
  const raw = process.env.ACCURACY_RECURRENCE_LOOKBACK_DAYS?.trim();
  if (!raw) return DEFAULT_RECURRENCE_LOOKBACK_DAYS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RECURRENCE_LOOKBACK_DAYS;
}

/**
 * Look up which of this run's fingerprints have been seen before, and when they
 * first appeared. Returns empty info when history is unavailable — the report
 * then simply omits the new/recurring split.
 *
 * Bounded by {@link DEFAULT_RECURRENCE_LOOKBACK_DAYS} so retention decisions
 * (pruning old rows, adding a partition) don't have to touch this query.
 */
export async function fetchRecurrence(
  db: SupabaseClient,
  fingerprints: string[],
): Promise<RecurrenceInfo> {
  const firstSeenByFingerprint = new Map<string, string>();
  if (fingerprints.length === 0) return { firstSeenByFingerprint };

  const lookbackDays = recurrenceLookbackDays();
  const sinceIso =
    lookbackDays > 0
      ? new Date(Date.now() - lookbackDays * 86_400_000).toISOString()
      : null;

  try {
    // Chunked so a large finding set cannot blow the URL length limit.
    const CHUNK = 100;
    for (let i = 0; i < fingerprints.length; i += CHUNK) {
      const chunk = fingerprints.slice(i, i + CHUNK);
      let query = db
        .from('ky_accuracy_findings')
        .select('fingerprint, observed_at')
        .in('fingerprint', chunk)
        .order('observed_at', { ascending: true });
      if (sinceIso) query = query.gte('observed_at', sinceIso);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        const fp = row.fingerprint as string;
        if (!firstSeenByFingerprint.has(fp)) {
          firstSeenByFingerprint.set(fp, row.observed_at as string);
        }
      }
    }
  } catch (e) {
    console.error(
      '[accuracy-audit] recurrence lookup failed:',
      e instanceof Error ? e.message : e,
    );
  }
  return { firstSeenByFingerprint };
}

/** Persist a run and its findings. Returns the run id, or null when not recorded. */
export async function recordAuditRun(
  db: SupabaseClient,
  summary: AuditSummary,
): Promise<string | null> {
  try {
    const domainSummary: Record<string, unknown> = {};
    for (const r of summary.results) {
      domainSummary[r.domain] = {
        checked: r.checked,
        passed: r.passed,
        warnings: r.warnings,
        failures: r.failures,
        durationMs: r.durationMs,
        skipped: r.skipped ?? false,
        skipReason: r.skipReason ?? null,
        error: r.error ?? null,
        // Outage state — triage-findings.ts reads these back so the LLM triage
        // can distinguish "the source went down" from "the content is wrong".
        outage: r.outage ?? false,
        outageSource: r.outageSource ?? null,
        upstreamFailures: r.upstreamFailures ?? 0,
        // Under-coverage marks a domain whose checker "succeeded" but verified
        // less than the configured floor — a silent Supabase-empty-set failure.
        // Triage should not treat such a domain's findings as full coverage.
        underCoverage: r.underCoverage ?? false,
        coverageFloor: r.coverageFloor ?? null,
      };
    }

    const { data: run, error: runErr } = await db
      .from('ky_accuracy_runs')
      .insert({
        started_at: summary.startedAt,
        duration_ms: summary.durationMs,
        seed: summary.seed,
        checked: summary.checked,
        passed: summary.passed,
        warnings: summary.warnings,
        failures: summary.failures,
        errored_domains: summary.erroredDomains,
        has_operational_error: summary.hasOperationalError,
        domain_summary: domainSummary,
      })
      .select('id')
      .single();
    if (runErr || !run) throw new Error(runErr?.message ?? 'run insert returned no row');

    const rows = summary.results.flatMap((r) =>
      r.findings
        .filter((f) => f.severity !== 'info')
        .map((f) => ({
          run_id: run.id as string,
          fingerprint: findingFingerprint(f),
          domain: f.domain,
          severity: f.severity,
          entity: f.entity ?? null,
          field: f.field ?? null,
          message: f.message,
          expected: f.expected ?? null,
          actual: f.actual ?? null,
          url: f.url ?? null,
        })),
    );

    if (rows.length > 0) {
      const { error: fErr } = await db.from('ky_accuracy_findings').insert(rows);
      if (fErr) throw new Error(fErr.message);
    }

    return run.id as string;
  } catch (e) {
    // History is an observability aid; never let it fail the run.
    console.error('[accuracy-audit] failed to record run:', e instanceof Error ? e.message : e);
    return null;
  }
}
