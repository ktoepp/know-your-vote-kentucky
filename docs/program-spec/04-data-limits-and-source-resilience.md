# WS4 — Data-limit stewardship & source resilience

## Purpose

KYvKY runs on other people's data. It has one free LegiScan key: 10,000 queries a month from 2026-10-01, audited enforcement from 2026-11-01, and a permanent ban for violations. It also uses Open States, four HTML scrapers of the Kentucky LRC site, and Anthropic for summaries. Being a good guest of those sources is what lets the project run for years on about $1,000 a year (O1, O2). It is also the first question a partner such as CalMatters Digital Democracy will ask before taking on a state (O3).

Today that protection is mostly people and prose:
- the quota counter misses failed attempts
- nothing in code stops a manual script from spending most of a month
- the bills sync can spend quota and then lose the result
- LRC fetches have no shared politeness policy
- the bills sync runs on two schedulers

This workstream moves those rules into code and tests, and deletes jobs instead of adding monitoring. Measured LegiScan use is about 10% of the cap (Sep 947, Oct 1–6 41), so the work is sized to that risk.

**WS4 succeeds if the 2027 session runs under 5,000 LegiScan queries a month with fewer scheduled jobs than today. It does not need to meter every vendor.**

**Owned findings:** D1, D2, D3, D5, E2, E6, A8, and erratum N3. Each one is addressed by a WP below or deferred in [Deferred](#deferred) with a reason and a trigger.

**Program class:** 5 of this file's 17 WPs are Core (WS4-01, WS4-02, WS4-03a, WS4-04, WS4-06: the budget, attempt counting, per-run budgets, key ownership and the resumable bills cap); the other 12 are Backlog. Definition-of-done items 1–4 are met by Core WPs. Items 5–11 apply only to the Backlog WPs the owner picks up; until WS4-12 and WS4-13 merge, the duplicate bills run and the votes cron keep running and stay in the budget.

### Definition of done (measured in WS4-15, FZ, and WS4-16, W4)

1. **One written budget.** `docs/data-budget.md` holds:
   - the LegiScan budget, per-run caps, paid-tier trigger and kill switch
   - LRC load by source
   - Open States notes
   - the Anthropic spend limit and the model's retirement date
   - free-tier ceilings
   - a five-line "Running Kentucky today (estimated)" block

   `src/lib/data-budget.ts` holds only the numbers that code reads. No file in the repo still says the LegiScan cap is 30,000, except quoted history and the vendor's own document, which carries a dated correction note.
2. **The LegiScan counter counts attempts.** Every HTTP attempt is counted before it is sent, including timeouts and retries. Failed attempts are also counted separately. A LegiScan `status: "ERROR"` reply is never retried, and a client with an empty key sends nothing.
3. **No LegiScan process runs without a budget.** Every LegiScan call is charged to a per-run budget inside `KyLegiScanClient`:
   - Scheduled jobs get their cap from their caller tag (`DATA_BUDGET.legiscan.perRunCap`).
   - Any other process must pass `--budget=N`, or it fails on its first call, before any HTTP request.
   - Every `perRunCap` key is used by a real caller.
4. **The bills sync never loses paid-for data.** A run stopped by its cap, its deadline or a quota hold has already written every bill it fetched. The next run continues from where it stopped. A unit test shows that two capped runs in a row fetch different bills.
5. **Pace, not just level.** The existing daily health check raises an edge-triggered breach when either of these happens:
   - projected month-end LegiScan use goes over the planning target (default 5,000, 50% of the cap)
   - the "5,000 by the 15th" paid-tier trigger fires

   This and the one monthly owner check (WS9-08, `docs/ops/vendors.md` §Monthly check) are the only two budget signals. No new schedule is added.
6. **AI spend is capped.** There is a hard monthly spend limit in the Anthropic Console (owner), plus the per-run `--max-usd` stop in the summary script (owned by WS3-09c). WS4 adds no AI metering code.
7. **LRC is fetched politely.** Every LRC fetch in `src/` and in the kept scripts goes through one helper. The bill-page link probe is the one exception; it is owned by WS6-03/WS6-09a, and WS6-09a moves it onto the helper. The helper:
   - sends a User-Agent with the project's contact address
   - makes at most 1 request per second per host
   - retries a bounded number of times inside a run deadline
   - makes no daily fetch for sessions that cannot change

   Scheduled LRC fetches per day go down, measured by source in WS4-15.
8. **Every LRC parser is tested against the saved pages**, and every LRC sync reports `error` when a 200 response parses to nothing.
9. **Fewer jobs, one registry.** Two cron jobs are deleted: the duplicate Vercel bills sync (WS4-12) and the daily votes cron (WS4-13). Cron lines go from 18 to 16. `src/lib/schedule-registry.ts` lists every Vercel and GitHub schedule. A test fails if `vercel.json`, a workflow `cron:` line, `MONITORED_SOURCES` or the Sentry monitors disagree with it, or if two LegiScan jobs' nominal run windows overlap.
10. **A rehearsal and a review exist.** WS4-15 shows that the projected 2027 peak month, with the caps in place, is at or under 5,000. WS4-16 compares that projection with the real session, records the paid-tier decision, and publishes a per-state data-cost sheet with a "minimum-quota mode".
11. **Net maintenance goes down.** WS4 adds no vendor, dashboard, schedule, migration or npm script. It deletes two cron jobs and one duplicate workflow step. It also turns the manual "price before running" rule into a code check.

### Interfaces with other workstreams

| This WS changes or needs | Other side | Note |
|---|---|---|
| WS4-03a/03b edit LegiScan scripts | E9 (WS1-01), E8 (WS1-02), E3 (WS5-01a archive) | WS1-01 must merge before WS4-03b. The dependency on WS5-01a is soft: WS4-03b does not wait, and skips any script WS5-01a has already archived (for example `backfill-veto-status.ts`). When WS1-02 has landed, run `npm run typecheck:scripts`. Until then, re-read every import line by hand (manual §6). |
| WS4-02/03a change the LegiScan client and the pipeline's catch sites | D1 gating invariant (WS1-05a) | If WS4-02/03a move a `getDataset`/`fetchDatasetZipGated` call site, update WS1-05a's allowlist in the same PR. |
| WS4-05, WS4-10 and others add `src/**/*.test.ts` files | E7/E8, WS1-04 CI | These tests run in CI once WS1-04 lands. WS1's Deferred list hands E6 parser tests and D1 quota-guard tests to WS4. |
| WS4-11 adds a schedule-drift test | E2, WS1-05a (`src/lib/repo-invariants.test.ts`) | If WS1-05a has merged, add a `describe` block there; otherwise create `src/lib/schedule-registry.test.ts`. WS1-05a checks that cron paths exist, and WS4-11 checks that schedules match. Both stay. |
| WS4-11 registry rows | WS7-09c (note on `/api/cron/notify`), WS5-07 (Routines), WS8-14a (links the registry) | The registry keeps a one-line `purpose` per job for these readers. It does **not** list Claude Routines; WS5-07 records them in `CURRENT.md`. |
| WS4-12 deletes the Vercel bills cron; `source-health.yml` stays | WS9-01 | `source-health.yml` stays on GitHub Actions on purpose. WS4-12 moves no job to Vercel, so it no longer conflicts with WS2-11c (Next 16). |
| WS4-06 and WS4-13 edit `ky-sync-pipeline.ts` | WS5-06a (W2, by 11-14); the pipeline split is Deferred (WS5) | WS5-06a's diff is deletions only, and WS4-06/13 do not wait for it: whichever merges second rebases (05 interface table). The split of `ky-sync-pipeline.ts` is in WS5's Deferred table, with WS4-05 and WS4-06 merged as prerequisites. |
| WS4-06 adds `--deadline-seconds=1080` to both bills-sync runs in `sync-ky-bills-status.yml` | WS3-09c step 5 (summary step ≤ 25 min in the same 45-minute job) | The job's split is: setup ≈ 2 min, sync ≤ 18 min, summaries ≤ 25 min. WS3-09c step 5 should cite this split. WS4-06 edits only the two sync run lines and the timeout comment; WS3-09c edits only the summary step's arguments and comment. Whichever merges second rebases. |
| WS4-07 AI spend | A1/A2 grounding, WS3-09c (adds `--max-usd` and a `--plan` cost estimate to `scripts/backfill-bill-summaries.ts`), WS3-10 (≈ $5–8 regeneration) | WS4 adds no AI metering code. The Console limit (WS4-07) must be at least WS3's in-session estimate plus WS3-10's one-time spend. |
| WS4-09a LRC helper | WS6-03 / WS6-09a (`/api/lrc/bill-link-status`, 1–3 LRC requests per bill-page view) | WS4-09a excludes that route by path. WS6-03 caches it, and WS6-09a moves it server-side using `fetchLrcPage` if WS4-09a has merged. WS4-01 and WS4-15 count its load as its own LRC line. |
| WS4-09a LRC helper | WS3-07 / WS3-08 (bill-text PDFs: ≤ 1,737 one-time, ≤ 100/day in session) | WS3-08's fetcher must call `fetchLrcPage`. WS4-09a should merge **before** WS3-08's production fill (an Owner run). If it has not, WS3-08 keeps its own ≤ 1/s serial loop and switches to the helper afterwards. If WS3-07 picks LegiScan `getBillText` instead, that needs its own line in `docs/data-budget.md` and a `--budget` (WS4-03a). |
| WS4-01 free-tier checks | WS9-08 (the one monthly owner check, `docs/ops/vendors.md` §Monthly check, reminded by the owner's phone calendar; there is no cron code) | Free-tier usage lines are checked **quarterly** inside it, or when a vendor emails about limits. No second checklist. |
| WS4-01 LegiScan kill switch; WS4-02 empty-key refusal | WS9-06a (LegiScan runbook `docs/ops/runbooks/legiscan.md`), WS9's "found, not fixed" items: `LEGISCAN_DISABLED` and the empty-key refusal | WS4-01 documents the existing brake (`LEGISCAN_MONTHLY_QUERY_LIMIT`) and the runbook's immediate-stop steps (a)–(c), never removing the key. WS4-03a tests the brake. WS4-02 makes the client refuse to send with an empty key (N3; owned here, so WS9's Deferred list keeps only `LEGISCAN_DISABLED`). No new env var (see Deferred). |
| WS4-08 adds `budget_pace` breaches to `src/lib/source-health.ts` | WS9-01 phone routing (D7) | Budget breaches use the existing health path, so they reach the phone once WS9-01 lands. |
| WS4-01 "Running Kentucky today" block; WS4-16 data-cost sheet | WS8-10/WS8-11 partner conversations (W2–W3), WS8-14a evidence pack (W4) | WS8-10 cites the WS4-01 estimates. WS4-16 replaces them with measured numbers. WS8 links both and restates neither. |
| Legislator name matching across LegiScan, Open States and LRC | E10, WS5-12a/12b | WS4-12 changes how often the roster is fetched, not how names are matched. |

### Out of scope

- Buying the LegiScan $1,000/yr tier or the Push API. WS4-04 records the trigger, and the purchase is an owner decision.
- A second LegiScan key for any reason, including development (one-key rule).
- New scrapers or crawl targets on the LRC site, including LRC record-vote pages (TASKS.md around line 554). WS3-07/08's bill-text PDFs are owned and approved there.
- Prompt, grounding or model changes to the summary generator (A1–A4, WS3).
- AI token metering code, Open States call counters, Resend send counters, a Batch API path and a model-evaluation harness (see Deferred).
- Moving jobs between schedulers (see Deferred), new dashboards, vendors or schedules, a second state, Push, or a native app.

---

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS4-01 | Publish one data budget and remove stale 30k quota references | P0 | W0 | Sonnet | S | none | Core |
| WS4-02 | Count every LegiScan attempt and stop retrying rejected requests | P0 | W0 | Opus | S | none | Core |
| WS4-03a | Charge every LegiScan call to a per-run budget and deny unbudgeted processes | P0 | W2 | Opus | M | WS4-01, WS4-02 | Core |
| WS4-03b | Print estimates in the high-spend LegiScan scripts and make the hash path the default | P1 | W2 | Sonnet | S | WS4-03a, WS1-01 (soft: WS5-01a) | Backlog |
| WS4-04 | Confirm LegiScan key ownership and adopt the budget and paid-tier trigger | P0 | W0 | Owner | S | WS4-01 | Core |
| WS4-05 | Test all four LRC parsers against the saved pages | P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | M | none | Backlog |
| WS4-06 | Make the hash-gated bills sync resumable, then turn on its run cap | P0 | W2 | Opus | M | WS4-03a | Core |
| WS4-07 | Set an Anthropic spend limit and record the model's retirement date | P2 | W2 | Owner | S | WS4-01 | Backlog |
| WS4-08 | Report LegiScan pace in the existing daily health check | P1 | W2 | Sonnet | S | WS4-01, WS4-06 | Backlog |
| WS4-09a | Route LRC fetches through one polite, deadline-aware helper | P1 | W2 | Sonnet | M | WS4-01 | Backlog |
| WS4-09b | Stop daily LRC fetches for sessions that cannot change | P2 | W2 | Sonnet | S | WS4-09a | Backlog |
| WS4-10 | Report an error when an LRC page parses to nothing | P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | S | WS4-05 | Backlog |
| WS4-11 | Make one schedule registry the source of truth | P2 | W2 | Sonnet | S | WS4-12 | Backlog |
| WS4-12 | Delete the duplicate bills and legislators runs | P1 | W2 | Sonnet | S | none | Backlog |
| WS4-13 | Fetch new roll calls in the bills sync and delete the votes cron | P1 | W2 | Opus | M | WS4-06 | Backlog |
| WS4-15 | Rehearse the 2027 session load against the budget | P1 | FZ | Sonnet | S | WS4-06 (soft: the other WS4 WPs) | Backlog |
| WS4-16 | Review real session usage and publish the per-state data-cost sheet | P2 | W4 | Sonnet | S | WS4-15 | Backlog |

There is no WS4-14 (see the retired-ID map in `TRACKER.md`). The Batch API path and the summary model evaluation are in Deferred, and WS4-13 is the roll-call WP.

**Execution notes.**
- **W0 (by 2026-10-20).** Only WS4-01, WS4-02 and WS4-04 run, which leaves room for the Next 15 patch (WS2-01) and the vote-label fix (WS3-01/02). Before 11-01, enforcement needs one key (WS4-04), no retried rejections (WS4-02) and staying under the cap, which is about 10% today. Until WS4-03a merges, the standing rule (TASKS.md line 77; WS9-06a runbook) still applies: **no manual LegiScan script without owner pricing.** For the same reason, the two manual LegiScan-spending workflows (`backfill-vote-nv-counts`, `backfill-session-votes`) are disabled in GitHub → Actions by WS4-04's owner step and stay disabled until WS4-03a merges.
- **Frozen files.** Once WS5-03a has merged, `TASKS.md` and `decisions.md` are frozen. A "decision note" in this file then means the next `docs/adr/NNNN-*.md` (manual §8), and a "mark TASKS.md line N" step records the closure in `CURRENT.md` (once WS5-03b merges) or in the PR body.
- **W1 and the election freeze.** WS4-05 and WS4-10 run, as tests and a parse guard that do not change healthy runs. WS9-03 sets an election freeze from **2026-10-31 to 2026-11-05**: under its default option (a), only P0 fixes deploy, except docs/test-only PRs (only `docs/**`, root `*.md` and `src/**/*.test.ts` changed), which may merge. So:
  - WS4-05 and WS4-10: **merge by 2026-10-30, or after 11-05.** WS4-10 changes LRC sync error behaviour and could raise new alerts in election week, so it is never exempt. WS4-05 is test-only except its `fixtures/lrc/README.md` edit, which is outside WS9-03 (a)'s list; it is exempt only if that README edit moves to a follow-up PR.
  - No other WS4 WP is scheduled in the freeze. WS4-01, WS4-02 and WS4-04 finish in W0, and the W2 WPs merge after 11-05.
- **W2.** Suggested order:
  1. WS4-03a (Core), by 11-13
  2. WS4-06 (Core), by 11-27, which turns on the bills cap
  3. Backlog, with the owner's go-ahead: WS4-12 (its decision default is 11-10), then WS4-13, WS4-08, WS4-09a/b and WS4-03b
  4. WS4-11 last, by 12-10, so it records the reduced schedule set

  WS4-06 must be live before FZ (2026-12-15), because the first 2027 pickup is the largest LegiScan load the project has had. WS4-13 should be too; if it has not merged by the 12-07 cut line, the votes cron stays and keeps its line in `docs/data-budget.md`.

---

## Work packages

### WS4-01 · Publish one data budget and remove stale 30k quota references

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | D1, D2, D3, D4, A8 |

- **Program class:** Core
- **Owner decision:** The budget numbers are decided in WS4-04. This WP writes them as **PROPOSED** using these defaults:
  - **LegiScan planning target:** 5,000 queries a month (50% of 10,000). The sync hold stays at 95%.
  - **LegiScan per-run caps (`perRunCap`), keyed by the caller tags that already exist** (verified 2026-10-06; re-run `grep -rn "withLegiscanCaller(\|LEGISCAN_CALLER" src scripts .github` when the PR opens and stop under manual §9 if the list differs):
    - `sync-bills: null` (counted, uncapped until WS4-06 sets 250). Tag set in `src/lib/ky-sync-pipeline.ts` line 970.
    - `sync-legislators: 10` (line 1353) and `sync-votes: 60` (line 1776), same file.
    - `dataset-sync: 40` (`scripts/sync-ky-dataset.ts` line 339), `accuracy-audit: 40` (`scripts/accuracy-audit.ts` line 348) and `session-preview: 5` (`scripts/preview-session-sync.ts` line 153).
    - `legislator-links: 40`. This tag has no `withLegiscanCaller` call: it is set only as the env var `LEGISCAN_CALLER: legislator-links` in `.github/workflows/legislator-links-weekly.yml` line 35.
    - **Deliberately absent:** `sync-legislator-bios` (`ky-sync-pipeline.ts` line 1682, LegiScan `getPerson`, 1 query per legislator that needs enrichment, up to about 138). It is manual-only (`src/lib/source-health.ts` ~107), so after WS4-03a it resolves to 0 and every run must pass `--budget=N` through `scripts/manual-sync.ts`. It is not a key, because WS4-03a's repo test allows only keys used by scheduled jobs. `docs/data-budget.md` says this in the per-vendor table.
    - Any other caller gets 0 and must pass `--budget=N`.
    - Any budget over 1,000 needs owner approval (operating manual §4).
  - **Anthropic:** a monthly Console limit of $40, set in WS4-07. That covers WS3's in-session estimate for grounded summaries (about $15–35 a month) plus WS3-10's one-time ≤ $10.
  - **LRC:** at most 1 request per second per host.
- **Data-limit impact:** none. Docs and constants only. No vendor is called. Step 3 may read one public Anthropic web page.
- **Ongoing cost:** About 0.25 h/quarter: the free-tier lines are checked quarterly inside the monthly check (WS9-08). It replaces ad-hoc research such as the decisions.md entries of 2026-09-29 and 2026-10-06. It adds no schedule, no vendor and no env var.
- **Why:** The limits that keep the project safe are scattered across `legiscan-quota.ts`, decisions.md, TASKS.md and the operating manual, and three files still say 30,000 (D1). Later WPs need one place to read caps from (O2). Partner conversations in W2–W3 (WS8-10) need an honest cost figure long before WS4-16's measured sheet in W4 (O3, O4).
- **Current state (verified 2026-10-06):**
  - `src/lib/legiscan-quota.ts`:
    - line 105: `LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT = 10_000`
    - lines 107–110: `legiscanPublicMonthlyLimit()` reads `LEGISCAN_MONTHLY_QUERY_LIMIT`
    - lines ~148–153: `legiscanSyncQuotaStopPct()` defaults to 95
    - lines ~176–190: `checkLegiscanQuotaForSync()` blocks when `pct >= stopPct`, and returns not-blocked when the counter cannot be read
  - `src/lib/slack-webhook.ts` lines ~214–233 (threshold parsing) and line 268 (`QUOTA_ALERT_BANDS = [90, 95, 98, 100]`).
  - Stale "30,000" or "30k":
    - `README.md` line 74 ("vs 30k cap") and line 162 ("vs 30k/month cap")
    - `docs/specs/committee-calendar.md` line 99 ("default limit 30,000/month")
    - `docs/reference/legiscan/LegiScan-API-Crash-Course.txt` line 6, which is a copy of LegiScan's own document. Its line 8 says per-operation timing guidelines are on page 7 of LegiScan's manual.
  - `scripts/check-quota.ts`:
    - lines 9–10 and 29–31 print a hard-coded `PLANNED_RUN_COST = 26` on every run
    - line 17 reads the month as `process.argv[2]`, so `npm run check:legiscan-quota -- --planned=500` would today parse `--planned=500` as the month
  - `docs/program-spec/00-agent-operating-manual.md` §4 step 2 (~line 176) says "Ignore its Run cost: ~26 line".
  - `env-template.txt` line 224 says the health check runs "every 15m". `vercel.json` runs it daily at 14:00 UTC.
  - Every GitHub workflow that calls LegiScan already passes `LEGISCAN_MONTHLY_QUERY_LIMIT: ${{ vars.LEGISCAN_MONTHLY_QUERY_LIMIT || '10000' }}` (for example `sync-ky-bills-status.yml` line 81). That makes a repo variable an existing brake.
  - decisions.md:
    - § 2026-09-29 (accepted option d) holds the paid-tier trigger
    - § 2026-10-06 holds the Jan–Mar 2027 projection, about 1,000–1,500 / 3,000–4,000 / 3,500–5,500
    - around line 2630 is the fixed-load breakdown
  - `src/lib/anthropic-model.ts`: `claude-sonnet-4-6` is the default model (A1, A8).
  - LRC fetchers found in the repo:
    - four sync modules
    - the committee-material link probe
    - two accuracy-audit checkers
    - `/api/lrc/bill-link-status`
    - two committee-materials scripts
    - two spike scripts, which WS5-01a archives
  - No file states budgets for LRC or Anthropic.
- **Do:**
  1. Create `src/lib/data-budget.ts`. Export one typed constant `DATA_BUDGET`, holding **only values code will read**:
     - `legiscan`:
       - `monthlyCap` (re-export `LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT`; do not repeat the number)
       - `planningTargetPerMonth: 5000`
       - `paidTierTriggerByDay15: 5000`
       - `perRunCap: Record<string, number | null>` with the values above. Its doc comment says: "`null` = counted, no cap. Keys are LegiScan caller tags (`src/lib/legiscan-caller.ts`)."
       - `manualApprovalAbove: 1000`
     - `lrc`:
       - `minSpacingMs: 1000`
       - `maxConcurrencyPerHost: 1`
       - `hosts: ['apps.legislature.ky.gov', 'legislature.ky.gov']`. These are the only two LRC hosts used in `src/` and `scripts/` (`grep -rhoE "https?://[a-z.]*legislature\.ky\.gov"`).
     - Give each number a one-line comment naming its source (finding ID, decisions.md section, or "PROPOSED, WS4-04").
     - Add no env vars. Do not put Anthropic, Open States or free-tier numbers in this file, because no code reads them.
  2. Create `docs/data-budget.md`, in plain prose, with these sections:
     - **Status line:** "PROPOSED 2026-10-xx, pending WS4-04."
     - **Running Kentucky today (estimated).** Exactly five lines, each labelled *estimate* with its source, for WS8-10 to cite:
       - LegiScan queries a month: interim about 200–300 after the 2026-09-29 fixes (decisions.md § 2026-09-29 option a), measured Aug 1,165 and Sep 947. Session peak 3,500–5,500 (§ 2026-10-06).
       - LRC fetches a day by scheduled jobs (step 4 of this list).
       - AI cost: about $0.006 per bill today (A8), about $0.03 per bill after grounding (WS3 estimate).
       - Cash: about $700–1,100 a year (D4, inferred).
       - Safeguards: one key, change-hash gating, per-run caps, the 95% hold, and polite LRC fetching.

       WS4-16 replaces these lines with measured figures.
     - **Per-vendor table:** vendor, hard limit, our planning target, alert level, per-run cap, where it is enforced in code (file and function, or "planned: WS4-xx"), and who can change it.
     - **LegiScan rules:**
       - one key; 10,000 a month; about 2 requests/s sliding; enforcement from 2026-11-01
       - `change_hash` and `dataset_hash` gating
       - CC BY 4.0 attribution through `src/lib/legiscan-attribution.ts`
       - the paid-tier trigger, quoted verbatim from the first clause of the **Revisit if** bullet in decisions.md § 2026-09-29: "a 2027 RS month passes 5,000 queries by the 15th (projects over ~8,000) → buy before month-end, state-limited Pull first". Quote that clause only.
       - the January–March 2027 projection, copied with its method from § 2026-10-06
       - a `[verify]` note: "LegiScan's API manual page 7 sets per-operation timing guidelines (Crash Course line 8). Confirm that our cadence for getMasterListRaw and getSessionList meets them."
     - **Kill switch (existing brake, no new code).** Set the GitHub repository variable and the Vercel env var `LEGISCAN_MONTHLY_QUERY_LIMIT=1`. Vercel needs a redeploy for the env change. The client's quota guard then raises `LegiscanQuotaHoldError` on every request once the month total is ≥ 1, for scheduled routes and scripts alike (WS4-03a tests this). Known gaps:
       - The first query of a calendar month can pass.
       - The guard fails open when the counter cannot be read.
       - The guard caches its result for 60 s.

       For an immediate stop, follow `docs/ops/runbooks/legiscan.md` steps (a)–(c) (created by WS9-06a): set `LEGISCAN_MONTHLY_QUERY_LIMIT=1` in Vercel env and Actions vars, redeploy, and disable the crons and workflows. Removing the key does not stop requests: until WS4-02 merges, the client warns and still sends keyless requests with retries. After WS4-02 the client refuses to send without a key, but the brake above stays the documented stop, because the key also lives in GitHub secrets and on the owner's machine. If WS9-06a has not merged when this PR opens, write the same sentence and link the runbook path anyway; WS9-06a creates it. Undo by deleting the variable.
     - **LRC load by source:** a table with one row per source. Each row is labelled measured or estimated, and WS4-15 measures it:
       - scheduled syncs: calendar 2/day, committee materials about 69/day, enrollment actions 23/day (one per `KY_SESSIONS` entry), popular names 23/week. About 97/day today and about 77/day after WS4-09b [estimate from code].
       - accuracy audit, weekly: the materials checker fetches one page per committee with an `lrc_rsn`, plus 1 calendar page. About 70/week [estimate].
       - bill-page link probe `/api/lrc/bill-link-status`: 1–3 per bill-page view, crawlers included; owned by WS6-03/09a [measure].
       - bill-text PDFs (WS3-08, if approved): ≤ 1,737 one-time, ≤ 100/day in session (WS3-08).
       - Wayback backfills: not LRC load.
     - **Open States:** no published limit is known to us [verify on the account page]. About 6 calls a day, with retries and a 7-day zero-yield alarm already in place (D2 re-check). No counter (see Deferred).
     - **Anthropic:**
       - the Console monthly limit (WS4-07)
       - the per-run stops: `--limit=300` today, plus `--max-usd` once WS3-09c merges
       - where to read spend: the Console usage page
       - the model's retirement date (step 3)
     - **Free tiers:** Resend (about 100/day) and Mapbox (about 50k loads), both from D4. PostHog, Sentry and GitHub Actions are listed with limit "[verify on the vendor's pricing page]". Each row gives where to look and which number to write down. The check runs **quarterly** inside the monthly check (WS9-08), or at once when a vendor emails about limits or monthly visitors pass 10× the September 2026 level.
     - **How to price a run:** the operating manual §4 steps, shortened, pointing to `npm run check:legiscan-quota -- --planned=N` (step 5).
  3. **Model retirement date (A8).** Look up `claude-sonnet-4-6` on Anthropic's model deprecations page [verify]. Write the date, or "no date announced as of <date>", with the source link, into the Anthropic section. Add the trigger: "If retirement falls before 2027-04-30, open a model-switch WP owned by the AI-summaries workstream (WS3), using its grounded evaluation set." If the agent cannot reach the page, write `[verify: owner, by 2026-11-15, WS4-07]`.
  4. Fix the stale references:
     - `README.md` lines 74 and 162 → "vs 10k cap (see docs/data-budget.md)". WS5-04a and WS5-04b also edit the README; rebase on whichever lands first.
     - `docs/specs/committee-calendar.md` line 99 → 10,000, with a link to `docs/data-budget.md`.
     - In `docs/reference/legiscan/LegiScan-API-Crash-Course.txt`, do **not** edit LegiScan's text. Insert at the top: `NOTE (KYvKY, 2026-10-xx): LegiScan cut the Public API cap to 10,000/month from 2026-10-01. The 30,000 below is out of date. See docs/data-budget.md.` followed by a blank line.
  5. In `scripts/check-quota.ts`:
     - Delete `PLANNED_RUN_COST`.
     - Take the month from the **first argv entry that does not start with `--`**, defaulting to the current month.
     - Read an optional `--planned=N`. When it is given, print "Planned: N" and "After run: <remaining>", then the safe/insufficient line, comparing against **both** the cap and `planningTargetPerMonth`.
     - When `--planned` is absent, print only usage and the breakdown.
  6. In `env-template.txt` line 224, change "every 15m" to "daily at 14:00 UTC".
  7. In `docs/program-spec/00-agent-operating-manual.md` §4 step 2, replace "Ignore its Run cost: ~26 line…" with "Pass `--planned=N` to compare your estimate with the cap and the planning target."
- **Don't:**
  - Change any runtime threshold, cap or alert. Later WPs wire the constants in.
  - Edit decisions.md history or LegiScan's wording in the Crash Course.
  - Copy the "Key ownership, for the record" paragraph of decisions.md § 2026-09-29, or any email address, account name or username, into `docs/data-budget.md` or any other file (manual §7).
  - Add env vars, schedules or vendors, or a `LEGISCAN_DISABLED` switch.
  - Write budget numbers into the README beyond the one link.
- **Acceptance criteria:**
  - [ ] `src/lib/data-budget.ts` exports `DATA_BUDGET` with only `legiscan` and `lrc`, and imports the LegiScan cap from `legiscan-quota.ts`.
  - [ ] `docs/data-budget.md` has every section in step 2, starts with the PROPOSED status line, and labels every number in the "Running Kentucky today" block as an estimate.
  - [ ] The kill-switch section names the existing variable, the redeploy need and the three known gaps, and points to runbook steps (a)–(c) for an immediate stop.
  - [ ] `grep -in "remove the key" docs/data-budget.md` returns nothing.
  - [ ] The Anthropic section has a retirement date with a source link, or the owner `[verify]` marker.
  - [ ] `grep -rn "30,000\|30k\|30000" README.md docs/specs scripts src --include=*.md --include=*.ts` returns only the existing explanatory comment in `src/lib/legiscan-quota.ts` (around lines 99–103).
  - [ ] The Crash Course file's original text is unchanged below the inserted note: `git diff -- docs/reference/legiscan/LegiScan-API-Crash-Course.txt` shows only added lines at the top. (This criterion applies to that file only.)
  - [ ] `docs/data-budget.md` contains no email address (`grep -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]+' docs/data-budget.md` prints nothing) and no LegiScan account name.
  - [ ] `perRunCap` has exactly the seven keys above, and the per-vendor table names `sync-legislator-bios` as `--budget`-only.
  - [ ] `scripts/check-quota.ts` no longer contains `PLANNED_RUN_COST`, and its month parse skips `--` flags (code review).
  - [ ] `env-template.txt` no longer says "every 15m". Manual §4 step 2 no longer mentions "Run cost: ~26".
- **Verify:**
  - In a plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`.
  - Read the `scripts/check-quota.ts` diff by hand, because tsc does not check `scripts/` (E8). Run `npm run typecheck:scripts` instead if WS1-02 has landed.
  - Running `npm run check:legiscan-quota` needs production secrets, so it is an Owner action.
- **Owner actions:**
  - [ ] Run `npm run check:legiscan-quota` and `npm run check:legiscan-quota -- --planned=500` (needs prod env). Expect usage lines, then the planned and remaining lines. This makes no LegiScan call; it reads `ky_sync_state` only.
- **Rollback:** Revert the PR. Nothing reads `DATA_BUDGET` until WS4-03a.

---

### WS4-02 · Count every LegiScan attempt and stop retrying rejected requests

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Opus | S | none | D1, E7, N3 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none during the work. Tests use a stubbed HTTP client and make zero LegiScan calls.
  - In production, the month total will read **higher** for the same traffic, by the number of failed attempts (about 50 in September 2026, per decisions.md § 2026-09-29). That is the intended, more honest number.
  - Not retrying `ERROR` replies saves queries. A brand-new session's master list that errors before bills load (`ky-sync-pipeline.ts` ~786–800) costs 1 query a run instead of 5.
  - A process with a missing or blank key sends 0 requests instead of up to 5 keyless ones per call.
- **Ongoing cost:** About 0. Once live, it removes the "add 10% to your estimate" fudge in the operating manual §4.
- **Why:**
  - The quota guard and the counter count only successful responses. Timeouts that LegiScan may still bill are invisible (D1). About one in three 6-hourly syncs sees every request time out (client comment at ~line 512).
  - `request()` retries a LegiScan `status: "ERROR"` reply up to 5 times. Those replies are rejections: bad key, bad parameter or quota. Each retry is a counted query that repeats a refused request, which looks like abuse to an enforcement audit (O2).
  - With an empty key the client only warns, then sends keyless requests with retries. Any workflow, env or script that lacks the key would do this after the 2026-11-01 enforcement date (D1, N3).
- **Current state (verified 2026-10-06), `src/lib/ky-legiscan-client.ts`:**
  - `constructor(apiKey?: string)` (line 128) sets `this.apiKey = apiKey || process.env.LEGISCAN_API_KEY || ''` and, when it is empty, only logs `LEGISCAN_API_KEY not set` (line 130). A whitespace-only key is truthy and is sent as-is.
  - `getKyLegiScanClient()` (line 503) constructs the singleton eagerly. `getAllKyDataSources()` (`src/lib/ky-data-sources.ts` line 91) calls it even when the caller needs only Open States or other sources, so the constructor and `getKyLegiScanClient()` must **not** throw.
  - `request()` (line 167) checks the in-process cache and calls `ensureQuotaAllows()` (line 154). It then loops `MAX_RETRIES` times; each attempt awaits `throttle()`, then `this.client.get(...)`.
  - Line 177: `void this.incrementQueryCounter(params.op);` runs only after a 2xx response, and is fire-and-forget. On Vercel the function can return before the write lands.
  - Line 178: `if (r.data?.status === 'ERROR') throw new Error(...)` is **inside** the `try`. The `catch` (lines 182–188) logs it and retries it, with a 1–4 s delay.
  - `isTransientLegiscanNetworkError()` (line 520) treats transport errors, timeouts and 502–504 as transient, and documents that an ERROR payload "must NOT be treated as transient". `request()` does not use it.
  - `incrementQueryCounter()` (line 206) calls the RPC `ky_increment_counter_multi` (migration 054) with the buckets `YYYY-MM`, `YYYY-MM:op` and `YYYY-MM:op@caller`.
  - There is no test of `request()`. `src/lib/legiscan-dataset-store.test.ts` shows the existing test style.
- **Do:**
  1. Make the client testable without the network. Add an optional second constructor argument, `deps?: { http?: Pick<AxiosInstance, 'get'>; recordAttempt?: (op: string | undefined) => Promise<void>; recordFailure?: (op: string | undefined) => Promise<void>; checkQuota?: typeof checkLegiscanQuotaForSync; sleep?: (ms: number) => Promise<void> }`. The defaults keep today's behavior. `getKyLegiScanClient()` keeps calling `new KyLegiScanClient()` unchanged.
  2. **Count before sending.** In `request()`, right after `await this.throttle()` and before `get`, `await recordAttempt(op)`. The default implementation is today's three-bucket `incrementQueryCounter`. If recording throws, log a warning and still send; counting must never block a sync.
  3. **Count failures separately.** After a failed attempt (exception, timeout or non-2xx), `await recordFailure(op)`. Its default increments a separate counter row, `legiscan_failed_attempt_counter`, with the single bucket `YYYY-MM`, through the existing `ky_increment_counter_multi` RPC. Do not add failure buckets to the main counter, because `parseLegiscanUsageBucket` would read them as operation names.
  4. **Stop retrying rejections.** When `r.data?.status === 'ERROR'`, throw a new exported `LegiscanRejectedError` (fields `op`, `message`) **outside** the retry loop: no retry, no delay. An ERROR reply is a completed attempt, so it is not a failure for step 3. Retry only when `isTransientLegiscanNetworkError(err)` is true or the HTTP status is 429. Throw any other error at once.
  5. **Refuse to send without a key.** Normalize the key with `.trim()` in the constructor, and keep the warning there; do not throw from the constructor or from `getKyLegiScanClient()` (see Current state). At the top of `request()`, after the cache check and **before** `ensureQuotaAllows()`, `throttle()`, `recordAttempt` and any HTTP call, throw a new exported, non-retryable `LegiscanMissingKeyError` (field `op`; message `LegiScan API key is empty: refusing to send (see docs/data-budget.md)`) when the key is empty. Nothing is recorded or sent. Handle it like `LegiscanRejectedError`: it is never retried, and it is not a WS4-03a stop error, because a missing key already fails the run at its first session-list or master-list call, outside the per-item loops. In the master-list fall-through condition in `syncKyBillsByHash` (`ky-sync-pipeline.ts` ~792–798), add `err instanceof LegiscanMissingKeyError` to the re-throw test, so a missing key is never logged as "not published on LegiScan yet".
  6. In `scripts/check-quota.ts`, also read `legiscan_failed_attempt_counter` and print "Failed attempts (included in total): N".
  7. Update the comment above `fetchLegiscanQuotaSummary` in `src/lib/legiscan-quota.ts`, and the header of `src/lib/ky-legiscan-client.ts`, to say the month total counts attempts.
  8. Create `src/lib/ky-legiscan-client.test.ts` with a stub `http.get`, spies for `recordAttempt` and `recordFailure`, `checkQuota` returning not-blocked, and a no-op `sleep`. Test:
     - a 2xx `OK` → `recordAttempt` ×1, `recordFailure` ×0, data returned
     - a timeout, then `OK` → `recordAttempt` ×2, `recordFailure` ×1
     - an `ERROR` payload → `recordAttempt` ×1, `recordFailure` ×0, `LegiscanRejectedError` thrown, `get` called once
     - HTTP 400 → `recordAttempt` ×1, `recordFailure` ×1, thrown at once
     - 5 timeouts → `recordAttempt` ×5, `recordFailure` ×5, the last error thrown
     - `recordAttempt` throws → the request is still sent
     - a cached second identical call → 0 new attempts
     - constructed with `''` and with `'   '`, with `LEGISCAN_API_KEY` unset for the test (save and restore `process.env`) → `LegiscanMissingKeyError` thrown, `get` called 0 times, `recordAttempt` ×0, `recordFailure` ×0, `checkQuota` called 0 times
     - the same empty-key construction does not throw, so eager construction (`getAllKyDataSources()`) keeps working
- **Don't:**
  - Throw from the constructor or from `getKyLegiScanClient()`.
  - Change `RATE_DELAY`, `MAX_RETRIES`, the timeout or the throttle.
  - Change bucket key formats or migration 054.
  - Add a migration. The failed-attempt counter is a new row in the existing `ky_sync_state` table, written by the existing RPC.
  - Call the real LegiScan API in tests.
  - Edit the operating manual §4 "undercounts" line (that is an Owner action after deploy).
- **Acceptance criteria:**
  - [ ] All nine test cases in step 8 pass, including the two empty-key cases.
  - [ ] `LegiscanMissingKeyError` is exported from `src/lib/ky-legiscan-client.ts`, and its check in `request()` comes before `ensureQuotaAllows()` (code review).
  - [ ] `grep -n "void this.incrementQueryCounter" src/lib/ky-legiscan-client.ts` returns nothing.
  - [ ] `getKyLegiScanClient()` and every existing call site compile unchanged (`npx tsc --noEmit`).
  - [ ] `check-quota.ts` prints the failed-attempt line (code review).
  - [ ] The PR's "Findings re-checked" cites N3 (step 5).
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. The production check is an Owner action.
- **Owner actions:**
  - [ ] The day after deploy, run `npm run check:legiscan-quota` (needs prod env). Expect a "Failed attempts" line (0 is fine), and a month total that keeps rising by about the same daily amount as before.
  - [ ] After that check, edit operating manual §4 (`00-agent-operating-manual.md` line ~197). Change "The counter undercounts. It records successful calls only. Add 10% to your estimate." to "The counter counts every attempt, including failures (WS4-02)."
- **Rollback:** Revert the PR. The `legiscan_failed_attempt_counter` row can stay, since nothing else reads it. To remove it (Owner): `delete from ky_sync_state where key = 'legiscan_failed_attempt_counter';`.

---

### WS4-03a · Charge every LegiScan call to a per-run budget and deny unbudgeted processes

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W2 | Opus | M | WS4-01, WS4-02 | D1, E14 |

- **Program class:** Core
- **Owner decision:** none for the design. Before merge, the owner confirms that each default cap is at or above the real per-run use (Owner actions). Target merge: 2026-11-13. The standing owner-pricing rule applies until it merges.
- **Data-limit impact:** none during the work. Tests use stubs.
  - In production, scheduled jobs run under their caller-tag caps. Those caps sit above measured per-run use, so no change is expected (the owner checks before merge).
  - Any other process that calls LegiScan without `--budget=N` now fails on its **first** call, before any HTTP request. That is the intended stop.
- **Ongoing cost:** Negative. The human "price before running" rule (TASKS.md line 77) becomes a code check. It adds one flag to manual runs, and no workflow or schedule.
- **Why:**
  - A single process can spend most of the month with nothing stopping it but the 95% hold. `backfill:vote-nv-counts` would use about 69% and a `refresh:bill-status` full pass about 17% (D1, TASKS.md line 77).
  - 14 scripts plus `manual-sync.ts` can reach LegiScan, and most are untagged (September's 552 `getPerson@untagged`, decisions.md § 2026-09-29).
  - Wrapping each script by hand is error-prone. Making "no budget" mean "no call" covers every script, including ones nobody remembers.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-legiscan-client.ts`:
    - one process-wide singleton (`getKyLegiScanClient()`, line 503)
    - the only guard is `ensureQuotaAllows()` (line 154), which throws `LegiscanQuotaHoldError` at 95% of the month
  - `src/lib/legiscan-caller.ts`:
    - `withLegiscanCaller(tag, fn)` scopes a tag with `AsyncLocalStorage`
    - `currentLegiscanCaller()` returns the scoped tag, else `LEGISCAN_CALLER`, else `'untagged'`
    - a scoped tag overrides the env tag
  - Existing tags:
    - `sync-bills`, `sync-legislators`, `sync-legislator-bios` and `sync-votes`, set at the pipeline entry points (`src/lib/ky-sync-pipeline.ts` lines 970, 1353, 1682, 1776)
    - `accuracy-audit` (`scripts/accuracy-audit.ts` line 348), `dataset-sync` (`scripts/sync-ky-dataset.ts` line 339) and `session-preview` (`scripts/preview-session-sync.ts` line 153)
    - `legislator-links`, set as an env var in `.github/workflows/legislator-links-weekly.yml` line 35
  - Inner per-item catches in `ky-sync-pipeline.ts` re-throw **only** quota holds, at ~575, ~668, ~886 (hash loop) and ~1754. The master-list fall-through condition at ~794 does the same, and so does the votes loop at ~1842. Any other error, including a new budget error, would be swallowed per item.
  - `quotaHoldSkipResult()` (line 368) turns a hold into `skipped`, with `success` plus a note on `ky_sources`; it is a no-op DB-wise when `options.dryRun`. `legiscanUnreachableSkipResult()` (line 437) returns `null` for quota holds. The top-level catches call them at ~1214, ~1764 and ~1872, and the legislators path at ~1652.
  - `scripts/manual-sync.ts` lines 46–71 parse flags by hand. Unknown flags are ignored.
  - Scripts that reach LegiScan (15 files, `grep -ln "ky-legiscan-client\|ky-data-sources\|legiscan-dataset-store\|accuracy-audit/\|ky-sync-pipeline" scripts/*.ts`):
    - `accuracy-audit.ts`, which goes through `src/lib/accuracy-audit/legiscan-dataset-corpus.ts` line 127
    - `backfill-bill-history-from-datasets.ts`, `backfill-bill-history-texts.ts`, `backfill-session-votes.ts`, `backfill-veto-status.ts`, `backfill-vote-nv-counts.ts`
    - `ky-legiscan-bulk-seed.ts`, `list-ky-legiscan-sessions.ts`, `manual-sync.ts`, `preview-session-sync.ts`
    - `refresh-bill-status-from-legiscan.ts`, `spot-check-bill-external-links.ts`, `sync-ky-dataset.ts`
    - `verify-legiscan-vote-counts.ts`, `verify-legislator-external-links.ts`
  - Scheduled runs and how each would get a budget:
    - **Through a pipeline scope:**
      - Vercel `/api/sync?source=bills|legislators|votes`
      - `sync-ky-bills-status.yml` (`npm run sync:ky:bills:status` = `manual-sync.ts bills --use-change-hash …`, every 6 h)
      - `legislator-links-weekly.yml` step `npm run sync:ky:legislators`
      - `sync-lrc-calendar.yml` (`manual-sync.ts lrc-calendar`, no LegiScan)
    - **Through a script-level tag:**
      - `legiscan-dataset-weekly.yml` (`dataset-sync`)
      - `accuracy-audit.yml` (`accuracy-audit`)
      - the verifier step of `legislator-links-weekly.yml` (`legislator-links`)
    - **Manual only, untagged:** `backfill-session-votes.yml` and `backfill-vote-nv-counts.yml`, whose inputs are mapped to env and an args array at lines ~80–103 and ~75–95.
  - The only `src/` code that calls `getKyLegiScanClient()` is in `ky-sync-pipeline.ts` (lines 988, 1642, 1715, 1791, all inside the four entry points) and `accuracy-audit/legiscan-dataset-corpus.ts`, which only scripts reach.
- **Do:**
  1. Create `src/lib/legiscan-run-budget.ts`. Keep it pure, with no Supabase import. Export:
     - `class LegiscanRunBudgetError extends Error`, with fields `budget`, `spent`, `caller` and `reason: 'exhausted' | 'no-budget'`.
     - `parseBudgetFlag(argv: string[]): number | undefined`. It reads the first `--budget=N` (N a non-negative integer) and throws on a malformed value.
     - `resolveRunBudget(tag: string, explicit?: number): number | null`. It returns `explicit` if it is a number. Otherwise it returns `DATA_BUDGET.legiscan.perRunCap[tag]` when that key exists (a number, or `null` for uncapped), and otherwise 0.
     - `withLegiscanRunBudget<T>(budget: number | null, fn: () => T): T`. It opens a new `AsyncLocalStorage` scope `{ budget, spent: 0 }` that **replaces** any outer scope (no nested minimum). `null` means the calls are counted but never stopped.
     - `chargeLegiscanRunBudget(): void`. With a scope, it throws `exhausted` when `budget !== null && spent >= budget`, and otherwise increments `spent`. With **no scope**, it uses a process-level fallback:
       - The budget is `parseBudgetFlag(process.argv)` if present. In that case one counter is shared by the whole process.
       - Otherwise it is `resolveRunBudget(currentLegiscanCaller())`, with one counter per tag. `'untagged'` resolves to 0.
       - When `process.env.VERCEL === '1'` [verify that Vercel sets this system env var], the fallback is always 0 and logs an error. Every Vercel LegiScan call must be inside a pipeline scope.
       - A 0 budget throws `no-budget`, with the message `No LegiScan budget for caller "<tag>": pass --budget=N (see docs/data-budget.md)`.
     - `legiscanRunBudgetRemaining(): number | null`, where `null` means uncapped or no scope.
     - `isLegiscanRunBudgetError(err)`, and `isLegiscanStopError(err)`, which is a quota hold or a run-budget error.
  2. In `KyLegiScanClient.request()`, call `chargeLegiscanRunBudget()` immediately before WS4-02's `recordAttempt`, for every attempt. Retries are charged too, and a cache hit is not. If the charge throws, nothing is recorded and nothing is sent.
  3. In `ky-sync-pipeline.ts`:
     - Add `legiscanRunBudget?: number` to `SyncOptions` (line 214).
     - Wrap each of the four entry points as `withLegiscanCaller(tag, () => withLegiscanRunBudget(resolveRunBudget(tag, options.legiscanRunBudget), () => run…(options)))`. Because `perRunCap['sync-bills']` is `null` until WS4-06, the bills sync is counted but **not capped** in this WP. That prevents a capped run from discarding its fetched bills and buying the same ones again on every run.
  4. Replace every inner `isLegiscanQuotaHoldError(err)` re-throw and the ~794 condition with `isLegiscanStopError(err)`: ~575, ~668, ~794, ~886, ~1754, ~1842, and any other match from `grep -n "isLegiscanQuotaHoldError(err)" src/lib/ky-sync-pipeline.ts`. In `legiscanUnreachableSkipResult()`, also return `null` for run-budget errors.
     - `LegiscanRejectedError` (WS4-02) **stays swallowed per item**. One bad bill id must not stop a run, and a key-level rejection already fails the run at the first session-list or master-list call, outside the per-item loops.
  5. Add `runBudgetSkipResult(source, err, start, options)` next to `quotaHoldSkipResult()`. It returns `status: 'skipped'` with the error `LegiScan run budget reached (spent N of M)` or the `no-budget` message, and records `success` with that note on `ky_sources` unless `dryRun`. Call it right after `quotaHoldSkipResult` in every top-level catch (~1214, ~1652, ~1764, ~1872). Export it for tests.
  6. In `scripts/manual-sync.ts`, pass `parseBudgetFlag(args)` as `legiscanRunBudget`. Print `LegiScan budget: <N | per-source default from DATA_BUDGET>`. Change nothing else.
  7. In `backfill-session-votes.yml` and `backfill-vote-nv-counts.yml`:
     - Add a **required** `workflow_dispatch` input `budget` (string, no default).
     - Map it to `INPUT_BUDGET` and append `--budget=${INPUT_BUDGET}` to the args array.
     - These are manual-only, so inputs always exist.
     - Do not add `--budget` to any scheduled workflow; those resolve their cap from their tag.
  8. In `legiscan-dataset-weekly.yml`, `accuracy-audit.yml` and `legislator-links-weekly.yml`, add a one-line comment above the run step: `# LegiScan per-run cap: DATA_BUDGET.legiscan.perRunCap['<tag>'] (WS4-03a)`.
  9. Tests in `src/lib/legiscan-run-budget.test.ts`:
     - untagged, no flag → the first charge throws `no-budget`
     - `LEGISCAN_CALLER=accuracy-audit` (set and restore in the test) → 40 charges pass and the 41st throws
     - argv `--budget=3` → the 4th charge throws
     - `--budget=abc` → `parseBudgetFlag` throws
     - a scope of 10 inside a scope of 3 → 10 applies (replacement)
     - a `null` scope never throws
     - two concurrent scopes do not share counts
     - `resolveRunBudget`: an explicit 0 → 0; a `null` key → `null`; a missing key → 0
     - `VERCEL=1`, no scope → 0
  10. Extend `src/lib/ky-legiscan-client.test.ts`:
      - budget 2 and three timeouts in a row → the third attempt throws `LegiscanRunBudgetError`, and `get` was called twice
      - `checkQuota` returns blocked → `LegiscanQuotaHoldError` is thrown before any charge or `get`. This is the kill-switch path, the same for routes and scripts.
  11. Pipeline seam tests (new `src/lib/ky-sync-pipeline-budget.test.ts`):
      - `runBudgetSkipResult` with `dryRun: true` returns `skipped` with the message
      - `isLegiscanStopError` is true for both error classes and false for `LegiscanRejectedError`
  12. Repo test, in WS1-05a's `src/lib/repo-invariants.test.ts` if it exists, otherwise in the step 9 file:
      - every caller tag used by a scheduled job has a `perRunCap` key: `sync-bills`, `sync-legislators` and `sync-votes` from the `vercel.json` `?source=` paths; `dataset-sync`, `accuracy-audit` and `session-preview` from the `withLegiscanCaller('…'` literals in `scripts/`; `legislator-links` from the workflow env
      - every `perRunCap` key appears as one of those tags (no dead keys)
  13. In `docs/data-budget.md`, add "How a run's LegiScan budget is chosen": pipeline scope → `--budget=N` → caller-tag default → denied. Include one example command for a manual script.
- **Don't:**
  - Change the monthly 95% hold or any cap value. WS4-06 sets `sync-bills`.
  - Wrap scripts in new `withLegiscanCaller` calls, or rename any existing tag. Tags are permanent counter keys.
  - Add per-script estimates (that is WS4-03b), or change bills-sync write order (that is WS4-06).
  - Use a module-global counter for scoped (route) calls.
  - Add `--budget` to scheduled workflow run lines.
- **Acceptance criteria:**
  - [ ] All tests in steps 9–12 pass.
  - [ ] `grep -n "isLegiscanQuotaHoldError(err)) throw" src/lib/ky-sync-pipeline.ts` returns nothing.
  - [ ] Each of the four entry points uses `resolveRunBudget` (code review), and `resolveRunBudget('sync-bills')` returns `null` (test).
  - [ ] Both manual backfill workflows have a required `budget` input. `git diff` shows no `--budget` on any scheduled workflow.
  - [ ] With no budget in scope, a scheduled tag resolves to a non-zero cap and an untagged process resolves to 0 (tests).
- **Verify:**
  - In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run typecheck:scripts` if WS1-02 has landed.
  - Manual demo, also in a plain container with no `.env`: `npx tsx scripts/list-ky-legiscan-sessions.ts` should print the `no-budget` error and make no HTTP request. [verify the script reaches `request()` without a Supabase read; if it does not, rely on the unit tests and say so in the PR.]
  - Other scripts need prod env (Owner).
- **Owner actions:**
  - [ ] **Before merge:** run `npm run check:legiscan-quota 2026-09` (prod env). Check that no scheduled tag's largest single run exceeds its cap: `dataset-sync` ≤ 40, `accuracy-audit` ≤ 40, `legislator-links` ≤ 40, `sync-legislators` ≤ 10, `sync-votes` ≤ 60. Use the per-caller breakdown divided by runs, or a recent run's log. If any cap is low, change it in `DATA_BUDGET` in the PR.
  - [ ] After deploy, check that these runs succeeded: the next Sunday/Wednesday dataset run, Sunday's accuracy audit and Monday's link verifier. `/admin/sync-status` should show no new `skipped` with a budget note.
  - [ ] After merge, re-enable the `backfill-vote-nv-counts` and `backfill-session-votes` workflows in GitHub → Actions (disabled since WS4-04). Never re-enable them, or any LegiScan workflow, to work around a cap.
  - [ ] Mark TASKS.md line 77 (standing pricing rule) "superseded by WS4-03a" (a one-line edit).
- **Rollback:** Revert the PR. No data or schema change. The backfill workflows lose the `budget` input.

---

### WS4-03b · Print estimates in the high-spend LegiScan scripts and make the hash path the default

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS4-03a, WS1-01 (soft: WS5-01a) | D1, E14 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. The agent runs no script against LegiScan, and tests stub the console and exit.
- **Ongoing cost:** About 0. Five scripts gain a printed estimate, and a refusal when the estimate exceeds `--budget`.
- **Why:**
  - WS4-03a stops unbudgeted calls. The operator still needs to know the right `--budget` **before** running the scripts that can spend hundreds or thousands (D1, TASKS.md line 77).
  - `npm run sync:ky` and `npm run sync:ky:dry` take the legacy bills path unless `--use-change-hash` is passed (`scripts/manual-sync.ts` lines ~67–71). That path calls `getBill` for up to 250 bills per session (`ky-sync-pipeline.ts` ~996–1001), because "dry run" there means "no DB writes", not "no LegiScan calls".
- **Current state (verified 2026-10-06):**
  - High-spend scripts:
    - `backfill-vote-nv-counts.ts` and `backfill-session-votes.ts` (estimate by default, `--live` to spend)
    - `refresh-bill-status-from-legiscan.ts` and `backfill-bill-history-texts.ts` (spend per row, `--limit` optional)
    - `manual-sync.ts`: the legacy bills path, and `--quota-backfill` (`sessions × (1 + sponsor budget)`)
  - None of the four standalone scripts is tagged. Their spend is recorded as `@untagged`.
  - `package.json`: `sync:ky:bills:status` already passes `--use-change-hash`, and `sync:ky`/`sync:ky:dry` do not.
  - `backfill-veto-status.ts` is on WS5-01a's archive list (05-simplification.md line ~182). WS4-03b does not wait for WS5-01a: it wires the scripts still in `scripts/` and skips any already archived.
- **Do:**
  1. Add `assertLegiscanEstimate({ script, estimate, note, argv?, exit?, log? })` to `src/lib/legiscan-run-budget.ts`. It:
     - prints `[<script>] Estimated LegiScan queries: <estimate> (<note>). Budget: <N | none>.`
     - when `estimate > 0` and there is no `--budget`, prints the WS4-03a refusal and exits 2 before any call
     - when `estimate > budget`, exits 2 and names both numbers
     - when `budget > DATA_BUDGET.legiscan.manualApprovalAbove` without `--owner-approved`, exits 2 and quotes operating manual §4
     - when `estimate === 0`, prints and returns
  2. Call it in the four standalone scripts, before any LegiScan call, with an estimate computed from DB rows or flags **without** calling LegiScan:
     - `backfill-vote-nv-counts.ts`: rows to repair
     - `backfill-session-votes.ts`: sessions × 2
     - `refresh-bill-status-from-legiscan.ts`: bills selected
     - `backfill-bill-history-texts.ts`: rows selected

     Add a `Cost: <formula>. Requires --budget=N when live.` line to each header. Keep their `--dry-run`, `--live` and `--limit` meanings unchanged. Skip any of them that WS5-01a archived.
  3. In those four scripts, wrap `main` with `withLegiscanCaller('<script-name-slug>', main)` **only when** `currentLegiscanCaller() === 'untagged'`, so a `LEGISCAN_CALLER=wp-wsn-nn` set by an operator is preserved. Test that preservation in the helper's test file using a stub.
  4. In `manual-sync.ts`:
     - Make the hash path the default for bills. Keep the legacy path behind a new `--legacy-full-fetch` flag, and accept `--use-change-hash` as a no-op.
     - Print an estimate for the legacy path (`limit × sessions + 2`) and for `--quota-backfill`.
     - For the hash path, print `bounded by the sync-bills run cap`.
     - Add to the header: "`--dry-run` means no DB writes. It still calls LegiScan."
  5. Tests in `src/lib/legiscan-script-estimate.test.ts`: each branch of `assertLegiscanEstimate`, with `exit` and `log` injected.
  6. In `docs/data-budget.md` "How to price a run", add one example command per script.
- **Don't:**
  - Run any script against LegiScan, change what any script writes, or wire scripts that WS5-01a archived.
  - Touch `ky-legiscan-client.ts` or `ky-sync-pipeline.ts`.
  - Rename existing caller tags.
- **Acceptance criteria:**
  - [ ] The four scripts (minus any archived) call `assertLegiscanEstimate` before their first LegiScan call and have a `Cost:` header line.
  - [ ] `manual-sync.ts bills` uses the hash path by default (code review and header example).
  - [ ] Helper tests cover the refuse, run, approval and tag-preservation branches.
- **Verify:**
  - In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run typecheck:scripts` if WS1-02 has landed.
  - Otherwise, list every import line added and re-read each by hand.
- **Owner actions:**
  - [ ] Run `npx tsx scripts/backfill-vote-nv-counts.ts` (prod env; estimate-only, 0 LegiScan calls). Expect the estimate line. Then add `--live` with no `--budget`, and expect exit code 2 before any call.
- **Rollback:** Revert the PR. `manual-sync` goes back to the legacy default.

---

### WS4-04 · Confirm LegiScan key ownership and adopt the budget and paid-tier trigger

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Owner | S | WS4-01 | D1, E14, T9 |

- **Program class:** Core
- **Owner decision:**
  1. **Accept the budget in `docs/data-budget.md`** (defaults in WS4-01). Options: accept as written, or change any number. **Recommended:** accept. **Default if not answered by 2026-10-20:** the PROPOSED numbers apply, and later WPs use them.
  2. **Paid-tier trigger.** Options:
     - (a) keep the accepted 2026-09-29 trigger: a month passes 5,000 by the 15th → buy before month-end, state-limited Pull first
     - (b) buy the $1,000/yr tier before the session
     - (c) never buy, and accept the hold

     **Recommended:** (a), plus one addition: also buy if a partner agreement needs a second state. **Default:** (a).
  3. **Contact address in bot User-Agents** (used by WS4-09a). Options: `katie@kyvky.com` (already the published reply-to), or a role alias such as `data@kyvky.com`. **Recommended:** a role alias, so the address can move with the project if it merges into a partner. **Default if not answered by 2026-10-20:** `katie@kyvky.com`.
- **Data-limit impact:** none. Account pages only.
- **Ongoing cost:** none after the one-time check.
- **Why:**
  - The one-key rule is audited from 2026-11-01, and a violation means a permanent ban (D1).
  - The account that holds the key is inferred, not confirmed (E14, TASKS.md line 37).
  - The funder-facing LegiScan line still cites a superseded reading (T9).
  - A partner will ask who controls the key (O3).
- **Current state (verified 2026-10-06):**
  - TASKS.md line 37 (open): find out which account holds `LEGISCAN_API_KEY`.
  - decisions.md § 2026-09-29 records the trigger as accepted.
  - TASKS.md lines 50 and 99 record where the key is configured: Vercel, a GitHub Actions secret, and local env files.
  - GitHub Actions secrets are write-only and cannot be read back.
- **Do (Owner):**
  1. Log in to the LegiScan account believed to hold the key. On the API Status page, confirm there is exactly **one** Public key.
  2. Compare its last four characters with the Vercel production value (Project → Settings → Environment Variables) and the local env file. For GitHub, either:
     - re-set the `LEGISCAN_API_KEY` secret from the confirmed value, or
     - check that a recent `sync-ky-bills-status` run's log shows successful LegiScan calls, and that the counter rose under `sync-bills` the same day.

     Do not register, request or rotate any key.
  3. Record the result in `docs/data-budget.md` under "LegiScan rules": the account (by role, not email), the confirmed date, "one key", and where it is configured. Do not write the key or any part of it.
  4. Answer decisions 1–3 in `docs/data-budget.md`, and change its status line to "ACCEPTED <date>".
  5. Mark TASKS.md line 37 done with a link to this WP. That one-line change is the only TASKS.md edit in this WP.
  6. Update the funder-facing LegiScan line in the owner's Notion to use the accepted planning target, not "97% of cap" (T9; Notion is outside the repo).
  7. In GitHub → Actions, disable the `backfill-vote-nv-counts` and `backfill-session-votes` workflows (… menu → Disable workflow). Nothing in code caps a single run until WS4-03a merges: `backfill-vote-nv-counts` alone would use about 69% of the monthly cap (D1), and WS1-01 makes `backfill-session-votes` runnable again. Both stay disabled until WS4-03a merges, and are never re-enabled to work around a cap (WS9-06a runbook).
- **Don't:**
  - Register a second key.
  - Send LegiScan anything.
  - Put the key, its suffix or the account email in the repo.
- **Acceptance criteria:**
  - [ ] `docs/data-budget.md` states the confirmed account role, the date and "one key".
  - [ ] Its status line reads ACCEPTED with a date.
  - [ ] TASKS.md line 37 is checked off with a link.
  - [ ] Both backfill workflows show as disabled in GitHub → Actions.
- **Verify:** Manual only. No commands.
- **Owner actions:** all of the above.
- **Rollback:** Not applicable. If the check finds two keys, stop and open an issue titled "LegiScan: more than one key found" before 2026-11-01. Do not delete either key until LegiScan's housekeeping rules have been read.

---

### WS4-05 · Test all four LRC parsers against the saved pages

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | M | none | E6, E7, D3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. Tests read `fixtures/lrc/` only, with no live LRC fetch (operating manual §4).
- **Ongoing cost:** About 0. Parser regressions fail in `npm test` instead of in a 12:00 UTC cron.
- **Why:** The LRC scrapers are the most fragile code in the repo, and all four Actions failures in the last 30 days were LRC jobs (E6). Saved snapshots exist in `fixtures/lrc/`, but no test uses them (E6, E7). WS1 deferred these tests to this workstream.
- **Current state (verified 2026-10-06):**
  - Pure parsers, each taking an HTML string:
    - `parseLegislativeCalendarHtml(html)` in `src/lib/lrc-legislative-calendar-parser.ts` line 217 (returns `stats.dayCount`, used by the guard), plus `parseLrcCalendarDateLabel` at line 80
    - `parseCommitteeMaterialsHtml(html, url)` in `src/lib/lrc-committee-materials-parser.ts` line 96 (`meetings`, `stats.meetingCount`, `stats.materialCount`)
    - `parseEnrollmentActionsHtml(...)` in `src/lib/lrc-enrollment-actions-parser.ts` line 137 (`stats.dateCount`, `actionGroupCount`, `billRefCount`), plus `kySessionToLrcRecordSlug` at line 50
    - `parsePopularNamesHtml(...)` in `src/lib/lrc-popular-names-parser.ts` line 100 (`stats.nameCount`, `billRefCount`, `uniqueBillCount`), plus `popularNamesByBillNumber` at line 167
    - `extractLrcBillReferences(text)` in `src/lib/lrc-bill-reference-parser.ts` line 127
  - Fixtures in `fixtures/lrc/`:
    - `legislative-calendar-live.html`
    - `committee-materials-itoc-live.html`
    - `legislative-record-enrollment-actions-26rs-live.html`
    - `lrc-popular-names-25rs-live.html`
    - `legislative-record-26rs-live.html` (an index page with no parser)

    `fixtures/lrc/README.md` omits the popular-names file.
  - `src/lib/ky-lrc-calendar-sync.ts` line ~553 and `scripts/audit-lrc-agenda-bill-refs.ts` line 12 already read the calendar fixture, which shows that the parsers run offline.
- **Do:**
  1. Create one test file per parser: `src/lib/lrc-legislative-calendar-parser.test.ts`, `src/lib/lrc-committee-materials-parser.test.ts`, `src/lib/lrc-enrollment-actions-parser.test.ts`, `src/lib/lrc-popular-names-parser.test.ts` and `src/lib/lrc-bill-reference-parser.test.ts`. Use `node:test` and `node:assert/strict`, and read fixtures with `readFileSync(resolve(process.cwd(), 'fixtures/lrc/<file>'), 'utf8')`.
  2. For each fixture-backed parser, run the parser once and write down its `stats`. Then assert:
     - the exact `stats` counts. These are golden values; add a comment saying when and how to update them.
     - 2–3 hand-checked records, chosen by reading the fixture HTML. For example: the first and last calendar day, one committee meeting with its material URLs, one veto entry with its bill numbers, one popular name and its bill.
     - that every bill number produced matches the format the parser emits. Check the code; for example `/^(HB|SB|HR|SR|HJR|SJR|HCR|SCR) \d+$/`.
  3. Add a "structure break" test per parser: feed it `'<html><body><p>Service unavailable</p></body></html>'` and an empty string, and assert the zero-result shape (for example `stats.dayCount === 0`). WS4-10 relies on these shapes.
  4. Add table tests for:
     - `parseLrcCalendarDateLabel`
     - `kySessionToLrcRecordSlug` (check the function for the real mapping)
     - `extractLrcBillReferences`, with 5–8 strings from the calendar fixture's agenda lines, including one with no bill
  5. In `fixtures/lrc/README.md`, add the popular-names fixture with its source URL, taken from `lrcPopularNamesUrl()`. Add a "Capture date" column, filled from `git log --format=%ad -1 -- <file>`.
- **Don't:**
  - Fetch live LRC pages or refresh fixtures.
  - Change parser code. If a test reveals a parser bug, record it under "Found, not fixed" with the failing assertion, and mark that assertion `test.skip` with a comment naming the bug.
  - Merge between 2026-10-31 and 2026-11-05 (WS9-03 election freeze), unless the PR is docs/test-only under WS9-03 (a), which needs step 5's `fixtures/lrc/README.md` edit split into a follow-up PR.
- **Acceptance criteria:**
  - [ ] Five new test files exist. `npm test` passes, with at least 25 new tests.
  - [ ] Each fixture-backed parser has golden `stats`, hand-checked records and a structure-break test.
  - [ ] `fixtures/lrc/README.md` lists all five fixtures with capture dates.
  - [ ] Apart from this WP's TRACKER.md row (manual §8), the diff touches only the new test files and `fixtures/lrc/README.md`.
  - [ ] The PR merges on or before 2026-10-30 or after 2026-11-05, unless it is docs/test-only under WS9-03 (a).
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** Delete the test files and revert the README.

---

### WS4-06 · Make the hash-gated bills sync resumable, then turn on its run cap

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W2 | Opus | M | WS4-03a | D1, D5, E5 |

- **Program class:** Core
- **Owner decision:** The bills per-run cap. Options: 250 (default in WS4-01), or a different number. **Recommended:** 250. The January pickup of about 300 bills then takes 2 runs, and February's about 950 take about a day of 6-hourly runs. **Default if not answered by 2026-11-20:** 250.
- **Data-limit impact:** none during the work, which uses unit tests with stubs. In production it **prevents** spend. Today, a bills run that stops before its single upsert has spent a `getBill` per changed bill and written nothing, and the next run buys the same bills again. Once this merges, no run spends more than `perRunCap['sync-bills']`.
- **Ongoing cost:** Reduces it. It removes a failure mode that would show up only as a quota spike in session, when there is least time to debug. It adds one `ky_sync_state` row that WS4-08 reads.
- **Why:**
  - In `syncKyBillsByHash`, every changed bill's `getBill` result is held in memory and written in one upsert **after** the whole loop. A quota hold, a run cap or a killed process mid-loop loses everything fetched so far (D1).
  - A per-run cap without resumable writes would make every capped run buy the same bills again and write none. That is why WS4-03a leaves this sync uncapped until this WP.
  - The first 2027 pickup (about 300 bills in January and 950 in February, decisions.md § 2026-10-06) is the largest load the sync has faced. decisions.md § 2026-09-30 notes there is "no per-run cap other than the quota guard".
  - The GitHub job has a 45-minute timeout, and the Vercel routes have a 300 s `maxDuration` for any manual `/api/sync?source=bills` call, so a deadline is kept as a second stop.
- **Current state (verified 2026-10-06), `src/lib/ky-sync-pipeline.ts`:**
  - `syncKyBillsByHash` starts at line 753. For each session it compares `change_hash` (lines ~835–848) into `changedOrNew`. A stored `NULL` hash counts as changed, and a missing row counts as new.
  - Lines ~868–937: a `for` loop calls `client.fetchBillDetail(raw.bill_id)` for every entry and pushes rows. The comment at ~870–873 says `getMasterListRaw` returns only `bill_id`, `number` and `change_hash`, with no `last_action_date`. A quota hold is re-thrown at ~886, which discards `rows`.
  - Line ~938: `fetchBillHistorySnapshots`. Line 940: `upsertKyBillRows(source, db, rows)`, once, after the loop. Line ~942: `recordBillStatusHistoryForBuiltBatch`, also once.
  - The row's `change_hash` is written in that upsert, which is what makes the next run skip the bill.
  - There is no deadline (`grep -n -i "deadline" src/lib/ky-sync-pipeline.ts` returns nothing).
  - `src/app/api/sync/route.ts` line 33 and `src/app/api/sync/[source]/route.ts` line 20 both set `maxDuration = 300`.
  - `scripts/manual-sync.ts` lines 46–71 parse flags with `intFlag()`; there is no `--deadline-seconds` flag yet.
  - `.github/workflows/sync-ky-bills-status.yml`: `timeout-minutes: 45`, with a comment above it (lines ~59–63) that budgets "~15-20 min" for summaries. The `bills_sync` step (~75–94) and the retry step (~96–118) both run `npm run sync:ky:bills:status -- ${EXTRA}` with no deadline. The summary step runs only when `steps.bills_sync.outcome == 'success'` (~124), so it never runs after the retry. WS3-09c step 5 (03-data-accuracy-and-trust.md) caps summaries at 25 min and leaves the rest of the job to the sync. After WS4-12 this workflow is the only bills scheduler, and WS4-13 adds `getRollCall` fetches to the same run.
  - `src/lib/source-health.ts` lines ~349–365 read and upsert `ky_sync_state` rows (the fingerprint pattern to copy).
- **Do:**
  1. Add `deadlineAt?: number` (epoch ms) to `SyncOptions`. Set `deadlineAt = requestStart + 240_000` in **both** `src/app/api/sync/route.ts` and `src/app/api/sync/[source]/route.ts`. The CLI (`scripts/manual-sync.ts`) leaves it unset unless `--deadline-seconds=N` is passed; add that flag with the existing `intFlag()` helper and set `deadlineAt = Date.now() + N * 1000` at start-up.
  2. **Split the 45-minute GitHub job.** In `.github/workflows/sync-ky-bills-status.yml`, append `--deadline-seconds=1080` to the `npm run sync:ky:bills:status` command in **both** the `bills_sync` step and the retry step. Rewrite the comment above `timeout-minutes: 45` to give the split: setup about 2 min, bills sync ≤ 18 min (`--deadline-seconds=1080`), summaries ≤ 25 min (WS3-09c step 5). On the retry path: 18 + 2 (wait) + 18 = 38 min, and the summary step is skipped because it needs the first sync's success. Note the residual risk in the same comment: the deadline is checked before each LegiScan fetch, so one in-flight request with its retries can overrun by a few minutes; the job timeout still bounds the run, and WS4-15 measures real durations. Change nothing else in the workflow: not the cron, the schedule comments or the summary step, whose arguments WS3-09c owns.
  3. Restructure the loop at ~868–937 into chunks of **25** changed bills:
     - Before each `fetchBillDetail`, stop the loop when `Date.now() >= deadlineAt` or `legiscanRunBudgetRemaining() === 0`.
     - Flush after every 25 rows, once at the end, and in a `finally` when an error stops the loop. A flush calls `fetchBillHistorySnapshots`, `upsertKyBillRows` and `recordBillStatusHistoryForBuiltBatch` for the chunk, in today's order.
     - At the loop level, catch `LegiscanRunBudgetError` thrown mid-retry: flush, then treat it as an early stop (step 5). For `LegiscanQuotaHoldError`: flush, then re-throw, so the existing `skipped` handling runs.
  4. Process `changedOrNew` in a stable order: new bills first (no stored hash), then changed bills by `bill_id` ascending. The master list carries no action date (comment at ~870–873), so do not try to sort by recency.
  5. **Early stop.**
     - When the loop stops early because of the deadline or the run budget, log `Hash-gated: stopped early (<deadline|run budget>) after N of M changed bills; the next run continues`.
     - Return `status: 'success'`, because progress was made and partial runs are expected in session, with that text in `error`. Record `success` with the note on `ky_sources`.
     - Upsert `ky_sync_state` key `bills_hash_early_stop_streak` with payload `{ count, lastReason, updatedAt }`: increment it on an early stop, and set `count: 0` on a complete run.
  6. In `src/lib/data-budget.ts`, set `perRunCap['sync-bills']` to the decided number (default 250). Update WS4-03a's test, which asserted `null`.
  7. Extract the per-chunk write into an exported function that takes its dependencies (`upsert`, `snapshot`, `recordHistory`) as parameters. Test it in `src/lib/ky-bills-hash-sync-chunks.test.ts`, with stubs and an in-memory hash store:
     - 60 changed bills with budget 30 → 30 detail calls, 2 flushes (25 + 5), and the 30 rows' hashes written
     - **two runs in a row** with 60 changed bills and budget 30 → the second run fetches the other 30, not the same 30
     - an error thrown on the 40th fetch → bills 1–39 flushed, error re-thrown
     - a quota hold on the 10th fetch → bills 1–9 flushed, hold re-thrown
     - a deadline already passed → 0 calls, 0 writes, and the early-stop note returned
     - order: new bills before changed ones
  8. Update the comment above `syncKyBillsByHash` to describe chunking, the cap, the deadline and resumption.
- **Don't:**
  - Change the hash comparison, the row shape, the status mapping or the topic classification.
  - Change the legacy (non-hash) path.
  - Raise `maxDuration` or `timeout-minutes`, lower `RATE_DELAY` or add concurrency.
  - Edit the summary step of `sync-ky-bills-status.yml` (WS3-09c).
  - Run the sync against production.
- **Acceptance criteria:**
  - [ ] The six test cases in step 7 pass.
  - [ ] No code path discards fetched rows without writing them. Every exit from the loop goes through a flush (code review, plus the error and hold tests).
  - [ ] Both sync routes set `deadlineAt`. A CLI run without the flag does not.
  - [ ] `grep -c "deadline-seconds=1080" .github/workflows/sync-ky-bills-status.yml` prints `2` (the sync step and its retry).
  - [ ] The comment above `timeout-minutes: 45` states the split: sync ≤ 18 min, summaries ≤ 25 min.
  - [ ] `perRunCap['sync-bills']` is a number.
  - [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` pass.
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Production behavior is an Owner check.
- **Owner actions:**
  - [ ] After deploy, check the next scheduled bills run's log in the Actions run. Expect `hash-gated: scanned=… unchanged_skipped=…` as before. No early stop is expected in interim.
  - Do **not** try to exercise the early stop with `npm run sync:ky -- bills … --dry-run`. That command still calls LegiScan. The first real early stop is expected in January and is reviewed in WS4-16.
- **Rollback:** Revert the PR. That restores the single end-of-loop upsert and `perRunCap['sync-bills'] = null`. The `bills_hash_early_stop_streak` row can stay.

---

### WS4-07 · Set an Anthropic spend limit and record the model's retirement date

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Owner | S | WS4-01 | A8, A7, D4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** The monthly limit. Options: $40 (default, which covers WS3's in-session estimate of about $15–35 a month plus WS3-10's one-time ≤ $10); another amount; or no limit. **Recommended:** $40. **Default if not answered by 2026-11-30:** $40.
  - WS4-04 already adopts the $40 amount (default 2026-10-20). The 11-30 date is only the deadline for setting it in the Console, and the limit is not in force until it is set, so set it as soon as WS4-04 is answered.
  - When the limit is reached, generation fails and existing summaries stay. `generateSummary()` (`src/lib/ky-content-generation.ts` ~70–92) turns any API error into a failure sentinel, and `isUsableSummary()` rejects it, so a good summary is not overwritten [verify that `scripts/backfill-bill-summaries.ts` skips the write for unusable text].
- **Data-limit impact:** none. Console settings only.
- **Ongoing cost:** About 0. Spend is read on the Console usage page during the monthly check (WS9-08). No token-metering migration or price table is added (see Deferred).
- **Why:** The summary job runs every 6 hours with `--limit=300`. Grounding (A1/A2, WS3-09a–d) multiplies input tokens per bill, and a hash change can regenerate many summaries at once (A8). A hard Console limit stops runaway spend with zero code. WS3-09c's `--max-usd` stops a single run, and A8's larger risk is model retirement, recorded here.
- **Current state (verified 2026-10-06):**
  - `src/lib/anthropic-model.ts`: `KY_DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'`.
  - `.github/workflows/sync-ky-bills-status.yml` lines ~118–137 run `npm run backfill:bill-summaries -- --limit=300` after each successful bills sync, with `continue-on-error: true`.
  - WS3-09c (03-data-accuracy-and-trust.md) adds `--max-usd=N` (default 5) and a `--plan` cost estimate to `scripts/backfill-bill-summaries.ts`.
  - No spend limit is recorded in the repo.
- **Do (Owner):**
  1. In the Anthropic Console, set a monthly spend limit for the organization or workspace that holds `ANTHROPIC_API_KEY`, and an email notification at 50% if offered [verify where the Console offers limits and notifications].
  2. Record in `docs/data-budget.md` (Anthropic section): the limit, the date set, where it lives, and that it is read in the monthly check (WS9-08).
  3. If WS4-01 left the retirement date as `[verify: owner …]`, look it up on Anthropic's model deprecations page and record it with the link. If it falls before 2027-04-30, open the WS3 model-switch WP named in WS4-01 step 3.
- **Don't:**
  - Add a migration, a token counter or a price table.
  - Change the model, the prompt or `--limit`.
- **Acceptance criteria:**
  - [ ] `docs/data-budget.md` states the Console limit and its date.
  - [ ] The model retirement date, or "none announced as of <date>", is recorded with a source link.
- **Verify:** Manual only.
- **Owner actions:** all of the above.
- **Rollback:** Raise or remove the limit in the Console, and update the doc line.

---

### WS4-08 · Report LegiScan pace in the existing daily health check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS4-01, WS4-06 | D1, E2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. Thresholds come from `DATA_BUDGET`.
- **Data-limit impact:** none. It reads two `ky_sync_state` rows.
- **Ongoing cost:** About 0, and it adds **no schedule**. Both existing health-check paths already call `evaluateSourceHealth`: Vercel at 14:00 UTC and `source-health.yml` at 02:00 UTC. Alerts reach Slack only when the breach set changes. This breach and the monthly check (WS9-08) are the only budget signals; there is no third checklist.
- **Why:**
  - The LegiScan alert starts at 90% of the cap (`slack-webhook.ts` line 268), far past the 50% planning target and the "5,000 by the 15th" buy trigger (D1). Nothing projects the month.
  - After WS4-06, a session backlog that hits the cap every run would look green, because every early stop records `success`.
  - Open States, Anthropic and Resend are out of scope (see Deferred): Open States makes about 6 calls a day, Anthropic has the Console limit (WS4-07), and WS7-09c owns the send budget.
- **Current state (verified 2026-10-06):**
  - `src/lib/source-health.ts`:
    - the pure `evaluateSourceHealth(rows, now)` (line 185) returns `breaches` and a `fingerprint`
    - `BreachKind` (line 117) is `'missing' | 'error' | 'stuck_running' | 'stale' | 'stalled'`
    - the fingerprint is built from `` `${source}:${kind}` `` only (lines ~282–287)
  - `src/app/api/cron/health-check/route.ts` and `scripts/check-source-health.ts` both call it.
  - `src/lib/slack-webhook.ts` `maybeAlertLegiscanQuotaHigh()` (line ~306) posts at 90/95/98/100% after syncs.
  - `fetchLegiscanQuotaSummary()` (`legiscan-quota.ts` line 121) returns `{ month, used, limit, pct }`.
- **Do:**
  1. Add `'budget_pace'` to `BreachKind`.
  2. Add a pure `evaluateLegiscanPace(input: { used: number | null; earlyStopStreak: number | null }, now: Date): SourceBreach[]` to `src/lib/source-health.ts`. Give each check its own `source`, so the fingerprint changes when a second breach appears:
     - `budget:legiscan-pace`: projected month-end (`used / elapsedDays * daysInMonth`, computed from day 3 onward) is over `planningTargetPerMonth`.
     - `budget:legiscan-trigger`: `used >= paidTierTriggerByDay15` on or before the 15th. The message quotes the decisions.md § 2026-09-29 trigger.
     - `budget:bills-backlog`: `earlyStopStreak >= 8` (two days of capped runs).
     - `budget:counters`: either input is `null` (unreadable).

     Each message names the number, the threshold and `docs/data-budget.md`.
  3. In the health-check route and the script, read `fetchLegiscanQuotaSummary()` and the `bills_hash_early_stop_streak` row (WS4-06). Merge `evaluateLegiscanPace(...)` into the result's breaches and fingerprint before formatting. A read failure becomes the single `budget:counters` breach and never crashes the check.
  4. Tests in `src/lib/source-health.test.ts` (new file):
     - each threshold just under and just over
     - the day 1–2 projection skip
     - unreadable counters
     - the fingerprint changes when a pace breach appears, stays the same while it persists, and changes again when a second, different budget breach appears
  5. Leave `maybeAlertLegiscanQuotaHigh()` in place (it is the at-the-wall alarm). Add a comment pointing to `evaluateLegiscanPace`.
- **Don't:**
  - Add a cron, workflow, Routine, counter or vendor API call.
  - Add Open States, Anthropic or Resend checks.
  - Change existing breach rules.
- **Acceptance criteria:**
  - [ ] `evaluateLegiscanPace` is pure and tested for every threshold and for the fingerprint behavior.
  - [ ] Both health-check paths include pace breaches (a test of the merge, or a code review of both call sites).
  - [ ] `git diff vercel.json .github/workflows` is empty.
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. A real run needs prod env (Owner).
- **Owner actions:**
  - [ ] After deploy: `npm run health:sources` (prod env). Expect no `budget_pace` breach in interim. If one appears, read its message before changing any threshold.
- **Rollback:** Revert the PR.

---

### WS4-09a · Route LRC fetches through one polite, deadline-aware helper

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | WS4-01 | D3, E6 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** The contact address in the User-Agent, decided in WS4-04 (default `katie@kyvky.com`).
- **Data-limit impact:** none during the work, because tests stub HTTP. In production, the LRC request rate goes **down**:
  - the committee-materials sync goes from a 250 ms pause to at least 1 s spacing
  - the accuracy-audit materials checker goes from 4 concurrent requests to 1 per second
- **Ongoing cost:** Reduces it. Hand-copied User-Agent strings and four copies of the fetch-and-classify code become one helper.
- **Why:**
  - The LRC has no API, so our scraping is a courtesy it can withdraw (D3).
  - Each module copies its own User-Agent (a URL but no contact address), timeout and retry rules.
  - The committee-materials sync pauses only 250 ms between about 69 fetches, and the accuracy audit fetches LRC pages 4 at a time.
  - Retry rules differ: the calendar retries 3 times, the link probe once, and the rest not at all.
  - Retries must stay inside a run deadline. A Vercel run that hits 300 s writes nothing.
- **Current state (verified 2026-10-06):**
  - `KnowYourVoteKentucky/1.0` appears 16 times in `src/` and `scripts/`:
    - LRC fetchers:
      - `src/lib/ky-lrc-calendar-sync.ts:32`
      - `src/lib/ky-lrc-committee-materials-sync.ts:22`
      - `src/lib/ky-lrc-enrollment-actions-sync.ts:26`
      - `src/lib/ky-lrc-popular-names-sync.ts:27`
      - `src/lib/ky-committee-material-link-probe.ts:13`, which retries once on status 0 (~line 51)
      - `src/lib/accuracy-audit/checkers/committees.ts:50` (calendar fetch ~515)
      - `src/lib/accuracy-audit/checkers/materials.ts:38`, which fetches committee pages with `mapWithConcurrency(…, 4, …)` at ~234–243
      - `scripts/backfill-lrc-committee-materials-history.ts:41`
      - `scripts/sync-lrc-committee-materials.ts:50`
    - Wayback (not LRC): `scripts/backfill-lrc-calendar-wayback.ts:88,130` and `scripts/repair-missing-agenda-items.ts:46`
    - Nominatim (not LRC): `src/app/api/geo/zip/route.ts:17`, the fallback when `NOMINATIM_USER_AGENT` is unset
    - Out of scope here:
      - `src/app/api/lrc/bill-link-status/route.ts:7`, owned by WS6-03/WS6-09a
      - `scripts/lrc-calendar-spike.ts:34` and `scripts/spike-lrc-committee-materials.ts:50`, archived by WS5-01a
  - Fetches use `axios.get<string>` with 30–45 s timeouts and `validateStatus: status < 500`. The exception is the calendar, which retries 3 times (waiting 15 s, then 30 s) on timeouts, network errors, 5xx, 408, 429 and bodies under 1 KB (decisions.md § 2026-10-06).
  - `src/lib/ky-lrc-committee-materials-sync.ts` lines ~203–236 loop over committees serially with `delayMs`. `ky-sync-pipeline.ts` line ~2167 passes `delayMs: 250`.
  - `src/lib/host-rate-gate.ts`:
    - `makeHostGate(limit, deps?: { now?, sleep? })` (line 32)
    - `makeHostGateRouter(limits: Record<string, HostLimit>)` (line 67) returns `null` for unlisted hosts and takes no deps
  - LRC hosts in use: `apps.legislature.ky.gov` and `legislature.ky.gov` only.
- **Do:**
  1. In `src/lib/kyvky-contact.ts`, add `export const KYVKY_BOT_CONTACT = '<address from WS4-04>';` and `export function kyvkyBotUserAgent(job: string): string`. The function returns `KnowYourVoteKentucky/1.0 (+https://www.kyvky.com/about; <contact>; <job>)`.
  2. Create `src/lib/lrc-fetch.ts` with a factory `createLrcFetcher(deps?: { http?; now?; sleep? })` and a default module-level instance. Build **one `makeHostGate` per host** listed in `DATA_BUDGET.lrc.hosts`, passing `now`/`sleep` through, so tests can use a fake clock. Reject a URL whose host is not in that list. Export `fetchLrcPage(url, { job, timeoutMs?, maxAttempts?, maxRetryAfterMs?, deadlineAt? })`, which returns `{ kind: 'ok', html, status } | { kind: 'absent', status: 404 } | { kind: 'failed', message, status? } | { kind: 'deferred' }`.
     - It sends `kyvkyBotUserAgent(job)` and `Accept: text/html`.
     - It retries on timeouts, network errors, 5xx, 408, 429 and bodies under 1 KB, waiting 15 s and then 30 s. A `Retry-After` value is honored, capped at `maxRetryAfterMs`. Defaults: `maxAttempts: 3`, `maxRetryAfterMs: 120_000` for single-page jobs (the calendar's existing policy).
     - It returns `absent` for 404, and `failed` at once for other 4xx.
     - With `deadlineAt`, it issues no new attempt and no wait when fewer than 45 s remain before the deadline, and returns `deferred` (or `failed` if an attempt already failed).
  3. Switch these fetchers to `fetchLrcPage`, keeping each module's existing outcome mapping (for example enrollment actions' `absent` versus `failed`):
     - the four sync modules
     - `ky-committee-material-link-probe.ts`, with `maxAttempts: 2` to keep its single retry
     - both accuracy-audit checkers. In `materials.ts`, the gate now serializes the fetches; keep `mapWithConcurrency` or replace it with a loop, since the result is the same.
     - `scripts/backfill-lrc-committee-materials-history.ts` and `scripts/sync-lrc-committee-materials.ts`

     For **multi-page** jobs (committee materials, enrollment actions, popular names, the audit checkers), pass `maxAttempts: 2`, `maxRetryAfterMs: 30_000`, and `deadlineAt` from `SyncOptions` when present. The `deadlineAt` field is WS4-06's. If WS4-06 has not merged, add the same optional field and set it in both sync routes as WS4-06 step 1 describes; whichever lands second rebases. A `deferred` page counts as "deferred to next run" and is not an error. Write everything already parsed. Remove the `delayMs` option from the committee-materials sync and its caller.
  4. Change only the User-Agent, using `kyvkyBotUserAgent(...)`, in:
     - `scripts/backfill-lrc-calendar-wayback.ts` (`'lrc-calendar-backfill'`)
     - `scripts/repair-missing-agenda-items.ts` (`'agenda-items-repair'`)
     - the fallback in `src/app/api/geo/zip/route.ts` (`'geo-zip'`), keeping the `NOMINATIM_USER_AGENT` override

     Those keep their own backoff. If WS3's U6 work is editing `geo/zip/route.ts`, rebase onto it.
  5. Tests in `src/lib/lrc-fetch.test.ts`, with a fake clock and stub HTTP:
     - the User-Agent contains the contact
     - two calls to the same host are spaced at least `minSpacingMs` apart
     - 503 then 200 → `ok` after 2 attempts
     - 429 with `Retry-After: 5` waits 5 s, and `Retry-After: 300` with a 30 s cap waits 30 s
     - 404 → `absent` after 1 attempt
     - 403 → `failed` after 1 attempt
     - a 10-byte 200 three times → `failed`
     - an unlisted host is rejected
     - a 3-page run where page 1 exhausts its retries: pages 2–3 still run, and the run ends before `deadlineAt`
     - 5 consecutive 503s with `deadlineAt` 120 s away → the last result is `deferred`, and the fake clock never passes the deadline
  6. Add an "LRC politeness" section to `docs/data-budget.md`: User-Agent, spacing, retries, deadline behavior, and "no new crawl targets".
- **Don't:**
  - Add conditional GET or content-hash caching (deferred until WS4-15's header check).
  - Change parsers or what the syncs write.
  - Add new LRC URLs.
  - Fetch live LRC pages in tests.
  - Edit `src/app/api/lrc/bill-link-status/route.ts` (WS6) or the spike scripts (WS5-01a).
- **Acceptance criteria:**
  - [ ] `grep -rn "KnowYourVoteKentucky/1.0" src scripts | grep -v -e src/lib/kyvky-contact.ts -e src/app/api/lrc/bill-link-status/route.ts -e scripts/lrc-calendar-spike.ts -e scripts/spike-lrc-committee-materials.ts` prints nothing.
  - [ ] `grep -rn "axios.get" src/lib/ky-lrc-*.ts src/lib/ky-committee-material-link-probe.ts src/lib/accuracy-audit/checkers/committees.ts src/lib/accuracy-audit/checkers/materials.ts` returns no LRC fetch.
  - [ ] All `lrc-fetch` tests pass, including the spacing and deadline tests.
  - [ ] The committee-materials sync no longer has a `delayMs` option.
  - [ ] The PR estimates the worst-case committee-materials runtime: 69 pages × (1 s + typical latency), with the deadline cutting off the tail [verify typical latency from a recent Vercel log, Owner].
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Production runtime is an Owner check.
- **Owner actions:**
  - [ ] After deploy, check the next `lrc-committee-materials` run in the Vercel logs. Expect a duration under 300 s and the same order of magnitude of "inserted/updated" as the previous run. Some "deferred to next run" lines are acceptable on slow days. If the run times out, revert.
- **Rollback:** Revert the PR.

---

### WS4-09b · Stop daily LRC fetches for sessions that cannot change

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS4-09a | D3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none during the work. In production, about **20 fewer LRC fetches a day** (enrollment actions) and about 20 fewer a week (popular names).
- **Ongoing cost:** Reduces load and log noise. Adds one flag for a rare manual full sweep.
- **Why:** The enrollment-actions sync walks all 23 sessions in `KY_SESSIONS` every day, and LRC has no page for most of them, so it makes about 20 requests a day for pages it knows will 404 (`ky-lrc-enrollment-actions-sync.ts`, comment at ~202–211). Popular names walks all 23 every week. A closed session's records do not change once its veto period and effective dates have passed (D3).
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-lrc-enrollment-actions-sync.ts` lines 255–258: `options.sessions?.length ? options.sessions : KY_SESSIONS.map((s) => s.name)`.
  - `src/lib/ky-lrc-popular-names-sync.ts` lines 207–209: the same default, from `options.sessions`.
  - `src/lib/ky-sessions.ts`: 23 `KY_SESSIONS` entries (2027 RS was added 2026-09-30). `KYSessionRecord` has `start`, `end` and optional `milestones`. `getMostRecentStartedSession()` exists.
- **Do:**
  1. Add a pure function `lrcRecordSessionsToRefresh(sessions: KYSessionRecord[], today: string, windowDays = 180): string[]` to `src/lib/ky-sessions.ts`. It returns:
     - sessions that have started and whose `end` is within `windowDays` before `today` (that window covers the veto period and effective dates)
     - plus the most recently started session in every case
  2. Use it as the default in both syncs when `options.sessions` is empty. Add `allSessions?: boolean` to both options objects, and a `--all-sessions` flag to `scripts/sync-lrc-enrollment-actions.ts` and `scripts/sync-lrc-popular-names.ts` for a manual full sweep.
  3. Tests in `src/lib/ky-sessions.test.ts` (existing file). Read the real start and end dates in the file and assert the real results:
     - on 2026-10-06 the function returns only "2026 Regular Session"
     - on 2027-02-01 it returns "2027 Regular Session", plus "2026 Regular Session" only if its end is within 180 days
     - on 2027-10-15 it returns "2027 Regular Session"
  4. Log the number of skipped sessions once per run, as a single line.
- **Don't:**
  - Change the parsers or the outcome mapping.
  - Touch the calendar or committee-materials syncs.
  - Change schedules.
- **Acceptance criteria:**
  - [ ] Both syncs fetch only the sessions returned by `lrcRecordSessionsToRefresh`, unless `options.sessions` or `allSessions` is set.
  - [ ] The new tests pass.
  - [ ] `--all-sessions` restores today's behavior (code review).
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:**
  - [ ] After deploy, the next `lrc-enrollment-actions` log line should report 0 or a small number of sessions with no enrollment-actions page, instead of about 20.
- **Rollback:** Revert the PR.

---

### WS4-10 · Report an error when an LRC page parses to nothing

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | S | WS4-05 | E6, D3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** About 0. The existing health check catches a silent LRC page change within a day, instead of after the 14-day zero-yield window. Healthy runs do not change.
- **Why:**
  - Only the calendar sync treats "HTTP 200 but the parser found nothing" as an error (E6, `ky-lrc-calendar-sync.ts` line 580).
  - In the other three syncs, a changed LRC page looks like a quiet day. The committee-materials sync logs "0 meetings with materials" per committee and still reports success.
  - The health check notices only after `maxZeroYieldHours`: 14 days for committee materials, and never for enrollment actions or popular names (`source-health.ts` lines 47–89).
  - An earlier LRC URL change left 802 dead material URLs (E6).
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-lrc-calendar-sync.ts` lines ~572–592: the `dayCount === 0` guard (line 580) returns `status: 'error'` with "the page structure likely changed".
  - `src/lib/ky-lrc-committee-materials-sync.ts` lines ~203–236 only log a per-committee `parsed.meetings.length === 0`. `stats.errors` is a number (line 52).
  - `src/lib/ky-lrc-enrollment-actions-sync.ts` and `src/lib/ky-lrc-popular-names-sync.ts` count `errors` only for fetch failures.
  - The pipeline wrappers in `src/lib/ky-sync-pipeline.ts` (~2167–2265) build status and message from `stats.errors`, for example `` `${stats.errors} session fetch error(s)` `` at ~2218.
  - WS4-05's structure-break tests pin the zero-result shapes.
- **Do:**
  1. Add an optional `structureBreak?: string` field to the stats type of each of the three syncs.
  2. **Committee materials:** count committees whose page fetched `ok` and parsed to 0 meetings. If at least 10 pages fetched `ok` and **all** of them parsed to 0 meetings, set `structureBreak = 'committee materials: <n> pages fetched and none parsed; the CommitteeDocuments page structure likely changed'`. An individual empty committee stays normal.
  3. **Enrollment actions:** a session page fetched `ok` (not `absent`) that parses to `stats.dateCount === 0` sets `structureBreak` with the same wording, naming the session.
  4. **Popular names:** a session page fetched `ok` that parses to `stats.nameCount === 0` sets `structureBreak` the same way.
  5. Put each decision in a small exported pure function next to its sync (for example `committeeMaterialsStructureBreak(okPages: number, emptyPages: number): string | null`).
  6. In the three pipeline wrappers (`ky-sync-pipeline.ts` ~2167–2265), when `stats.structureBreak` is set, return and record `status: 'error'` with `structureBreak` as the error message. Otherwise keep today's `stats.errors` logic.
  7. Tests in a new `src/lib/lrc-structure-guards.test.ts`. Cover each pure function, and feed the real fixtures through the parsers to show they do **not** trip any guard.
  8. In `MONITORED_SOURCES`, set `maxZeroYieldHours: 24 * 120` for `lrc-enrollment-actions`, with a comment: in interim it legitimately adds nothing for months, and the parse guard is the real check. WS4-11 later moves the value into the registry.
- **Don't:**
  - Change parsers.
  - Make a single empty committee an error.
  - Add alerts outside the existing `ky_sources` status path.
  - Merge between 2026-10-31 and 2026-11-05 (WS9-03 election freeze). This PR changes runtime error behaviour, so WS9-03 (a)'s docs/test-only exemption does not apply.
- **Acceptance criteria:**
  - [ ] Each pure function returns a "structure likely changed" message for an `ok` page that parses to nothing (tests).
  - [ ] The wrappers map `structureBreak` to `status: 'error'` (code review of the three wrappers, plus a unit test if a seam exists).
  - [ ] The real fixtures trip no guard (test).
  - [ ] What a healthy run writes does not change.
  - [ ] The PR merges on or before 2026-10-30 or after 2026-11-05 (WS9-03 election freeze).
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** Revert the PR.

---

### WS4-11 · Make one schedule registry the source of truth

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS4-12 | E2, D5, E14 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. It records the schedules that remain after WS4-12, and after WS4-13 if that has merged.
- **Data-limit impact:** none.
- **Ongoing cost:** Reduces it. The hand-kept copies in `MONITORED_SOURCES` and the Sentry map become derived values. Drift fails in CI instead of producing a wrong alert. No npm script and no print script are added.
- **Why:**
  - Schedules are copied by hand into `vercel.json`, the workflows, `MONITORED_SOURCES`, `src/lib/sentry-sync-cron.ts` and the README (E2).
  - One live drift exists: `MONITORED_SOURCES.dataset` says `0 8 * * 0,3`, but the workflow runs `0 11 * * 0` and `0 11 * * 3`.
  - LegiScan jobs share one key at about 2 requests/s, so their run windows must not overlap (D1, D5).
- **Current state (verified 2026-10-06; re-read after WS4-12/13):**
  - `vercel.json` `crons` (lines 46–56): 9 entries today, 8 after WS4-12, 7 after WS4-13.
  - Scheduled workflows and their timeouts:

    | Workflow | Cron | `timeout-minutes` |
    |---|---|---|
    | `sync-ky-bills-status.yml` | `40 */6 * * *` | 45 |
    | `sync-lrc-calendar.yml` live job | `0 12 * * *`, `0 18 * * *` | 15 |
    | `sync-lrc-calendar.yml` backfill job | `0 6 * * 0` | 45 |
    | `legiscan-dataset-weekly.yml` | `0 11 * * 0`, `0 11 * * 3` | 15 |
    | `accuracy-audit.yml` | `0 13 * * 0` (`0 14 * * 0` after WS4-12) | 45 |
    | `legislator-links-weekly.yml` | `0 12 * * 1` | 20 |
    | `source-health.yml` | `0 2 * * *` | 10 |

  - `src/lib/source-health.ts` lines 47–89: `MONITORED_SOURCES`, 8 entries with free-text `scheduler`/`schedule`. `lrc-calendar.schedule` is `'0 12,18 * * *'`.
  - `src/lib/sentry-sync-cron.ts` lines 8–58: `VERCEL_SYNC_CRON_MONITORS` holds crontab literals, and `monitorSlugForSource()` builds the slugs.
  - The README sync table (lines ~120–133) may already have been removed by WS5-04b.
- **Do:**
  1. Create `src/lib/schedule-registry.ts`, exporting `SCHEDULE_REGISTRY: readonly ScheduledJob[]`, where `ScheduledJob = { id: string; scheduler: 'vercel' | 'github'; cron: string[]; target: string; purpose: string; legiscan?: { maxRuntimeMin: number }; monitoredSource?: { name: string; maxAgeHours: number; maxZeroYieldHours?: number }; sentryMonitor?: { maxRuntime: number; checkinMargin: number } }`.
     - `target` is the Vercel path, with its query string, for `vercel`. For `github`, it is `<file>.yml#<job id>`.
     - `purpose` is one line for human readers (WS7-09c, WS8-14a).
     - `legiscan.maxRuntimeMin` is 5 for Vercel (`maxDuration` 300 s) and the job's `timeout-minutes` for GitHub, with a comment naming the file.
     - Enter every current schedule. Do **not** add Claude Routines; WS5-07 records them in `CURRENT.md`.
  2. Derive `MONITORED_SOURCES` from entries with `monitoredSource`. Keep its exported name and type.
     - `schedule` is `cron.join(' + ')` for every source.
     - `scheduler` is `'Vercel cron'` or `` `GitHub Actions ${file}` ``.
     - Copy each `maxAgeHours`/`maxZeroYieldHours` value and its comment across unchanged.
     - Keep `UNMONITORED_SOURCES` as it is.
  3. Derive `VERCEL_SYNC_CRON_MONITORS` from `vercel` entries with a `?source=` target and a `sentryMonitor`. Monitor slugs must not change.
  4. Tests: a `describe` block in `src/lib/repo-invariants.test.ts` if WS1-05a has merged, otherwise `src/lib/schedule-registry.test.ts`. Read files from `process.cwd()` with regexes only (no YAML dependency).
     - Every `vercel.json` cron (`path` + `schedule`) appears in the registry exactly once, and vice versa.
     - Every `- cron: '<expr>'` line in `.github/workflows/*.yml` maps to a registry entry with the same file, and vice versa.
     - The derived `MONITORED_SOURCES` and Sentry values equal the registry (assert on the derived values).
     - **LegiScan window rule.** Expand each `legiscan` entry's crons into start minutes over one week (Sunday = 0). Use a small expander in the test that supports only numbers, `*`, `*/n` and comma lists in the minute, hour and day-of-week fields, and throws on anything else. For every pair of entries, no two windows `[start, start + maxRuntimeMin + 5)` may overlap. Add a comment: nominal times only; GitHub can start up to 2 h late (D5), which is the residual risk covered by the Deferred cross-process lock.
  5. In the README, replace any remaining schedule table with one sentence linking `src/lib/schedule-registry.ts` and `docs/data-budget.md`.
- **Don't:**
  - Change any schedule, route, workflow or threshold.
  - Generate `vercel.json` or workflows from the registry.
  - Add an npm script, a print script or Routine entries.
- **Acceptance criteria:**
  - [ ] `npm test` passes. The test fails if a cron is edited in `vercel.json` only (try it, revert, and say so in the PR).
  - [ ] `MONITORED_SOURCES.dataset.schedule` is `0 11 * * 0 + 0 11 * * 3`.
  - [ ] `src/lib/sentry-sync-cron.ts` contains no crontab literals.
  - [ ] The LegiScan window rule passes with no exception list.
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Owner actions:** none.
- **Rollback:** Revert the PR. `MONITORED_SOURCES` and the Sentry map return to literals.

---

### WS4-12 · Delete the duplicate bills and legislators runs

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | none | E2, D5, D2, D1 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** Which scheduler keeps the bills sync. Options:
  - (a) keep it on GitHub Actions, where it already runs every 6 h with summary generation and a 45-minute timeout, and delete the Vercel daily duplicate
  - (b) move bills and the LRC calendar onto Vercel
  
  Option (b) adds jobs, monitors and Vercel lock-in, and collides with WS2-11c (see the Deferred row).
  
  **Recommended:** (a). **Default if not answered by 2026-11-10:** (a). Option (b) moves to Deferred, with the trigger "two missed GitHub runs of a session-critical job in W3".
- **Data-limit impact:** LegiScan goes **down**:
  - The Vercel daily bills run (1 `getSessionList` or cached list, plus 1 `getMasterListRaw`) disappears, which saves about 30–60 queries a month.
  - The two schedulers can no longer run the bills sync at the same time.
  - Open States drops by one roster fetch a week (the Monday duplicate).
  - LRC is unchanged.
- **Ongoing cost:** Reduces it. Two job paths are deleted, a schedule moves, and no file is added. Vercel cron lines go from 9 to 8, and the total from 18 to 17.
- **Why:**
  - The bills sync runs on two schedulers (E2), and the legislators sync runs twice on Mondays (D2 re-check).
  - GitHub scheduled triggers can fire up to 2 hours late or not at all (D5). That is tolerable for a 6-hourly, hash-gated job whose staleness is now watched more tightly.
  - Keeping bills and summaries in one workflow keeps summaries tied to a successful sync. The workflow's summary step depends on `steps.bills_sync.outcome` (line 124).
  - Moving the accuracy audit one hour later keeps every LegiScan job's window clear of the bills run (WS4-11 rule).
- **Current state (verified 2026-10-06):**
  - `vercel.json` line 47: `{ "path": "/api/sync?source=bills&useChangeHash=true&skipBillSponsorDetails=true&historicSessions=1", "schedule": "0 5 * * *" }`.
  - `.github/workflows/sync-ky-bills-status.yml`:
    - `40 */6 * * *` (line 42), `timeout-minutes: 45`
    - steps: `bills_sync` (line 75), a retry (line 96), then summaries with `if: steps.bills_sync.outcome == 'success'` (line 124)
  - `.github/workflows/legislator-links-weekly.yml` lines 50–53: the "Sync legislators from Open States" step (`npm run sync:ky:legislators`), followed by the verifier. Vercel already runs `/api/sync?source=legislators` daily at 06:00.
  - `.github/workflows/accuracy-audit.yml` line 26: `0 13 * * 0`, `timeout-minutes: 45`. It calls LegiScan via the dataset corpus. The bills run at 12:40 can last up to 45 min.
  - `src/lib/source-health.ts` line ~49: `bills: { scheduler: 'Vercel cron', schedule: '0 5 * * *', maxAgeHours: 36 }`.
  - `src/lib/sentry-sync-cron.ts` lines ~15–19: a `bills` monitor on `0 5 * * *`.
  - `src/lib/ky-sync-pipeline.ts` ~430–431: the comment on `legiscanUnreachableSkipResult` says "Vercel Cron owns the guaranteed daily sync".
  - TASKS.md line 53: "Watch: if 'no runner' cancellations recur, add a workflow_run-triggered retry."
- **Do:**
  1. `vercel.json`: delete the bills entry (line 47).
  2. `src/lib/sentry-sync-cron.ts`: delete the `bills` entry, and add a comment saying the bills sync runs on GitHub Actions and so has no Vercel monitor.
  3. `src/lib/source-health.ts` `MONITORED_SOURCES.bills`: set `scheduler: 'GitHub Actions sync-ky-bills-status.yml'`, `schedule: '40 */6 * * *'` and `maxAgeHours: 18`. Comment: three missed 6-hourly runs. Quota-hold and unreachable skips still record `success`, so a running job keeps this fresh.
  4. Update the `legiscanUnreachableSkipResult` comment: the next 6-hourly run picks it up, and source-health pages after 18 h.
  5. `legislator-links-weekly.yml`: delete the "Sync legislators from Open States" step and its comment. The verifier stays and uses the roster the Vercel daily run keeps fresh.
  6. `accuracy-audit.yml`: change `0 13 * * 0` to `0 14 * * 0`, and update any comment that names the time.
  7. `docs/data-budget.md`: update the runs-per-month numbers and record the decision, including option (b) and its trigger.
- **Don't:**
  - Change any sync's logic, the summary step or the bills workflow.
  - Move any job between schedulers.
  - Add a `workflow_run` retry.
  - Change Vercel or GitHub settings (Owner).
- **Acceptance criteria:**
  - [ ] `grep -n "source=bills" vercel.json` returns nothing.
  - [ ] `grep -n "sync:ky:legislators" .github/workflows/legislator-links-weekly.yml` returns nothing.
  - [ ] `MONITORED_SOURCES.bills` names the GitHub workflow with `maxAgeHours: 18`, and the Sentry map has no `bills` entry.
  - [ ] `accuracy-audit.yml` runs at `0 14 * * 0`.
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Cron behavior after deploy is an Owner check.
- **Owner actions:**
  - [ ] Within 24 h of deploy: the Vercel Cron Jobs page no longer lists a bills entry, and `/admin/sync-status` shows `bills` updated by the GitHub runs.
  - [ ] In Sentry, delete or archive the `vercel-cron-sync-bills` monitor, which will otherwise report missed check-ins.
  - [ ] Leave TASKS.md line 53 open. Its trigger now feeds the Deferred row "move session-critical jobs to Vercel".
- **Rollback:** Revert the PR, which restores the Vercel entry, the monitor entry, the legislators step and the 13:00 audit time. Re-create the Sentry monitor if it was deleted.

---

### WS4-13 · Fetch new roll calls in the bills sync and delete the votes cron

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS4-06 | D1, E2, C1, C8, U1 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** Accept a trade-off: same-day member votes for every bill that changed, in exchange for `getRollCall` on every new roll call. Options:
  - (a) build it as specified
  - (b) keep the votes cron
  
  **Recommended:** (a). It answers "how did my rep vote" on the same day for every bill (C1, C8, T5), and it removes a schedule. **Default if not answered by 2026-11-20:** (a).
- **Data-limit impact:** none during the work (stubbed tests). In production:
  - It removes the votes cron's `getBill` re-buys, about 150 a month in session (decisions.md around line 2630, "votes cron getBill ~150 in session").
  - It adds one `getRollCall` per new roll call on bills outside the cron's daily top 5. In a month like March 2025 that is up to about 530 roll calls, part of which the cron already fetches today.
  - Against today's code, session use may rise by up to about 300 a month at the peak. Against the decisions.md § 2026-10-06 projection, which counts roll calls [verify that its roll-call line assumes every roll call is fetched], it falls by about 150.
  - The stop condition is the existing `sync-bills` run cap (WS4-06), which roll-call fetches share. WS4-15 re-checks the peak against 5,000.
- **Ongoing cost:** Reduces it. One Vercel cron, one Sentry monitor and one `MONITORED_SOURCES` entry are deleted. `syncKyVotes` stays as a manual repair path.
- **Why:**
  - The daily votes cron (`/api/sync?source=votes&limit=5`, 06:15) calls `fetchVotes`, which buys a fresh `getBill` for the 5 bills with the latest `last_action_date`. Meanwhile the hash-gated bills sync has already fetched `getBill`, including `votes[]`, for every changed bill.
  - Only 5 bills a day are checked. On a busy floor day, per-member roll calls on the other bills wait for the weekly dataset ZIP (TASKS.md line 126), so member votes can lag up to a week in session (U1, C8).
- **Current state (verified 2026-10-06):**
  - `vercel.json` line 49: `{ "path": "/api/sync?source=votes&limit=5", "schedule": "15 6 * * *" }`.
  - `src/lib/ky-sync-pipeline.ts`, `runVotesSync` (~1779–1880):
    - interim skip
    - selects 5 bills by `last_action_date`
    - loads stored `(bill_id, roll_call_id)` from `ky_votes`
    - calls `legiscanClient.fetchVotes(...)` and builds rows inline (`roll_call_id`, `date`, `description`, `yea_count`, `nay_count`, `nv_count`, `absent_count`, `passed`, `roll_call`)
    - `dropDuplicateRollCallRows` (`src/lib/ky-vote-dedupe.ts` line 46)
    - upserts `onConflict: 'bill_id,roll_call_id'`
  - `src/lib/ky-legiscan-client.ts`:
    - `fetchRollCall` (~444)
    - `fetchVotes` (~453) calls `fetchBillDetail`, then `fetchRollCall` for roll calls that are not stored
    - `LegiScanBillDetail` has `votes: LegiScanVoteSummary[]` (line 21)
  - The hash loop already holds `detail` for each changed bill (`ky-sync-pipeline.ts` ~868–937).
  - `MONITORED_SOURCES.votes` (`source-health.ts` ~59) and the Sentry `votes` monitor (`sentry-sync-cron.ts` ~25–29).
  - `src/lib/ky-legiscan-dataset-import.ts` line 194 has `buildVoteRow(rc, billUuidByLegiscanId)` for dataset JSON.
- **Do:**
  1. Extract the inline row builder in `runVotesSync` into an exported pure function `voteRowFromRollCall(billUuid: string, rc: LegiScanVote)`, and use it in `runVotesSync`. The output must be unchanged. Compare it with the dataset `buildVoteRow` and note any column difference in the PR, but do not merge the two.
  2. Extend WS4-06's per-chunk function. After the chunk's bill rows are flushed:
     1. Look up the chunk's bill UUIDs by `legiscan_id`.
     2. Load the stored `roll_call_id`s for those bills.
     3. For each `detail.votes[].roll_call_id` not stored, call `client.fetchRollCall(id)`.
     4. Build rows with `voteRowFromRollCall`, pass them through `dropDuplicateRollCallRows`, and upsert with the same conflict key.

     Roll-call fetches are charged to the same run budget and stop on the same deadline.
  3. **No lost votes.** If any new roll call for a bill cannot be fetched (an error, a `null` result, the run cap, the deadline or a quota hold), set that bill's `change_hash` to `NULL` in `ky_bills`. A `NULL` hash reads as changed, so the next run re-fetches the bill and retries its roll calls, at a cost of 1 extra `getBill`. Stop errors then propagate exactly as WS4-06 handles them.
  4. Delete the votes entry from `vercel.json`. Delete the `votes` entry from the Sentry map. Move `votes` from `MONITORED_SOURCES` to `UNMONITORED_SOURCES` as `'manual repair only (npm run sync:ky -- votes); new roll calls arrive with the bills sync (WS4-13)'`. If WS4-11 has merged, update the registry instead and let it derive these.
  5. Add a comment to `syncKyVotes` saying it is a manual repair path. Keep `perRunCap['sync-votes']`.
  6. Tests, extending `src/lib/ky-bills-hash-sync-chunks.test.ts` with stubs:
     - a changed bill with 2 new roll calls and 1 stored → 2 `fetchRollCall`, 0 extra `fetchBillDetail`, 2 vote rows
     - the 2nd roll-call fetch throws → 1 vote row written and the bill's hash reset to `NULL`
     - the run budget runs out during roll calls → hashes reset for incomplete bills, and the early-stop note returned
     - `voteRowFromRollCall` produces the same row as the old inline code for one fixture roll call
  7. In `docs/data-budget.md`, replace the votes-cron line with "roll calls fetched with the bills sync", with the cost formula.
- **Don't:**
  - Delete `syncKyVotes`, `fetchVotes` or the dataset vote import.
  - Change the vote row shape, the dedupe rule or the conflict key.
  - Run any sync against production.
- **Acceptance criteria:**
  - [ ] The step 6 tests pass.
  - [ ] `grep -n "source=votes" vercel.json` returns nothing. `MONITORED_SOURCES` has no `votes` entry. The Sentry map has no `votes` entry.
  - [ ] Every exit path that skips a new roll call resets that bill's hash (code review plus tests).
  - [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` pass.
- **Verify:** In a plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Production behavior is an Owner check.
- **Owner actions:**
  - [ ] In Sentry, delete or archive the `vercel-cron-sync-votes` monitor.
  - [ ] In the first in-session week (W3), compare `ky_votes` rows dated each floor day with the LRC's published roll calls for 3 bills. Expect them present the same day. Check `npm run check:legiscan-quota` for `getRollCall@sync-bills` (prod env).
- **Rollback:** Revert the PR, which restores the votes cron, the monitor entry and the source entry. Re-create the Sentry monitor if it was deleted. Vote rows already written stay valid.

---

### WS4-15 · Rehearse the 2027 session load against the budget

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Sonnet | S | WS4-06 (soft: the other WS4 WPs) | D1, D2, D3, D5, E2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none (a readiness drill).
- **Data-limit impact:**
  - LegiScan: **at most 3 queries**. That is one `npm run sync:ky:session-preview` by the owner, if LegiScan lists the 2027 session (1–2 queries per decisions.md § 2026-09-30, capped by the `session-preview` tag at 5).
  - LRC: **1 request** (a header check).
  - Everything else is read-only SQL on our own database, plus log reading.
  - Anthropic: none.
- **Ongoing cost:** none. It is a one-time drill with a written result, repeated only if a cap changes.
- **Why:** The 2027 session is the first time this architecture runs under session load with measurement (T7, TASKS.md line 40). The decisions.md § 2026-10-06 projection was made before the per-run caps, the resumable sync, the roll-call change and the job deletions. Its upper end (5,500) is above the 50% planning target (D1).
- **Current state (verified 2026-10-06):**
  - decisions.md § 2026-10-06 gives the method and inputs:
    - 2025 RS bills introduced: Jan 295 / Feb 953 / Mar 193
    - roll calls: Jan 4 / Feb 169 / Mar 528
    - March 2026 had 2,970 bill-days with actions
  - April 2026 (in session, hash-gated) used 917 queries.
- **Do:**
  1. (Agent) Add a "Session rehearsal" section to `docs/data-budget.md`:
     - The read-only SQL that rebuilds the § 2026-10-06 inputs by month for the 2025 and 2026 regular sessions: bills introduced, bill-days with actions and roll calls, as aggregate counts only.
     - The projection formula with the WS4 changes applied:
       - runs per day, from `src/lib/schedule-registry.ts`, or from `vercel.json` and the workflows
       - the per-run caps from `DATA_BUDGET`
       - the first pickup spread across runs at `perRunCap['sync-bills']`
       - roll calls fetched with the bills sync (WS4-13)
       - no votes cron and no duplicate bills run
  2. (Agent) Add a checklist to the same section:
     - the counter counts attempts (WS4-02)
     - unbudgeted scripts are denied (WS4-03a)
     - the bills cap is on and resumable (WS4-06)
     - pace breaches are wired (WS4-08)
     - the parser tests are green (WS4-05)
     - one bills job and no votes cron (WS4-12/13)
     - the Console AI limit is set (WS4-07)

     Mark any item whose WP has not merged as "not merged", and project with that job as it runs today.
  3. (Owner) Run the SQL, fill in the projection table (Jan/Feb/Mar, low and high), and run `npm run check:legiscan-quota`.
  4. (Owner) Check one LRC page for caching headers: `curl -sI -A "<the WS4-09a User-Agent>" https://apps.legislature.ky.gov/legislativecalendar`. Note whether `ETag` or `Last-Modified` appears; this decides the conditional-GET row in Deferred.
  5. (Owner) If LegiScan lists the 2027 session by then, run `npm run sync:ky:session-preview` and note the printed `getBill` count. Otherwise skip, which is expected (decisions.md § 2026-09-30).
  6. (Owner) Measure LRC fetches **by source** for one day from the Vercel and Actions logs, and record each against WS4-01's table:
     - scheduled syncs
     - the bill-page link probe (after WS6-03's cache)
     - bill-text PDFs (WS3-08), if live
  7. Record the result as a decision note: the projected peak month (low/high), whether it is at or under 5,000, and, if not, which `perRunCap` or schedule to lower before 2027-01-05.
- **Don't:**
  - Run any sync or backfill.
  - Change caps or schedules. If the projection is over target, a new small WP lowers a cap before W3.
- **Acceptance criteria:**
  - [ ] `docs/data-budget.md` has the SQL, the formula, the checklist, the filled projection table and the LRC-by-source measurements.
  - [ ] The projected peak month is at or under 5,000, or a follow-up WP to lower a cap exists before 2027-01-05.
  - [ ] The LRC header result is recorded.
  - [ ] LegiScan spend for this WP is 3 or fewer, shown by the counter before and after.
- **Verify:** In a plain container: `npm test` (no code change expected). Everything else is an Owner action with prod env.
- **Owner actions:** steps 3–6.
- **Rollback:** Not applicable (docs only).

---

### WS4-16 · Review real session usage and publish the per-state data-cost sheet

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W4 | Sonnet | S | WS4-15 | D1, D2, D3, D4, A8, C2, C7 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** The paid-tier decision for the next session, made from this WP's numbers. Options: stay free; buy the state-limited Pull tier; buy only when a second state or a partner needs it. **Recommended:** decide from the measured peak; if the 2027 peak month was under 5,000, stay free. **Default:** stay free, and revisit when a partner agreement is drafted.
- **Data-limit impact:** none. Read-only counters, aggregate SQL and the Console.
- **Ongoing cost:** none after publication. The sheet is updated only when a vendor changes terms.
- **Why:**
  - The project's future is partnership or distribution (C2, C7). A partner taking Kentucky, or a newsroom adding a state, needs one honest page: what one state costs in queries, scraping and AI spend, in and out of session, and the safeguards that keep it there (O3, O4).
  - LegiScan cut the free cap by 67% in 2026 (D1), so the page must also say what happens if it is cut again (O1).
  - The 2027 session is the first measured session (T7).
- **Current state (verified 2026-10-06):** No such sheet exists. The inputs will be the WS4-02 counters, the Console spend (WS4-07), the WS4-08 breach history and the WS4-15 projection. `scripts/sync-ky-dataset.ts` (header lines 3–9) documents the dataset path: about 2 queries per changed session per week, hash-gated.
- **Do:**
  1. (Owner) Collect these and paste them into the PR description:
     - monthly totals for Jan–Apr 2027, from `npm run check:legiscan-quota <month>` for each month
     - Anthropic spend by month, from the Console
     - an Open States calls-a-day estimate from logs
     - the LRC daily fetch count by source
  2. (Agent) Add "Session 2027: projected vs actual" to `docs/data-budget.md`:
     - one table per vendor: projected low/high from WS4-15, actual, and the difference
     - a list of every cap hit, early-stop streak or `budget_pace` breach, and what happened next
     - one paragraph on what the projection got wrong

     Replace the WS4-01 "Running Kentucky today (estimated)" lines with measured figures.
  3. (Agent) Create `docs/data-cost-per-state.md`: one page, in plain language, with no internal jargon. For one state, give:
     - monthly LegiScan queries (interim and session peak)
     - Open States calls
     - LRC-equivalent scraping load
     - AI cost per bill and per session
     - cash cost per year (D4 numbers)
     - the safeguards (per-run caps, hash gating, pace alerts, polite fetching), each linked to the code that enforces it

     Label every number measured or estimated.
  4. (Agent) Add a **"Minimum-quota mode"** section to the same page, built from measured numbers. Build nothing new. Cover:
     - which jobs to switch off: the 6-hourly bills sync, the LegiScan part of the legislators sync, the link verifier, and manual repairs
     - what keeps running: the weekly dataset reconcile, at about 2 queries per changed session per week
     - the freshness lost: bill status and member votes up to a week old in session
     - the resulting queries a month [estimate: about 50–100; replace with the measured dataset-sync figure]
  5. (Owner) Record the paid-tier decision as a decision note.
  6. (Agent) In `DEFERRED.md`, fill the W4 status of the WS4 rows only (4.1–4.15): `fired (date)`, `not fired` or `revived (WP)`. Filling a status is not a verdict on the row.
- **Don't:**
  - Include partner names, funding asks or outreach wording (the partner-packaging owner writes those).
  - Include personal data.
  - Build a mode switch (see Deferred).
- **Acceptance criteria:**
  - [ ] Both docs exist, and every number in them is labelled measured or estimated.
  - [ ] The minimum-quota mode section lists the jobs to switch off, the freshness lost and the queries a month.
  - [ ] The paid-tier decision is recorded.
  - [ ] Every WS4 row in `DEFERRED.md` has a W4 status, and no other workstream's row was changed.
- **Verify:** In a plain container, nothing beyond `npm test` if code is untouched. Counter reads are an Owner task with prod env.
- **Owner actions:** steps 1 and 5.
- **Rollback:** Not applicable (docs only).

---

## Deferred

Each row is mirrored in `DEFERRED.md` (rows 4.1–4.15), where WS4-16 records its W4 status.

| Item | Reason | Revisit trigger |
|---|---|---|
| Moving the bills sync and the live LRC calendar to Vercel, and a `workflow_run` retry for GitHub "no runner" cancellations (TASKS.md line 53, kept open) | The move would add Vercel cron entries, a summary workflow and monitors, deepen Vercel lock-in (O3), and collide with WS2-11c. It would only fix up to 2 h of lateness on a 6-hourly, hash-gated job. WS4-12 tightens bills staleness to 18 h instead. | Two missed GitHub runs of a session-critical job (bills or LRC calendar) in W3, or the 10/5 "no runner" failure recurs. |
| Cross-process LegiScan lock (a lease row in `ky_sync_state`) | WS4-11's window rule keeps nominal LegiScan job windows apart. Each process throttles at 650 ms. The residual overlaps are a late GitHub start and an owner-run manual script. A lease adds a failure mode (a stale lease blocking syncs) and code on the hot path. | Any LegiScan 429 or rate-limit message in the logs; a second state; or a new scheduled LegiScan job. |
| A dataset-only "minimum-quota mode" switch | WS4-16 documents the mode from measured numbers. Building a switch now adds code for a contingency. | A further LegiScan cap cut, or a quota hold during a session. |
| An explicit `LEGISCAN_DISABLED` kill switch (WS9 suggestion) | `LEGISCAN_MONTHLY_QUERY_LIMIT=1` already forces the hold for routes and scripts (WS4-01 docs, WS4-03a test), with no new env var. WS9's other suggestion, a client that refuses to send with an empty key, is **not** deferred: WS4-02 step 5 builds it (N3). | The documented brake fails a WS9-06a drill. |
| Anthropic token metering (migration, price table, monthly ledger) | About $0.006 per bill today (A8). The Console limit (WS4-07) and WS3-09c's per-run `--max-usd` cap spend with no code. A fail-closed price table would pause all summaries on a model change. | A single regeneration is estimated above $25, or a partner asks for measured per-bill cost the Console cannot give. |
| Batch API path for summary regenerations | WS3-10's recommended regeneration is about $5–8. Batch processing would add a submit/collect flow and state rows. `@anthropic-ai/sdk` 0.54.0 already ships `resources/messages/batches`, so no SDK upgrade blocks this later [verify request shapes at that time]. | An approved regeneration estimated above $50 (WS3-10 option b or c), or a model retirement that forces a corpus regeneration. |
| Summary model evaluation | A metadata-only eval set would be obsolete once WS3-09c grounds summaries in bill text. Keep one eval set (WS3's) and one regeneration. | WS4-01/07 records a retirement date before 2027-04-30 (WS3 opens a model-switch WP). Otherwise fold it into WS3's eval fixtures in W4. |
| Open States per-call counter | About 6 calls a day, with retries and a 7-day zero-yield alarm already in place (D2). No published limit is known. | Open States publishes limits, returns 429s, or calls pass 50 a day. |
| Resend daily-send counter | The digest reaches 1 recipient a month (T3). WS7-09c owns the send budget. | Owned by WS7. |
| Conditional GET (`If-None-Match`/`If-Modified-Since`) and content-hash skip for LRC pages | It is unknown whether LRC sends `ETag` or `Last-Modified` (D3). A content hash saves our writes, not LRC's load. | WS4-15 step 4 finds caching headers. |
| Replacing Open States `/people` with its CC0 bulk export | The live API has retries, a transient-skip path and a 7-day zero-yield alarm (`ky-sync-pipeline.ts` ~391–425). The bulk export adds a pipeline to maintain. | Open States is unavailable for more than 7 days in a row, its terms or limits change, or the January post-election roster update fails. |
| Anthropic prompt caching | The current system prompt is likely below the minimum cacheable prefix length [verify with the token-counting endpoint if the prompt grows]. | WS3-09b's grounded prompt exceeds the model's minimum cacheable prefix. |
| Automated usage reads for Mapbox, PostHog and Sentry | Each needs a new management-scope secret, for usage far below free-tier limits (T1). A quarterly line in the monthly check (WS9-08) is cheaper. | Monthly visitors pass about 10× the September 2026 level, or a vendor emails about limits. |
| LRC record-vote scraping (TASKS.md around line 554) | A new scraper and crawl target, against the restraint rule and D3. | A partner or the owner makes pre-2018 vote history a priority. |
| Legislator name-matching tests (E10) | Owned by WS5-12b. WS4 changes roster fetch frequency only. | none (tracked there). |

## Findings re-checked (2026-10-06, `a4e543a`; working tree `96365a2` has docs-only changes)

- **D1: confirmed, with five additions.**
  1. The counter increments only after a 2xx response (`ky-legiscan-client.ts` line 177), as stated, **and** it is fire-and-forget (`void`), so a write can be lost when a serverless function returns. A LegiScan `status: "ERROR"` reply is thrown inside the `try` (line 178) and retried up to 5 times, each retry counted. Fixed by WS4-02.
  2. **New:** `syncKyBillsByHash` holds every fetched bill in memory and upserts once after the loop (lines ~868–940). A run stopped by a quota hold or a killed process spends quota and writes nothing, and the next run pays again. Adding a per-run cap first would turn this into a repeat-spend loop. That is why WS4-03a leaves `sync-bills` uncapped and WS4-06 turns the cap on together with chunked writes.
  3. **New:** `npm run sync:ky` and `sync:ky:dry` use the legacy bills path by default (`scripts/manual-sync.ts` ~67–71, `ky-sync-pipeline.ts` ~996–1001), which calls `getBill` for up to 250 bills per session. Fixed by WS4-03b. The scheduled `sync:ky:bills:status` already passes `--use-change-hash`.
  4. **New:** every per-item catch in `ky-sync-pipeline.ts` (~575, ~668, ~794, ~886, ~1754, ~1842) re-throws only quota holds, so any new stop error must be added there (WS4-03a). The votes cron re-buys `getBill` for 5 bills a day while the bills sync has already fetched every changed bill's `votes[]`. Fixed by WS4-13.
  5. **New (from WS9-06a; erratum N3):** with an empty key the client only warns (`ky-legiscan-client.ts` lines 129–130) and keeps sending keyless requests with retries, so "remove the key" is not a stop. Fixed by WS4-02 step 5; WS4-01 documents the brake and the runbook steps instead.
- **D2: mostly already handled.** `/people` 504s are retried with backoff (`ky-openstates-client.ts`, `MAX_RETRIES = 3`) and turned into a `skipped` result with a 7-day zero-yield alarm (`ky-sync-pipeline.ts` ~391–425). Calls are not counted (deferred, about 6 a day). The roster is fetched twice on Mondays, which WS4-12 fixes. Rate limits are unverified [verify].
- **D3: partly wrong.** The scrapers **do** send an identifying User-Agent with the project URL. They lack a contact address and a shared rate limit (committee materials pauses only 250 ms, and the accuracy audit fetches 4 pages at a time), and only the calendar and the link probe retry. No conditional GET exists. **Addition:** `/api/lrc/bill-link-status` fetches LRC on every bill-page view (found by WS6, owned there), and WS3-08 proposes a new LRC fetch type for bill-text PDFs. Both are now separate lines in the WS4-01 LRC budget.
- **D5: confirmed.** The appendix's "on 10/5 one run was never assigned a runner" is two runs in TASKS.md line 52 (LRC #296 and legislator links #30). WS4-12 keeps bills on GitHub with an 18 h staleness check, and the move to Vercel is deferred with a trigger.
- **E2: confirmed and understated.** Schedules are also duplicated in `src/lib/sentry-sync-cron.ts`, and `MONITORED_SOURCES.dataset` has already drifted (`0 8 * * 0,3` versus the workflow's `0 11 * * 0` and `0 11 * * 3`). The `env-template.txt` "every 15m" claim is confirmed (line 224). Cron lines go from 18 to 16 after WS4-12/13.
- **E6: confirmed.** **Addition:** `fixtures/lrc/` holds five files, and its README omits the popular-names fixture. The calendar guard is at `ky-lrc-calendar-sync.ts` line 580. One slow backstop exists outside the calendar, `MONITORED_SOURCES['lrc-committee-materials'].maxZeroYieldHours` (14 days), which is not a structure check.
- **A8: confirmed.** `claude-sonnet-4-6` is set in `src/lib/anthropic-model.ts`. `@anthropic-ai/sdk` 0.54.0 is installed and includes `resources/messages/batches`, so batch support is not blocked by the SDK (Deferred). The retirement date is recorded by WS4-01/07. `classifyTopicsAI` (`ky-topic-classifier.ts` line 322) is an Anthropic call site that nothing imports; removing it belongs to E3's owner.
- **TASKS.md and decisions.md reconciliation:**
  - TASKS.md line 37 (key ownership): **folded into** WS4-04.
  - TASKS.md line 77 (standing rule to price any manual LegiScan script before running it): **kept** until WS4-03a merges, then **superseded** (the owner marks it). The rule text stays in `docs/data-budget.md`.
  - TASKS.md line 75 (January 2027: confirm the 2027 RS pickup): **kept** as the owner's January task. WS4-15 step 5 does the pre-check.
  - TASKS.md line 40 (measure one real session before revisiting Push): **folded into** WS4-16.
  - TASKS.md line 53 (no-runner retry watch): **kept open**. Its trigger feeds the Deferred "move to Vercel" row.
  - TASKS.md line 126 (votes cron residual: "revisit only if intra-week vote latency becomes a complaint"): **superseded** by WS4-13.
  - TASKS.md line 142 (LRC CommitteeDocuments transient fetch failures): **folded into** WS4-09a (shared retry policy within a deadline).
  - decisions.md § 2026-09-29 (option d, paid-tier trigger) and § 2026-10-06 (projection): **kept**, and copied into `docs/data-budget.md` by WS4-01. WS4-15 re-runs the projection with the WS4 changes.
  - decisions.md line ~150 (LRC calendar moved to GitHub because of the Hobby plan): **kept**. The calendar stays on GitHub, and the Vercel move is Deferred with a new trigger.
