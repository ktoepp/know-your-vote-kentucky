#!/usr/bin/env npx tsx
/**
 * KYVKY content accuracy audit — runs deterministic source diffs (LegiScan,
 * Open States, LRC) plus an Anthropic LLM pass over fuzzy content, then posts a
 * report to Slack.
 *
 * Usage:
 *   npx tsx scripts/accuracy-audit.ts
 *   npx tsx scripts/accuracy-audit.ts --domain=bills,votes
 *   npx tsx scripts/accuracy-audit.ts --no-llm
 *   npx tsx scripts/accuracy-audit.ts --dry-run        # run + print, never post to Slack
 *   npx tsx scripts/accuracy-audit.ts --json           # machine-readable output
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 * Optional: LEGISCAN_API_KEY, OPENSTATES_API_KEY, ANTHROPIC_API_KEY, SLACK_WEBHOOK_*.
 * Tunable:  ACCURACY_DAYS, ACCURACY_BILLS_LIMIT, ACCURACY_VOTES_LIMIT,
 *           ACCURACY_MATERIALS_COMMITTEE_LIMIT, ACCURACY_LINK_SAMPLE,
 *           ACCURACY_LLM_SAMPLE, ACCURACY_SKIP_LLM, ACCURACY_LLM_MODEL,
 *           ACCURACY_LEGISCAN_QUOTA_STOP_PCT.
 *
 * Exit: 0 for clean runs, content findings, AND expected skips (e.g. a LegiScan
 *       quota stop); 1 only when a checker crashes (an operational error).
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { fetchLegiscanQuotaSummary } from '../src/lib/legiscan-quota';
import {
  ALL_DOMAINS,
  buildAuditConfig,
  domainEnabled,
  type AuditConfig,
  type AuditDomain,
  type CheckerResult,
} from '../src/lib/accuracy-audit/types';
import { checkBills } from '../src/lib/accuracy-audit/checkers/bills';
import { checkVotes } from '../src/lib/accuracy-audit/checkers/votes';
import { checkLegislators } from '../src/lib/accuracy-audit/checkers/legislators';
import { checkCommittees } from '../src/lib/accuracy-audit/checkers/committees';
import { checkMaterials } from '../src/lib/accuracy-audit/checkers/materials';
import { checkLlm } from '../src/lib/accuracy-audit/checkers/llm-review';
import {
  formatConsoleReport,
  formatSlackReport,
  summarizeAudit,
} from '../src/lib/accuracy-audit/report';
import { markSlackErrorNotified, notifyAccuracyAuditSlack } from '../src/lib/slack-webhook';

function parseArgs(argv: string[]): {
  json: boolean;
  dryRun: boolean;
  skipLlm: boolean;
  domains: Set<string> | null;
  seed: number | undefined;
} {
  let json = false;
  let dryRun = false;
  let skipLlm = false;
  let domains: Set<string> | null = null;
  let seed: number | undefined;

  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--no-llm') skipLlm = true;
    else if (arg.startsWith('--seed=')) {
      const n = parseInt(arg.split('=')[1] ?? '', 10);
      if (Number.isFinite(n)) seed = n >>> 0;
    } else if (arg.startsWith('--domain=') || arg.startsWith('--domains=')) {
      const list = arg.split('=')[1] ?? '';
      const parsed = list
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (parsed.length > 0) domains = new Set(parsed);
    }
  }
  return { json, dryRun, skipLlm, domains, seed };
}

function skippedResult(domain: string, reason: string): CheckerResult {
  return {
    domain,
    checked: 0,
    passed: 0,
    warnings: 0,
    failures: 0,
    findings: [],
    durationMs: 0,
    skipped: true,
    skipReason: reason,
  };
}

const CHECKERS: Record<
  AuditDomain,
  (db: NonNullable<typeof supabaseAdmin>, cfg: AuditConfig) => Promise<CheckerResult>
> = {
  bills: checkBills,
  votes: checkVotes,
  legislators: checkLegislators,
  committees: checkCommittees,
  materials: checkMaterials,
  llm: checkLlm,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = buildAuditConfig({
    dryRun: args.dryRun,
    skipLlm: args.skipLlm,
    domains: args.domains,
    seed: args.seed,
  });
  console.log(`[accuracy-audit] seed=${cfg.seed} (reproduce this run with --seed=${cfg.seed})`);

  const db = supabaseAdmin;
  if (!db) {
    console.error(
      'Supabase admin client unavailable. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).',
    );
    process.exit(1);
  }

  if (args.domains) {
    const unknown = [...args.domains].filter((d) => !(ALL_DOMAINS as readonly string[]).includes(d));
    if (unknown.length > 0) {
      console.error(`Unknown domain(s): ${unknown.join(', ')}. Valid: ${ALL_DOMAINS.join(', ')}`);
      process.exit(1);
    }
  }

  // LegiScan quota guard: if usage is near the monthly cap, skip LegiScan-backed checks.
  let legiscanBlockedReason: string | null = null;
  if (domainEnabled(cfg, 'bills') || domainEnabled(cfg, 'votes')) {
    const quota = await fetchLegiscanQuotaSummary();
    if (quota && quota.limit > 0 && quota.pct >= cfg.legiscanQuotaStopPct) {
      legiscanBlockedReason = `LegiScan quota ${quota.pct}% (>= ${cfg.legiscanQuotaStopPct}% stop)`;
    }
  }

  const startedAtMs = Date.now();
  const results: CheckerResult[] = [];

  for (const domain of ALL_DOMAINS) {
    if (!domainEnabled(cfg, domain)) continue;

    if ((domain === 'bills' || domain === 'votes') && legiscanBlockedReason) {
      results.push(skippedResult(domain, legiscanBlockedReason));
      continue;
    }

    const checker = CHECKERS[domain];
    try {
      results.push(await checker(db, cfg));
    } catch (e) {
      results.push({
        domain,
        checked: 0,
        passed: 0,
        warnings: 0,
        failures: 0,
        findings: [],
        durationMs: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const summary = summarizeAudit(results, startedAtMs, cfg.seed);

  // Operational problems — a checker actually *crashed* — fail the job and page
  // #errors. A LegiScan quota stop is NOT an operational error: it is an expected,
  // self-protective skip (the same reclassification applied to the sync pipeline,
  // see decisions.md § 2026-06-27). It already surfaces as a `skipped` domain line
  // in the status digest, so it needs no escalation — during interim, quota sits
  // high every week and this otherwise red-paged #errors every Sunday for nothing.
  // Content findings — even deterministic `fail`s — are reported to the status
  // digest but do NOT fail CI either (see decisions.md).
  const hasOperationalError = summary.hasOperationalError;

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatConsoleReport(summary));
    if (summary.hasHardFailures && !hasOperationalError) {
      console.log('\n(content findings reported to Slack; not failing the run)');
    }
  }

  if (!cfg.dryRun) {
    try {
      await notifyAccuracyAuditSlack({
        body: formatSlackReport(summary),
        escalateToAlerts: hasOperationalError,
        fromCli: true,
      });
    } catch (e) {
      console.error('[accuracy-audit] Slack notify failed:', e instanceof Error ? e.message : e);
    }
    // Operational errors were escalated to #errors above; let the workflow's
    // failure step stand down. (Content findings exit 0 and never reach here.)
    if (hasOperationalError) markSlackErrorNotified();
  }

  process.exit(hasOperationalError ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
