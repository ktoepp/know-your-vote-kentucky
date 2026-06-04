/**
 * Aggregation + formatting for the content-accuracy audit.
 *
 * Turns the array of {@link CheckerResult} into:
 *   - an {@link AuditSummary} (totals + exit decision),
 *   - a console-friendly report, and
 *   - a Slack `text` body (Block-Kit-free, matching slack-webhook.ts style).
 */
import type { CheckerResult, Finding } from './types';

export interface AuditSummary {
  results: CheckerResult[];
  checked: number;
  passed: number;
  warnings: number;
  failures: number;
  /** Checkers that crashed (result.error set). */
  erroredDomains: string[];
  /** True when any content `fail` finding occurred (reported, but does not fail CI). */
  hasHardFailures: boolean;
  /** True when a checker crashed — an operational problem that DOES fail the run. */
  hasOperationalError: boolean;
  /** Sampling seed used for this run (rerun with the same seed to reproduce). */
  seed: number;
  startedAt: string;
  durationMs: number;
}

export function summarizeAudit(results: CheckerResult[], startedAtMs: number, seed: number): AuditSummary {
  let checked = 0;
  let passed = 0;
  let warnings = 0;
  let failures = 0;
  const erroredDomains: string[] = [];

  for (const r of results) {
    checked += r.checked;
    passed += r.passed;
    warnings += r.warnings;
    failures += r.failures;
    if (r.error) erroredDomains.push(r.domain);
  }

  return {
    results,
    checked,
    passed,
    warnings,
    failures,
    erroredDomains,
    hasHardFailures: failures > 0 || erroredDomains.length > 0,
    hasOperationalError: erroredDomains.length > 0,
    seed,
    startedAt: new Date(startedAtMs).toISOString(),
    durationMs: Date.now() - startedAtMs,
  };
}

function domainStatusLine(r: CheckerResult): string {
  if (r.error) return `• ${r.domain}: ERROR — ${r.error}`;
  if (r.skipped) return `• ${r.domain}: skipped${r.skipReason ? ` — ${r.skipReason}` : ''}`;
  const parts = [`${r.checked} checked`, `${r.passed} ok`];
  if (r.failures > 0) parts.push(`${r.failures} fail`);
  if (r.warnings > 0) parts.push(`${r.warnings} warn`);
  return `• ${r.domain}: ${parts.join(', ')}`;
}

function findingLine(f: Finding): string {
  const mark = f.severity === 'fail' ? 'FAIL' : f.severity === 'warn' ? 'WARN' : 'INFO';
  const where = [f.entity, f.field].filter(Boolean).join(' · ');
  const detail =
    f.expected != null || f.actual != null
      ? ` (expected: ${f.expected ?? '∅'} | stored: ${f.actual ?? '∅'})`
      : '';
  return `[${mark}] ${where ? `${where}: ` : ''}${f.message}${detail}`;
}

/** Human-readable console report (full findings). */
export function formatConsoleReport(summary: AuditSummary): string {
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
      lines.push(`    ${findingLine(f)}`);
    }
  }
  return lines.join('\n');
}

/** Status word for the Slack header — bolded inline with the totals. */
function slackStatusLabel(summary: AuditSummary): string {
  if (summary.hasHardFailures) return 'failures';
  if (summary.warnings > 0) return 'warnings';
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
 * Slack finding line. Drops the `[WARN]`/`[FAIL]` bracket (severity is conveyed
 * by the per-domain count + overall status); only the rarer `fail` keeps a bold
 * tag. Expected/stored values move to an indented sub-line for readability.
 */
function slackFindingLine(f: Finding): string {
  const where = [f.entity, f.field].filter(Boolean).join(' · ');
  const tag = f.severity === 'fail' ? '*fail* ' : '';
  const head = `${tag}${where ? `${where} — ` : ''}${f.message}`;
  if (f.expected != null || f.actual != null) {
    return `  • ${head}\n     expected \`${f.expected ?? '∅'}\` · stored \`${f.actual ?? '∅'}\``;
  }
  return `  • ${head}`;
}

/** Slack message body. Caps findings per domain to keep the message readable. */
export function formatSlackReport(summary: AuditSummary, maxFindingsPerDomain = 8): string {
  const sections: string[] = [
    '*KY Vote — content accuracy audit*',
    slackTotalsLine(summary),
    '',
    summary.results.map(domainStatusLine).join('\n'),
  ];

  const flagged = summary.results.filter((r) => r.findings.some((f) => f.severity !== 'info'));
  for (const r of flagged) {
    // Surface failures before warnings within each domain.
    const notable = r.findings
      .filter((f) => f.severity !== 'info')
      .sort((a, b) =>
        a.severity === b.severity ? 0 : a.severity === 'fail' ? -1 : 1,
      );
    if (notable.length === 0) continue;
    const shown = notable.slice(0, maxFindingsPerDomain).map(slackFindingLine);
    const more =
      notable.length > maxFindingsPerDomain
        ? `\n  _…and ${notable.length - maxFindingsPerDomain} more_`
        : '';
    sections.push(`\n*${r.domain}* (${notableCountLabel(notable)})\n${shown.join('\n')}${more}`);
  }

  const body = sections.join('\n');
  return body.length > 3500 ? `${body.slice(0, 3500)}\n_…(truncated)_` : body;
}
