# Accuracy audit

Weekly comparison of `ky_bills` / `ky_votes` / `ky_legislators` / `ky_committees` / `ky_committee_materials` / AI-generated content against the primary sources (LegiScan, Open States, LRC). Runs from `.github/workflows/accuracy-audit.yml` (Sundays 07:00 UTC), or on demand via `workflow_dispatch` or `npm run audit:accuracy`.

This document is a reference for how the run classifies results, what the exit codes mean, how to add a new checker, and how to accept a finding as noise. Header comments in the code are the authority for anything not covered here.

## Domains

| Domain | Compares stored against | Notes |
| --- | --- | --- |
| `bills` | LegiScan `getBill` | Seed-sampled, `ACCURACY_BILLS_LIMIT` (default 40), rotation-aware, session-scoped fingerprint. |
| `votes` | LegiScan `getRollCall` | Seed-sampled, `ACCURACY_VOTES_LIMIT` (default 15). Roll-call ids are globally unique so no session in the fingerprint. |
| `legislators` | Open States roster | Whole-corpus, no upstream quota. Seat-count invariant (100 House + 38 Senate). |
| `committees` | LRC legislative calendar + stored-corpus invariants | Corpus invariants run first and always, so an empty live calendar (typical during interim) still produces coverage. |
| `materials` | LRC committee documents pages, sampled committees | Also probes a rotating sample of stored URLs when `ACCURACY_PROBE_LINKS=true`. |
| `llm` | Anthropic model verdicts on fuzzy content (summaries, topics, glossary) | Advisory, capped at `warn`. |

## Result taxonomy

Every checker returns a `CheckerResult`. The orchestrator classifies it into one of four terminal states, and the Slack digest headlines them in this precedence order:

1. **`operational error`** — the checker crashed on something we can act on: a bug on our side, a schema drift, an auth 4xx, a Supabase failure. `CheckerResult.error` is set. **This is the only state that exits 1 and pages `#errors`.**
2. **`upstream outage`** — LegiScan / Open States / LRC / Anthropic was unreachable (5xx, 429, network drop, gateway timeout). Two paths in:
   - Whole-checker outage: `CheckerResult.outage: true`, set by `outageResult` / `terminalResultFrom` when a single source-of-truth fetch fails.
   - Fan-out outage ratio: `upstreamFailures / attempted ≥ UPSTREAM_OUTAGE_RATIO` and at least `UPSTREAM_OUTAGE_MIN_FAILURES` failed. Bills and votes use this path; materials count `upstreamFailures` per committee.
   
   Exits 0. Visible in the digest so operators know a source was down.
3. **`under-coverage`** — the checker returned a clean result but verified less than `cfg.coverageFloors[domain]`. Silent "checked=0" runs (e.g. Supabase auth quietly returned an empty set) used to read as "all clear"; this state calls them out. Overridable per domain via `ACCURACY_<DOMAIN>_MIN_CHECKED`. Exits 0.
4. **`content failures` / `content warnings` / `all clear`** — normal drift reporting. Exits 0.

`skipped` domains (no rows to sample, LegiScan quota stop, ANTHROPIC_API_KEY missing) fall out of the state machine — they are visible on their status line but don't headline the digest.

## Error classification

`src/lib/accuracy-audit/types.ts` owns the taxonomy:

- `isTransientUpstreamError(e)` — HTTP 5xx / 429, gateway timeouts, `ECONN*`, and text-matched variants. One list, one place.
- `classifyCheckerError(e): 'upstream_outage' | 'crash'` — routes a caught error.
- `outageResult(domain, source, e, started, opts)` — terminal outage result. Preserves any findings gathered before the failure.
- `crashResult(domain, e, started, opts)` — terminal crash result.
- `terminalResultFrom(domain, source, e, started, opts)` — the two above rolled into one call. Use this in checker `catch` blocks.

Every checker's `catch` block should route through these. Ad-hoc "if transient then skip else error" logic is what let materials + llm-review read outages as drift before PR #241.

## Exit codes

| Exit | When | Slack |
| --- | --- | --- |
| `0` | Clean, content findings, upstream outages, expected skips (LegiScan quota stop), under-coverage | Digest → status channel |
| `1` | A checker's `error` field is set | Digest → status channel **and** `#errors` |

Content `fail` findings are surfaced but do not fail CI (decisions.md § 2026-06-03). Only crashes do.

## Sampling and rotation

`src/lib/accuracy-audit/sampling.ts` provides `sampleTable` / `sampleTableSplit` — seed-stable bottom-k over an FNV-1a hash of the row key. Seed prints at the start of every run; reuse with `--seed=<n>` to reproduce.

Callers that want oldest-first rotation pass `rotation: { scope: '<name>' }`. Marks live in `ky_accuracy_audit_marks` (migration 049).

**Rotation stamping is deferred by default via `stamp: 'defer'`** — the orchestrator commits stamps only when the checker actually verified its sample, and discards on outage / crash / skip / dry-run. This means an outage week no longer pushes unverified rows to the back of the rotation queue. `stamp: true` preserves the old eager-write behavior; `stamp: false` opts out entirely.

Bills is the only rotation user today; add new callers with `stamp: 'defer'`.

## Fingerprinting and recurrence

`findingFingerprint(f)` hashes `(domain, entity, field, message, session)`. Included:

- `session` — so `HB100 / 2024` and `HB100 / 2026` do not collide in the recurrence map. Only bills-domain findings populate it today; other domains have globally-unique entity keys and hash on an empty session component.
- Deliberately excluded: `expected` / `actual`. A status that drifts from one wrong value to another is still the same open issue.

`fetchRecurrence(db, fingerprints)` reads the earliest `observed_at` per fingerprint. The digest labels a finding "new" or "recurring for <n> days" from that. Recurrence lookup runs **before** the current run's findings are written, or every finding would look like it had been seen before (by itself).

## Dismissed findings

`ky_accuracy_dismissed_findings` (migration 052) records fingerprints an operator has accepted as noise. They are filtered out of the recurrence map, the history write, and the LLM triage payload — a single filter point in the orchestrator, so nothing downstream sees them.

CLI:

```
npm run audit:dismiss list
npm run audit:dismiss add <fingerprint> --reason=<slug> [--note="..."] [--expires-at=YYYY-MM-DD]
npm run audit:dismiss remove <fingerprint>
```

Fingerprints are printed alongside every finding in the console report (`[fp=…]`), so copy from a recent `npm run audit:accuracy:dry` output. Every dismissal takes a short `--reason` slug for readability; `--note` and `--expires-at` are optional.

## Notifications

Three shapes, one header convention (`KY Vote — <thing>`), consolidated in `src/lib/slack-webhook.ts`:

- `notifyAccuracyAuditSlack` — the weekly digest. `escalateToAlerts: true` posts to `#errors` too; only crashes set this flag.
- `notifyTriageSlack` — the follow-up interpretive summary from `scripts/triage-findings.ts`. Status channel only.
- `notifySourceHealthSlack` — source freshness. Edge-triggered so a persistently degraded source doesn't page every day.

## Triage

`scripts/triage-findings.ts` runs after the audit and posts an interpretive summary. Boundaries (decisions.md § 2026-06-03, extended by PR #241):

- Advisory only. Never changes a severity, never closes a finding, never fails CI.
- Given only what the checks recorded — no primary-source fetches, no re-derivation.
- Outage domains and errored domains are surfaced separately from findings, so the model never advises on "content drift" on a source that was down.
- Finding text is whitespace-normalized and clipped to 240 chars before the payload is built, to shrink prompt-injection surface from upstream HTML that lands in `expected` / `actual`.

## Adding a new checker

1. Create `src/lib/accuracy-audit/checkers/<domain>.ts` exporting `check<Domain>(db, cfg): Promise<CheckerResult>`.
2. Every source-of-truth fetch that could raise transiently must route its catch through `terminalResultFrom` (or `outageResult` / `crashResult` for per-branch control). No ad-hoc `if (isTransientUpstreamError(e))` blocks.
3. If the checker fans out per-item fetches (like bills / votes), increment `upstreamFailures` on each per-item transient failure and rely on the report layer to escalate to `outage` when the ratio trips.
4. Use `diffFinding` for field-mismatch findings so message shape stays uniform. Pass `session` to it (or stamp it via a per-row `push` closure) if the entity label repeats across sessions.
5. Wire the checker into `ALL_DOMAINS` (types.ts), the `CHECKERS` map (accuracy-audit.ts), and pick a `DEFAULT_COVERAGE_FLOORS` value sized against production totals.

## Environment reference

| Variable | Default | Purpose |
| --- | --- | --- |
| `ACCURACY_ACTIVE_DAYS` | 365 | "Active" window for sample weighting. |
| `ACCURACY_ACTIVE_SHARE` | 0.75 | Fraction of the bills sample drawn from the active window. |
| `ACCURACY_BILLS_LIMIT` | 40 | Max bills re-fetched from LegiScan per run. |
| `ACCURACY_VOTES_LIMIT` | 15 | Max roll calls re-fetched per run. |
| `ACCURACY_MATERIALS_COMMITTEE_LIMIT` | 12 | Max committees re-scraped for materials. |
| `ACCURACY_LINK_SAMPLE` | 25 | Max stored URLs checked per run. |
| `ACCURACY_PROBE_LINKS` | `false` | When `true`, live-probe URLs (slower). |
| `ACCURACY_LLM_SAMPLE` | 8 | Sample size per LLM review pass. |
| `ACCURACY_SKIP_LLM` | `false` | Skip the Anthropic pass. `--dry-run` forces this on unless `--skip-llm` is explicitly overridden. |
| `ACCURACY_LLM_MODEL` | `KY_DEFAULT_ANTHROPIC_MODEL` | Model for the LLM review pass. |
| `ACCURACY_LEGISCAN_QUOTA_STOP_PCT` | 95 | Skip LegiScan-backed checks at or above this monthly quota %. |
| `ACCURACY_DOMAIN_TIMEOUT_MS` | 600000 | Per-domain wall-clock deadline. Breach reports as `skipped`, not `error`. |
| `ACCURACY_<DOMAIN>_MIN_CHECKED` | see `DEFAULT_COVERAGE_FLOORS` | Coverage floor per domain. `0` opts a domain out. |
| `ACCURACY_SEED` | random | Reuse to reproduce a run's exact sample. |
