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
 */
export function findingFingerprint(f: Finding): string {
  const payload = [f.domain, f.entity ?? '', f.field ?? '', f.message].join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

export interface RecurrenceInfo {
  /** Fingerprints seen in an earlier run, mapped to their first-seen timestamp. */
  firstSeenByFingerprint: Map<string, string>;
}

/**
 * Look up which of this run's fingerprints have been seen before, and when they
 * first appeared. Returns empty info when history is unavailable — the report
 * then simply omits the new/recurring split.
 */
export async function fetchRecurrence(
  db: SupabaseClient,
  fingerprints: string[],
): Promise<RecurrenceInfo> {
  const firstSeenByFingerprint = new Map<string, string>();
  if (fingerprints.length === 0) return { firstSeenByFingerprint };

  try {
    // Chunked so a large finding set cannot blow the URL length limit.
    const CHUNK = 100;
    for (let i = 0; i < fingerprints.length; i += CHUNK) {
      const chunk = fingerprints.slice(i, i + CHUNK);
      const { data, error } = await db
        .from('ky_accuracy_findings')
        .select('fingerprint, observed_at')
        .in('fingerprint', chunk)
        .order('observed_at', { ascending: true });
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
