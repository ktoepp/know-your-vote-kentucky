#!/usr/bin/env npx tsx
/**
 * KYvKY content accuracy audit — runs deterministic source diffs (LegiScan,
 * Open States, LRC) plus an Anthropic LLM pass over fuzzy content, then posts a
 * report to Slack.
 *
 * Usage:
 *   npx tsx scripts/accuracy-audit.ts
 *   npx tsx scripts/accuracy-audit.ts --domain=bills,votes
 *   npx tsx scripts/accuracy-audit.ts --no-llm
 *   npx tsx scripts/accuracy-audit.ts --dry-run        # preview: no Slack, no
 *                                                      # DB write, no LLM spend,
 *                                                      # no rotation shift
 *   npx tsx scripts/accuracy-audit.ts --json           # machine-readable output
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 * Optional: LEGISCAN_API_KEY, OPENSTATES_API_KEY, ANTHROPIC_API_KEY, SLACK_WEBHOOK_*.
 * Tunable:  ACCURACY_ACTIVE_DAYS (alias ACCURACY_DAYS), ACCURACY_ACTIVE_SHARE,
 *           ACCURACY_BILLS_LIMIT, ACCURACY_VOTES_LIMIT,
 *           ACCURACY_MATERIALS_COMMITTEE_LIMIT, ACCURACY_LINK_SAMPLE,
 *           ACCURACY_LLM_SAMPLE, ACCURACY_SKIP_LLM, ACCURACY_LLM_MODEL,
 *           ACCURACY_LEGISCAN_QUOTA_STOP_PCT, ACCURACY_DOMAIN_TIMEOUT_MS.
 *
 * Exit: 0 for clean runs, content findings, expected skips (a LegiScan quota
 *       stop), and upstream outages (LegiScan/Open States/LRC/Anthropic
 *       unavailable — visible in the digest, but not our bug to page on).
 *       Exit 1 ONLY when a checker crashes on something we can act on: a bug on
 *       our side, or a source of truth returning something we cannot parse.
 *
 * Uniform error taxonomy: every checker routes caught errors through
 * `types.ts` — `classifyCheckerError` / `outageResult` / `crashResult` — so the
 * outage-vs-crash boundary is enforced once, not re-derived per checker.
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
  applyCoverageFloors,
  applyDismissals,
  formatConsoleReport,
  formatSlackReport,
  summarizeAudit,
} from '../src/lib/accuracy-audit/report';
import {
  fetchDismissedFingerprints,
  fetchRecurrence,
  findingFingerprint,
  recordAuditRun,
} from '../src/lib/accuracy-audit/history';
import {
  finalizeRotation,
  pendingRotationScopes,
} from '../src/lib/accuracy-audit/sampling';
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

/**
 * Per-domain wall-clock budget. The LegiScan client retries 5× on a 60s timeout
 * with exponential backoff, so a single hung bill can burn ~5.5 minutes — eight
 * of them exhaust the workflow's 45-minute ceiling and the job is killed with no
 * report at all (the 2026-06-21 cancellation). A per-domain deadline converts
 * that into one skipped domain and a delivered report.
 */
const DOMAIN_TIMEOUT_MS = (() => {
  const raw = process.env.ACCURACY_DOMAIN_TIMEOUT_MS?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 10 * 60_000;
})();

/**
 * Race a checker against its deadline. A breach is reported as `skipped` rather
 * than `error`: it is usually upstream slowness rather than a bug on our side,
 * and the same reclassification already applies to transient upstream failures.
 * The skip is loud in the digest, and the domain-level failure-rate escalation
 * catches a domain that keeps producing nothing.
 */
async function runWithDeadline(
  domain: string,
  run: () => Promise<CheckerResult>,
): Promise<CheckerResult> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<CheckerResult>((resolve) => {
    timer = setTimeout(
      () =>
        resolve(
          skippedResult(
            domain,
            `exceeded the ${Math.round(DOMAIN_TIMEOUT_MS / 60_000)}m per-domain deadline (upstream too slow)`,
          ),
        ),
      DOMAIN_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([run(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
    let result: CheckerResult;
    try {
      result = await runWithDeadline(domain, () => checker(db, cfg));
    } catch (e) {
      result = {
        domain,
        checked: 0,
        passed: 0,
        warnings: 0,
        failures: 0,
        findings: [],
        durationMs: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
    results.push(result);

    // Rotation stamps buffered by sampling.ts (`stamp: 'defer'`) commit only
    // when the checker actually verified its sample. An outage / crash / skip
    // discards them, so those rows keep their old `last_audited_at` and rise
    // back to the top of the rotation next run. A dry-run always discards —
    // a preview should never shift stateful rotation, or repeated `npm run
    // audit:accuracy:dry` would silently rotate the coverage queue.
    // Scopes not belonging to this domain are left alone — a later domain will
    // finalize them.
    const succeeded = !result.error && !result.outage && !result.skipped;
    const disposition = cfg.dryRun ? 'discard' : succeeded ? 'commit' : 'discard';
    for (const scope of pendingRotationScopes()) {
      if (scope !== domain) continue;
      try {
        await finalizeRotation(db, scope, disposition);
      } catch (e) {
        // Best-effort: never let rotation bookkeeping fail the run.
        console.error(
          `[accuracy-audit] rotation finalize failed for ${scope}:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  // Apply operator-accepted dismissals BEFORE summarizeAudit so counts, header
  // state, and every downstream consumer (report, history write, triage) see
  // the same filtered view. Silent degrade when the table doesn't exist yet.
  const dismissed = await fetchDismissedFingerprints(db);
  const { results: filteredResults, dismissedCount } = applyDismissals(
    results,
    dismissed,
    findingFingerprint,
  );
  if (dismissedCount > 0) {
    console.log(
      `[accuracy-audit] suppressed ${dismissedCount} finding(s) matching ${dismissed.size} dismissed fingerprint(s)`,
    );
  }

  // Under-coverage annotation. Applied after dismissals so the check uses the
  // as-reported view. A domain that came back "checked=0, all_clear" because
  // Supabase silently returned an empty set is now a distinct, visible state.
  const { results: withFloors, underCoverageDomains } = applyCoverageFloors(
    filteredResults,
    cfg.coverageFloors,
  );
  if (underCoverageDomains.length > 0) {
    console.log(
      `[accuracy-audit] under-coverage: ${underCoverageDomains.join(', ')} (below configured ACCURACY_<DOMAIN>_MIN_CHECKED)`,
    );
  }

  const summary = summarizeAudit(withFloors, startedAtMs, cfg.seed);

  // Recurrence must be read *before* this run's findings are written, or every
  // finding would look like it had been seen before (by itself).
  const notable = results.flatMap((r) => r.findings.filter((f) => f.severity !== 'info'));
  const { firstSeenByFingerprint } = await fetchRecurrence(
    db,
    [...new Set(notable.map(findingFingerprint))],
  );
  const recurrence = (f: typeof notable[number]) =>
    firstSeenByFingerprint.get(findingFingerprint(f)) ?? null;

  // Operational problems — a checker actually *crashed* — fail the job and page
  // #errors. Everything else exits 0 and reports to the status digest only:
  //   - LegiScan quota stop: expected, self-protective skip
  //     (decisions.md § 2026-06-27).
  //   - Upstream outage (LegiScan/Open States/LRC/Anthropic 5xx / timeout):
  //     visible outage banner in the digest, not our bug to page on. Paging on
  //     upstream hiccups trained us to skim past #errors.
  //   - Content findings (even deterministic `fail`s): reported, do not fail CI
  //     (decisions.md § 2026-06-03).
  const hasOperationalError = summary.hasOperationalError;

  if (!cfg.dryRun) {
    await recordAuditRun(db, summary);
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    // Threaded fingerprintOf so console output includes the fingerprint an
    // operator would copy into `npm run audit:dismiss add <fp> --reason=…`.
    console.log(formatConsoleReport(summary, { fingerprintOf: findingFingerprint }));
    if (summary.hasHardFailures && !hasOperationalError) {
      console.log('\n(content findings reported to Slack; not failing the run)');
    }
  }

  if (!cfg.dryRun) {
    let slackDelivered = false;
    try {
      slackDelivered = await notifyAccuracyAuditSlack({
        body: formatSlackReport(summary, { recurrence }),
        escalateToAlerts: hasOperationalError,
        fromCli: true,
      });
    } catch (e) {
      console.error('[accuracy-audit] Slack notify failed:', e instanceof Error ? e.message : e);
    }
    // Stand the workflow's failure step down only when our own #errors message
    // actually landed. Dropping the sentinel after a failed post (Slack down, or
    // no webhook configured) silenced the fallback too and left the failure
    // reported nowhere.
    if (hasOperationalError) markSlackErrorNotified(slackDelivered);
  }

  process.exit(hasOperationalError ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
