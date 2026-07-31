#!/usr/bin/env npx tsx
/**
 * Triage agent for check-workflow output.
 *
 * The accuracy audit and source-health check both post raw results to Slack.
 * That tells an operator *what* was observed but not what to do about it, and a
 * digest of a dozen findings with no ranking gets skimmed — the same failure
 * mode that made the old un-grouped report unreadable.
 *
 * This reads what the checks actually recorded (`ky_accuracy_runs` /
 * `ky_accuracy_findings`, plus live source health) and asks Claude for a short
 * operator-facing triage: what needs action now, what is probably noise, and the
 * concrete next step for each. The triage is posted to Slack as a follow-up to
 * the raw digest, never as a replacement for it.
 *
 * Deliberate boundaries, consistent with decisions.md § 2026-06-03:
 *   - Advisory only. It never changes a severity, never fails a workflow, and
 *     never decides that a finding can be closed.
 *   - It is given ONLY what the checks recorded. It does not re-derive findings
 *     or reach for primary sources, so it cannot invent drift.
 *   - Every claim it makes is traceable to a finding row the operator can read.
 *
 * Usage:
 *   npx tsx scripts/triage-findings.ts               # triage latest audit run + source health
 *   npx tsx scripts/triage-findings.ts --dry-run     # print, never post
 *   npx tsx scripts/triage-findings.ts --source=health   # source health only
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL, ANTHROPIC_API_KEY.
 * Optional: SLACK_WEBHOOK_STATUS_REPORTS / SLACK_WEBHOOK_URL, SLACK_SYNC_NOTIFY_CLI=true.
 *
 * Exit: always 0 unless its own inputs are unreadable. Triage failing must never
 *       turn a green check red — the raw digest has already been delivered.
 */
import './load-env';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { KY_DEFAULT_ANTHROPIC_MODEL } from '../src/lib/anthropic-model';
import { evaluateSourceHealth, fetchSourceRows, formatSourceHealth } from '../src/lib/source-health';
import { notifyTriageSlack } from '../src/lib/slack-webhook';

type TriageSource = 'audit' | 'health' | 'all';

function parseArgs(argv: string[]) {
  const sourceArg = argv.find((a) => a.startsWith('--source='))?.split('=')[1];
  const source: TriageSource =
    sourceArg === 'audit' || sourceArg === 'health' ? sourceArg : 'all';
  return { dryRun: argv.includes('--dry-run'), source };
}

interface AuditContext {
  runId: string;
  startedAt: string;
  seed: number;
  totals: { checked: number; passed: number; warnings: number; failures: number };
  erroredDomains: string[];
  findings: Array<{
    domain: string;
    severity: string;
    entity: string | null;
    field: string | null;
    message: string;
    expected: string | null;
    actual: string | null;
    /** How long this exact finding has been recurring, in days. */
    recurringDays: number | null;
  }>;
}

/** Latest audit run plus its findings, annotated with how long each has recurred. */
async function loadAuditContext(): Promise<AuditContext | null> {
  if (!supabaseAdmin) return null;
  const { data: runs } = await supabaseAdmin
    .from('ky_accuracy_runs')
    .select('id, started_at, seed, checked, passed, warnings, failures, errored_domains')
    .order('started_at', { ascending: false })
    .limit(1);
  const run = runs?.[0];
  if (!run) return null;

  const { data: rows } = await supabaseAdmin
    .from('ky_accuracy_findings')
    .select('fingerprint, domain, severity, entity, field, message, expected, actual')
    .eq('run_id', run.id);
  const findings = rows ?? [];

  // First sighting per fingerprint, so the model can distinguish "new this run"
  // from "open for months" — the single most useful triage signal, and one the
  // model cannot infer from the finding text.
  const firstSeen = new Map<string, string>();
  const fps = [...new Set(findings.map((f) => f.fingerprint as string))];
  for (let i = 0; i < fps.length; i += 100) {
    const { data } = await supabaseAdmin
      .from('ky_accuracy_findings')
      .select('fingerprint, observed_at')
      .in('fingerprint', fps.slice(i, i + 100))
      .order('observed_at', { ascending: true });
    for (const r of data ?? []) {
      const fp = r.fingerprint as string;
      if (!firstSeen.has(fp)) firstSeen.set(fp, r.observed_at as string);
    }
  }

  return {
    runId: run.id as string,
    startedAt: run.started_at as string,
    seed: run.seed as number,
    totals: {
      checked: run.checked as number,
      passed: run.passed as number,
      warnings: run.warnings as number,
      failures: run.failures as number,
    },
    erroredDomains: (run.errored_domains as string[]) ?? [],
    findings: findings.map((f) => {
      const seen = firstSeen.get(f.fingerprint as string);
      const days = seen ? Math.floor((Date.now() - Date.parse(seen)) / 86_400_000) : null;
      return {
        domain: f.domain as string,
        severity: f.severity as string,
        entity: (f.entity as string) ?? null,
        field: (f.field as string) ?? null,
        message: f.message as string,
        expected: (f.expected as string) ?? null,
        actual: (f.actual as string) ?? null,
        recurringDays: days,
      };
    }),
  };
}

const TRIAGE_SYSTEM = `You are triaging automated data-quality findings for Know Your Vote Kentucky, a
non-partisan civic site publishing Kentucky legislative data.

You are given ONLY what the automated checks recorded. Do not speculate about
causes you cannot support from that evidence, and never claim a finding is
resolved or invalid unless the evidence shows it. If something is ambiguous, say
it is ambiguous and name what an operator would need to check.

Priorities, highest first:
1. Anything that shows users wrong legislative information (a bill's status,
   vote tallies, who sponsored what, what a committee is meeting about).
2. A pipeline that has stopped producing data, or a source in error.
3. Presentation or metadata drift.
4. Advisory model-generated observations (domain "llm") — these are suggestions,
   are capped at warn by policy, and are frequently subjective. Treat them as the
   lowest priority and say so.

A finding recurring for many days without changing is usually either accepted
drift or an unfixed known issue — call that out, because repeat findings are
what train people to ignore the digest.

Output plain text for Slack (no markdown headers, no code fences). Be concise:
at most ~12 lines. Use "•" bullets. For each item give the concrete next action.
End with one line stating what, if anything, needs a human today. If nothing
does, say so plainly rather than manufacturing urgency.`;

async function requestTriage(payload: unknown): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error('[triage] ANTHROPIC_API_KEY not set — skipping triage');
    return null;
  }
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.TRIAGE_LLM_MODEL?.trim() || KY_DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0,
    system: TRIAGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Triage this check output.\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  const part = message.content[0];
  return part && part.type === 'text' ? part.text.trim() : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const audit = args.source === 'health' ? null : await loadAuditContext();

  let health: { summary: string; breaches: unknown[] } | null = null;
  if (args.source !== 'audit') {
    try {
      const rows = await fetchSourceRows();
      const h = evaluateSourceHealth(rows);
      health = { summary: formatSourceHealth(h), breaches: h.breaches };
    } catch (e) {
      console.error('[triage] source health unavailable:', e instanceof Error ? e.message : e);
    }
  }

  const nothingToTriage =
    (!audit || audit.findings.length === 0) &&
    (!health || (health.breaches as unknown[]).length === 0);

  if (nothingToTriage) {
    // Silence is the correct output for a clean run. Posting "all clear" every
    // day is exactly the noise that makes a channel unreadable.
    console.log('[triage] no findings and no source breaches — nothing to triage');
    process.exit(0);
  }

  let triage: string | null = null;
  try {
    triage = await requestTriage({ audit, sourceHealth: health });
  } catch (e) {
    console.error('[triage] model call failed:', e instanceof Error ? e.message : e);
  }

  if (!triage) {
    console.error('[triage] no triage produced — the raw digest already went out, so exiting quietly');
    process.exit(0);
  }

  console.log(triage);

  if (!args.dryRun) {
    const header = audit
      ? `*Triage — accuracy audit ${audit.startedAt.slice(0, 10)}* (seed \`${audit.seed}\`, ${audit.findings.length} finding(s))`
      : '*Triage — sync source health*';
    const delivered = await notifyTriageSlack(`${header}\n${triage}`).catch((e) => {
      console.error('[triage] Slack notify failed:', e);
      return false;
    });
    if (!delivered) console.error('[triage] Slack post was not delivered');
  }

  process.exit(0);
}

main().catch((e) => {
  // Triage is advisory: never turn a green check red because the summariser
  // fell over. The raw digest has already been delivered by this point.
  console.error('[triage] unexpected failure:', e);
  process.exit(0);
});
