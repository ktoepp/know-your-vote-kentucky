# WS9 — Operations & session readiness

## Purpose

KYvKY is run by one person and her agents (E14). Today every alert lands in a Slack channel that nobody is required to watch (D7). Operational knowledge lives in about 635 KB of prose, and `decisions.md` doubles as an ops journal (E12). Several accounts are single points of failure that nobody has written down in one place (D4, D6). This workstream gives the project the smallest operating layer that can survive the 2027 Regular Session and be read by a partner:

- a page that reaches a phone
- two runbook files (LegiScan alone, because of the 2026-11-01 ban risk, and one file for the other sources)
- an incident log
- a release calendar with an election freeze
- a vendor inventory that says what does not transfer, and an env-var catalog
- one monthly owner check, shared with WS4, WS5 and WS7
- a dated session go/no-go, a post-seating roster check, and a post-session trim

It adds no vendor and no schedule. The monthly check is a phone calendar reminder, not code. Where it adds a document, a test caps the document's size. About 6 ops files and 2 tests in total.

**Owned findings:** D4, D6, D7, E14.

**Program class:** 8 of this file's 15 WPs are Core (WS9-01, WS9-03, WS9-04, WS9-06a, WS9-06b, WS9-08, WS9-10, WS9-13); the other 7 are Backlog (manual, "Core vs Backlog"). Three Backlog WPs (WS9-02, WS9-05, WS9-11a) are owner-tier and open no agent PR, so they wait on the owner's time, not on review capacity. Definition-of-done items that rest on a Backlog WP (parts of 1, 3, 5, 6, 7 and 8) are recorded as "not met" if that WP is not picked up; they never block a Core WP.

**Definition of done (measurable):**

1. **Phone alerts.** By 2026-10-20, test posts have produced a phone notification for the owner through: (a) `npm run slack:smoke-test` (the `support` post), (b) the off-Vercel site check (WS9-01) or the Sentry uptime monitor if chosen, and (c) a Sentry `[page]` rule test. The date is recorded in `docs/ops/log.md`. The smoke test stands in for the Vercel health check, sync-crash and quota-band paths, because all of them post through `postToAlertsAndSupport` to the same `SLACK_WEBHOOK_SUPPORT` URL (`src/lib/slack-webhook.ts` ~102–113). No production breach is staged to test them.
2. **Ops docs, capped by test.** `src/lib/ops-docs.test.ts` passes in CI. It enforces a per-file line cap from one constant map (default 60), a total of 450 lines or fewer across `docs/ops/` excluding `log.md` and `env-vars.md`, the log format, links from `docs/ops/README.md`, and no email addresses other than `kyvky.com` and `example.com`.
3. **Env-var catalog.** By 2026-12-14 (or W4 if it slips), `docs/ops/env-vars.md` exists and a test asserts that every env-var name read in code or workflows is catalogued, and that no cell looks like a secret value.
4. **Vendor inventory and the one monthly check.** `docs/ops/vendors.md` lists every vendor, what breaks if it lapses, and what does not transfer. Its §Monthly check is the program's only monthly owner check. The first `check` entry for it is in `docs/ops/log.md` by 2026-12-04. A renewal and card-expiry check is logged by 2026-10-20 (WS9-02).
5. **`.org` redirect.** `https://knowyourvotekentucky.org/bills` reaches `https://www.kyvky.com/bills` with the path intact (D6), or the item is recorded as moved to W4.
6. **Backups.** The schema-rebuild drift count is recorded by 2026-12-14 (WS9-11b). A backup and restore drill was completed during FZ, and its restore time is in `docs/ops/log.md` (WS9-11a).
7. **Go/no-go.** The go/no-go table in `docs/ops/session-2027.md` is complete and signed by the owner on or before 2027-01-04. The post-seating roster check passes, or has an incident and hotfix issue, by 2027-01-08.
8. **Ops review and trim.** By 2027-04-30, the operations section of the W4 evaluation records pages, alert precision, incidents, and cash for Nov–Mar taken from vendor billing history against the D4 estimate. The docs-only trims are applied, and the "ops floor" list has been handed to WS5-16.
9. **Owner-hours budget.** Owner time for WS9 before 2027-01-05 is 6 hours or less: WS9-02 about 1 h, WS9-03 5 min, WS9-05 about 45 min, WS9-06a 20 min, WS9-07 15 min, WS9-08 30 min, WS9-11a about 2.5 h, WS9-11b 10 min, WS9-12 30 min. Monthly checks (about 15 min each) are counted under the monthly check. If a WP's owner step runs over its share, say so in its `log.md` entry, and WS9-14 uses that.

**Interfaces with other workstreams**

| This workstream | Other work | Contract |
|---|---|---|
| WS9-01 routes pages through `postToAlertsAndSupport` | WS4-08 adds a vendor-pace breach kind to `src/lib/source-health.ts` (D1, D4) | WS4-08 breaches go out through `notifySourceHealthSlack`, so they reach the phone with no extra work. WS9 does not change thresholds. |
| WS9-01 edits `.github/workflows/source-health.yml` | WS5-07 removes that workflow's triage step (E5, E13). WS4-12 moves no job to Vercel. | Whichever merges second rebases. `source-health.yml` **stays on GitHub Actions** on purpose, so the site check runs off-Vercel. |
| WS9-02 replaces the two daily Claude Routines' "someone is watching" role | WS5-07 retires the Routines (E2, E14) | WS5-07's default (2026-11-10) assumes deterministic alerts reach a person. WS9-02 should be done first. |
| WS9-03 release calendar | Operating manual §2 (FZ/W3 rules), WS1-04 (PR template), WS2-14 (Vercel rollback drill), every W1 WP that targets "merge by 10-30" | WS9-03 adds only the election freeze and the owner's deploy checklist. Under the default, docs/test-only PRs may merge during the freeze. It links WS2-14's drill and does not repeat it. |
| WS9-04 incident log | WS5-03a freezes `decisions.md` and adds ADRs and `CURRENT.md` (E12) | ADRs hold decisions. `docs/ops/log.md` holds events: incidents, drills and monthly checks. Both WPs edit manual §8, so the second to merge rebases and keeps both sentences. |
| WS9-06a/b runbooks | WS3-14 `docs/corrections-procedure.md` (A9, U1). WS4-01 `docs/data-budget.md` (D1), including its LegiScan kill-switch paragraph. WS5-01a/b script archive and alias cut. WS7-09c `MY_LEGISLATORS_SEND`. | Runbooks **link** to these documents and do not copy them. They cite only npm scripts that exist on `main` when the PR opens. The LegiScan runbook's stop steps and WS4-01's kill-switch text must agree: WS9-06a is the procedure, WS4-01 the budget. The email section's Stop step includes `MY_LEGISLATORS_SEND` once WS7-09c merges. Reader reports are not a WS9 runbook: `docs/ops/README.md` points to WS3-14. |
| WS9-07 env catalog | WS5-01a/b and WS5-02 delete scripts and files (E3). WS2-07 removes `/api/intelligence`. WS7-09c and WS4 WPs add env vars. WS1-05b's `repo-invariants.test.ts`. | WS9-07 lands after WS5-02. The test checks one direction (code ⊆ catalog), so deletions never fail it; adders must add a row, and manual §6 says this is in scope for every WP. If `repo-invariants.test.ts` exists, the check is a `describe` block there. |
| WS9-08 vendors and the one monthly check | WS4-01 (quarterly free-tier lines), WS4-07 (Anthropic spend read), WS4-08, WS5-05 (owner hours and PR labels), WS1-07 and WS5-16 (quarterly dependency and framework currency), WS7-12 (KPI readouts), WS2-15 (2FA column), WS2-04 (Mapbox token restriction), WS6-17b (Adobe Fonts), WS8-14a (partner index) | There is **one** monthly owner check: `docs/ops/vendors.md` §Monthly check, recorded as one `check` entry in `docs/ops/log.md`. WS4-01, WS4-07 and WS5-05 add their line to it, not a second checklist. It is reminded by the owner's phone calendar; there is no cron code. WS7-12's readouts are agent PRs to `docs/metrics.md` in Feb and Mar, not a monthly owner check. WS8-14a links `vendors.md` §Does not transfer instead of a handover doc. |
| WS9-10/12 go/no-go | `01-quality-gates.md` §Pre-session gate checks (former WS1-14), WS2-14, WS3's 2026-12-07 grounding go/no-go and WS3-10, WS4-15, WS6-19, WS7-11 | WS9-12 collects their results and does not re-run them. For WS3 it records the go/no-go outcome, whether WS3-10 ran or was deferred, and that the WS3-04 basis label is live; it does not judge summary quality. A drill that has not run is recorded as "not met", not as a blocker. |
| WS9-11b schema rebuild check | WS8-14b data dictionary, WS1-05b migration invariants | WS9-11b's catalog query output can be reused by WS8-14b. A duplicate-migration-number finding goes to WS1-05b under "Found, not fixed". |
| WS9-13 roster check | WS7-09a district subscriptions. WS5-12a/b name matching (E10). WS6-05 members-elect note. | WS9-13 only verifies production after seating. Fixes to matching logic belong to WS5. If the roster is stale after 2027-01-01, WS6-05's note date is extended. |
| WS9-14 ops review | WS5-13 (`docs/evaluation/2027-04-maintenance.md`), WS5-16 (`docs/evaluation/maintain-mode.md`), WS3-11a sunset test and WS3 "decided at WS9-14" rows, WS4-16, WS8-16, `DEFERRED.md` | WS9-14 adds an "Operations" section to WS5-13's page instead of a separate report, and hands WS5-16 the ops floor (which alerts page, which runbooks stay, the monthly check) for maintain mode. WS5-16 owns the maintain-mode profile; WS9 does not write a second one. WS9-14 fills the W4 status of WS9's own `DEFERRED.md` rows only. |

**Out of scope:**

- a new monitoring or paging vendor (PagerDuty, Better Stack and the like), a status page, or on-call rotations
- buying Supabase point-in-time recovery, or separating the Supabase org
- moving the repo to a GitHub organization (see Deferred)
- a full account-transfer runbook (see Deferred; WS8-16 decides whether a transfer happens)
- the maintain-mode profile (WS5-16 owns it)
- the full `.org` rebrand (TASKS.md "Owner wishlist, filed 2026-08-31")
- SLAs to partners
- any new scheduled job, cron, workflow or date-triggered code

---

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS9-01 | Route every page-worthy alert to one channel and add an off-Vercel site check | P1 | W0 | Sonnet | S | none | Core |
| WS9-02 | Make the page channel ring the owner's phone, arm the Sentry rules, and check renewals | P1 | W0 | Owner | S | WS9-01 | Backlog |
| WS9-03 | Publish the release calendar, the election freeze and the deploy checklist | P1 | W0 | Sonnet | S | none | Core |
| WS9-06a | Write the LegiScan quota and ban-risk runbook before enforcement | P0 | W0 | Opus | S | none | Core |
| WS9-04 | Start `docs/ops/log.md` and cap the ops docs with a test | P1 | W1 | Sonnet | S | WS9-01, WS9-03 | Core |
| WS9-05 | Make the `.org` domains redirect with the path intact | P2 | W2 | Owner | S | none | Backlog |
| WS9-06b | Write one runbook file for LRC, Open States, Supabase and email | P1 | W2 | Opus | M | WS9-04 | Core |
| WS9-08 | Inventory vendors, list what does not transfer, and define the one monthly check | P2 | W2 | Sonnet | S | WS9-04 | Core |
| WS9-11b | Check that the migrations rebuild the production schema | P2 | W2 | Opus | S | none | Backlog |
| WS9-07 | Catalogue every env var by name and purpose, with a one-way drift test | P2 | W2 (after WS5-02; target 12-11) | Sonnet | S | WS9-04, WS5-02 (soft: WS5-01b) | Backlog |
| WS9-10 | Write the 2027 session runbook: go/no-go list, key dates, daily and weekly checks | P1 | W2 | Sonnet | S | WS9-03, WS9-06a, WS9-06b, WS9-08 | Core |
| WS9-11a | Run the database backup and restore drill | P1 | FZ | Owner | M | WS9-06b | Backlog |
| WS9-12 | Run the session go/no-go and record the result | P1 | FZ | Sonnet | S | WS9-10 | Backlog |
| WS9-13 | Verify the roster after the newly elected members are seated | P0 | FZ→W3 (2027-01-02 → 01-08) | Owner | S | WS9-10 | Core |
| WS9-14 | Review session operations, trim what did not earn its keep, and hand the ops floor to WS5-16 | P1 | W4 (merge by 2027-04-24) | Sonnet | S | WS9-12, WS9-13 (soft: WS5-13) | Backlog |

**Retired IDs (do not reuse; also in the `TRACKER.md` retired-ID map):** WS9-06c (Supabase, email and reader-report runbooks) is merged into WS9-06b; the reader-report runbook is dropped in favour of WS3-14. WS9-09 (access-transfer runbook) is retired: its time-sensitive parts moved to WS9-08 (§Does not transfer) and WS9-10 (emergency-access row), and the full transfer order is Deferred. WS9-11 is split into WS9-11a (owner drill) and WS9-11b (agent schema check).

**W0 critical path:** WS9-06a (P0), then WS9-01 → WS9-02 (paging before the election), and WS9-03 (freeze).

---

### WS9-01 · Route every page-worthy alert to one channel and add an off-Vercel site check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | D7, E14, E2, D5 |

- **Program class:** Core
- **Owner decision:** **How the public site is checked from outside Vercel.**
  - (a) Sentry Uptime Monitoring on `https://www.kyvky.com/`, if the current Sentry plan includes it at $0 [verify in Sentry → Alerts/Uptime]. Its alert must be an issue alert named with the `[page]` prefix, or it will not reach Slack (see Current state). The owner sets it up in WS9-02, and this WP skips step 4.
  - (b) A daily `curl` check inside the existing `source-health.yml` run (step 4). Detection latency is up to about 24 hours, plus up to 2 hours of GitHub scheduling delay (D5).
  - **Recommended: (a) if it is free, otherwise (b).** Building both would be two mechanisms for one job.
  - **Default if no answer by 2026-10-12: (b).** The agent may start steps 1–3, 5 and 7 at once, since they do not depend on the answer. Step 4 and the site-check row of step 6 depend on it. If the PR opens before the owner answers, write step 4 as the provisional default (b), write the step 6 row for (b), and say in the PR summary "site check written as provisional (b); pending the 10-12 decision". If the owner then picks (a), remove step 4's YAML in the same PR before merge.
- **Data-limit impact:**
  - LegiScan, Open States, LRC and Anthropic: none.
  - Under (b): 2 GET requests a day to our own site (`https://www.kyvky.com/` and `/bills`), plus at most one retry each, from the existing 02:00 UTC run.
  - Slack incoming webhooks are free.
- **Ongoing cost:** roughly −1 h/month. The owner stops scanning `#errors` for things that matter, because those now page. No new schedule or vendor. `SLACK_WEBHOOK_SUPPORT` is an existing Vercel env name, but it is a **new GitHub Actions repository secret**: the 11 `secrets.*` names in the workflows today do not include it.
- **Why:**
  - No alert reaches a phone (D7). The code already has a "critical only" tier (`SLACK_WEBHOOK_SUPPORT`), but two paths skip it: the GitHub backstop run and the Sentry bridge.
  - Nothing checks from outside Vercel that the public site answers at all.
  - This is the deterministic alerting that WS5-07 assumes when it retires the daily Routines (E2, E14).
- **Current state (verified 2026-10-06):**
  - **`src/lib/slack-webhook.ts`:**
    - `webhookUrlForSupportEscalation()` (~64–67) reads `SLACK_WEBHOOK_SUPPORT`. `postToAlertsAndSupport()` (~102–113) posts to `#errors` and to support.
    - These already use it: `notifySyncExceptionSlack` (~507–522), `notifyHealthCheckFailureSlack` (~524–527), `notifySourceHealthSlack` (~554–559) and `maybeAlertLegiscanQuotaHigh` (~306–325, edge-triggered 90/95/98/100% bands, post at ~318).
    - `runSlackSmokeTest` (~151–170) posts one message per webhook, including `support` (~168). It is run by `npm run slack:smoke-test`.
  - **`src/app/api/webhooks/sentry/route.ts`:**
    - `slackWebhookUrl()` (~65–72) posts only to `SLACK_WEBHOOK_ERRORS`, `_ALERTS` or `_URL`. The payload type already carries `data.triggered_rule` (~46).
    - Only resources `event_alert` and `issue` are forwarded. Every other resource, including `metric_alert`, returns 200 silently (~134–137). A metric-type rule therefore never reaches Slack through the bridge.
  - **`.github/workflows/source-health.yml`:**
    - `workflow_dispatch` with one boolean input `strict` (~19–24). Daily `cron: '0 2 * * *'` (~29).
    - The "Evaluate sync source health" step (~57–66, no `id`) passes `SLACK_WEBHOOK_ERRORS` and `SLACK_WEBHOOK_URL` but **not** `SLACK_WEBHOOK_SUPPORT`, so breaches found by the GitHub backstop never reach support.
    - "Refresh planner statistics" (~75–82, `if: always()`), then "Triage source health" (~87–99, `if: success()`).
    - The failure notifier (~106–127, `if: cancelled() || failure()`) curls `SLACK_WEBHOOK_ERRORS` only, and stays quiet when `.slack-notified` exists. The evaluator writes that file after a delivered post.
  - **Other workflows.** The failure notifiers in `sync-ky-bills-status.yml` (~139), `sync-lrc-calendar.yml` (~83), `legiscan-dataset-weekly.yml` (~107), `legislator-links-weekly.yml` (~84) and `accuracy-audit.yml` (~97) post to `#errors` only. That is correct: transient failures are retried, and source-health catches a persistent one.
  - **`src/app/api/cron/health-check/route.ts`.** Its doc comment says "An uptime monitor should treat this as down". No uptime monitor is configured anywhere in the repo [verify in Sentry/Vercel dashboards].
  - **`env-template.txt` line ~195** says `SLACK_WEBHOOK_SUPPORT` receives "*critical* only: sync crashes + health failures". That is already stale before this WP: source breaches and quota bands also go there.
  - **No `docs/ops/` exists.**
- **Do:**
  1. Create `src/lib/alert-routing.ts` with two pure functions:
     - `isPageRule(rule: string | undefined): boolean`. It returns true when the trimmed rule name starts with `[page]`, case-insensitive.
     - `sentrySlackTargets(rule, env): string[]`. It returns the `#errors` URL, using the existing fallback order, plus the support URL when `isPageRule(rule)` and `SLACK_WEBHOOK_SUPPORT` is set. Duplicate URLs are removed.
  2. In `src/app/api/webhooks/sentry/route.ts`, replace the single `slackWebhookUrl()` post with a loop over `sentrySlackTargets(payload.data?.triggered_rule, process.env)`. Treat the request as delivered if at least one post succeeds. Keep the signature check, the resource filter and the response codes unchanged.
  3. In `source-health.yml`:
     - Give the evaluator step `id: evaluate` and add `SLACK_WEBHOOK_SUPPORT: ${{ secrets.SLACK_WEBHOOK_SUPPORT }}` to its env.
     - In the failure notifier step, add `SLACK_WEBHOOK_SUPPORT: ${{ secrets.SLACK_WEBHOOK_SUPPORT }}` to its env and post the same text to it as well. The source-health run is the backstop, so its own failure pages. Replace the guard `if [ -z "$SLACK_WEBHOOK_ERRORS" ]; then … exit 0` with one that exits only when **both** `SLACK_WEBHOOK_ERRORS` and `SLACK_WEBHOOK_SUPPORT` are empty, and skip each target whose URL is empty. Keep the `.slack-notified` check and the `|| true` on these posts unchanged: this notifier does not need to know whether a post succeeded.
  4. **Under decision (b) only**, in `source-health.yml`:
     - Add a `workflow_dispatch` input `site_check_path` (string, default empty, description "Manual test only: path appended to the checked URL"). Schedule runs have no inputs, so they always check the real URLs.
     - Add a step "Check public site responds" **after "Triage source health" and before the failure notifier**, with `if: always()`, so it runs even when the evaluator crashed and never stops triage from running.
     - Pass the input through `env:` as `SITE_CHECK_PATH: ${{ github.event_name == 'workflow_dispatch' && inputs.site_check_path || '' }}`. Never interpolate the input into the script text. If it is non-empty and does not match `^/[A-Za-z0-9._/-]*$`, fail the step.
     - Check `https://www.kyvky.com/${SITE_CHECK_PATH#/}` (the home page) and `https://www.kyvky.com/bills` with `curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -A "KnowYourVoteKentucky-sitecheck/1.0 (+https://kyvky.com)"`. Treat anything other than `200` as a failure. Allow one retry after 30 s. Capture each code as `code=$(curl …) || code=000`, so a timeout or DNS error counts as a failure instead of ending the step early under the runner's `bash -e`.
     - On failure, post `*KYvKY site check failed* <url> returned <code>` plus the run URL to **both** `SLACK_WEBHOOK_ERRORS` and `SLACK_WEBHOOK_SUPPORT`. Skip a target whose URL is empty. Record success per post, not with `|| true`: start with `ok=0`, and for each non-empty target run `if curl -fsS -X POST -H 'Content-Type: application/json' --data "$PAYLOAD" "$URL"; then ok=1; fi`. If `ok` is 1 **and** `steps.evaluate.outcome == 'success'`, run `touch .slack-notified`, so the generic notifier does not add a second, misleading "could not report for itself" post. If the evaluator itself failed, leave the sentinel alone so that failure is still reported. Then `exit 1`.
     - Add a YAML comment: "Detection latency up to ~24 h plus GitHub delay (D5). Not an uptime monitor."
  5. Add `src/lib/alert-routing.test.ts` with these cases:
     - `[page] digest` → true
     - `[PAGE]x` → true
     - `digest [page]` → false
     - undefined → false
     - targets with the support URL unset → `#errors` only
     - targets when support equals errors → one URL
  6. Create `docs/ops/README.md` (50 lines or fewer). Title "Operations", then a table **"What pages you"** with columns Alert | Where it comes from | Channel | First action:
     - Health check failed (infra): `/api/cron/health-check`, daily 14:00 UTC, Vercel.
     - Sync sources degraded: health check and `source-health.yml` 02:00 UTC, edge-triggered.
     - Sync crashed: Vercel cron or CLI.
     - LegiScan quota band: 90/95/98/100%.
     - Source-health run failed.
     - Site check failed (decision b) or Sentry uptime (decision a). State the detection latency. Under (a), write the row as "Sentry uptime monitor (pending WS9-02)", because the monitor exists only after the owner sets it up in WS9-02.
     - Sentry issue-alert rule whose name starts with `[page]`.

     Add: "Everything else goes to `#errors` or `#status-reports` and does not page. Reader reports about a wrong summary or vote: follow `docs/corrections-procedure.md` (WS3-14)." Leave the "First action" column as "see runbook (WS9-06a/b)" until the runbooks exist. Quote schedules from `vercel.json` and the workflow files (or `npm run schedules` once WS4-11 lands), never from `MONITORED_SOURCES` in `src/lib/source-health.ts`, which has drifted (see Findings re-checked).
  7. In `env-template.txt` (~195), reword the `SLACK_WEBHOOK_SUPPORT` comment to: "page channel: health failures, source breaches, sync crashes, LegiScan quota bands, site check, Sentry rules named `[page]`. Point it at a channel with phone notifications on (docs/ops/README.md)." Do not rename the variable.
- **Don't:**
  - Rename `SLACK_WEBHOOK_SUPPORT` or add any other webhook or secret name.
  - Add paging to the other workflows' failure notifiers.
  - Change thresholds, edge-trigger logic or message wording in `slack-webhook.ts`.
  - Change the Sentry route's resource filter.
  - Add a cron or workflow.
  - Call Slack from tests.
- **Acceptance criteria:**
  - [ ] `npm test` passes, including `alert-routing.test.ts` with the six cases.
  - [ ] `grep -n "SLACK_WEBHOOK_SUPPORT" .github/workflows/source-health.yml` shows the evaluator env and the failure notifier, plus the site check under (b).
  - [ ] The workflow parses: `python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" .github/workflows/source-health.yml` exits 0.
  - [ ] Under (b): the site-check step has `if: always()`, sits after the triage step, reads `site_check_path` only through `env:` guarded by `github.event_name == 'workflow_dispatch'`, sets `ok=1` only inside an `if curl -fsS …; then` branch (no `|| true` on its Slack posts), and contains `touch .slack-notified` guarded by `ok` and `steps.evaluate.outcome`. Show the YAML in the PR.
  - [ ] The failure notifier exits early only when both webhook URLs are empty (show the guard in the PR).
  - [ ] If the PR opened before the 10-12 answer, its summary says the site check is provisional (b).
  - [ ] The Sentry route still returns 401 on a bad signature and still skips non-issue resources. Show this from the diff: the signature and resource blocks are untouched.
  - [ ] `docs/ops/README.md` exists, is 50 lines or fewer, and lists all 7 paging alerts.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Workflow behaviour needs repo secrets, so it is the owner's WS9-02 test.
- **Owner actions:** answer the decision by 2026-10-12. Configuration is WS9-02. Under (b), confirm that Vercel Firewall or Attack Challenge Mode, if ever enabled, does not challenge GitHub runner IPs [verify in Vercel → Firewall], or the check will page falsely.
- **Rollback:** revert the PR. With `SLACK_WEBHOOK_SUPPORT` unset, every new code path is a no-op.

---

### WS9-02 · Make the page channel ring the owner's phone, arm the Sentry rules, and check renewals

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Owner | S | WS9-01 | D7, E14, S11, D6, D4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Which channel pages.**
  - (a) A new dedicated channel, for example `#kyvky-page`, with a new incoming webhook.
  - (b) Whatever channel `SLACK_WEBHOOK_SUPPORT` already points at in Vercel.
  - **Recommended: (a).** A channel that only pages can be set to "all messages" on the phone without noise.
  - **Default if no answer by 2026-10-14:** (b) if `SLACK_WEBHOOK_SUPPORT` is already set in Vercel, otherwise (a).
  - The uptime question is WS9-01's decision.
- **Data-limit impact:** none. A Sentry uptime monitor, if chosen in WS9-01, uses Sentry's free quota only [verify the allowance].
- **Ongoing cost:** about 1 hour once, including the 10-minute renewal check. After that, pages should be rare (WS9-14 measures this).
- **Why:**
  - Alerts reach nobody when the owner is away from Slack (D7).
  - The two Sentry alert rules in `docs/launch-checklist.md` §B are unchecked, so failed digest sends and Resend webhook errors may alert nobody.
  - A lapsed domain, hosting plan or payment card would take the whole site, email and DKIM offline (D6, D4), and nothing checks renewals before the election.
  - The project needs one notification path that a partner could inherit (E14).
- **Current state (verified 2026-10-06):**
  - `docs/launch-checklist.md` lines ~52–53: Rule 1 (`route:cron/notify`) and Rule 2 (≥5 `route:webhooks/resend` events in 5 min) are unchecked [verify in Sentry whether they exist]. The tags are emitted per that file's pre-flight note.
  - The Sentry→Slack bridge needs a Sentry Internal Integration and `SENTRY_WEBHOOK_SECRET` (setup steps in the header comment of `src/app/api/webhooks/sentry/route.ts` ~1–20; `env-template.txt` ~156).
  - The bridge forwards only `event_alert` and `issue` resources (route ~134–137).
  - `npm run slack:smoke-test` (`scripts/slack-smoke-test.ts`) posts one message per configured webhook.
- **Do:** owner only.
  1. In Slack, create the channel (per the decision) and an incoming webhook for it.
  2. On the phone, set that channel's notifications to "All new messages" and allow it through Do Not Disturb if Slack supports a per-channel exception [verify in Slack's mobile notification settings]. Mute nothing else.
  3. Set `SLACK_WEBHOOK_SUPPORT` in Vercel (Production), then **redeploy production** (Vercel → Deployments → Redeploy), because Vercel applies env changes only to new deployments [verify in Vercel docs]. Also add it as a GitHub Actions repository secret. Never paste the value into a PR, issue or doc.
  4. Confirm the Sentry Internal Integration exists and `SENTRY_WEBHOOK_SECRET` is set in Vercel. If not, create both per the route's header comment, then redeploy.
  5. In Sentry → Alerts, create **issue alert** rules (not metric alerts, which the bridge drops):
     - `[page] Digest send failed`: any event with tag `route:cron/notify`.
     - `[page] Resend webhook errors`: ≥5 events with tag `route:webhooks/resend` in 5 minutes.
     - `[page] New production issue, high volume`: an issue seen more than 50 times in 1 hour in `production` [verify the condition names in Sentry's UI, and that this is an issue alert delivered with resource `event_alert` or `issue`; if it is not, keep it with the email action only].

     Set each rule's action to the bridge integration **and** an email to the owner, as a second path that does not depend on Slack [verify that email actions exist on the current plan].
  6. If WS9-01 chose (a): create the uptime monitor and an issue-alert `[page]` rule for it [verify that uptime downtime arrives as an issue alert; otherwise rely on its email action].
  7. **Renewals (10 minutes).** Check the expiry date and auto-renew status of `kyvky.com`, the `.org` domains and the Hostinger plan, and the payment-card expiry on Vercel, Supabase and any other paid vendor. Turn on auto-renew where available. Record only "renewals checked, next renewal after YYYY-MM, cards valid past YYYY-MM" in the log entry below. No card details, amounts or account emails.
  8. Test each path and note what reached the phone:
     - (i) run `npm run slack:smoke-test` (needs prod env). The page channel should buzz once. This also stands in for the health-check, sync-crash and quota-band paths (same URL).
     - (ii) under WS9-01 (b): run `source-health.yml` from `main` with `workflow_dispatch` and `site_check_path=/__sitecheck-test` (returns 404). Confirm one page arrives and no second "could not report for itself" post. This run touches production as a normal run does: the evaluator reads with the service role and may update the edge-trigger state in `ky_sync_state`, `db:analyze` runs ANALYZE, and, until WS5-07 removes it, the triage step runs [verify whether triage calls Anthropic when there is no breach].
     - (iii) use Sentry's "send test notification" on one `[page]` rule [verify the feature].
  9. Tick §B in `docs/launch-checklist.md` (or ask an agent to), and add a `check` entry to `docs/ops/log.md` with the date, which paths buzzed and the renewal line. If WS9-04 has not merged yet, put the entry in the PR or issue that closes this WP, and the WS9-04 agent copies it.
- **Don't:**
  - Point the page channel at `#errors` or `#status-reports`.
  - Add a paid Slack or Sentry plan.
  - Paste any webhook URL, card or account detail anywhere in the repo.
  - Push a branch with an edited workflow to test the site check. Use the dispatch input.
- **Acceptance criteria:**
  - [ ] Three paths are recorded as having reached the phone: smoke test, site check (or uptime monitor) and a Sentry `[page]` test.
  - [ ] The three Sentry rules exist as issue alerts, with names starting `[page]`, each with an email action.
  - [ ] `docs/launch-checklist.md` §B is ticked.
  - [ ] The renewal line is logged by 2026-10-20.
- **Verify:** manual on the phone, as in step 8. Needs production secrets and dashboards.
- **Owner actions:** all of the above.
- **Rollback:** unset `SLACK_WEBHOOK_SUPPORT` in Vercel (then redeploy) and in GitHub. Pages stop, and `#errors` still receives everything. Disable the Sentry rules.

---

### WS9-03 · Publish the release calendar, the election freeze and the deploy checklist

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | E8, E13, C8, D5, S1 |

- **Program class:** Core
- **Owner decision:** **Election freeze.**
  - (a) 2026-10-31 → 2026-11-05: only P0 fixes deploy, **except** docs/test-only PRs, which may merge. A docs/test-only PR changes only `docs/**`, root `*.md` files and `src/**/*.test.ts`. It still triggers a production redeploy of unchanged code [verify: the Vercel production branch is `main` with auto-deploy; `vercel.json` has no `ignoreCommand`], which is accepted as harmless.
  - (b) The same dates, with no exception: docs/test-only PRs also wait until 2026-11-06.
  - (c) No election freeze.
  - **Recommended: (a).** Election week is the highest-intent period (C8), and a bad code deploy then costs the most. A docs redeploy carries no code change.
  - **Default if no answer by 2026-10-17: (a).** If the PR opens before an answer, the agent writes option (a) and labels the manual bullet "pending owner confirmation". If the owner picks (b) or (c) in review, the agent edits the rows before merge.
  - Target merge 2026-10-20 (end of W0). Hard deadline 2026-10-30, the day before the freeze starts.
- **Data-limit impact:** none.
- **Ongoing cost:** about 5 minutes per code deploy for the checklist. Docs/test-only merges skip it. It removes ad-hoc "is it safe to merge now?" reasoning. No schedule.
- **Why:**
  - Nothing checks code before merge (E8). Merging to `main` deploys to production [verify as above].
  - Freeze rules exist only in the agents' manual, not as an owner-facing calendar.
  - The Next 15 end-of-support upgrade (S1) and the election (C8) put the riskiest change and the highest demand in the same six weeks.
- **Current state (verified 2026-10-06):**
  - Operating manual §2's window calendar lists W0–W5, FZ ("fixes, drills and readiness only") and W3 ("small fixes only"). Its "Election freeze" row states this WP's default (a) and stays "pending owner confirmation" until this WP merges. No owner-facing calendar exists outside the spec.
  - `vercel.json` crons (UTC): bills 05:00, legislators 06:00, votes 06:15, notify 11:00, lrc-committee-materials 13:30, health-check 14:00, lrc-enrollment-actions 14:45, lrc-popular-names Sun 15:30, notify-signups every 6 h from 00:00.
  - GitHub Actions jobs run outside Vercel and are not interrupted by a deploy.
  - WS2-14's Owner actions include a Vercel instant-rollback drill.
  - `README.md` "Deployment" (~172–178) covers `CRON_SECRET`, the canonical origin, the legacy-host redirects (inaccurately, see WS9-05) and a link to the launch checklist. It has no release guidance.
  - No `docs/ops/release.md` exists.
- **Do:**
  1. Create `docs/ops/release.md` (70 lines or fewer). If WS9-01 has not merged, create `docs/ops/` and a stub `README.md` that WS9-01 will extend.
  2. **§Calendar.** A table with these dates and "what may deploy":
     - W0 2026-10-06 → 10-20: anything that passes the checklist
     - W1 2026-10-21 → 11-03: as W0, with code PRs merged by 10-30
     - Election freeze 2026-10-31 → 11-05: per the decision
     - W2 2026-11-04 (code from 11-06) → 12-14: migrations and refactors
     - FZ 2026-12-15 → 2027-01-04: fixes, drills and readiness only
     - W3 2027-01-05 → 03-30: small fixes only
     - W4 2027-04-01 → 04-30: evaluation; docs and fixes
     - W5: set by the W4 decision (WS8-16)
  3. **§Deploy checklist (owner, every merge that changes anything outside docs/tests):**
     - CI green, once WS1-04 has landed. Until then, `npx tsc --noEmit`, `npm test` and `npm run lint` tails are in the PR.
     - The PR's "Deploy notes" have been read, and any migration has been applied in the stated order.
     - Deploy between 16:00 and 22:00 UTC, and not within 10 minutes of a `vercel.json` cron. Once WS4-11 has landed, read the times from `src/lib/schedule-registry.ts` (WS4-11 adds no npm script).
     - For PRs that change `src/` (other than tests), `supabase/migrations/`, `vercel.json`, `next.config.ts` or `package.json`: after deploy, load `/`, one bill page and `/members/map`, and watch Sentry for 30 minutes.
     - If something breaks, use Vercel instant rollback (link WS2-14's drill) first and debug second.
     - Docs/test-only PRs: merge any time, no checklist.
  4. **§Session days (W3).**
     - Hotfixes only. Prefer Monday to Thursday.
     - Never deploy code within 24 hours before 2027-03-25 (reconvene) or 2027-03-30 (sine die), unless it is a P0.
     - Any migration in W3 needs the down SQL in the PR.
  5. **§What "P0" means here.** Copy the priority definitions (P0 = must ship in its window: security, correctness, legal/ToS, data-limit safety; P1 high value; P2 valuable; P3 opportunistic).
  6. In operating manual §2's window calendar, update the "Election freeze" row to the decided option, link `docs/ops/release.md`, and remove "pending owner confirmation" once the owner has answered (or the 10-17 default applies).
  7. Link `release.md` from `docs/ops/README.md` and from `README.md` "Deployment" (one line).
- **Don't:**
  - Change CI, Vercel settings, the PR template (WS1-04 owns it) or `vercel.json`.
  - Add a deploy bot or a schedule.
- **Acceptance criteria:**
  - [ ] `docs/ops/release.md` exists, is 70 lines or fewer, and has the four sections.
  - [ ] Manual §2's election-freeze row shows the decided option and links `release.md`, or still says "pending owner confirmation" if the decision is open.
  - [ ] Every cron time quoted in `release.md` matches `vercel.json`. Check by hand, or against `src/lib/schedule-registry.ts` once WS4-11 has merged.
  - [ ] The PR merged on or before 2026-10-30 (target 2026-10-20).
- **Verify:** plain container: `npm test`, `npm run lint`. The rest is a docs review.
- **Owner actions:** answer the decision. Follow the checklist from merge onward.
- **Rollback:** revert. Docs only.

---

### WS9-06a · Write the LegiScan quota and ban-risk runbook before enforcement

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Opus | S | none | D1, D7, E14 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none. The runbook is written from code, with no LegiScan calls. It must **lower** future spend by telling the operator to stop, not retry.
- **Ongoing cost:** about 0.1 h/month to keep it current. It replaces reconstructing the procedure from decisions.md § 2026-06-26, § 2026-09-29 and § 2026-10-06 under pressure.
- **Why:**
  - Audited enforcement starts 2026-11-01, and a violation can mean a permanent key ban (D1).
  - The only knowledge of how to stop LegiScan spend fast is spread across prose (E14), and some of it is wrong: removing the key does not stop requests (see Current state).
  - A quota-band alert pages after WS9-01/02 (D7), so the page needs a first action.
- **Current state (verified 2026-10-06):**
  - **The client.** `src/lib/ky-legiscan-client.ts`:
    - The constructor only `console.warn`s when `LEGISCAN_API_KEY` is empty (~129–130) and still builds the client.
    - `request()` (~166–189) calls `ensureQuotaAllows()` once, then sends `GET https://api.legiscan.com/?key=<key>&op=…` up to `MAX_RETRIES` (5) times, and calls `incrementQueryCounter` before it checks the response status. With an empty key it keeps sending keyless requests, with retries.
    - Only the legislators path checks for the key (`src/lib/ky-sync-pipeline.ts` ~1640), plus two backfill scripts.
    - `ensureQuotaAllows()` (~154–165) re-reads the quota only every `QUOTA_GUARD_TTL_MS` (60 s, ~105), so a running process may make up to a minute of calls after a brake is set.
  - **The quota guard.** `src/lib/legiscan-quota.ts`:
    - `legiscanPublicMonthlyLimit()` (~107–111) reads `LEGISCAN_MONTHLY_QUERY_LIMIT` (default 10,000) and is the denominator of every percentage.
    - `legiscanSyncQuotaStopPct()` (~144–149) reads `LEGISCAN_SYNC_QUOTA_STOP_PCT` (1–100), falls back to `ACCURACY_LEGISCAN_QUOTA_STOP_PCT`, then 95.
    - `checkLegiscanQuotaForSync()` (~176–190) returns `blocked` when `pct >= stopPct`, and fails open (`blocked: false`) when the counter cannot be read.
    - `LegiscanQuotaHoldError` (~158–168) is thrown by the client when blocked. Sync callers mark the run skipped.
  - **Which brake reaches which scheduler:**
    - All six key-holding workflows pass `LEGISCAN_MONTHLY_QUERY_LIMIT: ${{ vars.LEGISCAN_MONTHLY_QUERY_LIMIT || '10000' }}`: `accuracy-audit.yml` (~57), `sync-ky-bills-status.yml` (~81, ~102), `backfill-vote-nv-counts.yml` (~75), `backfill-session-votes.yml` (~81), `legislator-links-weekly.yml` (~34), `legiscan-dataset-weekly.yml` (~73).
    - **No workflow passes `LEGISCAN_SYNC_QUOTA_STOP_PCT`.** It appears only in a comment in `sync-ky-bills-status.yml` (~9). Setting it as a GitHub secret or variable has no effect on Actions.
    - `src/lib/accuracy-audit/types.ts` (~247) also reads `ACCURACY_LEGISCAN_QUOTA_STOP_PCT` for the audit's own stop.
    - Vercel crons that call LegiScan: bills (05:00), legislators (06:00), votes (06:15) (`vercel.json`). They read whatever is set in Vercel env, after a redeploy.
  - **Caller tags.** There is no caller list in `src/lib/legiscan-caller.ts`; it has only `normalizeLegiscanCaller`, `withLegiscanCaller` and `UNTAGGED_LEGISCAN_CALLER`. Tags are set in `src/lib/ky-sync-pipeline.ts` (`sync-bills` ~970, `sync-legislators` ~1353, `sync-legislator-bios` ~1682, `sync-votes` ~1776), `scripts/accuracy-audit.ts` (`accuracy-audit`), `scripts/sync-ky-dataset.ts` (`dataset-sync`), `scripts/preview-session-sync.ts` (`session-preview`), and `legislator-links-weekly.yml` (`LEGISCAN_CALLER: legislator-links`).
  - **The read path is DB-only.** Bill pages do not call LegiScan (decisions.md § 2026-06-26), so the site keeps serving if LegiScan calls stop.
  - **Readout:** `npm run check:legiscan-quota` (`scripts/check-quota.ts`, needs prod env) prints usage and the per-op and per-caller breakdown. It reads our counter and makes no LegiScan call.
  - **The two manual backfill workflows.** `backfill-vote-nv-counts.yml` (its header comment puts a full run at about 69% of the monthly cap, D1) and `backfill-session-votes.yml` (runnable again after WS1-01) are manual-only. WS4-04's owner step (W0) disables both in GitHub → Actions, and WS4-03a's owner step re-enables them after it merges, because nothing in code caps a single run until then.
  - **WS4-01** (W0) writes `docs/data-budget.md` (not yet on `main`) with `LEGISCAN_MONTHLY_QUERY_LIMIT=1` as the kill switch and its gaps (first query of a month can pass, fails open, 60 s cache). For an immediate stop it points to this runbook's steps (a)–(c), never to removing the key.
  - **WS4-02 step 5** (W0) makes the client refuse to send when the key is empty (N3). Until it merges, the keyless-request behaviour above holds.
- **Do:**
  1. Create `docs/ops/runbooks/legiscan.md` (60 lines or fewer) with these headings: **Signals**, **First 15 minutes**, **Stop the spend**, **Diagnose**, **Recover**, **Never**, **Log it**.
  2. **Signals:** the quota-band page (90/95/98/100%), a WS4-08 pace breach once it lands, the bills, votes or dataset sources degraded, an email from LegiScan about terms or suspension, and HTTP errors from `api.legiscan.com` in sync logs.
  3. **First 15 minutes (owner):** run `npm run check:legiscan-quota` and read the per-caller breakdown. Find the caller whose count jumped. Check GitHub Actions for a running manual backfill workflow, and cancel it.
  4. **Stop the spend.** Least to most drastic. Each step is an Owner action:
     - (a) **GitHub:** disable the six key-holding workflows (list them by file name) in GitHub → Actions → each → "Disable workflow". Immediate, no deploy. State that `backfill-vote-nv-counts` and `backfill-session-votes` are already disabled from WS4-04 until WS4-03a merges, and are never re-enabled to work around a cap.
     - (b) **The limit brake, everywhere:** set the GitHub repository **variable** `LEGISCAN_MONTHLY_QUERY_LIMIT=1`, and the Vercel env var of the same name, then **redeploy production** (as in WS9-02 step 3). Every scheduler reads this name. Once the month's count is 1 or more, `pct` is 100% or more, so the client throws `LegiscanQuotaHoldError` before sending. Say what to expect: the 100% quota-band page fires once (expected), a running process may continue for up to 60 s, and the guard fails open if the counter cannot be read (Supabase down). `LEGISCAN_SYNC_QUOTA_STOP_PCT` works in Vercel only and is not needed when (b) is set. `ACCURACY_LEGISCAN_QUOTA_STOP_PCT` is the audit's separate knob and the fallback for the sync stop. Link WS4-01's kill-switch paragraph in `docs/data-budget.md` if it exists.
     - (c) **Vercel crons:** if the guard may fail open, stop the three LegiScan crons. Use Vercel → Project → Settings → Cron Jobs → Disable [verify the control exists; it disables all crons, including health-check], or a hotfix PR that removes the bills, legislators and votes entries from `vercel.json` (allowed in any window as a P0).
     - (d) **Last resort, only together with (a)–(c):** remove `LEGISCAN_API_KEY` from Vercel (then redeploy) and the GitHub secrets, keeping the value only in the owner's password manager. State plainly: **removing the key is not the stop.** Until WS4-02 merges, bills, votes and dataset runs still send keyless requests to `api.legiscan.com`, with retries, and the counter still increments [verify whether LegiScan counts or penalizes keyless requests from our IP]. After WS4-02 (step 5, N3) the client refuses to send without a key, but the key also lives in GitHub secrets and on the owner's machine, so (a)–(c) stay the documented stop. Health breaches are then expected, and pages keep serving from the database.
  5. **Diagnose:** match the caller tag to its source with a table built from `grep -rn "withLegiscanCaller(\|LEGISCAN_CALLER" src scripts .github` (paste the output in the PR), and use the WS4-01 per-run caps. If the counter and LegiScan's own figure disagree, remember that until WS4-02 lands the counter is incremented per HTTP-success response, not per attempt (D1).
  6. **Recover:** re-enable in reverse order. Restore `LEGISCAN_MONTHLY_QUERY_LIMIT` (delete the variable, so workflows fall back to `'10000'`; remove it or set 10000 in Vercel and redeploy). Re-enable one scheduled job at a time and read the counter after each run; the two backfill workflows stay disabled unless WS4-03a has merged. If the month passes 5,000 by the 15th, follow the paid-tier trigger in `docs/data-budget.md` (WS4-04). For a suspension or terms email, reply from the account that holds the key (WS4-04) and keep (a)–(c) in place until LegiScan answers.
  7. **Never:**
     - register or request a second key
     - rotate the key to "reset" a quota
     - run a backfill to catch up after an outage, since the hash-gated syncs self-heal
     - re-enable `backfill-vote-nv-counts` or `backfill-session-votes` before WS4-03a merges, or any LegiScan workflow to work around a cap
     - remove or weaken LegiScan attribution
  8. **Log it:** add an `incident` entry to `docs/ops/log.md` (WS9-04). If the log does not exist yet, use the PR or issue.
  9. Link the runbook from `docs/ops/README.md` (create the file if WS9-01 has not merged), and fill the "First action" cell for the quota-band alert.
  10. Cite N3 under "Findings re-checked" in the PR. If WS4-02 has not merged, say so there (it owns the empty-key refusal). If `docs/data-budget.md` exists, confirm that `grep -in "remove the key" docs/data-budget.md` returns nothing, and raise any hit for WS4-01 under "Found, not fixed".
- **Don't:**
  - Add a kill-switch env var or change the client.
  - Edit any workflow or `vercel.json` in this PR.
  - Run `check:legiscan-quota` or any LegiScan call.
  - Copy decisions.md or `docs/data-budget.md` text wholesale.
- **Acceptance criteria:**
  - [ ] The file exists, is 60 lines or fewer, and has the seven headings.
  - [ ] The runbook says, for each scheduler (six workflows, Vercel crons, the accuracy audit), which env name or repository variable it actually reads. The PR pastes `grep -n "LEGISCAN_MONTHLY_QUERY_LIMIT\|LEGISCAN_SYNC_QUOTA_STOP_PCT\|ACCURACY_LEGISCAN_QUOTA_STOP_PCT" .github/workflows/*.yml src/lib/legiscan-quota.ts src/lib/accuracy-audit/types.ts` as evidence.
  - [ ] Step (d) states that removing the key is not the stop (keyless requests until WS4-02 merges).
  - [ ] Step (a) and **Never** state that the two backfill workflows stay disabled until WS4-03a merges and are never re-enabled to work around a cap.
  - [ ] Every env var, workflow file and npm script it names exists on `main`. Paste the grep output in the PR.
  - [ ] Merged by 2026-10-20 (end of W0). Hard stop 2026-10-31, the day before enforcement.
- **Verify:** plain container: `npm test`. Check each named item with `ls .github/workflows` and `grep -n "<name>" package.json src/lib/legiscan-quota.ts`.
- **Owner actions:** read it once before 2026-11-01. Confirm you can reach Vercel env (including Redeploy), GitHub Actions and repository variables, and the password manager from your phone.
- **Rollback:** revert. Docs only.

---

### WS9-04 · Start `docs/ops/log.md` and cap the ops docs with a test

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | WS9-01, WS9-03 | E12, E14, E13, O4 |

- **Program class:** Core
- **Owner decision:** none. The format is set here. WS5-03a owns where *decisions* go.
- **Data-limit impact:** none.
- **Ongoing cost:** about 5 minutes per incident, drill or monthly check. It **replaces** decisions.md ops-journal entries, which average about 40 lines each. The size test stops the ops docs from becoming the next 635 KB.
- **Why:**
  - `decisions.md` mixes real decisions with operational events, for example:
    - § 2026-08-11 "Daily health check: … retraction"
    - § 2026-08-24 "The bills accuracy checker had been dead for three weeks"
    - § 2026-10-06 "LegiScan post-cut health check; … 10/5 runs never got a runner"
  - That makes both hard to read (E12, E13).
  - A short, dated event log is what a partner or funder checks for operational rigor (O4). It is also how knowledge leaves one person's head (E14).
- **Current state (verified 2026-10-06):**
  - `decisions.md` has 112 entries since 2026-05-09. Event-type entries include those at lines ~1090 (2026-06-26), ~2019, ~2278 and ~2604.
  - Operating manual §8 says to append decision notes to `decisions.md` "until the decisions.md work from WS5 replaces it".
  - No `docs/ops/log.md` exists. Tests are `src/**/*.test.ts` run by `node --test` through `tsx` (`package.json` `test`).
- **Do:** this is a docs/test-only PR, so under WS9-03's default it may merge during the election freeze. Otherwise merge by 2026-10-30 or after 11-05.
  1. Create `docs/ops/log.md`. Header (5 lines or fewer): purpose, newest first, and "events only: decisions go to ADRs (WS5-03a)". Then a fenced template:

     ```
     ## YYYY-MM-DD · incident|drill|check · <one-line title>
     - Detected: <page / alert / reader / owner>, <when>
     - Impact: <what users saw, for how long, or "none">
     - Cause: <one line, or "n/a">
     - Action: <what was done, PR link>
     - Follow-up: <WP ID, ADR, or "none">
     ```

  2. Seed three past `incident` entries, written from the cited decisions.md sections only, with no personal data:
     - 2026-06-26: the quota hold emptied bill pages, and the read path moved to the DB.
     - 2026-08-24: the bills accuracy checker had been dead for about three weeks.
     - 2026-10-05: two scheduled GitHub runs never got a runner (D5).

     Link each to its decisions.md anchor. If WS9-02's `check` entry is in a PR or issue, copy it in.
  3. Create `src/lib/ops-docs.test.ts`. It asserts:
     - (a) **per-file caps** from one exported constant map, default 60 lines for any file not in the map: `README.md` 50, `release.md` 70, `runbooks/legiscan.md` 60, `runbooks/sources.md` 110, `vendors.md` 70, `session-2027.md` 90. `log.md` and `env-vars.md` are uncapped.
     - (b) the sum of lines across `docs/ops/**/*.md`, excluding `log.md` and `env-vars.md`, is **450 or fewer**
     - (c) in `log.md`, ignoring every line inside a ``` fence, every `## ` heading matches `^## \d{4}-\d{2}-\d{2} · (incident|drill|check) · .+$`, entries are sorted newest first, and each entry is 10 lines or fewer
     - (d) every file under `docs/ops/` other than `README.md` is linked from `docs/ops/README.md`
     - (e) no file under `docs/ops/` contains an email address outside the allowlist. Match emails only, with `/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g`, and allow domains `kyvky.com` and `example.com`. Text such as `op@caller` or `@sentry/nextjs` does not match.
  4. Edit manual §8. Add: "Operational events (incidents, drills, monthly checks) go to `docs/ops/log.md` in its template, never to `decisions.md` or ADRs." If WS5-03a has already edited §8, add the sentence beside its ADR rule.
  5. Link `log.md` from `docs/ops/README.md`.
- **Don't:**
  - Edit or move any `decisions.md` entry.
  - Create ADRs (WS5-03a).
  - Add a log viewer, a database table or a schedule.
- **Acceptance criteria:**
  - [ ] `docs/ops/log.md` has the template and three seed entries that pass the format test.
  - [ ] `npm test` passes, including `ops-docs.test.ts`, with the WS9-01 and WS9-03 docs present.
  - [ ] A temporary 61-line file in `docs/ops/` fails test (a), and a temporary `someone@gmail.com` fails test (e). Say in the PR that both were tried and reverted.
  - [ ] Manual §8 has the sentence.
- **Verify:** plain container: `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** revert. Docs and a test only.

---

### WS9-05 · Make the `.org` domains redirect with the path intact

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Owner | S | none | D6, O3, U15 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Mechanism.**
  - (a) Add `knowyourvotekentucky.org`, `www.knowyourvotekentucky.org`, and `kyvky.org` with its `www` host if owned, to the Vercel project as redirect domains to `www.kyvky.com`. Then point their DNS at Vercel as Vercel instructs.
  - (b) Change the Hostinger forward to keep the path and target `https://www.kyvky.com`, if Hostinger's forwarding supports path preservation [verify].
  - **Recommended: (a).** The four `.com` alternates are already redirected by the Vercel project's domain settings (`next.config.ts` ~53–60) [verify that they preserve the path and which status they use: `curl -sI https://knowyourvotekentucky.com/bills`]. Vercel issues TLS, and it removes one Hostinger feature from the critical path.
  - **Default:** none. This is a DNS change, so it waits on the owner. If it is not done by 2026-12-14, it moves to W4 (no DNS changes in FZ or W3).
- **Data-limit impact:** none. Vercel Pro includes the domains [verify the domain limit on the plan].
- **Ongoing cost:** removes one fragile forwarding rule. 0 h/month after.
- **Why:**
  - `https://knowyourvotekentucky.org/bills` 301s to `https://kyvky.com` with the path stripped, then to www, so visitors land on the homepage (D6).
  - Owning and serving `.org` correctly is the cheap first step of the trust signal a partner asked about (TASKS.md "Owner wishlist, filed 2026-08-31"; O3).
  - Broken redirects also waste backlinks (U15).
- **Current state (verified 2026-10-06):**
  - TASKS.md line ~26 records the defect.
  - The `next.config.ts` `redirects()` comment (~53–63) explains that the `.org` pair is forwarded by Hostinger and never reaches Next.js, and says the apex 307s to www (~54).
  - `docs/launch-checklist.md` (~40, ~63) shows that Hostinger also hosts the `kyvky.com` DNS zone and the mailbox. That is the same account, so the change must not touch MX or DKIM records.
  - `README.md` "Deployment" (~176) says the apex 301s and that `next.config.ts` redirects the legacy hosts. Both contradict the config comment (E12, for WS5-04b).
- **Do:** owner only, between 2026-11-06 and 2026-12-14. **Not** during the election freeze (2026-10-31 → 11-05, `docs/ops/release.md`) or in the election run-up.
  1. Before changing anything, record the current DNS records for each `.org` host: screenshot or `dig +short A`/`CNAME` output. That is the rollback.
  2. Apply the chosen option. Change only the `.org` zones. Do not touch MX, SPF, DKIM (`resend._domainkey`) or `send` records on `kyvky.com`.
  3. Check with `curl -sI https://knowyourvotekentucky.org/bills` and `curl -sI https://www.knowyourvotekentucky.org/bills`. Expect one redirect whose `location` is `https://www.kyvky.com/bills`. Repeat for `kyvky.org` if applicable.
  4. Ask an agent to open a one-line PR that updates the `next.config.ts` comment (~59–62) to "`.org` hosts are redirected by the Vercel project (2026-xx-xx)", and add a `check` entry in `docs/ops/log.md`.
- **Don't:**
  - Start the `.org` rebrand (Deferred).
  - Change the canonical host, `NEXT_PUBLIC_APP_URL` or email identity.
  - Move nameservers away from Hostinger as part of this WP.
  - Make the change between 2026-10-21 and 2026-11-05.
- **Acceptance criteria:**
  - [ ] Each `.org` host answers `/bills` with a single redirect to `https://www.kyvky.com/bills`, shown by curl output in the PR.
  - [ ] Email still works: a test message to the reply-to inbox arrives, and `dig TXT resend._domainkey.kyvky.com` still returns the key.
  - [ ] The `next.config.ts` comment is updated.
- **Verify:** `curl`, `dig` and one test email. These need no secrets but do need the owner's DNS access.
- **Owner actions:** steps 1–3.
- **Rollback:** restore the recorded DNS records and remove the domains from the Vercel project.

---

### WS9-06b · Write one runbook file for LRC, Open States, Supabase and email

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS9-04 | D2, D3, E6, E14, D7, D4, S11, T3 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none for writing. Written from code and `fixtures/lrc/`, with no live fetches. The runbook itself allows at most **one** saved-page fetch per LRC incident (manual §4 LRC rules), and names the one LegiScan cost after a restore (the dataset reconcile, priced with its dry run).
- **Ongoing cost:** about 0.1 h/month. It replaces re-deriving fixes after the four LRC calendar failures in 30 days (E6) and handling database and email failures from memory (E14). One file instead of five: for a site with 16 accounts and about 1 digest recipient a month (T3), each source gets 25 lines or fewer.
- **Why:**
  - The LRC scrapers are the most fragile part of the system (E6, D3), and Open States `/people` often returns 504 (D2).
  - The database and email paths each have a failure that a solo operator handles from memory today (E14). Email has already failed once through a stale DKIM record at Hostinger (`docs/launch-checklist.md` §A, 2026-06-04; the D6 scope addition in Findings re-checked).
  - All of these breaches page after WS9-01 (D7).
- **Current state (verified 2026-10-06):**
  - **Source budgets.** `src/lib/source-health.ts` `MONITORED_SOURCES` (~47–98): `lrc-calendar` (`maxAgeHours` 30, `maxZeroYieldHours` 21 days), `lrc-committee-materials` (14 days zero-yield), `legislators` (7 days zero-yield), `lrc-enrollment-actions`, `lrc-popular-names`. Quote **schedules** from `vercel.json` and the workflow files, not from this file (its `dataset` schedule has drifted; see Findings re-checked).
  - **LRC structure guard.** `src/lib/ky-lrc-calendar-sync.ts` (~580–592) returns an error when the calendar parses to 0 day headings. The other LRC modules have no structure guard (E6), until WS4-10 lands.
  - **Open States outages.** `src/lib/ky-sync-pipeline.ts` `openStatesUnreachableSkipResult` (~400–420) records a transient outage as a skip. A persistent one surfaces through the 7-day zero-yield budget. Deactivation needs 2 consecutive misses (`OS_MISS_THRESHOLD`, ~1521).
  - **Fixtures.** Saved pages are in `fixtures/lrc/` (`README.md` plus 5 HTML files).
  - **npm scripts:** LRC dry runs `sync:ky:lrc-calendar:dry`, `sync:ky:lrc-committee-materials:dry`, `sync:ky:lrc-enrollment-actions:dry`, `sync:ky:lrc-popular-names:dry`; roster `sync:ky:legislators`; URL probe `probe:legacy-material-urls`; dataset `sync:ky:dataset` and `sync:ky:dataset:dry`; `health:sources`.
  - **Supabase.** `src/app/api/cron/health-check/route.ts` returns 503 and alerts when Supabase is unreachable. The plan is Pro in an org shared with another project (D4). Backup retention and point-in-time recovery have not been verified [verify in Dashboard → Database → Backups]. `env-template.txt` documents `DATABASE_URL` / `SUPABASE_DB_PASSWORD` for `npm run db:apply-sql`.
  - **Email.**
    - `DIGEST_DRY_RUN=true` stops digest sends (`src/app/api/cron/notify/route.ts` ~34–35, `src/lib/digest/run-bill-digest-cron.tsx` ~121). The route also honours `?dryRun=true`, but that affects only a manual call: the scheduled cron URL in `vercel.json` has no query.
    - `src/app/api/webhooks/resend/route.ts` suppresses hard bounces and complaints automatically.
    - DKIM is at `resend._domainkey.kyvky.com` in Hostinger DNS. Resend's free tier is about 100 a day (D4).
  - **Dataset reconcile cost.** `scripts/check-quota.ts` hard-codes `PLANNED_RUN_COST = 26` ("1 list + 25 datasets", ~10, ~29). That is a forced full-pass upper bound; the hash-gated reconcile normally costs less. Manual §4 says to price your own run.
- **Do:**
  1. Create `docs/ops/runbooks/sources.md` (110 lines or fewer): a 3-line header, then four sections of 25 lines or fewer each, every one with **Signals**, **Stop**, **Diagnose**, **Recover**, **Never**.
  2. **§LRC:**
     - Signals: a breach on any `lrc-*` source; "parsed to 0 day headings"; a jump in dead material links in the weekly audit; HTTP 403 or 429 from `legislature.ky.gov` hosts.
     - Stop: disable `sync-lrc-calendar.yml` in GitHub. For the Vercel `lrc-*` crons there is no runtime switch: open a one-line PR removing the cron entries (a W3 hotfix is allowed). On a 403 or 429, stop all LRC jobs and wait 24 hours before one retry.
     - Diagnose: save **one** copy of the failing page with the project User-Agent into `fixtures/lrc/` (`<page>-YYYYMMDD.html`), diff its structure against the existing fixture, and run the module's `:dry` script against production env only if the owner approves (it writes nothing, but it fetches).
     - Recover: fix the parser against the saved fixture, with a test once WS4-05's harness exists. Re-enable and watch one run.
     - Never: loop live fetches, add a crawl target, or run Wayback backfills during an incident. "If LRC blocks us, the owner contacts LRC's public information office [verify the address on legislature.ky.gov]; agents never do."
  3. **§Open States:**
     - Signals: a `legislators` stalled or zero-yield breach, or "Open States unreachable (transient)" repeating for more than 3 days.
     - Stop / first action: do nothing for 72 hours. The roster is retained, and the 2-miss deactivation guard protects against partial responses.
     - Diagnose: check Open States status [verify a status page exists], and run WS9-13's seat query (read-only, owner). Expected: 100 House and 38 Senate seats (Ky. Const. § 35 [verify]), each with one active member, minus any named vacancy.
     - Recover: run `npm run sync:ky:legislators` once (owner; at most about 10 Open States calls and 10 or fewer LegiScan calls under the WS4-01 caps). If an outage lasts more than 14 days during session, open an issue proposing the CC0 bulk data path (D2). Do not build it during the incident.
     - Never: loop retries without backoff, or create a second API key.
  4. **§Supabase:**
     - Signals: a health-check infra page, or Supabase errors in Sentry.
     - First 15 minutes: check status.supabase.com, and confirm with one `/api/cron/health-check` call from the owner (Bearer `CRON_SECRET`).
     - During an outage: do nothing to data. ISR pages may keep serving cached HTML [verify]. Syncs are hash-gated and self-heal, so **never** backfill to catch up.
     - Restore, only for data loss or corruption: (a) the dashboard restore of the latest daily backup (replaces the database; accounts, follows and logs written after the backup are lost); (b) restore to a new project, if the plan offers it [verify], repointing env vars only after checks pass; (c) the CLI dump procedure that WS9-11a drills.
     - After any restore: run `npm run sync:ky:dataset:dry` to price the reconcile (at most about 26 LegiScan queries: 1 list + 1 per changed session, under WS4-01), then `npm run sync:ky:dataset` (owner), then `npm run health:sources`.
     - Never: restore over production without first taking a dump of the current state, or put a dump in the repo, a GitHub artifact, a cloud agent container or a shared drive (it contains account emails).
  5. **§Email:**
     - Signals: `[page] Digest send failed` or `[page] Resend webhook errors`; bounce or complaint counts (aggregate only); mail landing in spam; Resend free-tier warnings.
     - Stop: set `DIGEST_DRY_RUN=true` in Vercel, **then redeploy production** (as in WS9-02 step 3). If WS7-09c has merged, also unset `MY_LEGISLATORS_SEND` in the same redeploy. If a redeploy is not possible, a hotfix PR removing the `notify` cron entry from `vercel.json` also stops it. `?dryRun=true` is for manual calls only.
     - Diagnose: `dig TXT resend._domainkey.kyvky.com` and SPF on the `send` subdomain (public DNS); the Resend dashboard domain status; the webhook URL is `https://www.kyvky.com/api/webhooks/resend`, since the apex breaks POST.
     - Recover: fix DNS in Hostinger, wait for propagation, unset the dry-run flag, redeploy, and watch one send.
     - Never: send test blasts to real subscribers; run `preview:digest` with `--send` or `--inject` (manual §4); remove the postal-address footer (`KYVKY_POSTAL_ADDRESS`) or `List-Unsubscribe` (CLAUDE.md, S11).
  6. Link the file from `docs/ops/README.md`, and fill the remaining "First action" cells ("see `runbooks/sources.md` § <source>").
  7. List every `[verify]` item in the PR body, for the owner to confirm during WS9-11a.
- **Don't:**
  - Fetch from LRC or Open States, or run any SQL, dump or restore.
  - Edit sync code, the notify route or the webhook code, or add a switch env var (record any need under "Found, not fixed").
  - Write a reader-report runbook or duplicate WS3-14's corrections procedure.
- **Acceptance criteria:**
  - [ ] `docs/ops/runbooks/sources.md` exists, is 110 lines or fewer, each section is 25 lines or fewer, and `ops-docs.test.ts` passes.
  - [ ] Every npm script, workflow, route, env var and file path it cites exists on `main`. Paste the grep output.
  - [ ] Every "set X in Vercel" step is followed by "redeploy production".
  - [ ] The expected chamber counts (100 and 38) are stated with their source.
  - [ ] Merged by 2026-11-27.
- **Verify:** plain container: `npm test`.
- **Owner actions:** confirm the `[verify]` items (backup retention, point-in-time recovery, restore-to-new-project) during WS9-11a, and correct the runbook through a follow-up PR.
- **Rollback:** revert.

---

### WS9-08 · Inventory vendors, list what does not transfer, and define the one monthly check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS9-04 | D4, D6, E14, O2, O3 |

- **Program class:** Core
- **Owner decision:** none. Each "Plan", "Renewal" and "2FA" cell is owner-filled, and the agent leaves it as `[owner]`.
- **Data-limit impact:** none.
- **Ongoing cost:**
  - one monthly owner check of about 15 minutes, December 2026 to April 2027, then as WS5-16 says. It **replaces** separate monthly rituals in WS4-01, WS4-07 and WS5-05 with one entry.
  - about 0.1 h/month for agents (none unless a vendor changes)
  - **no code and no schedule:** the reminder is a recurring event in the owner's phone calendar
- **Why:**
  - About 12 accounts sit with one person (E14), and nobody wrote down what breaks if each lapses (D6). Hostinger and Adobe Fonts are single points of failure.
  - A partner will ask what does not transfer (O3). The LegiScan one-key rule, the Adobe licence and the per-person keys are the answer, and they should be written once.
  - D4's cash cost is an estimate ([I] on its cost sentence). The program needs one place where usage, spend and owner hours are read each month (O2), without a second ledger: vendor billing history already holds the charges, and WS9-14 pulls Nov–Mar from it in one sitting.
- **Current state (verified 2026-10-06):**
  - No vendor list exists in the repo. Vendors are known only from code and docs:
    - **Core platform and data:** Vercel (`vercel.json`), Supabase, GitHub Actions, LegiScan, Open States (`src/lib/ky-openstates-client.ts`) and Anthropic.
    - **OpenAI:** `OPENAI_API_KEY` is read only by the dead `src/lib/transcribe.ts` and `src/app/lib/transcribe.ts` (E3) and typed in `src/lib/env-validation.ts` (~7). WS5-02 removes them.
    - **Messaging and monitoring:** Resend, Mapbox (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`), PostHog, Sentry and Slack.
    - **Hostinger:** DNS zone, mailbox and `.org` forwarding (`docs/launch-checklist.md` ~40, ~63; `next.config.ts` ~59). Whether it is also the registrar for `kyvky.com` is not visible in the repo [verify].
    - **Fonts:** Adobe Fonts kit `yru3sto` (`src/app/layout.tsx` ~88–107) and Google Fonts (`next/font/google`, `layout.tsx` ~4).
    - **No-account services:** Nominatim (`src/app/api/geo/zip/route.ts`, `NOMINATIM_USER_AGENT`) and the Wayback CDX (`scripts/repair-missing-agenda-items.ts` ~44).
    - **Search verification:** Google Search Console (`layout.tsx` ~64 `verification`) and Bing Webmaster (TASKS.md SEO pass).
    - **Agent tooling:** Claude Code Routines (TASKS.md ~181; WS5-07 retires them).
  - **The Adobe Fonts fallback already exists:** `src/app/globals.css` (~14–24) defines the size-adjusted `aesthet-nova-fallback` face over Georgia, listed before Georgia in `src/lib/theme.ts` (~19) and `globals.css` (~85). A lapsed kit degrades heading typography only (see Findings re-checked). WS6-17b owns the typeface.
  - Other WPs already point at this file: WS4-01 (quarterly free-tier lines), WS4-07 (Anthropic spend), WS5-05 step 4 (hours and labels into "`docs/ops/vendors.md` §Monthly check"), WS2-15 (2FA column), WS2-04 (Mapbox token restriction), WS8-14a (partner index).
- **Do:**
  1. Create `docs/ops/vendors.md` (70 lines or fewer).
  2. **§Inventory table:** Vendor | Used for | Plan `[owner]` | Limit we depend on (link `docs/data-budget.md` if it exists) | What breaks if it lapses | Renewal / card expiry `[owner]` | 2FA + recovery stored (yes/no) `[owner]` (WS2-15) | Transfers? (yes / no, see below).
     - One row per vendor above, including OpenAI as "dead code only; delete this row with WS5-02" (or omit it with a note if WS5-02 has merged), and the no-account services marked "no account".
     - The "what breaks" cell is written from code, for example: Hostinger "site unreachable on all kyvky.com hosts if it holds the zone, reply-to mail stops, DKIM fails so digests go to spam"; Adobe Fonts "headings fall back to size-matched Georgia, no outage"; Resend "digest and welcome emails stop; auth emails also stop if Supabase SMTP uses Resend [verify]".
     - The Mapbox row notes whether the token's URL restriction is on (WS2-04).
     - Account holder: write only "owner". Logins, emails and recovery codes stay in the owner's password manager.
  3. **§Does not transfer (10 lines or fewer):**
     - LegiScan: the key belongs to its account holder, and LegiScan prohibits multiple Public keys. A partner coordinates with LegiScan **before** any switch, and two keys never run.
     - Adobe Fonts: the licence is personal; switch the typeface first (WS6-17b).
     - Open States, Anthropic and Mapbox keys: per person. A partner issues its own, and the old ones are revoked after cutover.
     - Claude Code Routines: none should exist after WS5-07.
     - One line on the three partner modes: data partnership (no accounts move), co-operation (admin seats, owner stays account holder), full transfer (order written only if WS8-16 chooses it; see Deferred).
  4. **§Monthly check (15 lines or fewer), first working day of each month from 2026-12-01:**
     - LegiScan month total: `npm run check:legiscan-quota` against the plan in `docs/data-budget.md`.
     - Anthropic spend against the Console limit (WS4-07).
     - Quarterly (January and April only): the free-tier usage lines in `docs/data-budget.md` (WS4-01).
     - Write this line verbatim: "Quarterly (January and April): dependency and framework currency. Open Dependabot security alerts and PRs are merged or triaged (WS1-07). The end-of-support dates for Next, Node and MUI v5 are checked against each project's published support policy. WS2's deferred MUI v5 triggers are checked. Record the result in the `check` entry. After W4 this line continues quarterly under maintain mode (WS5-16)."
     - Owner hours this month and the PR label counts (WS5-05's line; leave a placeholder if WS5-05 has not merged).
     - Pages this month / pages that needed action (WS9-10).
     - Any renewal or card expiry in the next 60 days.
     - Record **one** `check` entry in `docs/ops/log.md`, 10 lines or fewer. No cash ledger: charges are read from vendor billing history in W4 (WS9-14).
  5. Link `vendors.md` from `docs/ops/README.md`.
- **Don't:**
  - Put prices, login emails, account IDs or card details in the repo.
  - Add reminder code, a cash ledger table, a schedule, or a font test.
  - Cancel or change any vendor, or change the typeface (WS6-17b).
- **Acceptance criteria:**
  - [ ] `vendors.md` exists, is 70 lines or fewer, has the three sections, and has at least 18 vendor rows.
  - [ ] §Monthly check contains the quarterly dependency-and-framework-currency line, and the inventory has the "2FA + recovery stored" column (WS2-15) and the Mapbox token-restriction note (WS2-04).
  - [ ] Every vendor named by an env var in `env-template.txt` or `docs/ops/env-vars.md` (if it exists) has a row, or is noted as excluded.
  - [ ] `npm test` passes, including `ops-docs.test.ts`.
  - [ ] Merged by 2026-11-27, so the 2026-12-01 check can run.
- **Verify:** plain container: `npm test`, `npm run lint`.
- **Owner actions:**
  - [ ] Fill the `[owner]` cells, without secrets.
  - [ ] Add a recurring phone-calendar event, "KYvKY monthly check", on the first working day of each month, December 2026 to April 2027.
- **Rollback:** revert. Docs only.

---

### WS9-11b · Check that the migrations rebuild the production schema

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Opus | S | none | E1, E14, O3, D4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. One owner-run, read-only catalog query on production (no rows, no personal data). No LegiScan, Open States, LRC or Anthropic calls.
- **Ongoing cost:** none after merge. It is not repeated unless drift is non-zero and the W4 decision continues the project, or a partner asks.
- **Why:**
  - Whether the 57 migrations, including the duplicate `045`, rebuild today's schema is unknown. A partner, an emergency rebuild or a new environment depends on it (O3, E1, E14).
  - This half of the backup drill needs no production data, so it does not need the owner beyond one query.
- **Current state (verified 2026-10-06):**
  - `supabase/migrations/` has 57 files, `001_kentucky_schema.sql` … `056_ky_committee_meetings_agenda_recovery.sql`, with two numbered `045` (`045_get_votes_for_legislator_perf.sql`, `045_ky_signup_notified.sql`).
  - `scripts/apply-migration-sql.ts` does not track applied migrations (manual §5).
  - The migrations reference Supabase objects: roles `anon`, `authenticated`, `service_role`; `auth.users`; `auth.uid()`; extensions `pgcrypto` and `pg_trgm` (`grep -ohiE "auth\.[a-z_]+|\b(anon|authenticated|service_role)\b|create extension[^;]*" supabase/migrations/*.sql | sort | uniq -c`).
  - `supabase/config.toml` (`project_id = "know-your-vote-kentucky"`) exists. Running `supabase start` or `supabase db reset` inside the repo would apply `supabase/migrations/` and record versions, where the two `045` files may collide [verify].
  - Production may contain one-off tables created outside migrations, for example `ky_votes_dupe_backup_20260717` (TASKS.md ~539) and `ky_committee_materials_legacy_dupes_048` (S6).
- **Do:**
  1. Ask the owner (PR "Owner actions") to run this read-only query on production and paste the output into the PR:

     ```sql
     select 'column' as kind, table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable as item
       from information_schema.columns where table_schema = 'public'
     union all
     select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     union all
     select 'policy', tablename || '.' || policyname || ' ' || cmd from pg_policies where schemaname = 'public'
     union all
     select 'index', indexname from pg_indexes where schemaname = 'public'
     union all
     select 'trigger', event_object_table || '.' || trigger_name from information_schema.triggers where trigger_schema = 'public'
     order by 1, 2;
     ```

  2. Build a local database **outside the repo**, with no production data. Check `which docker psql` first [verify in your container]:
     - Preferred: `supabase init && supabase start` in an **empty temporary directory** (it has the real `auth` schema and roles), then apply each file in `supabase/migrations/` in filename order with `psql "<local url>" -v ON_ERROR_STOP=1 -f <file>`. Do not run `supabase start` or `db reset` in the repo.
     - Fallback: a plain Postgres container matching the production major version [verify the version from `supabase/config.toml` `[db] major_version`], with stub roles `anon`, `authenticated`, `service_role`, a schema `auth` with `users(id uuid primary key, email text)` and a `uid()` function returning `uuid`, and the two extensions. Then apply the files as above.
     - If neither Docker nor Postgres is available, stop and hand off (§9).
  3. If a migration fails, record the file and error, fix nothing, and continue with `ON_ERROR_STOP` off for the remaining files so the count is complete.
  4. Run the same query locally. Diff the two sorted outputs. Count differences by kind, in both directions (only in production / only in migrations).
  5. Add a `check` entry to `docs/ops/log.md`: "Schema rebuild: N differences (columns a, functions b, policies c, indexes d, triggers e); failing migrations: list or none". Names only, top 5 per direction, no definitions.
  6. If the difference count is non-zero, say in the PR body that the first half of the trigger for the "baseline migration" row in `DEFERRED.md` (row 9.3) has fired; WS9-14 records its W4 status. Under "Found, not fixed": the duplicate `045` number for WS1-05b, and any production-only table for WS2/WS5.
  7. Offer the owner's query output to WS8-14b in the PR body, so it need not be re-run.
- **Don't:**
  - Connect to production from the agent container.
  - Commit the query output, a dump, or any schema file.
  - Edit or renumber migrations.
- **Acceptance criteria:**
  - [ ] The `check` entry exists with counts by kind and the list of failing migrations.
  - [ ] No new file besides the log entry is committed.
  - [ ] Merged by 2026-12-14.
- **Verify:** plain container with Docker or Postgres: the commands above, plus `npm test` for the log format. The production query needs the owner.
- **Owner actions:**
  - [ ] Run the catalog query (SQL editor, read-only) and paste the output. About 10 minutes.
- **Rollback:** revert the log entry.

---

### WS9-07 · Catalogue every env var by name and purpose, with a one-way drift test

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 (after WS5-02; target 12-11) | Sonnet | S | WS9-04, WS5-02 (soft: WS5-01b) | E14, E1, E2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 2 minutes whenever a PR adds an env var. Deletions never fail the test. It replaces hunting through `env-template.txt`, which omits about a quarter of the names read in code (21 of 75). It is the one env list WS8-14a links.
- **Why:**
  - 75 env-var names are read by code (E1, E14). A partner taking over, or the owner rebuilding Vercel, has no list of which are required, where each is set, and what each does.
  - `env-template.txt` documents only some of them and has drifted (it said "every 15m", E2).
  - Landing after WS5's deletions (W1–W2) avoids cataloguing names that are about to disappear.
- **Current state (verified 2026-10-06):**
  - `grep -rhoE "process\.env\.[A-Z0-9_]+" src scripts instrumentation*.ts sentry*.ts next.config.ts | sort -u` gives 75 names. 21 of them do not appear in `env-template.txt` (for example `HEALTH_CHECK_FAIL_ON_DEGRADED`, `KY_SYNC_USE_CHANGE_HASH`, `SUPABASE_DB_URL`, `TRIAGE_LLM_MODEL`, and platform names such as `VERCEL_URL` and `GITHUB_RUN_ID`).
  - Names are also read dynamically in four files: `src/lib/env-validation.ts` (~32, ~94, ~126, ~136), `src/lib/legiscan-quota.ts` `envQuotaStopPct(name, …)` (~137), `src/lib/accuracy-audit/types.ts` (~190–204, ~247) and `scripts/test-env.ts` (~25). The test does not parse these; the catalog lists the names by hand.
  - Workflows reference 11 `secrets.*` names and `vars.LEGISCAN_MONTHLY_QUERY_LIMIT`. WS9-01 adds `secrets.SLACK_WEBHOOK_SUPPORT`.
  - Some names exist only in dashboards or build plugins (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SUPABASE_SMTP_*` per `env-template.txt`).
  - WS1-05b may have added `src/lib/repo-invariants.test.ts` [verify].
- **Do:**
  1. Create `docs/ops/env-vars.md` (no line cap) with one table: **Name | Scope | Required in production | Purpose (12 words or fewer) | Vendor**.
     - Scope is one of: `public-build` (`NEXT_PUBLIC_*`), `server`, `gh-secret`, `gh-var`, `scripts-local`, `platform` (set by Vercel, GitHub or Node, e.g. `VERCEL_ENV`, `CI`, `GITHUB_RUN_ID`, `NODE_ENV`, `NEXT_RUNTIME`, `PORT`) or `dashboard-only`.
     - Include the dynamically read names from the four files above, by reading them.
     - Mark legacy aliases (`SLACK_WEBHOOK_SYNC`, `_ALERTS`, `_URL`) as "legacy alias of X".
     - Every Vendor cell must name a row in `docs/ops/vendors.md`, or "none".
     - **Never** include a value, an example value or a URL with a token.
  2. Add the test. If `src/lib/repo-invariants.test.ts` exists, add a `describe('env catalog')` block there; otherwise create `src/lib/env-catalog.test.ts`. It:
     - (a) collects names from `process.env.NAME` and `process.env['NAME']` in files ending `.ts`, `.tsx`, `.js` or `.mjs` under `src/` and `scripts/`, plus root `instrumentation*.ts`, `sentry*.ts` and `next.config.ts`. It excludes `*.test.ts`, `*.test.tsx`, `node_modules` and `.next`.
     - (b) collects `secrets.NAME` and `vars.NAME` in `.github/workflows/*.yml`, excluding `GITHUB_TOKEN`
     - (c) parses the catalog table
     - asserts that every collected name is in the catalog (one direction only; extra catalog rows are allowed)
     - asserts that no catalog cell matches `/(\bsk-[A-Za-z0-9]|sk-ant-|\bre_[A-Za-z0-9]{8}|\bphc_|\bphx_|\bwhsec_|\bsntrys_|\beyJ[A-Za-z0-9]|hooks\.slack\.com\/services\/T)/`, so ordinary words such as "risk-" or "task-" do not trip it
  3. Add one bullet to operating manual §6: "If the env catalog test fails because your WP adds or renames an env var, add or edit its row in `docs/ops/env-vars.md`. This is in scope for every WP and is not an unrelated failure under §3."
  4. Add one line at the top of `env-template.txt`: `# Full list with scopes and purposes: docs/ops/env-vars.md`. Change nothing else there (WS4-01 fixes "every 15m").
  5. Link the catalog from `docs/ops/README.md`, and replace the `README.md` "Environment variables" body with a pointer to it. Coordinate with WS5-04b if it has rewritten the README.
- **Don't:**
  - Read `.env*` files or Vercel env.
  - Add, rename or remove env vars.
  - Edit `env-template.txt` values.
  - Parse helper-function calls or assert that every catalogued name is still read (brittle, and it would fail on every deletion).
- **Acceptance criteria:**
  - [ ] `npm test` passes with the catalog test.
  - [ ] Temporarily adding `process.env.KYVKY_FAKE_TEST_VAR` to any `src` file makes the test fail. Say in the PR that this was tried and reverted.
  - [ ] Every name collected by step 2(a)–(b) has a row, every row has all five columns filled, and the secret-pattern assertion passes.
  - [ ] Manual §6 has the bullet.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:** skim the "Required in production" column and fix any row that does not match what Vercel has. Check presence only, never values.
- **Rollback:** revert. Docs and a test only. If it slips past 2026-12-14, it moves to W4 (before WS8-14a).

---

### WS9-10 · Write the 2027 session runbook: go/no-go list, key dates, daily and weekly checks

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS9-03, WS9-06a, WS9-06b, WS9-08 | T7, T5, D1, D7, E13, E14, A2 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none to write it. The checks it prescribes are owner-run reads. Its LegiScan reads go through `check:legiscan-quota`, which makes no LegiScan call.
- **Ongoing cost:** during W3, about 5 minutes a day on floor days and about 20 minutes a week, about 3–4 h/month in total. It replaces:
  - the two daily Routines (WS5-07)
  - TASKS.md items "January 2027 — confirm the 2027 RS pickup" (line ~75) and "March 2027 — re-check the LRC calendar and add `actsEffectiveDate`" (line ~76), which this WP **folds in**
- **Why:**
  - The 2027 session is the first one the current architecture will be observed under (T7). Session maintenance is estimated at 1.5–2× (E13).
  - The checks must be few and written down, so they survive a tired operator or a hand-over (E14).
  - The daily check is the safety net behind the phone page (D7).
- **Current state (verified 2026-10-06):**
  - **Session record.** `src/lib/ky-sessions.ts` (~62–77) schedules "2027 Regular Session" (2027-01-05 → 2027-03-30), with `vetoRecessStart` 03-13, `vetoRecessEnd` 03-25 (the exclusive reconvene day, the same convention as 2026) and `sineDie` 03-30. It was added in PR #287 (merge `a420522`).
  - **Comment-only dates.** The code comment (~68–71) gives Part I Jan 5–8, the break Jan 9–Feb 1, Part II from Feb 2, and concurrence days Mar 11–12, citing the LRC 2027 calendar PDF. These are not data fields. `getSessionPhase()` (~276–287) reports `in_session` through the break.
  - **LegiScan listing.** LegiScan had not listed the 2027 session as of 2026-09-30 (TASKS.md ~74). `npm run sync:ky:session-preview` exists.
  - **No session ops doc exists.**
- **Do:**
  1. Create `docs/ops/session-2027.md` (90 lines or fewer).
  2. **§Go/no-go (filled by WS9-12).** A table: Item | Source | Status | Evidence. Rows:
     - quality gate checks (`01-quality-gates.md` §Pre-session gate checks)
     - security readiness (WS2-14)
     - session load rehearsal (WS4-15)
     - product readiness (WS6-19)
     - measurement and email readiness (WS7-11)
     - AI summary grounding (A2): WS3 go/no-go of 2026-12-07 recorded as Go or No-go; WS3-10 (2026 enacted-bill regeneration) done or deferred to W4/W5; the summary basis label (WS3-04) shown either way. Evidence: WS3's go/no-go decision note and its `TRACKER.md` row, the WS3-04 merged PR (and, on Go, the WS3-09c merged PR), and the WS3-10 decision note (spend and counts) or the deferral line in WS3's go/no-go note. This row is `met` when the outcome is known and the basis label is live, whichever way the go/no-go went; it is `not met` only if the go/no-go result is unrecorded or WS3-04 has not merged.
     - page test within 14 days (WS9-02)
     - backup drill (WS9-11a) and schema drift count (WS9-11b)
     - runbooks present (WS9-06a/b)
     - release calendar shows FZ and W3 (WS9-03)
     - `KY_SESSIONS` 2027 entry unchanged, or updated from LRC
     - no renewal or card expiry due before 2027-04-01 (WS9-02 check, `vendors.md`)
     - password-manager emergency access or shared vault configured for one trusted person: yes/no only, no names (E14) [verify the feature in the owner's manager]
     - owner availability Jan 5–8 and Feb 2–Mar 30, or a backup reviewer: yes/no only, no names
  3. **§Key dates:**
     - Jan 1 (new members' terms begin [verify Ky. Const. § 30]; WS9-13)
     - Jan 5–8 Part I (bill filing surge)
     - Feb 2 Part II
     - Mar 11–12 concurrence
     - Mar 13–24 veto recess
     - Mar 25 reconvene (veto overrides)
     - Mar 30 sine die
     - "March: re-check the LRC calendar PDF and update `KY_SESSIONS` milestones by hotfix PR"
     - "After the AG opinion: add `actsEffectiveDate`"
  4. **§First pickup (folds TASKS.md ~75):**
     - Once LegiScan lists the session, the owner runs `npm run sync:ky:session-preview` (1–2 queries), confirms `session_name` is exactly "2027 Regular Session", and reads the printed `getBill` count against the WS4-01 caps.
     - Run `npm run check:legiscan-quota` daily during the first week.
  5. **§Daily, on floor days (5 minutes or less):**
     - Did anything page? If yes, open its runbook.
     - Glance at `#errors` once.
     - Does `/bills` with the 2027 session filter show new bills dated yesterday?
  6. **§Weekly, Mondays (20 minutes or less):**
     - `npm run health:sources`
     - `npm run check:legiscan-quota` against "5,000 by the 15th" (`docs/data-budget.md`)
     - Sentry: the top 3 new issues
     - Resend bounce and complaint counts, including My Legislators complaints this week if WS7-09c shipped (Resend dashboard or the KPI-7 SQL)
     - the corrections inbox (WS3-14)
     - **one roll-call spot check:** pick one floor vote from the LRC record, then compare the bill page tally and one member page label (U1)
     - **one meeting spot check:** compare tomorrow's `/meetings` with the LRC calendar
  7. **§Monthly:** "Do the one monthly check in `vendors.md` §Monthly check; its `check` entry includes pages this month / pages that needed action." No other monthly list. Log an incident only when one happens.
  8. **§When to stop a check:** a check that found nothing in 4 weeks drops to every other week. Record it in `docs/ops/log.md`.
  9. Link the file from `docs/ops/README.md`.
- **Don't:**
  - Add a Routine, cron or dashboard.
  - Duplicate other workstreams' drill steps. Link them.
  - Add LegiScan spend.
- **Acceptance criteria:**
  - [ ] The file exists, is 90 lines or fewer, has the seven sections, and `ops-docs.test.ts` passes.
  - [ ] Session dates match the `KY_SESSIONS` fields or the source comment in `src/lib/ky-sessions.ts` (quote the lines in the PR). Dates not in the file (Jan 1 term start) carry a `[verify]` citation to the Ky. Const. section.
  - [ ] The two TASKS.md items are listed in the PR as "folded in". If WS5-03b has created `CURRENT.md`, they are marked superseded there too.
  - [ ] Merged by 2026-12-11.
- **Verify:** plain container: `npm test`.
- **Owner actions:** read it before FZ, and flag any check you will not do, so it is removed rather than ignored.
- **Rollback:** revert.

---

### WS9-11a · Run the database backup and restore drill

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Owner | M | WS9-06b | E14, D4, D6, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Drill method.**
  - (a) A CLI dump restored into a local Supabase stack started in an empty directory (needs Docker). Cost $0.
  - (b) Supabase restore to a new project [verify on Pro]. Billed compute for a few hours [verify the rate], deleted after.
  - (c) Dashboard confirmation only, with no restore.
  - **Recommended: (a).** It costs nothing and proves the data can leave Supabase and be served again.
  - **Second question:** keep the dump as an off-platform encrypted backup? **Recommended:** yes, one copy, replaced at each drill. **Default:** delete after the drill.
  - **Default if no answer by 2026-12-15:** (a) if Docker is available on the owner's machine, otherwise (c).
- **Data-limit impact:** about 200 MB of database egress (DB 197 MB, D4), within the Pro quota [verify]. No LegiScan, Open States, LRC or Anthropic calls. Under (b), a few hours of compute [verify the cost before starting, and stop if it is above $5].
- **Ongoing cost:** about 2–3 hours once in FZ. No schedule. It is repeated only if WS9-11b found drift and the project continues, or a partner asks.
- **Why:**
  - A database nobody has ever restored is a hope, not a backup (E14).
  - The shared Supabase org (D4) makes the dashboard the only copy.
- **Current state (verified 2026-10-06):**
  - There is no documented restore and no drill record. `docs/ops/runbooks/sources.md` §Supabase (WS9-06b) holds the procedure.
  - `supabase/config.toml` exists in the repo, so `supabase start` there would apply the repo's migrations first [verify]. The restore target must be started elsewhere.
  - The schema rebuild check is WS9-11b.
- **Do:** owner only, between 2026-12-15 and 2027-01-02.
  1. In the dashboard, confirm that daily backups exist and note their retention, and whether point-in-time recovery is enabled. Fix the runbook's `[verify]` items by asking an agent for a PR.
  2. Use a **direct or session-mode** connection string for `DATABASE_URL` (not the transaction pooler, which `pg_dump` does not support) [verify in Dashboard → Connect].
  3. Dump to an encrypted local disk, following Supabase's CLI backup guide [verify the current page and flags]: `supabase db dump --db-url "$DATABASE_URL" -f roles.sql --role-only`, then `-f schema.sql`, then `-f data.sql --use-copy --data-only`. Time it.
  4. In an **empty temporary directory** (not the repo), run `supabase init && supabase start`. Restore with the guide's `psql` command (roles, schema, then data with `session_replication_role = replica`) against the local database URL that `supabase start` prints. Time it. Record any errors by count and first line.
  5. Point a local `npm run dev` at the local stack, using its printed URL and **local** keys only, never production keys. Load `/`, one 2026 bill page and `/members/map`. Run `npm run health:sources` against the local stack.
  6. Record a `drill` entry in `docs/ops/log.md`: dump time, restore time, error count, pages OK yes/no, and what you would do differently. No rows or names.
  7. Run `supabase stop` and delete the temporary directory. Keep or delete the dump under the decision. Never upload it anywhere.
- **Don't:**
  - Restore over production.
  - Run the drill with production keys in a local app.
  - Start the restore stack inside the repo.
  - Copy any rows into the log.
  - Let a cloud agent handle the dump.
- **Acceptance criteria:**
  - [ ] A `drill` entry exists, dated within FZ, with dump and restore durations (or a `check` entry under option (c) with retention and PITR status).
  - [ ] The runbook's `[verify]` items are resolved by PR.
- **Verify:** manual, on the owner's machine with production credentials (dump only).
- **Owner actions:** all.
- **Rollback:** not applicable. Nothing in production changes.

---

### WS9-12 · Run the session go/no-go and record the result

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Sonnet | S | WS9-10 | T7, D1, D7, E13, E14, A2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The owner signs the result.
- **Data-limit impact:** none. The agent reads `TRACKER.md`, PRs and repo files only. LegiScan spend for session readiness belongs to WS4-15.
- **Ongoing cost:** none after the run. One PR.
- **Why:**
  - The project enters its first observed session (T7) with work spread across nine workstreams.
  - One dated table tells the owner and any partner what is ready, what is a known risk, and what was skipped (D1, D7, E14).
- **Current state (verified 2026-10-06):** not applicable. This WP depends on the table WS9-10 creates. WS9-02, WS9-11a/b, WS3's 2026-12-07 grounding go/no-go and WS3-10, and the FZ drills in WS1, WS2, WS4, WS6 and WS7 are **inputs**: if one has not happened, its row is `not met`, never a reason to wait.
- **Do:** between 2026-12-28 and 2027-01-04.
  1. For each go/no-go row in `docs/ops/session-2027.md`, set the status:
     - `met`: link the merged PR or log entry
     - `not met`: say what is missing
     - `accepted risk`: the owner chooses this in the PR review
  2. Run `01-quality-gates.md` §Pre-session gate checks in a plain container. Use `npm ci`, then `npm run check` once WS1-04 has added it, instead of separate `tsc`, lint and test commands; before that, `npx tsc --noEmit`, `npm run lint` and `npm test`. Then `npm run build`. Paste the tails.
  3. Check that `src/lib/ky-sessions.ts` still has the 2027 entry, and that `getSessionPhase(new Date('2027-01-06T12:00:00Z'))` returns `in_session`. Use a one-line `node --import tsx -e` call, or the WS1-10 tests if they exist.
  4. List every `not met` item with a proposed FZ-allowed fix (a fix, drill or readiness task) or "accept".
  5. Add a `check` entry to `docs/ops/log.md`: "Session go/no-go: N met, N not met, N accepted".
  6. Update this WP's `TRACKER.md` row only. List in the PR body any other WS9 rows whose status looks stale.
- **Don't:**
  - Fix anything in this PR. Fixes are separate PRs, which FZ allows.
  - Re-run other workstreams' drills.
  - Probe production.
- **Acceptance criteria:**
  - [ ] Every row has a status and evidence.
  - [ ] The owner has approved the PR, which counts as the sign-off, on or before 2027-01-04.
  - [ ] The log entry exists.
- **Verify:** plain container: the commands in step 2.
- **Owner actions:** review, mark accepted risks, and merge by 2027-01-04.
- **Rollback:** revert. Docs only.

---

### WS9-13 · Verify the roster after the newly elected members are seated

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | FZ→W3 (2027-01-02 → 01-08) | Owner | S | WS9-10 | T5, U6, D2, E10 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** read-only SQL on our own database. If a fix sync is needed: one `npm run sync:ky:legislators` run, at most about 10 Open States calls and 10 LegiScan queries (the WS4-01 `sync-legislators` cap), owner-run. No agent-initiated LegiScan spend in W3 (manual §4).
- **Ongoing cost:** about 30 minutes, up to three times in one week. It repeats only after a general election (next: November 2028, for terms beginning January 2029 [verify]).
- **Why:**
  - "Find my legislator" is the one behaviour people actually use (T5).
  - On 2026-11-03 all 100 House seats and half the Senate were on the ballot. Members elected then take office in January [verify Ky. Const. § 30].
  - This is the first seating since KYvKY launched. A stale roster would answer the site's most common question wrongly during the session's first week.
  - Seating depends on Open States updating (D2) and on the untested name matching (E10). Nothing else in the program checks it (see Findings re-checked).
- **Current state (verified 2026-10-06):**
  - `ky_legislators` (migration `001_kentucky_schema.sql` ~21–38): `chamber` is `'house'` or `'senate'`; `district` is text, normalized to `HD-001`…`HD-100` and `SD-01`…`SD-38` by `normalizeKyLegislatorDistrictForDb` (`src/lib/ky-district-geo.ts` ~21–38).
  - `src/lib/ky-sync-pipeline.ts` marks legislators inactive after 2 consecutive Open States misses (~1515–1578). It also retires LegiScan-only rows whose seat is covered (~1597–1631).
  - The daily legislators cron runs at 06:00 UTC (`vercel.json`).
  - The district lookup is `src/components/members/DistrictMapExplorer.tsx` (`/members/map`).
  - WS6-05's members-elect note hides itself after 2027-01-01.
- **Do:** owner, between 2027-01-02 (FZ readiness allowed) and 2027-01-08.
  1. Run this read-only query on `ky_legislators`, which holds public data, not user data. It lists every seat whose active-member count is not exactly 1, including empty seats:

     ```sql
     with seats as (
       select 'house' as chamber, 'HD-' || lpad(n::text, 3, '0') as district from generate_series(1, 100) n
       union all
       select 'senate', 'SD-' || lpad(n::text, 2, '0') from generate_series(1, 38) n
     )
     select s.chamber, s.district, count(l.id) as active_members
     from seats s
     left join ky_legislators l
       on l.active and l.chamber = s.chamber and l.district = s.district
     group by s.chamber, s.district
     having count(l.id) <> 1
     order by 1, 2;
     ```

     Then check for active rows whose district is not a valid seat:

     ```sql
     select chamber, district, count(*) from ky_legislators
     where active and (district is null or district !~ '^(HD-[0-9]{3}|SD-[0-9]{2})$')
     group by 1, 2;
     ```

     Expect zero rows from both, except seats that are actually vacant (a resignation or a pending special election), which are recorded by district as "accepted vacancy".
  2. Compare the names for 5 districts whose incumbent did not return against the LRC legislator list [verify the URL on legislature.ky.gov].
  3. Run three address lookups on `/members/map` using public addresses: the State Capitol, and one county courthouse in a changed district for each chamber. Check the members shown.
  4. If Open States has not updated yet, wait. Repeat steps 1–3 on 2027-01-06 and 2027-01-08. If it has updated and we are wrong, run `npm run sync:ky:legislators` once and re-check.
  5. If still wrong on 2027-01-08, open a W3 hotfix issue for WS5's name-matching owner with the aggregate evidence, add an `incident` entry to `docs/ops/log.md`, and extend WS6-05's members-elect note date in a one-line W3 PR.
  6. Record a `check` entry with the counts and any accepted vacancies.
- **Don't:**
  - Hand-edit `ky_legislators` rows in the dashboard. Fixes go through sync or code.
  - Query user tables.
  - Run any backfill.
- **Acceptance criteria:**
  - [ ] Both queries return no rows other than named accepted vacancies, or an incident and hotfix issue exist by 2027-01-08.
  - [ ] Three lookups show the seated members.
  - [ ] A `check` entry exists in `docs/ops/log.md`.
- **Verify:** owner SQL (prod, read-only) and manual lookups.
- **Owner actions:** all.
- **Rollback:** not applicable.

---

### WS9-14 · Review session operations, trim what did not earn its keep, and hand the ops floor to WS5-16

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 (merge by 2027-04-24) | Sonnet | S | WS9-12, WS9-13 (soft: WS5-13) | E13, E12, D4, D7, O1, O2, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** which checks, runbook sections and pages to drop, from the agent's proposal.
  - **Docs-only cuts** (checks removed from `session-2027.md`, unused runbook sections deleted or collapsed into one line in `docs/ops/README.md`): **default if no answer by 2027-04-20: apply them.**
  - **Page demotions** (an alert moved from the page channel to `#errors`): **blocked until answered.** They reduce alerting coverage, so they need the owner's sign-off and a separate code PR.
- **Data-limit impact:** none. It reads repo files and the owner's inputs.
- **Ongoing cost:** **reduces** it. Every check, runbook section and page that never earned its keep in session is proposed for removal, not kept "but not maintained" (E12).
- **Why:**
  - The project is overbuilt (E13). Operations must shrink after the session unless the session proved a need.
  - Real numbers, such as cash per month, pages that mattered and hours spent, are what a partner evaluates (O3, O4), and they replace the inferred cost in D4.
  - Maintain mode is the default W4 outcome (WS8-16). WS5-16 defines it, but needs to know which alerts, runbooks and checks must stay on (O1, O2).
- **Current state (verified 2026-10-06):** not applicable. This WP consumes `docs/ops/log.md`, WS5-13's `docs/evaluation/2027-04-maintenance.md` (merge by 04-17), the WS3 rows that name WS9-14 (`grep -n "WS9-14" docs/program-spec/03-data-accuracy-and-trust.md`, or the same file under `docs/archive/program-spec/` if WS8-16 has moved the spec: WS3-11a's sunset test and two "decided at WS9-14's W4 review" defaults), and the owner's billing-history totals, and the WS9 rows (9.1–9.13) of `DEFERRED.md`.
- **Do:** on or after 2027-04-01.
  1. **Measurements**, as an "Operations" section of 15 lines or fewer appended to `docs/evaluation/2027-04-maintenance.md`. If that file does not exist by 04-17, create `docs/ops/review-2027.md` (40 lines or fewer) instead, and note it for WS5-13. Contents:
     - the number of pages, and how many needed action (precision), from the monthly `check` entries
     - incidents by source, with time to detect where logged
     - monthly cash for Nov–Mar from the owner's billing-history totals, against the D4 band ($55–75 interim, $65–110 session)
     - owner hours: link WS5-13's figures; do not restate them
     - for each daily, weekly and monthly check: whether it ever found something
  2. **WS3 items:** apply WS3-11a's sunset test and resolve the two WS3 rows that defer to this review, citing the data each one names. Write "no data" where it is missing.
  3. **Trim proposal**, one line of evidence each:
     - checks that found nothing, to remove from `session-2027.md`
     - runbook sections never opened, to delete or collapse into a single line in `docs/ops/README.md`
     - pages that never needed action, to demote through a follow-up code PR (blocked until answered)
  4. **Ops floor for maintain mode**, as a list in the PR body and a comment-free table in the measurements section: which alerts still page, which runbook sections stay, and the monthly check in maintain mode. Tell WS5-16 (by its PR or `TRACKER.md` row) to use it.
  5. **Deferred register:** fill the W4 status of WS9's own rows (9.1–9.13) in `DEFERRED.md` only, as `fired (date)`, `not fired` or `revived (WP)`, citing the evidence from step 1 or WS9-11b. Recording a status is not a verdict on the row.
  6. Apply the docs-only cuts in this PR once the owner answers, or after 2027-04-20 by default. Add a `check` entry to the log, and link the section from `docs/ops/README.md`.
- **Don't:**
  - Change alert code in this PR.
  - Add metrics tooling.
  - Write a maintain-mode profile (WS5-16) or restate KPI results (WS7-13).
  - Keep an unused runbook "but not maintained".
- **Acceptance criteria:**
  - [ ] The measurements exist, each filled or marked "not recorded".
  - [ ] The WS3 sunset test and the two WS3 defaults have a recorded result.
  - [ ] The proposed cuts are listed with one line of evidence each, and the docs-only cuts are applied or explicitly declined by the owner.
  - [ ] The ops floor is in the PR body and linked from WS5-16's `TRACKER.md` row or PR.
  - [ ] Every WS9 row in `DEFERRED.md` has a W4 status, and no other workstream's row was changed.
  - [ ] `npm test` passes.
- **Verify:** plain container: `npm test`.
- **Owner actions:**
  - [ ] Pull Nov–Mar charges from each paid vendor's billing history in one sitting, and give totals per month only.
  - [ ] Confirm or decline the cuts by 2027-04-20. Answer the page demotions, and merge the follow-up PR if any.
- **Rollback:** revert.

---

## Deferred

Each row is also in `DEFERRED.md` (rows 9.1–9.13), where WS9-14 records its W4 status.

| Item | Reason | Revisit trigger |
|---|---|---|
| Paid paging service (PagerDuty, Better Stack and similar) | Adds a vendor. Slack per-channel phone notifications plus Sentry email cover a site this size (D7). | WS9-14 shows a missed page that mattered, or a partner requires on-call. |
| Supabase point-in-time recovery add-on | Costs money [verify the price]. Daily backups plus the WS9-11a drill fit the data, most of which can be rebuilt from public sources. | The number of accounts or subscribers passes 500, or a partner requires a stated recovery point. |
| Baseline migration that matches the production schema | Size unknown until WS9-11b counts the drift. It is not a FZ or W3 change. | WS9-11b reports non-zero drift, and the W4 decision is "continue" or "partner". |
| Full account-transfer order (the retired WS9-09 handover runbook) | Speculative until a transfer is chosen. `vendors.md` §Does not transfer and the env catalog hold the time-sensitive facts. | WS8-16 chooses a partner mode that moves accounts. Then write it from `vendors.md` and `env-vars.md`, at 90 lines or fewer. |
| Repository home (personal account vs a GitHub organization) | No user benefit now. A transfer is cheap to do later [verify that secrets need re-entry]. | A partner agreement or LOI; decided in WS8-16. |
| Separate Supabase org for KYvKY | Adds a second Pro bill [verify] (D4). Only needed at transfer. | WS8-16 chooses a partner mode that moves accounts. |
| `.org` rebrand of the canonical host | Large and risky: User-Agents, email identity, auth redirects, SEO (TASKS.md "Owner wishlist, filed 2026-08-31"). WS9-05 gives the trust signal cheaply. | A partner or funder requires `.org` as the primary host. |
| Transfer rehearsal with a real second admin | Needs a partner or a trusted volunteer. | A partner LOI (W5). |
| Font-fallback guard test and Typekit-blocked screenshots | The fallback exists and degrades typography only (D6 re-check). A test and four manual screenshots exceed the risk. | WS6-17b keeps Adobe Fonts and a later CSS change removes the fallback face. Then WS6 adds the guard. |
| Monthly cash ledger and a reminder in the health-check cron | Vendor billing history already holds the charges (WS9-14 pulls them once). A date-triggered post in a cron is a schedule in disguise, to a channel nobody watches (D7). | A partner requires monthly cost reporting. |
| Roster invariant inside the existing source-health evaluation (at most 1 active member per seat, totals within N of 100/38) | WS9-13's queries cover the one seating that matters before 2028, with no new breach kind to tune. | WS9-13 finds a roster defect, or the W4 decision is "continue" with the 2028 election ahead. |
| Reader-report runbook | WS3-14's corrections procedure owns it. `docs/ops/README.md` points there. | WS3-14 is not merged by FZ. |
| An explicit `LEGISCAN_DISABLED` kill switch | `LEGISCAN_MONTHLY_QUERY_LIMIT=1` already works as the brake, and WS9-06a adds disabling workflows and crons. The client refusing to send with an empty key is **not** deferred: WS4-02 step 5 builds it (N3). | The documented brake fails a WS9-06a drill, a WS9-06a stop sends keyless requests, or the WS4-03a review asks for it. |

## Findings re-checked

- **D7: confirmed, but it is mostly configuration, not code.**
  - The code already has a critical tier: `SLACK_WEBHOOK_SUPPORT` through `postToAlertsAndSupport` in `src/lib/slack-webhook.ts` (~64–113). It carries health failures, source breaches, sync crashes and LegiScan quota bands.
  - The gaps are the GitHub backstop run, which does not pass the variable (`source-health.yml` ~57–66), the Sentry bridge, which posts to `#errors` only (`src/app/api/webhooks/sentry/route.ts` ~65–72) and forwards issue alerts only (~134–137), and the fact that no phone is subscribed. Whether `SLACK_WEBHOOK_SUPPORT` is set in Vercel cannot be seen from the repo [verify].
  - The two Sentry rules in `docs/launch-checklist.md` §B are unchecked [verify in Sentry whether they exist].
- **D6 (Adobe Fonts): partly mitigated already.**
  - A size-adjusted Georgia fallback face exists (`src/app/globals.css` ~14–24, `src/lib/theme.ts` ~19; decisions.md § 2026-07-03).
  - A lapsed kit degrades heading typography but does not break pages. The residual risk is brand and licence (transfer), recorded in `vendors.md`. No guard test (Deferred).
- **D6 (`.org` forwarding): confirmed** (TASKS.md ~26, `next.config.ts` ~53–63).
  - Related drift for WS5-04b: `README.md` "Deployment" (~176) says `next.config.ts` redirects the legacy hosts and that the apex 301s, while the config comment says the hosts never reach Next.js and the apex 307s (E12). Whether the `.com` alternates preserve the path is unverified.
- **D6 (scope addition):** Hostinger is a bigger single point of failure than the appendix lists. It holds the DNS zone, the reply-to mailbox and the DKIM record that once went stale (`docs/launch-checklist.md` §A ~40, ~63). WS9-02 checks renewals, WS9-08 records it, and WS9-06b's email section covers the DKIM failure.
- **D4: confirmed [V] for plans; the cash-cost sentence is [I].** Billing is not visible from the repo. `/about` states about $1,000 a year (TASKS.md ~237). WS9-14 replaces the estimate with Nov–Mar billing-history totals.
- **E14: confirmed.**
  - `process.env.X` gives exactly 75 distinct names, 21 of them absent from `env-template.txt`. Dynamic reads in four files add more.
  - LegiScan key ownership is owned by WS4-04, and the Routines by WS5-07. WS9 does not duplicate them.
- **D1 (stop path): the existing "remove the key" advice is wrong.** `KyLegiScanClient` warns and keeps sending keyless requests with retries (`src/lib/ky-legiscan-client.ts` ~129–130, ~166–189). The brake that reaches every scheduler is `LEGISCAN_MONTHLY_QUERY_LIMIT` (all six key-holding workflows pass `vars.LEGISCAN_MONTHLY_QUERY_LIMIT`); `LEGISCAN_SYNC_QUOTA_STOP_PCT` is passed by no workflow. WS9-06a is written to this. WS4-01 points its immediate stop at the runbook's steps (a)–(c), and WS4-02 step 5 makes the client refuse an empty key (N3).
- **E2 (schedule drift), for WS4-11:** `MONITORED_SOURCES.dataset` in `src/lib/source-health.ts` (~86) says `'0 8 * * 0,3'`, while `legiscan-dataset-weekly.yml` runs at `'0 11 * * 0'` (~41) and `'0 11 * * 3'` (~47). Runbooks quote schedules from `vercel.json` and the workflows, never from `MONITORED_SOURCES`.
- **Session readiness (seed: "2027 session already scheduled in PR #287"): confirmed.**
  - `src/lib/ky-sessions.ts` (~62–77) carries the 2027 RS. It arrived through commit `03ee994`, merged as `a420522` (PR #287).
  - `vetoRecessEnd: '2027-03-25'` is the reconvene day, and `getSessionPhase` treats it as exclusive, the same convention as 2026.
- **Gap found:** no workstream checked the January 2027 seating of members elected on 2026-11-03. WS9-13 adds the check, with a query that also finds empty seats. The district-based subscriptions in WS7 already account for it.
