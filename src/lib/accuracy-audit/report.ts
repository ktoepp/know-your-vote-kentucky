/**
 * Aggregation + formatting for the content-accuracy audit.
 *
 * Turns the array of {@link CheckerResult} into:
 *   - an {@link AuditSummary} (totals + exit decision),
 *   - a console-friendly report, and
 *   - a Slack `text` body (Block-Kit-free, matching slack-webhook.ts style).
 */
import type { CheckerResult, Finding, Severity } from './types';

/**
 * Drop findings whose fingerprint has been dismissed. Re-derives per-domain
 * counts (warnings/failures/passed) from the remaining findings so the report
 * layer never accidentally re-surfaces a dismissed row via a stale count.
 *
 * Kept out of the individual checkers by design: dismissal is an operator
 * decision about noise, not a signal the checker itself should be aware of.
 * Applied once at the aggregation boundary in the orchestrator.
 */
export function applyDismissals(
  results: CheckerResult[],
  dismissed: Set<string>,
  fingerprintOf: (f: Finding) => string,
): { results: CheckerResult[]; dismissedCount: number } {
  if (dismissed.size === 0) return { results, dismissedCount: 0 };
  let dismissedCount = 0;
  const out = results.map((r) => {
    const kept: Finding[] = [];
    for (const f of r.findings) {
      if (dismissed.has(fingerprintOf(f))) {
        dismissedCount += 1;
        continue;
      }
      kept.push(f);
    }
    if (kept.length === r.findings.length) return r;
    const failures = kept.filter((f) => f.severity === 'fail').length;
    const warnings = kept.filter((f) => f.severity === 'warn').length;
    // Passed is checked minus distinct flagged entities in the filtered set,
    // symmetric with summarizeResult so counts stay honest after filtering.
    const flagged = new Set<string>();
    let anon = 0;
    for (const f of kept) {
      if (f.severity === 'info') continue;
      if (f.entity) flagged.add(f.entity);
      else anon += 1;
    }
    const passed = Math.max(0, r.checked - flagged.size - anon);
    return { ...r, findings: kept, failures, warnings, passed };
  });
  return { results: out, dismissedCount };
}

export interface AuditSummary {
  results: CheckerResult[];
  checked: number;
  passed: number;
  warnings: number;
  failures: number;
  /**
   * Checkers that crashed (`result.error` set) — a bug on our side or a source
   * of truth returning something we cannot parse. These fail CI and page #errors.
   */
  erroredDomains: string[];
  /**
   * Domains that could not reach their upstream source. Two paths in:
   *   1. Whole-checker outage (`result.outage === true`) — the roster / calendar
   *      / Anthropic pass never returned.
   *   2. Per-item outage ratio — a fan-out checker (bills, votes, materials) hit
   *      the upstream-failure threshold across its sample.
   * Reported visibly in the digest but NOT escalated to #errors: we cannot fix
   * an upstream outage from our side, and paging on it every hiccup trains
   * operators to skim past a channel that should mean "act now".
   */
  upstreamOutageDomains: string[];
  /** True when any content `fail` finding occurred (reported, but does not fail CI). */
  hasHardFailures: boolean;
  /**
   * True when a checker crashed. This is the only thing that fails the run and
   * escalates to #errors — upstream outages surface in the digest and exit 0.
   */
  hasOperationalError: boolean;
  /** Sampling seed used for this run (rerun with the same seed to reproduce). */
  seed: number;
  startedAt: string;
  durationMs: number;
}

/** Fraction of a domain's attempted items that must fail upstream to count as an outage. */
const UPSTREAM_OUTAGE_RATIO = 0.5;
/** Floor so a 1-of-2 blip on a tiny sample does not page. */
const UPSTREAM_OUTAGE_MIN_FAILURES = 5;

export function summarizeAudit(results: CheckerResult[], startedAtMs: number, seed: number): AuditSummary {
  let checked = 0;
  let passed = 0;
  let warnings = 0;
  let failures = 0;
  const erroredDomains: string[] = [];
  const upstreamOutageDomains: string[] = [];

  for (const r of results) {
    checked += r.checked;
    passed += r.passed;
    warnings += r.warnings;
    failures += r.failures;
    if (r.error) {
      erroredDomains.push(r.domain);
      continue;
    }

    // Whole-checker outage set by the checker itself (roster/calendar/Anthropic
    // fetch failed once with a transient class).
    if (r.outage) {
      upstreamOutageDomains.push(r.domain);
      continue;
    }

    // Fan-out outage: enough per-item upstream failures to say the domain
    // verified nothing. Same threshold as before; the difference is what we do
    // with it — we surface it, we don't page.
    const upstreamFailures = r.upstreamFailures ?? 0;
    const attempted = upstreamFailures + r.checked;
    if (
      !r.skipped &&
      upstreamFailures >= UPSTREAM_OUTAGE_MIN_FAILURES &&
      attempted > 0 &&
      upstreamFailures / attempted >= UPSTREAM_OUTAGE_RATIO
    ) {
      upstreamOutageDomains.push(r.domain);
    }
  }

  return {
    results,
    checked,
    passed,
    warnings,
    failures,
    erroredDomains,
    upstreamOutageDomains,
    hasHardFailures: failures > 0 || erroredDomains.length > 0,
    // Crashes ONLY. An upstream outage is not an operational error we can act on
    // — it exits 0 and posts a visible outage banner instead of turning CI red.
    hasOperationalError: erroredDomains.length > 0,
    seed,
    startedAt: new Date(startedAtMs).toISOString(),
    durationMs: Date.now() - startedAtMs,
  };
}

/**
 * Reasons carry raw upstream text — a transient 504 skip reason can drag in a
 * full HTML error body (the Open States client wraps `<html>…504 Gateway
 * Time-out…</html>` into its message). Clip to one readable line so a single
 * outage doesn't flood the digest.
 */
function clipReason(s: string, max = 140): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function domainStatusLine(r: CheckerResult): string {
  if (r.error) return `• ${r.domain}: ERROR — ${clipReason(r.error)}`;
  if (r.outage) {
    // Outage-first phrasing so the operator sees "the source was out" before
    // the reason. Reason is clipped so a 504 HTML body doesn't flood the digest.
    const src = r.outageSource ?? 'upstream';
    return `• ${r.domain}: upstream outage (${src}) — ${clipReason(r.skipReason ?? 'unavailable')}`;
  }
  if (r.skipped) return `• ${r.domain}: skipped${r.skipReason ? ` — ${clipReason(r.skipReason)}` : ''}`;
  const parts = [`${r.checked} checked`, `${r.passed} ok`];
  if (r.upstreamFailures) parts.push(`${r.upstreamFailures} upstream fetch failure(s)`);
  if (r.failures > 0) parts.push(`${r.failures} fail`);
  if (r.warnings > 0) parts.push(`${r.warnings} warn`);
  return `• ${r.domain}: ${parts.join(', ')}`;
}

function findingLine(f: Finding, fingerprint?: string): string {
  const mark = f.severity === 'fail' ? 'FAIL' : f.severity === 'warn' ? 'WARN' : 'INFO';
  const where = [f.entity, f.field].filter(Boolean).join(' · ');
  const detail =
    f.expected != null || f.actual != null
      ? ` (expected: ${f.expected ?? '∅'} | stored: ${f.actual ?? '∅'})`
      : '';
  // Fingerprint suffix — copy/paste into `npm run audit:dismiss add <fp> --reason=…`.
  const fp = fingerprint ? `  [fp=${fingerprint}]` : '';
  return `[${mark}] ${where ? `${where}: ` : ''}${f.message}${detail}${fp}`;
}

/** Human-readable console report (full findings). */
export function formatConsoleReport(
  summary: AuditSummary,
  opts: { fingerprintOf?: (f: Finding) => string } = {},
): string {
  const lines: string[] = [];
  lines.push('KYVKY content accuracy audit');
  lines.push(
    `checked=${summary.checked} ok=${summary.passed} fail=${summary.failures} warn=${summary.warnings} ` +
      `seed=${summary.seed} (${(summary.durationMs / 1000).toFixed(1)}s)`,
  );
  lines.push('');
  for (const r of summary.results) {
    lines.push(domainStatusLine(r));
    for (const f of r.findings) {
      lines.push(`    ${findingLine(f, opts.fingerprintOf?.(f))}`);
    }
  }
  return lines.join('\n');
}

/**
 * Status word for the Slack header — bolded inline with the totals.
 *
 * Order matters: an outage carries no content `fail`s (it produced nothing to
 * diff), so it must be named ahead of "warnings" or the digest headlines as
 * routine drift. Crashes take precedence over outages because a crash means
 * something on our side broke — someone should look at it now.
 */
function slackStatusLabel(summary: AuditSummary): string {
  if (summary.erroredDomains.length > 0) {
    return `operational error (${summary.erroredDomains.join(', ')})`;
  }
  if (summary.upstreamOutageDomains.length > 0) {
    return `upstream outage (${summary.upstreamOutageDomains.join(', ')})`;
  }
  if (summary.failures > 0) return 'content failures';
  if (summary.warnings > 0) return 'content warnings';
  return 'all clear';
}

/** Totals line. Zero `fail`/`warn` counts are omitted to keep clean runs uncluttered. */
function slackTotalsLine(summary: AuditSummary): string {
  const parts = [
    `*${slackStatusLabel(summary)}*`,
    `checked \`${summary.checked}\``,
    `ok \`${summary.passed}\``,
  ];
  if (summary.failures > 0) parts.push(`fail \`${summary.failures}\``);
  if (summary.warnings > 0) parts.push(`warn \`${summary.warnings}\``);
  parts.push(`seed \`${summary.seed}\``);
  parts.push(`${(summary.durationMs / 1000).toFixed(0)}s`);
  return parts.join(' · ');
}

/** Compact "1 fail, 2 warn" label for a domain's notable findings. */
function notableCountLabel(findings: Finding[]): string {
  const fail = findings.filter((f) => f.severity === 'fail').length;
  const warn = findings.filter((f) => f.severity === 'warn').length;
  const bits: string[] = [];
  if (fail > 0) bits.push(`${fail} fail`);
  if (warn > 0) bits.push(`${warn} warn`);
  return bits.join(', ');
}

/**
 * Collapse findings that share a root cause.
 *
 * One status-mapper regression across 30 bills used to render as eight
 * near-identical lines plus "…and 22 more" — the operator saw the field name
 * eight times and never learned the shape of the failure. Grouping reports it
 * once, with a count and one worked example.
 *
 * Findings produced by `diffFinding` carry a generic `<field> mismatch` message,
 * so `field` is the natural key; findings with a bespoke message group on the
 * message instead.
 */
interface FindingGroup {
  domain: string;
  severity: Severity;
  label: string;
  count: number;
  example: Finding;
  entities: string[];
  /** Earliest prior sighting across the group, when history is available. */
  firstSeen: string | null;
}

function groupKeyFor(f: Finding): string {
  return f.field ? `${f.domain}|f:${f.field}|${f.severity}` : `${f.domain}|m:${f.message.slice(0, 60)}|${f.severity}`;
}

export function groupFindings(findings: Finding[], recurrence?: RecurrenceLookup): FindingGroup[] {
  const byKey = new Map<string, FindingGroup>();
  for (const f of findings) {
    if (f.severity === 'info') continue;
    const key = groupKeyFor(f);
    const existing = byKey.get(key);
    const firstSeen = recurrence?.(f) ?? null;
    if (existing) {
      existing.count += 1;
      if (f.entity) existing.entities.push(f.entity);
      if (firstSeen && (!existing.firstSeen || firstSeen < existing.firstSeen)) {
        existing.firstSeen = firstSeen;
      }
      continue;
    }
    byKey.set(key, {
      domain: f.domain,
      severity: f.severity,
      label: f.field ? `${f.field} — ${f.message}` : f.message,
      count: 1,
      example: f,
      entities: f.entity ? [f.entity] : [],
      firstSeen,
    });
  }
  // Failures first, then the largest clusters.
  return [...byKey.values()].sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'fail' ? -1 : 1) || b.count - a.count,
  );
}

/** Maps a finding to the timestamp it was first seen, or null when it is new. */
export type RecurrenceLookup = (f: Finding) => string | null;

function ageLabel(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'earlier';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 60) return `${days} days`;
  return `${Math.floor(days / 30)} months`;
}

function slackGroupLines(g: FindingGroup): string {
  const tag = g.severity === 'fail' ? '*fail* ' : '';
  const scope = g.count > 1 ? ` — *${g.count}* affected` : '';
  const age = g.firstSeen ? ` · _recurring for ${ageLabel(g.firstSeen)}_` : ' · _new_';
  const lines = [`  • ${tag}${g.label}${scope}${age}`];

  const e = g.example;
  const who = g.entities.length > 0 ? g.entities.slice(0, 3).join(', ') : e.entity ?? '';
  const detail =
    e.expected != null || e.actual != null
      ? `expected \`${e.expected ?? '∅'}\` · stored \`${e.actual ?? '∅'}\``
      : '';
  if (who || detail) {
    const more = g.count > 3 ? `, +${g.count - 3} more` : '';
    lines.push(`     ${who ? `${who}${more}` : ''}${who && detail ? ' — ' : ''}${detail}`.trimEnd());
  }
  // The URL was collected by the checkers and never rendered.
  if (e.url) lines.push(`     ${e.url}`);
  return lines.join('\n');
}

/**
 * Slack message body.
 *
 * The previous 3500-char cap was ~11× tighter than Slack's ~40k `text` limit and
 * truncated whole trailing sections, so `materials` and `llm` were the first
 * domains to vanish on a noisy run — exactly when their findings mattered.
 */
export function formatSlackReport(
  summary: AuditSummary,
  opts: { maxGroupsPerDomain?: number; recurrence?: RecurrenceLookup } = {},
): string {
  const maxGroupsPerDomain = opts.maxGroupsPerDomain ?? 8;

  const allNotable = summary.results.flatMap((r) => r.findings.filter((f) => f.severity !== 'info'));
  const allGroups = groupFindings(allNotable, opts.recurrence);
  const newGroups = allGroups.filter((g) => !g.firstSeen).length;
  const recurringGroups = allGroups.length - newGroups;

  const sections: string[] = [
    '*KY Vote — content accuracy audit*',
    slackTotalsLine(summary),
  ];
  // "new · recurring" only makes sense when there are groups to place on that
  // axis. On clean runs / pure outages, the extra line is noise.
  if (opts.recurrence && allGroups.length > 0) {
    sections.push(`${newGroups} new · ${recurringGroups} recurring (grouped by cause)`);
  }
  sections.push('', summary.results.map(domainStatusLine).join('\n'));

  for (const r of summary.results) {
    // Outaged / crashed domains: the status line above already says what happened.
    // The per-item warns they produced ("LegiScan fetch failed") are noise here —
    // they'd render as a group titled "fetch failed" that just repeats the outage.
    if (r.outage || r.error) continue;
    const groups = groupFindings(
      r.findings.filter((f) => f.severity !== 'info'),
      opts.recurrence,
    );
    if (groups.length === 0) continue;
    const shown = groups.slice(0, maxGroupsPerDomain).map(slackGroupLines);
    const more =
      groups.length > maxGroupsPerDomain
        ? `\n  _…and ${groups.length - maxGroupsPerDomain} more group(s)_`
        : '';
    const notable = r.findings.filter((f) => f.severity !== 'info');
    sections.push(`\n*${r.domain}* (${notableCountLabel(notable)})\n${shown.join('\n')}${more}`);
  }

  const body = sections.join('\n');
  const MAX = 38_000;
  return body.length > MAX ? `${body.slice(0, MAX)}\n_…(truncated)_` : body;
}
