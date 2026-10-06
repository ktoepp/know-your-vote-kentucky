# KYvKY program spec (2026-10 → 2027-04)

Know Your Vote Kentucky (KYvKY, www.kyvky.com) is a free, neutral website about the Kentucky General Assembly: bills with AI plain-language summaries, roll-call votes, legislators, a district map, committee meetings, and bill follows with an email digest. One person runs it, and AI coding agents built most of it.

**The honest state on 2026-10-06** ([Appendix A](appendix-a-findings.md)). Reach is real and return visits are not: about 2,400 human visitors since June, about 40% from Kentucky, mostly from search (T1, T4), a week-1 return of 1.4% (T2), 16 accounts and a digest that reaches about one person a month (T3). Visitors do one thing, look up their legislators (T5). The project is overbuilt for that audience: about 78k lines of code (E1), 18 cron lines plus 2 daily Claude Code Routines (E2), about 635 KB of process logs (E12), 25–45 owner hours a month of upkeep [I] (E13) and no check before merge (E8). Readers can see trust defects: member profiles mislabel ordinary votes (U1), and AI summaries are written without the bill text (A1, A2). Two security items need hardening (S3, S4; details in the owner's private security note). Two deadlines are close: Next.js 15 end of support around 10-21 (S1) and LegiScan's enforced 10,000-query monthly cap from 11-01 (D1). No single feature is unique (C1); the niche is a neutral, Kentucky-only layer linking each bill to every roll call, to *your* legislators and to committee agendas, and the likely future is distribution through a larger organization such as a Kentucky newsroom or CalMatters Digital Democracy (C2, C7).

**Direction.** Harden and simplify the site, fix what readers can see is wrong, put the data limits into code, run the 2027 Regular Session as the first measured test against thresholds set in advance, and stay partner-ready. In April 2027 the owner decides: go, partner or maintain. This serves the owner's goals: a long-term project (O1) that respects data limits (O2), is ready to partner or merge (O3), and is a record of rigor (O4).

**This spec is a snapshot,** synthesized 2026-10-06 against `main` @ `a4e543a`. It is large: about 199k words and 1.3 MB on 2026-10-06, about twice the 636 KB of `TASKS.md` plus `decisions.md` it replaces (E12). The 2026-10-06 final pass applied the amendments and cut this README to about 3.6k words, but it did not shrink the workstream files (`01`–`09`, about 170k words), and the size problem is not solved. It is accepted for this snapshot only because each WP is written to run cold, so an agent reads one WP, the owner reads only this page, [TRACKER.md](TRACKER.md) and [OWNER-DECISIONS.md](OWNER-DECISIONS.md), and WS5-15 freezes the workstream files at zero growth. If Backlog bodies prove too costly to keep current, the owner may collapse them to Why, Current-state pointers and Acceptance. The program commits only to what one reviewer can merge: a **Core** of 45 WPs. The other 122 are **Backlog**. After the W4 decision, WS8-16 (step 4) moves this folder to `docs/archive/program-spec/`, and new work is specified only in ADRs and `CURRENT.md`.

## How to use this spec

| Reader | Read |
|---|---|
| **Agent executing a WP** | This README; your WP's row in [TRACKER.md](TRACKER.md) (and its retired-ID map); [the operating manual](00-agent-operating-manual.md) in full; your whole WP and its workstream intro; its findings in [Appendix A](appendix-a-findings.md) with errata N1–N5; `CLAUDE.md` and the voice guide; the files under **Current state**. |
| **Owner** | [OWNER-DECISIONS.md](OWNER-DECISIONS.md) every Monday until 12-14, and the Core table below. |
| **Partner or funder** | This page, then [DEFERRED.md](DEFERRED.md) (what is deliberately not done), [Appendix A](appendix-a-findings.md) and [`08-partner-readiness.md`](08-partner-readiness.md). |

**Before the first WP:** the owner merges this spec folder to `main`. Agents branch from `main` and edit their `TRACKER.md` row there (manual §2, §8).

**Kickoff prompt:** the template in [manual §10](00-agent-operating-manual.md#10-kickoff-prompt-template), with the budget from the WP's **Data-limit impact** field.

**Precedence.** Manual §4 (data limits) and §5 (production safety) override everything. A WP's text overrides the manual's defaults. The WP file wins over TRACKER.md and OWNER-DECISIONS.md; note any mismatch under "Found, not fixed". The window calendar is manual §2; if this page differs, stop and ask (manual §9).

## Principles

1. **Trust before features.** A wrong vote label costs more than any missing feature (U1, A2, C4). If the data cannot support a statement, show less and name the source.
2. **Data budgets are hard limits, enforced in code** (D1, D3, A8). Agents spend nothing a WP did not budget (manual §4).
3. **Delete before adding.** No new schedule, vendor, dashboard or process unless it replaces one (E2, E3, E5).
4. **One WP, one PR, owner-merged.** Agents open draft PRs. The owner merges, deploys, spends and touches production (manual §5).
5. **Measure honestly and register in advance.** KPIs are defined once, filtered (T6, T10). April thresholds are fixed by 12-14 (WS8-08).
6. **Partner-ready by default; integrations only on a written partner request** (C1, C3).
7. **Commit only what can be reviewed, and let the calendar win.** Core first, at about 4–5 agent PRs a week. Backlog needs an owner go-ahead. Work that misses its window goes to `DEFERRED.md`, never into FZ or W3.
8. **No second state, no Push API, no native app** ([DEFERRED.md](DEFERRED.md) §1).

## The Core program by window

Windows (manual §2, dates inclusive): **W0** 10-06 → 10-20; **W1** 10-21 → 11-03 (election 11-03); **election freeze** 10-31 → 11-05 (P0 fixes and docs/test-only PRs); **W2** 11-04 (code from 11-06) → 12-14, cut line **12-07**; **FZ** 12-15 → 01-04; **W3** session 01-05 → 03-30; **W4** April 2027; **W5** set by WS8-16.

"Owner step": **Owner WP** (the owner does the work), a decision, a pre-merge step, or a production check or count. Each WP's Owner actions list is authoritative.

### W0 (now → 10-20): 24 WPs, 21 agent and 3 Owner

Agents work these in the W0 queue order in [manual §2](00-agent-operating-manual.md#2-picking-up-a-wp).

| ID | Title | Tier | Owner step |
|---|---|---|---|
| WS1-01 | Restore the missing dataset-store import in two backfill scripts | Sonnet | none |
| WS1-02 | Type-check `scripts/` with its own tsconfig and clear the errors | Sonnet | none |
| WS1-03 | Replace `next lint` with the ESLint CLI and a warning ceiling | Sonnet | none |
| WS1-04 | Add a secret-free pull-request CI workflow and align the PR template | Sonnet | decision (default now) |
| WS1-05a | Assert that LegiScan `getDataset` is reached only through the gated store | Sonnet | none |
| WS2-01 | Patch Next.js 15 and clear production dependency advisories | Sonnet | check |
| WS2-02 | Harden admin-route access control and consolidate six bearer-token checks into one constant-time guard | Opus | pre-merge |
| WS2-03 | Harden the post-signup session flow (owner decision) | Opus | decision 10-13; pre-merge |
| WS2-05 | Remove personal data from FEEDBACK.md and block its return | Sonnet | decisions 10-13; pre-merge |
| WS3-01 | Extract roll-call labelling into a tested library | Sonnet | check |
| WS3-02 | Show derived vote labels on member profiles | Sonnet | check |
| WS3-03a | Label unmatched roll calls honestly and fix the outcome chip | Sonnet | decision 10-13 |
| WS3-04 | State what each AI summary was built from and gate the audience clause | Sonnet | decisions 10-13 |
| WS3-05a | Say that a ZIP result is based on the ZIP's center | Sonnet | check |
| WS4-01 | Publish one data budget and remove stale 30k quota references | Sonnet | check |
| WS4-02 | Count every LegiScan attempt and stop retrying rejected requests | Opus | check |
| WS4-04 | Confirm LegiScan key ownership and adopt the budget and paid-tier trigger | Owner | **Owner WP**, by 10-20 |
| WS7-01 | Define the KPIs once, record a filtered baseline, and close the Tier-1 handoff | Sonnet | decision 10-13 |
| WS7-03 | Correct funder-facing figures before the NLnet deadline | Owner | **Owner WP**, before 11-03 |
| WS7-06 | Stop the underpowered PMF survey and close the intent survey | Owner | **Owner WP** |
| WS7-07a | Fix the account data export | Sonnet | check |
| WS9-01 | Route every page-worthy alert to one channel and add an off-Vercel site check | Sonnet | decision 10-12 |
| WS9-03 | Publish the release calendar, the election freeze and the deploy checklist | Sonnet | decision 10-17 |
| WS9-06a | Write the LegiScan quota and ban-risk runbook before enforcement | Opus | read |

### W1 (10-21 → 11-03): 1 WP

| ID | Title | Tier | Owner step |
|---|---|---|---|
| WS9-04 | Start `docs/ops/log.md` and cap the ops docs with a test | Sonnet | none |

### W2 (11-06 → 12-14): 16 WPs

| ID | Title | Tier | Owner step |
|---|---|---|---|
| WS2-11a | Declare React 19 in package.json and fix type fallout | Opus | check |
| WS2-11c | Upgrade to Next 16, bump @mui/material-nextjs, rename middleware to proxy | Opus | check |
| WS4-03a | Charge every LegiScan call to a per-run budget and deny unbudgeted processes | Opus | pre-merge |
| WS4-06 | Make the hash-gated bills sync resumable, then turn on its run cap | Opus | check |
| WS7-07b | Separate email kinds, record complaints, and trim the mail log | Opus | migration before merge |
| WS7-08 | Map every April decision metric to one KPI and write the measurement protocol | Sonnet | decision; bet status 12-07 |
| WS7-09a | Store a subscriber's districts and weekly opt-in | Opus | migration before merge |
| WS7-09b | Build the My Legislators email from a pure builder and template | Opus | copy review |
| WS7-09e | Load the email's input in one pass per run | Opus | none |
| WS7-09c | Send the weekly email from the notify cron under a daily send budget | Opus | check |
| WS7-09d | Offer the weekly email to signed-in visitors after a lookup and in preferences | Sonnet | copy review |
| WS7-14 | Record the October and election-period readout for the partner brief | Sonnet | counts |
| WS8-08 | Pre-register the April thresholds and verdict rules, and map verdicts to the five options | Sonnet | decision 12-14 |
| WS9-06b | Write one runbook file for LRC, Open States, Supabase and email | Opus | check |
| WS9-08 | Inventory vendors, list what does not transfer, and define the one monthly check | Sonnet | fill cells; monthly check |
| WS9-10 | Write the 2027 session runbook: go/no-go list, key dates, daily and weekly checks | Sonnet | read |

### FZ (12-15 → 01-04): 2 WPs

| ID | Title | Tier | Owner step |
|---|---|---|---|
| WS7-11 | Run the pre-session measurement and email readiness drill | Sonnet | drill; email go-live 01-05 |
| WS9-13 | Verify the roster after the newly elected members are seated | Owner | **Owner WP**, 01-02 → 01-08 |

### W3 (01-05 → 03-30): 1 WP; W4 (April): 1 WP; W5

| ID | Title | Tier | Owner step |
|---|---|---|---|
| WS7-12 | Record the in-session monthly readouts (about 2 small PRs) | Sonnet | counts |
| WS7-13 | Fill measured values for the April decision (by 04-15) | Sonnet | counts |

**W4 promotions expected:** WS5-13 (maintenance hours), WS5-16 (maintain-mode profile), WS8-16 (the decision, Owner). If they are not promoted, WS8-16's default applies: maintain mode by 04-30.

**W5:** not yet chosen. WS8-16 updates this line with the chosen path.

**Core totals:** 45 WPs (41 agent, 4 Owner). By window: W0 24, W1 1, W2 16, FZ 2, W3 1, W4 1. By tier: Sonnet 27, Opus 14, Owner 4.

### How the Core was chosen

1. **P0 closure (32 WPs).** Every non-trigger P0 and its hard dependencies (WS1-03 for WS2-11c; WS9-01, WS9-03, WS9-04, WS9-06b, WS9-08 and WS9-10 for WS9-13).
2. **Measurement spine (8).** WS7-06, WS7-07b, WS7-08, WS7-14, WS7-11, WS7-12, WS7-13 and WS8-08: KPIs, the 12-14 pre-registration, the pre-session drill, monthly readouts and measured values by 04-15.
3. **Retention test (5).** WS7-09a, 09b, 09e, 09c and 09d, the minimum WS7's 12-07 cut line counts as "shipped". No new cron (it rides `/api/cron/notify`), zero LegiScan, LRC or Anthropic calls, within Resend's 70-a-day budget plus a 30 reserve, `MY_LEGISLATORS_SEND` as kill switch and allowlist, districts resolved at send time. WS7-09f (signed-out path) stays Backlog because it needs WS6-12a, so the email ships to signed-in visitors only (recorded by WS7-08).

**Trade-off.** To hold 45, the April trio (WS5-13, WS5-16, WS8-16) are W4 promotions; April has room. Without WS5-13, R2(d) owner hours are unmeasured, so R2 can hold only through its "partner conversation open" branch. If the owner prefers the trio now, it swaps back in place of the email chain: 2 slots free up and R2(c) becomes `not measured (deferred)`.

**WS5-12a swap rule.** WS5-12a is "P0 if triggered". If the owner's 10-13 query triggers it, or its 10-16 default applies, it enters Core as a P0, and WS7-13 moves to the April promotions (WS7-12's readouts already hold the numbers).

### Critical paths

1. **Platform (S1):** WS1-04 (target 10-12) → WS2-01 (before ~10-21) → WS2-11a (11-20) → WS2-11c (opens 11-21, merges by 12-01 or stops and production stays on 15.5.x; also needs WS2-02 and WS1-03). While WS2-11c is open, no other PR edits `src/middleware.ts`/`src/proxy.ts`, `next.config.ts` or the `next`/`react` lines of `package.json` (02 §W2 platform sequence).
2. **LegiScan safety (D1):** WS4-01 → WS4-04 (Owner, 10-20); WS4-02 and WS9-06a before 11-01 → WS4-03a (11-13) → WS4-06 (11-27). The two LegiScan-spending backfill workflows stay disabled from WS4-04 until WS4-03a merges.
3. **Trust (U1, A2):** WS3-01 → WS3-02 and WS3-03a; WS3-04 and WS3-05a in parallel; all W0.
4. **Retention test (C5, T2):** WS7-07a → WS7-07b; WS7-09a (owner migration before merge) and WS7-09b (after WS3-01/02) → WS7-09e → WS7-09c; WS7-09d after WS7-09a. **Cut line 12-07:** WS7-09c and WS7-09d both merged, or the email is deferred to W5. Then the WS7-11 drill and the first sends on 2027-01-05.
5. **Decision (C7, O4):** WS7-01 → WS7-03 (Owner, before 11-03) and WS7-14 (11-10); WS7-01 → WS7-08 (12-07) → WS8-08 (12-14) → WS7-11 → WS7-12 → WS7-13 (04-15) → WS8-16 (04-30).
6. **Operations:** WS9-01 and WS9-03 → WS9-04 → WS9-06b and WS9-08 → WS9-10 → WS9-13 (Owner, 01-02 → 01-08).

### Capacity

One reviewer merges about **4–5 agent PRs a week**, roughly 40–50 before the 12-15 freeze.

- **Before 12-15:** 38 agent PRs plus 3 owner actions (WS4-04, WS7-03, WS7-06), about 41 review units against the 40–50 envelope.
- **W0 is overloaded:** 21 agent PRs against about 8–10 review slots by 10-20. Planned spill (owner to confirm):
  - Code P0s merge through 10-30 (manual §2 grace and P0 rules).
  - Docs and test-only PRs (WS7-01, WS1-05a, WS9-03, WS9-04) may merge in the 10-31 → 11-05 freeze. WS9-06a still lands before 11-01.
  - WS1-03 and WS1-02 slide to early W2. WS1-03 is needed only before WS2-11c opens (about 11-21).
- **W2 after the spill:** about 19 PRs against 22–27 slots, leaving 3–8 for promotions.

**Promotion order for spare slots** (each needs the owner's go-ahead):

1. Owner toggles, no PR, recommended before 10-20: WS2-15 (2FA), WS1-07 (GitHub ruleset and security alerts), WS9-02 (phone paging).
2. WS6-03 (stop probing the LRC site on every bill page view).
3. WS9-12 (session go/no-go).
4. W4: WS5-13, then WS5-16, then WS8-16.
5. The partner package: WS5-04a, WS8-10, WS8-11.

## The Backlog

The other **122 WPs** are fully specified and listed in [TRACKER.md](TRACKER.md) as `Backlog`. An agent picks one up only when the Core WPs in its window are merged or blocked, or its trigger fires, and only with the owner's go-ahead linked in the PR. It re-verifies the Current state first. A Backlog WP that misses its window becomes `deferred`, with a row in [DEFERRED.md](DEFERRED.md) (manual §2).

## The April 2027 decision

WS8-08 owns the thresholds and rules, pre-registered in `docs/evaluation/README.md` by **12-14**. The numbers below are its **proposed defaults**, owner-adjustable until 12-14 and changed after 2027-01-05 only by ADR. WS7-08 defines the measurements, WS7-13 fills them by 04-15 without a verdict, and WS8-16 applies the rules by **04-30**. Full detail lives in WS8-08 and WS8-16.

Rules apply in order; the first that holds is the verdict.

- **R1 Partner:** on 04-15, at least 1 organization at `written interest` or `pilot` (WS8-11 counts). Baseline 0.
- **R2 Loop works:** all four hold. (a) Week-1 return over the session cohorts ≥ 5% (baseline 1.4%, T2). (b) Median weekly Kentucky human visitors in session ≥ 150 (September 83–104, T1). (c) Weekly-email subscribers on 03-30 ≥ 20, or `not measured (deferred)` and left out if the email was deferred at 12-07. (d) In-session owner hours ≤ 45 a month (WS5-13), or a partner conversation is open on 04-30. Any other unmeasured gating input makes its rule "not met".
- **R3 Maintain:** neither holds.

Verdicts map to the five C7 options (WS8-08): Partner → a Digital Democracy or newsroom partnership; Loop works → continue while seeking distribution; Maintain → syncs and fixes only, a 2028 session check, no new features (WS5-16). The owner may record disagreement but cannot change the mechanical verdict. **If no decision is recorded by 04-30, maintain mode applies.**

## Program budgets

Source: `docs/data-budget.md` (WS4-01), accepted under WS4-04's default on 10-20.

| Resource | Vendor limit | Program limit | Enforced by |
|---|---|---|---|
| **LegiScan** | 10,000 queries/month from 11-01; one key | Plan 5,000/month (Aug used 1,165, Sep 947); no run takes the month above 6,000; ≤ 1,000 per WP without owner approval; per-run caps, other callers 0 without `--budget=N`; agents 0 in W3. Paid tier only if a month passes 5,000 by the 15th | WS4-02, WS4-03a, WS4-06, WS9-06a |
| **Open States** | none published [verify] | about 6 calls a day; no retry loop without backoff and a maximum | manual §4 |
| **Kentucky LRC site** | public site, no API | serial, at most 1 request/s per host, contact in User-Agent, no new crawl targets | manual §4; WS4-09a (Backlog) |
| **Anthropic** | pay as you go | $40/month Console limit; about $0.006 per bill; every run takes `--limit` and `--max-usd`; agents never launch backfills | WS4-04; WS4-07 sets it |
| **Resend** | free tier, about 100/day | 70 logged sends a day plus a reserve of 30; upgrade only above about 2,500/month; agents never send | WS7-09c |
| **Cash** | n/a | about $700–1,100 a year [I] (D4). The program adds no recurring cash by default | WS9-08 monthly check |
| **Owner hours** | n/a | baseline 25–45 h/month [I] (E13); Core review about 41 units before 12-15, roughly 14–21 h [I]; W4 gate ≤ 45 h/month in session; aim after W4 ≤ ~20 h/month [I] | WS9-08; WS5-13 (promotion) |

**Net change.** Core adds no schedule, cron, vendor or recurring cost: only a PR-triggered CI workflow, an off-Vercel check inside the existing `source-health.yml` run or Sentry Uptime (WS9-01), two migrations (WS7-07b, WS7-09a) and the `MY_LEGISLATORS_SEND` flag. The reductions are Backlog: cron lines 18 → 16 (WS4-12, WS4-13), Routines 2 → 0 (WS5-07), at least 11,000 net lines deleted from `src/` (WS5-02), one fewer vendor (WS2-09a), npm aliases 86 → ≤ 40 (WS5-01a/b) and the ceilings (WS5-15).

## Next 10 owner decisions

All Core. The full calendar, including Backlog rows, is in [OWNER-DECISIONS.md](OWNER-DECISIONS.md).

| By | WP | Decision | Default if unanswered |
|---|---|---|---|
| now | WS1-04 | Node version in CI; run `next build` in CI | `'24'`; separate build job |
| now | WS2-02 | Admin access method | header only |
| 10-12 | WS9-01 | Off-Vercel site check | daily check in `source-health.yml` |
| 10-13 | WS2-03 | How to harden the post-signup session flow | the private note's recommended option |
| 10-13 | WS2-05 | `FEEDBACK.md` history; outreach notes | HEAD only; move outreach notes out |
| 10-13 | WS3-03a | Roll-call outcome chip | show "failed" only |
| 10-13 | WS3-04 | Changed-bill summaries; "who it may affect" clause | caveat; hide the clause at render |
| 10-13 | WS7-01, WS7-06 | Headline reach figure; PMF survey | both figures, KY first; stop the survey |
| 10-17 | WS9-03 | Election freeze | P0 only, plus docs/test-only PRs |
| 10-20 | WS4-04, WS7-03 | Data budget, paid-tier trigger, User-Agent contact; the NLnet ask | PROPOSED budget, keep the trigger, `katie@kyvky.com`; **no default for the ask** |

## Files

| File | What it holds |
|---|---|
| `README.md` | This front door. |
| [TRACKER.md](TRACKER.md) | Every WP with Class and status; the retired-ID map. |
| [OWNER-DECISIONS.md](OWNER-DECISIONS.md) | Decision calendar and owner-only actions. |
| [DEFERRED.md](DEFERRED.md) | "Not doing" and the Deferred register with W4 status. |
| [`00-agent-operating-manual.md`](00-agent-operating-manual.md) | Agent rules: windows and W0 queue, Core vs Backlog, routing, data limits, production safety, verification, kickoff prompt. |
| [`01-quality-gates.md`](01-quality-gates.md) | WS1 (13 WPs, 5 Core): CI, type-checks, lint, tests. |
| [`02-security-and-platform.md`](02-security-and-platform.md) | WS2 (19, 6 Core): Next 15 → 16, admin-route and post-signup hardening, personal data, grants, CORS, CSP. |
| [`03-data-accuracy-and-trust.md`](03-data-accuracy-and-trust.md) | WS3 (23, 5 Core): vote labels, summary provenance and grounding, corrections. |
| [`04-data-limits-and-source-resilience.md`](04-data-limits-and-source-resilience.md) | WS4 (17, 5 Core): data budget, LegiScan run budgets, LRC politeness, schedules. |
| [`05-simplification.md`](05-simplification.md) | WS5 (18, 0 Core): deletions, frozen logs, ceilings, maintain mode. |
| [`06-product-and-ux.md`](06-product-and-ux.md) | WS6 (24, 0 Core): home, bill and member pages, accessibility, email-link login. |
| [`07-retention-and-measurement.md`](07-retention-and-measurement.md) | WS7 (21, 15 Core): KPIs, measurement protocol, the weekly email, readouts. |
| [`08-partner-readiness.md`](08-partner-readiness.md) | WS8 (17, 1 Core): data rights, April rules, partner brief and outreach, the decision. |
| [`09-operations-and-session-readiness.md`](09-operations-and-session-readiness.md) | WS9 (15, 8 Core): paging, election freeze, runbooks, vendors, go/no-go, roster check. |
| [`appendix-a-findings.md`](appendix-a-findings.md) | Findings T, E, A, S, D, U, C, O and errata N1–N5. |
