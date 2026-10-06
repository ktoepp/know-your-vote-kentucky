# WS5 — Simplification & maintenance reduction

## Purpose

KYvKY is a small civic site with a big codebase. On 2026-10-06 it had:

- about 68k lines in `src/` and 9.7k in `scripts/`
- 86 npm scripts
- two CSS systems and two icon sets
- a public design-system page
- parked local-government code
- about 636 KB of process docs that every agent is told to read first

(E1, E3, E4, E12.) That weight costs an estimated 25–45 owner hours a month between sessions, and most recent pull requests were plumbing rather than user-visible work (E5, E13).

This workstream makes the project cheaper to keep alive (O1) and easier for a partner to evaluate (O3, O4). It:

- deletes what nothing uses
- freezes the process docs behind a short current-state page and ADRs
- makes the README tell the truth
- caps what may grow back
- measures the maintenance share, so the April 2027 decision rests on numbers
- writes down what "maintain mode" would switch off

It also puts tests under the riskiest untested logic before anyone refactors it (E10). Every WP removes, consolidates or caps something. The only additions are a few guard tests, one current-state page, a short ADR folder, and two W4 documents that feed the evaluation.

**Owned findings:** E1, E3, E4, E5, E10, E12, E13, U18, and erratum N2. Each is addressed by a WP below or deferred in [Deferred](#deferred) with a reason.

**Program class:** 0 of this file's 18 WPs are Core; all 18 are **Backlog**. They are picked up only after the Core WPs in their window are done, or when their trigger fires (WS5-12a), with the owner's go-ahead and a fresh Current-state check. See [Program ledger and cut line](#program-ledger-and-cut-line) for the suggested pickup order.

**IDs and status.** Older references to WS5-01, -03, -04, -12, -06b, -11 and -14a/b map to current IDs in the retired-ID map in [TRACKER.md](TRACKER.md). WP status lives in TRACKER.md. A WP also counts as `done` when a merged PR's title starts with its ID: `gh pr list --state merged --search "<WP-ID> in:title"`.

### Definition of done (measured by WS5-13 in W4; each item objectively checkable)

1. **No orphan code.** The orphan check passes (WS5-02): either a `describe` block in `src/lib/repo-invariants.test.ts` (WS1-05a) or `src/lib/repo-orphans.test.ts`. Every non-entry file under `src/` is imported by something, except files on its allowlist, and each allowlist entry names its owner WP. WS5 PRs delete at least 11,000 lines from `src/` net (`git diff --shortstat` summed over WS5 PRs).
2. **Parked code is gone.** WS5-06a's grep prints nothing in `src/` or `scripts/`. That grep looks for `legistar`, `ExecutiveOrder`, `SchoolBoard`, `CountyAction`, `KYOrdinance` and the four table names. `src/lib/source-health.ts` keeps its kebab-case `UNMONITORED_SOURCES` keys, because the four tables and their `ky_sources` rows stay (see Deferred).
3. **Fewer scripts.**
   - Of the 86 npm aliases that existed on 2026-10-06, at most 40 remain (WS5-01b keep-set: 37, or 39 while the triage aliases exist).
   - Aliases added later by a merged WP are exempt and listed in `scripts/README.md`.
   - Every alias points at a file that exists, and every `npm run X` in `.github/workflows/` exists.
   - Each file in `scripts/` is listed in `scripts/README.md`.
4. **Fewer production dependencies.**
   - `openai` is gone.
   - `dotenv`, `autoprefixer` and `postcss` are not in `dependencies`.
   - If WS5-10 merged, `tailwindcss` and `@tailwindcss/postcss` are gone.
   - `react-email` stays, with an ADR recording that its CLI dependencies are installed but not reachable from app code (WS5-08).
   - `npm ls --omit=dev --all --parseable | wc -l` is lower than the 2026-10-06 baseline of 495.
5. **Process docs are frozen and capped.**
   - `TASKS.md` and `decisions.md` are frozen behind a hash test.
   - New decisions go to `docs/adr/`.
   - `CURRENT.md` is ≤ 150 lines and `README.md` is ≤ 130 lines. The README contains no claim that WS5-04b's checks flag, and it does not tell agents to read the frozen files.
   - The combined bytes of `CURRENT.md`, `docs/adr/`, the front-door files (`docs/program-spec/README.md`, `TRACKER.md`, `OWNER-DECISIONS.md`, `DEFERRED.md`) and `00-agent-operating-manual.md` stay under the process-doc ceiling set by WS5-15.
   - The workstream files `01`–`09` and `appendix-a-findings.md` do not grow past their size after the 2026-10-06 final pass (zero growth, WS5-15). Corrections are made in place without growing the total. After the W4 decision the folder moves to `docs/archive/program-spec/` (WS8-16).
6. **One fewer LLM loop.** `scripts/triage-findings.ts` and its two workflow steps are removed (WS5-07). Whether the two Claude Code Routines are disabled is recorded in `CURRENT.md`.
7. **Name matching is pinned.**
   - `src/lib/ky-legislator-matching.test.ts` holds at least 30 assertions over the functions that link legislators across LegiScan, Open States, LRC and sponsor strings (WS5-12b).
   - The one-element-roster surname case is either fixed (WS5-12a) or pinned as a KNOWN RISK, with the owner's aggregate check recorded.
8. **Simplicity is enforced.** ADR "One in, one out" exists. Ceiling tests fail if any of these grows without a new ADR (WS5-15): the production dependency count, the npm alias count, the schedule count, the number of files that call Anthropic, the process-doc byte total, or the program-spec byte total (zero growth after synthesis).
9. **Maintenance is measured.** `CURRENT.md` holds the 2026-10-06 baseline and the commands. `docs/evaluation/2027-04-maintenance.md` holds the W4 numbers (WS5-05, WS5-13):
   - owner hours per month (primary)
   - merged-PR share by type (secondary)
   - a keep / slim / cut verdict for each plumbing subsystem
10. **Maintain mode is defined.** `docs/evaluation/maintain-mode.md` lists every schedule, LLM loop and outbound email path, plus one dependency- and framework-currency row, with its maintain-mode state and cost (WS5-16).

### Interfaces with other workstreams

| This WS changes or needs | Other side | Note |
|---|---|---|
| WS5-01a archives one-off scripts (W0) | E8/E9 (WS1-01, WS1-02), D1 (WS4-03b), D3 (WS4-09a), WS9-07 env catalog | WS1-02 and WS4-03b do **not** wait for WS5-01a (both dependencies are soft). WS1-02 fixes `backfill-interim-calendar-2026.ts` if it still exists. WS4-03b (W2) skips archived files. Their references to these files do **not** block the archive. WS5-01a keeps `backfill-session-votes.ts` and `backfill-bill-history-from-datasets.ts` (WS1-01). |
| WS5-01b cuts aliases (W2) | WS1 (`typecheck`, `typecheck:scripts`, `check`), WS4-11 (`schedules`), WS3 (`summaries:suppress`, `spike:bill-text`) | Aliases added by merged WPs are exempt from the cap and listed in `scripts/README.md`. Runbooks (WS9-06a/b) cite only aliases that exist on `main` when their PR opens. |
| WS5-02 deletes never-imported files (W1, by 10-30) | S9 (WS2-04, already P2/W1 and depending on WS5-02), S7 (WS2-10), S5 (WS2-07), WS9-07 | **The minimap is not rendered anywhere.** WS5-02 deletes it by default; WS2-04 is a guard test for live surfaces. WS5-02's steps cover the WS2-10 (`supabaseAdmin.ts`), WS2-07 (`ky-intelligence.ts`, `anthropic-cache.ts`) and WS9-07 (env rows) cases. |
| WS5-03a freezes `TASKS.md` and `decisions.md` (W0) | Every WP with a "decision note" step (WS2-01, WS2-14, WS3, WS4-15/16, WS8-08/16). WS7-01 (`TASKS.md` dispositions). WS9-04 (manual §8, `docs/ops/log.md`). | WS5-03a's precedence rule in manual §8 turns a "decision note" into the next `docs/adr/NNNN-*.md` and a `TASKS.md` check-off into a closure in `CURRENT.md` or the PR body. Operational events go to `docs/ops/log.md` (WS9-04). WS9-04 and WS5-03a both edit manual §8; the second to merge keeps both sentences. |
| WS5-04a fixes README line 17 and the special-session copy (W0) | WS4-01 (README lines 74, 162), WS1-04 (README line 68), WS3 (session copy, U18-type facts) | Different lines; whichever merges second rebases. WS5-04a carries the special-session finding. |
| WS5-04b rewrites the README (W2) | E2 (WS4-11), D1 (WS4-01), S5 (WS2-07), S3 (WS2-02), WS8-07b, WS8-09 | WS5-04b drops the hand-kept sync table, the 30k lines and the `/api/intelligence` rows. It links WS8-07b's `/methodology` page if it has merged, and keeps the `CONTRIBUTING.md` / `SECURITY.md` links WS8-09 adds. |
| WS5-05 adds a PR "Type" line and baseline | E8 (WS1-04 owns the PR template), WS9-08 (the one monthly check), WS9-04 (`docs/ops/log.md`) | It adds **no** second monthly ritual. The label count and the owner's hours estimate go into the single monthly check (WS9-08 §Monthly check) and its `check` entry in `docs/ops/log.md`. |
| WS5-06a edits `ky-sync-pipeline.ts` and `ky-content-generation.ts` (W2, by 11-14) | D1 (WS4-06, WS4-13), A1 (WS3-04 in W0, WS3-09b in W2) | WS5-06a's diff is deletions only. Core work never waits for it: whichever merges second rebases. |
| WS5-07 removes the triage step (W1); the owner disables the Routines | WS9-01/02 (paging replaces "someone is watching"), WS9-01 also edits `source-health.yml`, WS4-11 (does not list Routines), WS3 (no review queue any more) | The owner disables Routines only after WS9-02 is confirmed. The Routines' status lives in `CURRENT.md`. Whichever of WS5-07 and WS9-01 merges second rebases. |
| WS5-08 moves deps to dev and records `react-email` reachability | S2 (WS2-01, WS2-14), E7 (WS1-12) | WS2-14 lists the `react-email` → socket.io advisory as "installed, not reachable" with a link to WS5-08's ADR. WS1-12's email tests must pass unchanged. |
| WS5-08 and WS5-10 change `package.json` and the CSS toolchain | S1 platform sequence (WS2-11a target 11-20; WS2-11c opens by 11-21) | Both merge before WS2-11c opens. WS5-10 has a hard merge-by date of **11-14**, otherwise it moves to Deferred (W5). |
| WS5-12a/b name matching | E10; WS9-13 (roster check after seating), WS1-15 (district lookup tests, not matching) | Matching fixes belong to WS5. WS9-13 only verifies production. |
| WS5-13 writes `docs/evaluation/2027-04-maintenance.md` | WS8-08 (defines the path and holds the owner-hours threshold), WS7-08/13 (hours as the "Cost" input), WS8-14a (evidence pack), WS9-14 (ops review), `DEFERRED.md` | Path fixed by WS8-08. WS5-13 fills the W4 status of the WS5 rows in `DEFERRED.md`. |
| WS5-15 ceilings | WS1-05a (`repo-invariants.test.ts`), WS4-11 (schedule registry), WS9-04 (ops-docs line cap), WS9-07 (env catalog drift test), WS8-16 (moves the spec to `docs/archive/`), the front-door files (`README.md`, `TRACKER.md`, `OWNER-DECISIONS.md`, `DEFERRED.md`) | WS5-15 does not re-cap `docs/ops/` (WS9-04 does) or env vars (WS9-07 does). Its ADR states the rule for both. Files `01`–`09` and the appendix are fixed at their post-synthesis size. The front-door files and the manual change over time and count as process docs. |
| WS5-16 maintain-mode profile | WS8-08 (defines maintain mode in one sentence), WS8-16 (default outcome is maintain mode), WS4-11, WS9-14, WS9-08 (quarterly currency line), WS1-07 (Dependabot alerts and security updates), WS2 Deferred (MUI v5 triggers), `DEFERRED.md` | WS8-16 reads WS5-16 before deciding. WS5-16's currency row carries WS9-08's quarterly line past W4. WS5-16 fills the W4 status of the WS1 and WS2 rows in `DEFERRED.md`. |
| `BillDetailView.tsx` and `SearchPageClient.tsx` | E10 → WS6 (U2/U8) | WS5 does not touch either file. See Deferred. |
| `lottie-react`, `lucide-react` | E4 → WS6-04b (removes `lottie-react` if unused), WS6-04a/b and WS6-06 (touch lucide users) | See Deferred. |

### Program ledger and cut line

The critique asks the program to cut 25–45 owner hours a month (E5, E13). The program itself is large: 167 WP headings across `01`–`09`, of which 25 are P0 (plus WS5-12a, P0 if triggered) and 95 are P1. Each one is an owner-reviewed PR, and about 74 WPs carry a non-"none" owner decision. At 20–30 minutes of owner review per PR plus decisions, that is roughly 60–90 owner hours over seven months [I]. The owner can review about 4–5 agent PRs a week, roughly 40–50 before the 12-15 freeze, so the program names a **Core** set of 45 WPs and treats everything else as Backlog. Before the 2026-10-06 final pass the spec files totalled 1,166,748 bytes (`cat docs/program-spec/*.md | wc -c`), about 1.8× the 635 KB of `TASKS.md` plus `decisions.md` that E12 calls overgrown. The ledger below makes the net effect visible, and the cut line keeps the program from becoming the maintenance problem it is meant to fix.

**Ledger (net effect if every WP ships; each row cites its owner WP):**

| Kind | Removed | Added |
|---|---|---|
| Schedules and LLM loops | Vercel bills cron and the Monday legislators duplicate (WS4-12); the votes cron (WS4-13); the LLM triage step (WS5-07); 2 Claude Code Routines (WS5-07, Owner) | A PR CI workflow (WS1-04, runs on PRs, not on a schedule); an optional axe CI job (WS6-16); an off-Vercel site check (WS9-01) |
| Code and dependencies | `openai` and about 8.8k never-imported lines (WS5-02); Speed Insights (WS2-09a, default option); Tailwind and PostCSS (WS5-10); `/api/intelligence` (WS2-07); `/design-system` (WS5-09); parked local-government code (WS5-06a) | The weekly My Legislators email product with the `MY_LEGISLATORS_SEND` and `NEXT_PUBLIC_EMAIL_LINK_ENABLED` flags (WS7-09a–f); the `ky_bill_texts` store and its LRC fetches (WS3) |
| Public pages | `/design-system` (WS5-09) | `/corrections` (WS3-14) and `/methodology` (WS8-07b). `/licenses` already exists (`src/app/licenses/`); WS8-01b edits it and does not add a page. |
| Docs and process | `TASKS.md` and `decisions.md` frozen (WS5-03a); one-off scripts archived (WS5-01a); aliases cut (WS5-01b) | About 25 new docs: `CURRENT.md`, `docs/adr/`, `docs/ops/*`, `docs/metrics.md`, `docs/data-budget.md`, `docs/evaluation/*`, `docs/partner/*`. One monthly owner check (WS9-08). Monthly readouts in session (WS7-12, agent PRs). |

Schedules go down (18 to about 15; Routines 2 to 0). Product and doc surface goes up. Every WS5 removal in this ledger is Backlog, so the removal side lands only as Core capacity allows. The ceilings in WS5-15 stop further growth, and the cut line below keeps Backlog additions from crowding out Core work.

**Cut line (program-wide rule; the Class column in [TRACKER.md](TRACKER.md) is authoritative):**

1. **Core:** the 45 WPs marked Core in TRACKER.md. Agents work Core first in each window.
2. **Backlog:** every other WP. A Backlog WP is picked up only when the Core WPs in its window are merged or blocked, or when its trigger fires; it needs the owner's go-ahead, the owner's monthly hours (WS9-08 §Monthly check) must be inside budget, and its Current state is re-verified at pickup. A Backlog WP that misses its window goes to [DEFERRED.md](DEFERRED.md). It does not slide into FZ or W3.
3. **No Core WP depends hard on a Backlog WP.** Where one did, the dependency is soft, with a stated fallback (for example, WS1-02 soft-depends on WS5-01a).

**WS5 under the cut line:** no WS5 WP is Core. WS5-12a is picked up at once if its trigger fires, because it is then a P0 trust fix. Otherwise, when Core capacity allows, pick up WS5's P1s first, in window order: WS5-03a and WS5-04a (W0), WS5-02 and WS5-07 (W1), WS5-15 (W2), WS5-13 and WS5-16 (W4); then WS5-01a, WS5-03b and WS5-12b; then the P2s. WS5-15 soft-depends on WS5-01b, WS5-13 on WS5-05, and WS5-16 on WS4-11; each has a fallback step.

### Out of scope

- Splitting `BillDetailView.tsx` or `SearchPageClient.tsx` (WS6).
- Consolidating schedules or schedulers (E2, WS4-11/12/13). WS5 removes only the triage steps and, by owner action, the Routines.
- Changing the accuracy audit's design (A3, WS3-11a).
- An MUI major upgrade (WS2).
- Renumbering the duplicate `045` migrations (WS1-05b tests the invariant).
- Rewriting git history, including to purge the 712 KB design export.
- New dashboards, schedulers, vendors, a second state, a Push API, or a native app.

---

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS5-01a | Archive one-off scripts and the aliases that point at them | P1 | W0 (merge by 10-16) | Sonnet | S | none | Backlog |
| WS5-01b | Cut npm aliases to an explicit keep-set and index `scripts/` | P2 | W2 | Sonnet | S | WS5-01a (soft: WS5-07) | Backlog |
| WS5-02 | Delete never-imported source files, drop `openai`, add an orphan guard | P1 | W1 (merge by 10-30) | Sonnet | M | none (soft: WS2-07, WS1-05a) | Backlog |
| WS5-03a | Freeze `TASKS.md` and `decisions.md` and start ADRs | P1 | W0 (merge by 10-20) | Sonnet | S | none | Backlog |
| WS5-03b | Write `CURRENT.md` and map every open `TASKS.md` item | P1 | W1 (merge by 10-30) | Sonnet | S | WS5-03a | Backlog |
| WS5-04a | Correct two wrong Kentucky-law statements (README veto rule, special-session copy) | P1 | W0 (merge by 10-20) | Sonnet | S | none | Backlog |
| WS5-04b | Rewrite the README to be short and accurate | P2 | W2 | Sonnet | S | WS5-01b, WS5-03b | Backlog |
| WS5-05 | Record the maintenance baseline and label PRs by type | P2 | W1 (merge by 10-30) | Sonnet | S | WS5-03b, WS1-04 | Backlog |
| WS5-06a | Remove parked local-government and executive-order code | P2 | W2 (merge by 11-14) | Opus | M | WS5-02 (soft: WS2-07) | Backlog |
| WS5-07 | Retire the LLM triage step and the two daily Claude Code Routines | P1 | W1 (merge by 10-30) | Sonnet | S | none (Routine action after WS9-02) | Backlog |
| WS5-08 | Move build- and script-only dependencies to dev and record `react-email` reachability | P2 | W2 (before WS2-11c opens, about 11-21) | Sonnet | S | WS2-01, WS5-02 | Backlog |
| WS5-09 | Remove the public `/design-system` page and the 712 KB design export | P2 | W2 | Sonnet | S | none | Backlog |
| WS5-10 | Remove the Tailwind and PostCSS toolchain | P2 | W2 (merge by 11-14, else Deferred) | Sonnet | M | WS5-02, WS5-09 | Backlog |
| WS5-12a | Check for surname collisions and, if any, require a first-initial match on profile sponsor matching | P0 if triggered | W0 owner check (by 10-13); W1 fix (by 10-30) | Opus | S | none | Backlog |
| WS5-12b | Pin legislator name matching with characterization tests | P1 | W2 | Opus | M | WS5-12a | Backlog |
| WS5-13 | Re-measure maintenance after the session and grade each plumbing subsystem | P1 | W4 (merge by 04-17) | Sonnet | S | none (soft: WS5-05) | Backlog |
| WS5-15 | Adopt "one in, one out" and enforce ceilings on dependencies, aliases, schedules, LLM callers and process-doc bytes | P1 | W2 | Sonnet | S | WS5-03a (soft: WS5-01b, WS5-08, WS4-11) | Backlog |
| WS5-16 | Write the maintain-mode profile, including dependency and framework currency | P1 | W4 (merge by 04-24) | Sonnet | S | WS5-13 (soft: WS4-11, WS9-14) | Backlog |

**Cut line.** Every WS5 WP is Backlog (see [Program ledger and cut line](#program-ledger-and-cut-line)). WS5-12a is picked up at once if its trigger fires. A Backlog WP that misses its window goes to [DEFERRED.md](DEFERRED.md).

**Execution notes** (all WS5 WPs are Backlog, so each window's WS5 work starts only once its Core WPs are merged or blocked).

- **W0 (10-06 → 10-20):** three small, docs-or-deletion PRs: WS5-01a, WS5-03a and WS5-04a. None changes runtime behavior except the special-session sentence in WS5-04a. Also in W0: WS5-12a's owner query (≈1 minute, read-only, counts only).
- **W1 (10-21 → 11-03):** WS5-02, WS5-03b, WS5-05 and WS5-07, all with a hard merge-by date of **10-30**.
  - **Election freeze 2026-10-31 → 11-05 (WS9-03): nothing from WS5 merges**, except WS5-12a if its trigger fired, because it is then a P0 trust fix.
  - Anything that misses 10-30 waits until 11-06 and then continues in W2 only with the owner's go-ahead; otherwise it goes to DEFERRED.md.
- **W2 (11-04 → 12-14):** WS5-06a and WS5-10 merge by **11-14**. WS5-08 merges before WS2-11c opens (by 11-21). Everything else merges by **12-10**, so it is live and observed before FZ.
- **FZ and W3:** nothing in WS5 merges. The monthly maintenance line rides the single WS9-08 check, not a WS5 PR.
- **W4:** WS5-13 by 04-17 and WS5-16 by 04-24, so WS8-14a and WS8-16 can use them before the 04-30 decision.

---

## Work packages

### WS5-01a · Archive one-off scripts and the aliases that point at them

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 (merge by 10-16) | Sonnet | S | none | E1, E3, E5, D1, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** Which one-off scripts to delete.
  - **Options:**
    - (a) delete the **Tier A** list below and keep Tier B
    - (b) delete Tier A and Tier B
    - (c) delete nothing
  - **Recommended:** (a).
  - **Default:** if the owner has not answered by **2026-10-09**, the agent applies (a). The owner can veto any single file in PR review.
- **Data-limit impact:** none. No script is run. Deleting `backfill-veto-status.ts` removes an uncapped per-row LegiScan spender (`--fetch`), so a mistaken run can no longer burn quota before the 2026-11-01 enforcement (D1).
- **Ongoing cost:** removes about 1,650 lines of scripts that would otherwise need type fixes (WS1-02), budget wiring (WS4-03b) and LRC-helper updates (WS4-09a), plus 9 aliases. Net: about 0.5 h/month less. No schedule added.
- **Why:** 86 npm scripts and 59 script files make "what can I safely run?" hard to answer. Each one-off is a standing quota risk under the new LegiScan terms (E1, D1, O2). Several are "one-time" corrections that already ran.
- **Current state (verified 2026-10-06):**
  - **Tier A** (one-time, spike, debug or perf; no workflow references them): 11 files, 1,646 lines by `wc -l`.
    - **Spikes:** `scripts/lrc-calendar-spike.ts` and `scripts/spike-lrc-committee-materials.ts`. `scripts/sync-lrc-committee-materials.ts` line 36 sniffs the spike's filename (`/spike-lrc-committee-materials/.test(__filename)`).
    - **Debug and probe:** `scripts/debug-openstates-roster.ts` and `scripts/test-supabase-auth-api.ts`.
    - **One-time corrections:**
      - `scripts/remap-recommittal-statuses.ts` (header: "One-time data correction")
      - `scripts/remap-committee-referral-statuses.ts` (no alias)
      - `scripts/backfill-interim-calendar-2026.ts` ("One-time backfill"; no alias)
      - `scripts/backfill-veto-status.ts` ("One-shot correction")
    - **Perf:** `scripts/perf/members-postgrest-stub.mjs`, `scripts/perf/members-measure.mjs` and `scripts/perf/README.md`.
  - **Aliases pointing at Tier A files (9):** `test:supabase-auth`, `debug:openstates-roster`, `remap:recommittal-statuses`, `backfill:veto-status`, `backfill:veto-status:dry`, `spike:lrc:calendar`, `spike:lrc:committee-materials`, `perf:members:stub`, `perf:members:measure`.
  - **Tier B** (kept by default; each is still referenced, or reusable after a mapper or LRC change):
    - `backfill-bill-history-texts.ts`: `backfill-bill-history-from-datasets.ts` line 7 recommends it.
    - `repair-agenda-bill-links.ts`: cited in `src/lib/ky-lrc-calendar-sync.ts` line ~131 and manual §4.
    - `merge-duplicate-committees.ts` and `diagnose-committee-duplicates.ts`: cited in `src/app/committees/[slug]/page.tsx` and `src/lib/ky-committee-utils.ts`.
    - `backfill-lrc-committee-materials-history.ts` (WS4-09a), `probe-committee-material-links.ts`, `reconcile-committee-memberships.ts` and `generate-favicons.py`.
  - **Must keep:**
    - `repair-missing-agenda-items.ts`, which `src/lib/accuracy-audit/checkers/committees.ts` names explicitly at line ~319 (line ~713 mentions "the repair script" generically)
    - every script run by a workflow
    - `backfill-session-votes.ts` and `backfill-bill-history-from-datasets.ts` (WS1-01)
  - Other WPs naming Tier A files:
    - WS1-02 fixes two type errors in `backfill-interim-calendar-2026.ts`, but says WS5-01a's deletion still applies.
    - WS4-03b skips archived files.
    - WS4-10 names the two spike files as archived.
  - There is no `scripts/README.md`.
- **Do:**
  1. For each Tier A file (and each Tier B file under (b)), run `grep -rn "<basename without extension>" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude=TASKS.md --exclude=decisions.md` and paste the hits into the PR.
     - **Drop the file from the list** if it is used by `.github/workflows/`, `vercel.json` or a `src/` import.
     - **Program-spec references do not block deletion.** That includes WS1-02 on `backfill-interim-calendar-2026.ts` and WS4-03b on `backfill-veto-status.ts`. List them under "Coordination" in the PR.
     - **A comment-only mention** in `src/` or `scripts/` is fine. Update the comment (step 4).
  2. In the PR body, record the current `main` SHA as the **archive SHA**. Delete the files.
  3. In `scripts/sync-lrc-committee-materials.ts` line ~36, delete the `|| /spike-lrc-committee-materials/.test(__filename)` clause. Keep the `--spike` flag.
  4. Remove the 9 aliases listed above from `package.json`. For each removed alias, run `grep -rn "npm run <alias>" src scripts docs --exclude-dir=program-spec`. Then:
     - delete the hit if it sits in a deleted file's own docs
     - otherwise append `(archived; see scripts/README.md)` to the line
     
     Do not edit `TASKS.md` or `decisions.md`.
  5. Create `scripts/README.md` containing only an **Archived scripts** table: file, one-line purpose, archive SHA, and the restore command `git show <sha>:scripts/<file> > scripts/<file>`. WS5-01b adds the other sections.
  6. If WS9-07's `docs/ops/env-vars.md` exists, delete any row that only a deleted file used, and run its drift test.
- **Don't:**
  - Run any script.
  - Delete a file used by a workflow, `vercel.json` or a `src/` import.
  - Remove any alias other than the 9 that point at deleted files (WS5-01b does that).
  - Rename kept scripts or change their flags.
  - Edit `TASKS.md`, `decisions.md` or `.github/workflows/`.
- **Acceptance criteria:**
  - [ ] Each Tier A file is deleted, unless it was dropped under step 1 with the evidence recorded.
  - [ ] `node -e 'console.log(Object.keys(require("./package.json").scripts).length)'` prints 77, or 77 plus any aliases added by WPs merged since 2026-10-06, listed in the PR.
  - [ ] This command prints nothing: `node -e 'const s=require("./package.json").scripts,fs=require("fs");for(const[k,v]of Object.entries(s)){const m=v.match(/scripts\/[^\s"]+/);if(m&&!fs.existsSync(m[0]))console.log("MISSING",k,m[0])}'`
  - [ ] This command prints nothing: `for s in $(grep -ohE "npm run [a-z:.-]+" .github/workflows/*.yml | awk '{print $3}' | sort -u); do node -e "process.exit(require('./package.json').scripts['$s']?0:1)" || echo MISSING $s; done`
  - [ ] `grep -rnE "npm run (test:supabase-auth|debug:openstates-roster|remap:recommittal-statuses|backfill:veto-status|spike:lrc:calendar|spike:lrc:committee-materials|perf:members)" src scripts docs --exclude-dir=program-spec | grep -v archived` prints nothing.
  - [ ] `scripts/README.md` exists with the archive table.
  - [ ] `npx tsc --noEmit`, `npm test` and `npm run lint` pass. `npm run typecheck:scripts` passes too, if it exists.
- **Verify:** plain container. Run the commands above plus `npm run build`. No production secrets are needed.
- **Owner actions:**
  - [ ] Answer the decision by 2026-10-09, or veto files in review.
- **Rollback:** revert the PR. A single file can be restored with the command in `scripts/README.md`.

---

### WS5-01b · Cut npm aliases to an explicit keep-set and index `scripts/`

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS5-01a (soft: WS5-07) | E1, E5, E14, D1, O2, N1 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The keep-set is fixed below. The owner can add back any alias in review.
- **Data-limit impact:** none. No script is run.
  - **Rule (O2):** no `:dry` alias is removed while its live alias stays. Every kept alias that calls LegiScan, Open States, LRC or Anthropic either has a kept dry twin or is estimate-only by default. For example, `backfill:vote-nv-counts` needs `--live` to spend.
- **Ongoing cost:** replaces a hunt through roughly 77 aliases with 37 aliases plus one index file. About 0.25 h/month less. No schedule added.
- **Why:** Most aliases are spikes, debug aids and one-off live variants nobody remembers. A short list, where every metered tool has a safe twin, is easier to hand over (E14) and harder to misuse (D1).
- **Current state (verified 2026-10-06):**
  - **Workflow-referenced aliases (13):** `audit:accuracy`, `backfill:bill-summaries`, `backfill:lrc:calendar`, `backfill:session-votes`, `backfill:vote-nv-counts`, `db:analyze`, `health:sources`, `probe:legacy-material-urls`, `sync:ky:bills:status`, `sync:ky:dataset`, `sync:ky:legislators`, `sync:ky:lrc-calendar` and `triage:findings` (WS5-07 removes the last one).
  - `legislator-links-weekly.yml` runs two scripts with `npx tsx` directly, not through aliases.
  - The three LRC sources `lrc-committee-materials`, `lrc-enrollment-actions` and `lrc-popular-names` run from Vercel cron routes (`vercel.json`), not from their aliases.
  - `src/lib/accuracy-audit/report.ts` line ~240 and `scripts/accuracy-audit.ts` line ~320 tell operators to run `npm run audit:dismiss`.
  - WS4's re-check notes that `sync:ky:dry` still calls LegiScan `getBill` on the legacy path.
  - `audit:accuracy:dry` still runs the Anthropic pass unless `--no-llm` is passed (N1, fixed by WS3-15).
- **Keep-set (37 aliases, plus the two triage aliases until WS5-07 merges):**
  - **Core (5):** `dev`, `build`, `start`, `lint`, `test`
  - **Run by a workflow (12):** the list above, minus `triage:findings`
  - **Dry twins of kept metered aliases (5):** `audit:accuracy:dry`, `backfill:bill-summaries:dry`, `backfill:lrc:calendar:dry`, `sync:ky:dataset:dry`, `sync:ky:lrc-calendar:dry`
  - **Invoked by a program-spec Do, Verify or Owner step (10):** `db:apply-sql`, `check:legiscan-quota`, `verify:bill-status`, `sync:ky`, `sync:ky:dry`, `sync:ky:session-preview`, `slack:smoke-test`, `preview:digest`, `preview:welcome`, `generate:district-thumbnails`
  - **Operator tools named by code or with a dry twin (5):** `refresh:bill-status`, `refresh:bill-status:dry`, `repair:agenda-items`, `repair:agenda-items:dry`, `audit:dismiss`
  - **Exempt:** aliases added after 2026-10-06 by a merged WP, for example `typecheck`, `typecheck:scripts`, `check`, `schedules`, `summaries:suppress` and `spike:bill-text`. Find them with `git log -p --since=2026-10-06 -- package.json`.
- **Remove (38):** `dev:clean`, `test:env`, `geo:ky-districts`, `geo:ky-mask`, `sync:ky:sessions`, `sync:ky:quota`, `bulk-seed:ky`, `verify:votes`, `verify:legislator-links`, `spot-check:bill-links`, `verify:digest-state`, `health:sources:json`, `audit:prune`, `topics:reclassify`, `topics:reclassify:dry`, `backfill:bill-history`, `backfill:bill-history:dry`, `audit:legiscan-subjects`, `diagnose:legislators`, `diagnose:committee-duplicates`, `merge:duplicate-committees`, `merge:duplicate-committees:live`, `probe:committee-links`, `probe:committee-links:dry`, `repair:agenda-bill-links`, `repair:agenda-bill-links:live`, `reconcile:committee-memberships`, `audit:lrc:bill-refs`, `sync:ky:lrc-committee-materials`, `sync:ky:lrc-committee-materials:dry`, `backfill:lrc:committee-materials`, `backfill:lrc:committee-materials:dry`, `sync:ky:lrc-enrollment-actions`, `sync:ky:lrc-enrollment-actions:dry`, `spike:lrc:enrollment-actions`, `sync:ky:lrc-popular-names`, `sync:ky:lrc-popular-names:dry`, `spike:lrc:popular-names`.
  - The files stay, runnable with `npx tsx scripts/<file> [flags]`.
- **Do:**
  1. **Re-check the inputs.**
     - Re-derive the workflow list with `grep -ohE "npm run [a-z:.-]+" .github/workflows/*.yml | awk '{print $3}' | sort -u`.
     - Re-derive the program-spec list with `grep -ohE "npm run [a-z][a-z:.-]*[a-z]" docs/program-spec/0*.md | sort -u`.
     - If either list contains an alias that is in neither the keep-set nor the exempt list, keep that alias and list it in the PR.
  2. Remove the 38 aliases in the remove list (and the two triage aliases if WS5-07 has merged and they are still present).
  3. For each removed alias, run `grep -rn "npm run <alias>" src scripts docs --exclude-dir=program-spec`. Rewrite each hit to the `npx tsx scripts/<file> …` form, keeping any flags. Leave `TASKS.md` and `decisions.md` alone.
  4. Expand `scripts/README.md` (≤ 120 lines) with these sections:
     - **Scheduled / workflow**: alias or file, workflow, one-line purpose
     - **Operator tools**: name, exact command, and whether it calls LegiScan, Open States, LRC or Anthropic. Note "calls LegiScan even with `--dry-run`" for `sync:ky:dry`, and "calls Anthropic unless `--no-llm`" for `audit:accuracy:dry` until WS3-15 has merged (N1). Copy any `Cost:` line WS4-03b added.
     - **Assets**: geo and favicons
     - **Removed aliases → replacement command**: two columns
     - **Exempt aliases added by other WPs**: alias and WP ID
     - **Archived scripts**: from WS5-01a
  5. In `README.md`, replace the "Maintenance scripts" table (lines ~66–83) with two lines pointing to `scripts/README.md`, unless WS5-04b has already done it.
- **Don't:**
  - Remove a `:dry` alias whose live alias stays.
  - Remove an alias that a workflow uses.
  - Delete files.
  - Change flags.
  - Edit `.github/workflows/`, `TASKS.md` or `decisions.md`.
- **Acceptance criteria:**
  - [ ] This command prints ≤ 40: `node -e 'const s=Object.keys(require("./package.json").scripts);const ex=process.argv.slice(1);console.log(s.filter(k=>!ex.includes(k)).length)' <exempt aliases…>`. Use 39 instead of 40 if WS5-07 has not merged.
  - [ ] For every alias ending in `:dry`, the alias without `:dry` either exists or is in the removed list. Show this with a one-liner in the PR.
  - [ ] The `MISSING` checks from WS5-01a print nothing.
  - [ ] `scripts/README.md` lists every file in `ls scripts scripts/*/`.
  - [ ] This command prints nothing: `grep -rnE "npm run (dev:clean|test:env|geo:|sync:ky:sessions|sync:ky:quota|bulk-seed|verify:votes|verify:legislator-links|spot-check|verify:digest-state|health:sources:json|audit:prune|topics:|backfill:bill-history|audit:legiscan-subjects|diagnose:|merge:duplicate|probe:committee-links|repair:agenda-bill-links|reconcile:|audit:lrc|sync:ky:lrc-(committee|enrollment|popular)|backfill:lrc:committee|spike:lrc)" src scripts docs --exclude-dir=program-spec`
  - [ ] `npx tsc --noEmit`, `npm test` and `npm run lint` pass. `npm run typecheck:scripts` passes too, if it exists.
- **Verify:** plain container. Run the commands above. No secrets are needed.
- **Owner actions:** none.
- **Rollback:** revert the PR.

---

### WS5-02 · Delete never-imported source files, drop `openai`, add an orphan guard

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 10-30) | Sonnet | M | none (soft: WS2-07, WS1-05a) | E3, E4, E1, U18, S9 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** Delete `LegislatorDistrictMinimap.tsx`, which is not rendered anywhere (see Current state)?
  - **Options:**
    - (a) delete it with the rest
    - (b) keep it on the orphan allowlist, because the owner plans to put the minimap back on profiles
  - **Recommended:** (a). Git keeps it, and WS2-04's guard test protects any future map.
  - **Default:** (a) if the owner has not answered by **2026-10-13**.
- **Data-limit impact:** none.
- **Ongoing cost:** removes about 8.8k lines (9.0k if WS2-07 has merged) that every type upgrade (WS2-11a), lint run and code search has to wade through. Adds one sub-second test. Net: about 0.5–1 h/month less, and more during the Next 16 upgrade.
- **Why:**
  - About 19% of `src/` is dead or parked (E3).
  - Dead files keep wrong facts alive: `src/lib/tooltipGuidelines.ts` line ~118 repeats the wrong "3/5 of elected members" veto rule (U18).
  - They also keep dependencies installed: `openai` is used only by two dead `transcribe.ts` files (E4).
  - A guard test stops dead code from piling up again (O1).
- **Current state (verified 2026-10-06):** import scan covering relative and `@/` imports, dynamic `import()` and `require`. Entry points are the Next App Router special files, `src/middleware.ts`, `*.test.ts`, root config files and `scripts/`.
  - **39 never-imported files.** One is `src/app/lib/supabaseAdmin.ts` (S7, owned by WS2-10). The other **38** match E3:
    - `src/app/components/`: `ExpandableSection.tsx`, `GraphVisualization.tsx`, `InteractiveTermTooltip.tsx`, `KeyPlayersAndRelated.tsx`, `NavigationLoader.tsx`, `ProfessionalNavigation.tsx`, `RelatedSearches.tsx`, `SearchBar.tsx`, `SearchDiscoveryVerification.tsx`, `SpeakerNetwork.tsx`, `Timeline.tsx`
    - `src/app/lib/transcribe.ts`
    - `src/components/`: `bills/BillsListTable.tsx`, `bills/StatsGrid.tsx`, `civic/SponsorAvatarChip.tsx`, `home/HomeCuratedBillList.tsx`, `members/LegislatorDistrictMinimapLazy.tsx`, `mobile/MobileHeader.tsx`, `ui/Box.tsx`, `ui/ComingSoonPage.tsx`, `ui/ComplexTooltip.tsx`, `ui/ContextualTooltip.tsx`, `ui/LegislativeTimeline.tsx`
    - `src/lib/`: `content-generation.ts`, `env-validation.ts`, `graph-database-server.ts`, `graph-queries.ts`, `home-bill-curated.ts`, `icons.tsx`, `name-utils.ts`, `tooltipGuidelines.ts`, `transcribe.ts`, `trending-bills.ts`, `use-ky-active-legislator-roster.ts`
    - `src/utils/`: `ErrorBoundary.tsx`, `logger.ts`, `transform.ts`, `validator.ts`
  - **Two more files are imported only by the files above:** `src/lib/graph-database.ts` (464 lines) and `src/components/members/LegislatorDistrictMinimap.tsx` (227 lines). No page renders the minimap; its only importer is the unused Lazy wrapper. It was on `MemberCard` and the profile in May (TASKS.md line ~307, #26 "Uniform member cards + scalable district minimap") and was later removed.
  - **If WS2-07 has merged,** it deleted `src/app/api/intelligence/route.ts`. Its step 2 leaves `src/lib/ky-intelligence.ts` (142 lines) and `src/lib/anthropic-cache.ts` (83 lines) in place, and nothing else imports them. The scan then lists **41** files.
  - **If WS2-10 has merged,** `supabaseAdmin.ts` is already gone (38 or 40).
  - `openai` (`package.json` dependencies) is imported only by the two `transcribe.ts` files. `OPENAI_API_KEY` appears in those files, in `src/lib/env-validation.ts` line 7 (also deleted), and in `env-template.txt`.
  - `env-template.txt` has two blocks to remove:
    - the comment `# OpenAI API Key (optional fallback for summarization)` with `# OPENAI_API_KEY=…` below it (~lines 64–65)
    - the comment `# Optional: Debug / Logging` with `# DEBUG_MODE=false` and `# LOG_LEVEL=info` below it (~lines 119–121)
    
    `DEBUG_MODE` and `LOG_LEVEL` are read nowhere in `src/`, `scripts/` or root config.
  - `src/lib/content-generation.ts` imports `generateOrdinanceSummary`, `generateEOSummary` and `generateSchoolBoardSummary` from `ky-content-generation.ts` (lines ~35–37). After deletion those three have no caller; WS5-06a removes them.
  - `src/lib/anthropic-model.ts` lines ~3–6 mention `ky-intelligence` in a historical comment ("Previously the model id was duplicated across…"). It stays as history.
- **Do:**
  1. **Add the orphan check.** If `src/lib/repo-invariants.test.ts` exists (WS1-05a), add a `describe('orphan files')` block there. Otherwise create `src/lib/repo-orphans.test.ts`. Use `node:test`, `fs` and `path` only, with no new dependency. It:
     - walks `src/`, `scripts/` and root `*.ts`/`*.mjs` files
     - resolves relative and `@/` specifiers (the `tsconfig.json` `paths` map), trying the `''`, `.ts`, `.tsx`, `.js` and `/index.ts(x)` suffixes
     - covers static `import … from`, `export … from`, side-effect `import '…'`, `import('…')` and `require('…')`
     - treats these as entry points:
       - `src/app/**/{page,layout,route,loading,error,not-found,global-error,template,default,sitemap,robots,manifest,opengraph-image,icon,apple-icon}.{ts,tsx}`
       - `src/middleware.ts` and `src/proxy.ts`
       - `**/*.test.ts`
     - fails, listing the files, if any non-entry file under `src/` has no importer and is not on `ALLOWLIST`
     - starts `ALLOWLIST` with `src/app/lib/supabaseAdmin.ts` commented `// S7 — WS2-10 decides`, only if that file still exists
  2. **Run the check.** It must list exactly one of these sets. If it lists anything else, stop and report (manual §9).
     - the 39 files above
     - 41 if WS2-07 has merged
     - one fewer in either case if WS2-10 has merged
  3. **Delete.** Delete the 38 files and the 2 transitively dead files. Under option (b), put the minimap on `ALLOWLIST` with `// owner keeps (WS5-02 option b)`. If WS2-07 has merged, also delete `ky-intelligence.ts` and `anthropic-cache.ts`, and say so under "Coordination" for WS5-06a. Run the check again. If it reports new orphans:
     - delete them if there are at most 5 and none is under `src/app/api/`, `src/lib/ky-sync-pipeline.ts`, auth or email
     - otherwise stop and report (manual §9)
  4. **Drop `openai` and the dead env vars.** Remove `openai` from `dependencies` and run `npm install` to update the lockfile. In `env-template.txt`, delete by content (not by line number):
     - the `# OpenAI API Key …` comment line and the `# OPENAI_API_KEY=` line
     - the `# Optional: Debug / Logging` line and the `# DEBUG_MODE=` and `# LOG_LEVEL=` lines
     - any blank line left doubled
     
     If WS9-07's `docs/ops/env-vars.md` exists, delete those three rows.
  5. **Tidy references.** Delete now-empty directories (`src/utils/`, `src/components/mobile/`). Grep `README.md`, `docs/architecture.md` and `design-system/*.md` for the deleted file names, and fix any live reference. Leave `TASKS.md` and `decisions.md` alone.
  6. **Coordination note.** Under "Coordination" in the PR body, state:
     - the minimap outcome (for WS2-04)
     - that the three `ky-content-generation.ts` functions are now unused (for WS5-06a)
     - whether `ky-intelligence.ts` and `anthropic-cache.ts` were deleted here
- **Don't:**
  - Delete `supabaseAdmin.ts` (WS2-10).
  - Delete any file the check does not list.
  - Refactor live files beyond removing an import of a deleted file (there should be none).
  - Touch `ky-content-generation.ts` (WS5-06a).
  - Delete `ky-intelligence.ts` while `src/app/api/intelligence/route.ts` exists.
  - Remove unused *exports* inside live files (see Deferred).
- **Acceptance criteria:**
  - [ ] `npm test` passes, including the orphan check. `ALLOWLIST` holds at most two entries: `supabaseAdmin.ts` if it still exists, and the minimap under option (b).
  - [ ] The check fails if a new unimported file is added. Show this once locally; do not commit the failing state.
  - [ ] `grep -rn "from 'openai'\|OPENAI_API_KEY\|DEBUG_MODE\|LOG_LEVEL" src scripts env-template.txt` prints nothing.
  - [ ] `git diff --shortstat main` shows at least 8,500 deleted lines under `src/`.
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container. Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`. No secrets are needed; the build runs without env vars (WS1-04).
- **Owner actions:**
  - [ ] Answer the minimap decision by 2026-10-13.
  - [ ] After merge, delete `OPENAI_API_KEY` from Vercel (Project → Settings → Environment Variables, all environments) and from GitHub Actions secrets, if present. Expect no build or runtime change.
- **Rollback:** revert the PR. That restores the files, the `openai` dependency and the template lines together.

---

### WS5-03a · Freeze `TASKS.md` and `decisions.md` and start ADRs

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 (merge by 10-20) | Sonnet | S | none | E12, E13, E14, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** How to retire the two large logs.
  - **Options:**
    - (a) **Freeze in place.** Add a "FROZEN" header and leave both files where they are. New decisions go to `docs/adr/NNNN-*.md`, and open work goes to `CURRENT.md` (WS5-03b).
    - (b) Move both files to `docs/archive/` and rewrite every reference. 50 files outside `docs/program-spec/` mention them, including 35 mention lines in `src/`, `scripts/`, `.github/` and `supabase/`. Measured with `grep -rlE "TASKS\.md|decisions\.md" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=program-spec | wc -l`.
    - (c) Keep appending, with a size cap.
  - **Recommended:** (a). It gives the same reduction in what agents read, breaks no links, and is one small PR.
  - **Default:** (a) if the owner has not answered by **2026-10-13**.
- **Data-limit impact:** none.
- **Ongoing cost:** stops the habit that produced about 40% of written bytes in the last 8 weeks, with 38 of 72 non-merge commits touching process docs (E12). Expected saving: 2–5 h/month. An ADR costs about 15 minutes per real decision.
- **Why:**
  - The README tells agents to read about 160k tokens before starting (E12).
  - `TASKS.md` (203 KB) and `decisions.md` (432 KB, 112 entries since 2026-05-09) have become the product instead of a record of it.
  - Manual §8 currently tells every W0 PR to append to `decisions.md`, so the log keeps growing through the busiest window.
  - A partner needs one page of current state and a short list of real decisions (O3, O4).
- **Current state (verified 2026-10-06):**
  - `TASKS.md`:
    - 203,404 bytes
    - opens with "This file is the source of truth for roadmap tasks"
    - 55 unchecked `- [ ]` lines
    - open work sits under "In Progress → Open near-term items" (line ~13) and later sections
    - "Maintained on autopilot" (line ~179) documents the two daily Routines
  - `decisions.md`:
    - 432,317 bytes
    - "append-only" (line 3)
    - 112 `## ` sections, the last being `## 2026-10-06 — LegiScan post-cut health check…` (line ~2604)
  - Manual:
    - §1 (line ~22) tells agents to grep `TASKS.md` and `decisions.md` for their topic.
    - §8 (line ~254) tells agents to append decision notes to `decisions.md` "until the decisions.md work from WS5 replaces it".
    - §10's kickoff template says "Grep TASKS.md and decisions.md for the topic".
  - Writers in other workstreams:
    - WS2-01 step 9 and WS2-14 step 3 already switch to an ADR once the files are frozen.
    - WS7-01 (step 11) already skips `TASKS.md` when frozen.
    - WS4-12 no longer edits `TASKS.md`.
    - WS3, WS4-15/16 and WS8-08/16 say "decision note", which follows manual §8.
  - No `docs/adr/` or `CURRENT.md` exists.
  - `CLAUDE.md` does not mention either file.
- **Do:**
  1. **Freeze the files.** Under (a), prepend this block to both `TASKS.md` and `decisions.md` and change nothing else in them:

     ```
     > **FROZEN <YYYY-MM-DD>.** Historical record only; do not edit or append. Open items: CURRENT.md. Roadmap: docs/program-spec/. New decisions: docs/adr/. Operational events: docs/ops/log.md.
     ```

     Under (b), `git mv` both files to `docs/archive/` and fix every reference found by the grep above. That makes the PR size M, so split it if needed.
  2. **Start the ADR folder.** Create `docs/adr/README.md` (≤ 25 lines). It covers:
     - the format `NNNN-kebab-title.md`
     - the sections Status / Date / Context / Decision / Consequences / Revisit when, at most about 30 lines in total
     - "only decisions that constrain future work get an ADR"
     - "operational events go to `docs/ops/log.md`"
  3. **Record this decision.** Create `docs/adr/0001-freeze-tasks-and-decisions.md`, recording this WP's decision and the rejected options.
  4. **Edit the manual.**
     - **§1:**
       - Replace the "Do not read TASKS.md … in full" paragraph: "`TASKS.md` and `decisions.md` are frozen history. Open work is in `CURRENT.md` and `docs/program-spec/TRACKER.md`. Grep the frozen files only for history on your topic, never for open work."
       - Add: "Read this manual, the workstream intro and **only your WP's section**. Do not read whole workstream files or other WPs unless your WP names them."
     - **§8:** Replace the `decisions.md` append rule with a **precedence rule**: "After WS5-03a has merged:
       - any WP step that says to write a decision note or append to `decisions.md` writes the next `docs/adr/NNNN-*.md` instead
       - any step that says to check off or edit a `TASKS.md` line records the closure in `CURRENT.md` (once it exists) or in the PR body instead
       - never edit the frozen files"
       
       If WS9-04's sentence about `docs/ops/log.md` is present, keep it.
     - **§10:** Change "Grep TASKS.md and decisions.md for the topic; do not read them whole" to "Check CURRENT.md for open items on the topic; grep the frozen TASKS.md and decisions.md only for history."
  5. **Find stray writers.** Run `grep -n "decisions.md\|TASKS.md" docs/program-spec/0[1-9]*.md` and list, under "Coordination" in the PR, every WP step still told to append to or check off a line in the frozen files. The precedence rule covers them. Do not edit other workstreams' files.
  6. **Add the frozen-docs check.** Add it as a `describe('frozen docs')` block in `src/lib/repo-invariants.test.ts` if that file exists, otherwise as `src/lib/frozen-docs.test.ts`. It asserts:
     - the sha256 of `TASKS.md` and `decisions.md` equals constants recorded in the test
     - every `docs/adr/*.md` other than the README matches `^\d{4}-[a-z0-9-]+\.md$`
     - ADR numbers are unique
     
     A comment says that changing a hash constant requires a new ADR.
- **Don't:**
  - Rewrite, reorder or delete any existing entry.
  - Move files under (a).
  - Edit `CLAUDE.md` (Owner action) or other workstreams' spec files.
  - Create `CURRENT.md` (WS5-03b).
- **Acceptance criteria:**
  - [ ] Under (a), both files start with the FROZEN block, and `git diff main -- TASKS.md decisions.md` shows only those added lines.
  - [ ] `docs/adr/README.md` and `docs/adr/0001-freeze-tasks-and-decisions.md` exist.
  - [ ] `grep -n "until the decisions.md work from WS5" docs/program-spec/00-agent-operating-manual.md` prints nothing.
  - [ ] Manual §8 contains "docs/adr/". Manual §1 contains "only your WP's section". Manual §10 contains "CURRENT.md".
  - [ ] The PR's Coordination list names every stray-writer hit from step 5.
  - [ ] `npm test` passes, including the frozen-docs check. Show once locally that appending a byte to `decisions.md` makes it fail.
- **Verify:** plain container. Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
- **Owner actions:**
  - [ ] Answer the decision by 2026-10-13.
  - [ ] After merge, add to `CLAUDE.md` under a new "## Where things are" heading: "Open items: `CURRENT.md`. Roadmap: `docs/program-spec/`. Decisions: `docs/adr/`. `TASKS.md` and `decisions.md` are frozen history; do not read them whole or append to them."
- **Rollback:** revert the PR. The frozen files are byte-identical apart from the header, so nothing is lost.

---

### WS5-03b · Write `CURRENT.md` and map every open `TASKS.md` item

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 10-30) | Sonnet | S | WS5-03a | E12, E14, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** Where open items not covered by the program spec live.
  - **Options:**
    - (a) in `CURRENT.md`
    - (b) as GitHub Issues
  - **Recommended:** (a). One file, no new tool.
  - **Default:** (a) if the owner has not answered by **2026-10-20**.
- **Data-limit impact:** none.
- **Ongoing cost:** one page of at most 150 lines that replaces 636 KB as the "what's open" source. About 10 minutes a month to keep it current, against hours of grepping.
- **Why:** After the freeze, agents and a partner need one place that says what is open and where everything is (E12, E14, O3).
- **Current state (verified 2026-10-06):**
  - `TASKS.md` has 55 unchecked `- [ ]` lines (`grep -c "^\s*- \[ \]" TASKS.md`).
  - "Open near-term items" (line ~13) also holds plain bullets, some already marked resolved. Example: "Filters — Clear filters ✅ Resolved 2026-08-10".
  - No `CURRENT.md` exists.
- **Do:**
  1. **Define "open item".** An open item is either of:
     - an unchecked `- [ ]` line anywhere in `TASKS.md`
     - a bullet under "Open near-term items" that contains neither `[x]` nor "Resolved"
     
     Count them with this command and paste the number: `{ grep -nE "^\s*- \[ \]" TASKS.md; awk '/^### Open near-term items/{f=1;next} /^### /{f=0} f && /^\s*- / && !/\[x\]|Resolved|\[ \]/' TASKS.md; } | wc -l`
  2. **Create `CURRENT.md`** (≤ 150 lines) with these sections:
     - **What KYvKY is** (3 lines). State the C1 niche: a neutral, Kentucky-only layer linking bills, every roll call, your legislators and committee agendas.
     - **Where things are**: the program spec (`docs/program-spec/README.md`) and its `TRACKER.md`, `docs/adr/`, `docs/ops/` (if WS9-04 merged), `scripts/README.md`, `docs/voice-and-tone.md`, and `docs/data-budget.md` (if WS4-01 merged).
     - **Open items not covered by the program spec.** For each open item:
       - grep `docs/program-spec/` for its key nouns
       - if a WP covers it, list it under "Superseded by program spec" with the WP ID
       - otherwise copy it as one line (≤ 160 characters) with a link to its `TASKS.md` line
       
       Cap this section at 40 lines. Put any overflow under "Backlog (unsorted)" with links only.
     - **Closures**: an empty list, where the manual §8 precedence rule records `TASKS.md` items closed by later WPs.
     - **Owner-account automations**: the two Claude Code Routines, with status "running" until WS5-07's owner action.
     - **Maintenance metrics**: an empty heading that WS5-05 fills in.
  3. Under option (b), put the proposed issues in the PR body for the owner to create. `CURRENT.md` then links the issues list instead of the one-liners.
- **Don't:**
  - Edit `TASKS.md` or `decisions.md`.
  - Copy any personal data from `TASKS.md` or `FEEDBACK.md`.
  - Create issues yourself.
- **Acceptance criteria:**
  - [ ] `CURRENT.md` exists and `wc -l CURRENT.md` ≤ 150.
  - [ ] The PR's mapping table has exactly as many rows as the step-1 count. Each row says "superseded by WSn-NN", "CURRENT.md line N" or "Backlog".
  - [ ] If WS5-03a's check is in `repo-invariants.test.ts` or `frozen-docs.test.ts`, it now also asserts that `CURRENT.md` is ≤ 150 lines, and `npm test` passes.
- **Verify:** plain container. Run the step-1 count, `npm test` and `npm run lint`.
- **Owner actions:**
  - [ ] Answer the decision by 2026-10-20.
- **Rollback:** revert the PR.

---

### WS5-04a · Correct two wrong Kentucky-law statements (README veto rule, special-session copy)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 (merge by 10-20) | Sonnet | S | none | U18, E12, C8, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none for the veto rule; the in-app tooltip is already correct.
  - The special-session sentence changes user-facing copy on a guide page. If the agent cannot confirm the fact from the Kentucky Constitution (step 2), it ships the README fix only and lists the session copy under "Found, not fixed" for the owner.
- **Data-limit impact:** at most **2 LRC page fetches** to read Kentucky Constitution §80 on the LRC site. No LegiScan, Open States or Anthropic calls. **Stop condition:** if the page is unreachable or the text is ambiguous, do not fetch again; skip step 2.
- **Ongoing cost:** none.
- **Why:**
  - The public README states the veto override wrongly (U18). It is the first file a partner or funder skims (O3, O4).
  - The live guide page `/guides/kentucky-general-assembly-sessions` says a special session can be called "by petition of 3/5 of the members of each chamber". Our understanding is that only the Governor can call one, and that the 2022 amendment that would have let the General Assembly call itself in was rejected [verify].
  - Wrong civic facts during election season undercut the site's core claim (C8).
- **Current state (verified 2026-10-06):**
  - `README.md` line 17 says "Use KY terminology: 100 House / 38 Senate, Governor (not President), 3/5 veto override." `src/lib/tooltipContent.ts` line ~52 is correct (a majority of members elected: 51 House, 20 Senate).
  - `src/lib/ky-sessions.ts` line ~363, in `SESSION_TYPE_DESCRIPTIONS.special`, reads "A special session is called by the Governor, or by petition of 3/5 of the members of each chamber, …". It renders at `src/app/guides/kentucky-general-assembly-sessions/page.tsx` line ~184.
  - The `subject` doc comment in `ky-sessions.ts` (~line 36) says "the Governor's or petition's stated subject".
- **Do:**
  1. In `README.md` line 17, replace "3/5 veto override" with "a veto is overridden by a majority of the members elected to each chamber (51 House, 20 Senate)". Change nothing else in the README; WS4-01 and WS1-04 edit other lines.
  2. Fetch Kentucky Constitution §80 from the LRC site (≤ 2 requests, with the project's normal User-Agent).
     - **If it confirms that only the Governor convenes the General Assembly in extraordinary session:**
       - Change the special-session sentence to start "A special session is called by the Governor, outside the regular annual schedule." Keep the rest of the description unchanged.
       - Change the `subject` comment to "the Governor's stated subject".
       - Paste the quoted §80 sentence and its URL in the PR.
     - **Otherwise,** skip this step and record it under "Found, not fixed".
  3. Follow `docs/voice-and-tone.md`: neutral wording, no new claims.
- **Don't:**
  - Rewrite the README (WS5-04b).
  - Change any other session copy or the 60/30-day rules.
  - Fetch any LRC page other than the constitution section.
- **Acceptance criteria:**
  - [ ] `grep -n "3/5" README.md` prints nothing, and `grep -n "majority of the members elected" README.md` prints one line.
  - [ ] Either `grep -n "petition" src/lib/ky-sessions.ts` prints nothing and the PR quotes §80 with its URL, or the PR lists the session copy under "Found, not fixed".
  - [ ] `npx tsc --noEmit`, `npm test` and `npm run lint` pass.
- **Verify:** plain container. Run the greps and checks above. Optionally run `npm run build && npm run start` and open `/guides/kentucky-general-assembly-sessions`; the page uses only static session data [verify it renders without Supabase env].
- **Owner actions:**
  - [ ] If the session copy was skipped, confirm the §80 fact and tell the agent, or fix the line yourself.
- **Rollback:** revert the PR.

---

### WS5-04b · Rewrite the README to be short and accurate

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS5-01b, WS5-03b | E12, U18, E2, D1, C1, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** removes the hand-kept sync table (one of the five schedule copies, E2) and the stale-claim drift. Slightly negative upkeep.
- **Why:**
  - The README sends agents to about 636 KB of logs, lists routes that no longer exist, and misstates the stack (E12).
  - It is a partner's first impression, so it must state the niche (C1) and be accurate (O3, O4).
- **Current state (verified 2026-10-06, `README.md`, 186 lines):**
  - line 17: veto rule (fixed by WS5-04a)
  - line 18 and lines 92–93: "React 18" and "Tailwind (tooltip layer)". The app runs Next's vendored React 19 (S1). Tailwind is used in 3 live files.
  - lines 9–15: "For AI agents — Read first: TASKS.md, decisions.md, FEEDBACK.md".
  - line 40: the hidden-routes line lists `/browse` and `/find-content`, which do not exist in `src/app`. The real API route `GET /api/bills/browse` (line 139, used by `src/components/bills/BillsBrowse.tsx`) does exist.
  - line 68: "There is no Jest/Vitest suite" (WS1-04 fixes this).
  - line 108: "`/about` is a stub". In fact `src/app/about/page.tsx` has real copy.
  - lines 74 and 162: "30k cap" (WS4-01 fixes these).
  - lines 118–131: a sync table that omits about 7 jobs (E2).
  - lines 141, 154 and 163: `/api/intelligence` (WS2-07 removes it).
  - lines 3 and 116: "daily email digest". `src/lib/ky-notification-preferences.ts` line ~169 defaults to weekly.
  - There is no `.nvmrc` and no `engines` field. Every workflow uses `node-version: '24'`.
- **Do:**
  1. Rewrite `README.md` to ≤ 130 lines with these sections, in order:
     - **What it is.** The first line states the niche: "A neutral, Kentucky-only layer that links each bill to every roll call, your legislators and committee agendas." Then the live URL `https://www.kyvky.com` and the scope "Kentucky General Assembly only". Link `/methodology` (WS8-07b) if it has merged.
     - **Kentucky facts agents get wrong:**
       - 100 House / 38 Senate
       - a veto is overridden by a majority of the members elected to each chamber (51 House, 20 Senate)
       - even-year sessions run up to 60 legislative days and odd-year sessions up to 30 (cite `src/lib/ky-sessions.ts`)
       - "Governor", not "President"
     - **Quick start**: `dev`, `build`, `test`, `lint`, plus `check` if it exists. "Node 24 (matches `.github/workflows/*` setup-node)."
     - **Where things live**: ≤ 12 rows, kept from the current "Key files" table. Check each path with `ls`. Include `CURRENT.md`, `docs/adr/` and `scripts/README.md`.
     - **Data sources and credit**: LegiScan (CC BY 4.0, link `src/lib/legiscan-attribution.ts`), Open States, and the Kentucky LRC website. Link `docs/data-budget.md` if WS4-01 merged.
     - **Schedules**: one sentence pointing to `src/lib/schedule-registry.ts` if WS4-11 merged, otherwise to `vercel.json` and `.github/workflows/`. No table.
     - **Public read API**: rows only for routes that exist under `src/app/api/` and are used by the site (keep `GET /api/bills/browse`).
     - **Deployment essentials**: keep the `CRON_SECRET` paragraph, the canonical-origin paragraph and the "Outbound mail" paragraph verbatim. They are load-bearing.
     - **For contributors and agents**: start at `CLAUDE.md`, `docs/program-spec/00-agent-operating-manual.md` and `CURRENT.md`, plus the copy rules in `docs/voice-and-tone.md`. Keep the `CONTRIBUTING.md` and `SECURITY.md` links if WS8-09 or WS2-08 added them.
     - **License.**
  2. Move the "Tooltip taxonomy" section (lines ~42–51) verbatim to the end of `docs/architecture.md`. In `docs/architecture.md` line 3, replace the `TASKS.md` / `decisions.md` pointers with `CURRENT.md` / `docs/adr/`.
  3. Keep the "Hidden routes" line, rewritten to list only routes that exist: `/dashboard`, `/dev/digest-history`, `/dev/bill-summary-preview`, `/admin/*`, and `/design-system` until WS5-09. Keep its `ADMIN_TOKEN` note consistent with WS2-02 if WS2-02 has merged.
  4. Check every factual claim in the README (route, file, script, count) with `ls` or `grep`. Paste the claim → evidence list in the PR.
- **Don't:**
  - Put budget numbers, schedules or counts in the README (they drift).
  - Change product copy.
  - Remove the CAN-SPAM, outbound-mail or canonical-origin facts.
  - Add badges or screenshots.
- **Acceptance criteria:**
  - [ ] `wc -l README.md` ≤ 130.
  - [ ] `grep -nE "3/5|find-content|(^|[^/a-z])/browse\b|no Jest|is a stub|React 18|30k|TASKS\.md|decisions\.md|daily email digest" README.md` prints nothing. The pattern does not match `/api/bills/browse`.
  - [ ] `grep -n "majority of the members elected" README.md` prints one line, and `grep -n "Kentucky-only" README.md` prints at least one.
  - [ ] Every repo path in the README exists: `grep -oE "(src|scripts|docs)/[A-Za-z0-9_./()-]*[A-Za-z0-9_)]" README.md | sort -u | xargs -I{} ls -d {}` reports no "No such file". Paths with `[id]`-style segments are checked by hand and listed in the PR.
  - [ ] The PR body contains the claim → evidence list.
- **Verify:** plain container. Run the greps above and `npm run lint`. Read the rendered README in the PR's GitHub file view.
- **Owner actions:** none.
- **Rollback:** revert the PR.

---

### WS5-05 · Record the maintenance baseline and label PRs by type

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W1 (merge by 10-30) | Sonnet | S | WS5-03b, WS1-04 | E13, E5, E1, E12, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The label set is fixed below.
- **Data-limit impact:** none. It uses GitHub API reads through `gh` only.
- **Ongoing cost:**
  - Agents add one label per PR.
  - The single monthly check (WS9-08) gains one command and one line in its log entry, about 5 extra minutes a month.
  - No new ritual, dashboard or schedule.
- **Why:**
  - The project cannot tell whether simplification worked without numbers. E13's "about 22 of 51 PRs were plumbing" came from a one-time manual count.
  - **Owner hours per month are the primary measure**, because they are what the W4 decision and a partner need (WS8-08's owner-hours threshold, which WS7-08 maps to a KPI).
  - PR share by type is secondary: it measures agent output, not owner load.
- **Current state (verified 2026-10-06), with the exact command for each value:**

  | Metric | Value | Command |
  |---|---|---|
  | `src/` lines | 68,450 | `find src \( -name '*.ts' -o -name '*.tsx' \) -print0 \| xargs -0 cat \| wc -l` |
  | `scripts/` lines | 9,717 | `find scripts \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' \) -print0 \| xargs -0 cat \| wc -l` |
  | npm aliases | 86 | `node -e 'console.log(Object.keys(require("./package.json").scripts).length)'` |
  | Production deps (direct) | 32 | `node -e 'console.log(Object.keys(require("./package.json").dependencies).length)'` |
  | Production tree | 495 | `npm ls --omit=dev --all --parseable \| wc -l` |
  | Migrations | 57 | `ls supabase/migrations \| wc -l` |
  | Env vars in template | 68 | `grep -oE "[A-Z][A-Z0-9_]{2,}=" env-template.txt \| sort -u \| wc -l` |
  | Env vars in code | 75 | `grep -rhoE "process\.env\.[A-Z][A-Z0-9_]*" src scripts *.ts *.js *.mjs \| sort -u \| wc -l` |
  | Schedules | 18 | `node -e 'console.log(require("./vercel.json").crons.length)'` (9) plus `grep -hE "^\s*- cron:" .github/workflows/*.yml \| wc -l` (9) |
  | Process docs (bytes) | 203,404 / 432,317 | `wc -c TASKS.md decisions.md` |
  | Program spec (bytes) | 1,166,748 before the 2026-10-06 final pass [re-measure at merge] | `cat docs/program-spec/*.md \| wc -c` |

  - `.github/pull_request_template.md` has no type field. WS1-04 rewrites the template.
  - No `type:` labels are known [verify with `gh label list`].
- **Do:**
  1. **Fill the metrics section.** Under `CURRENT.md` "Maintenance metrics", add the table above with a 2026-10-06 column, a column dated this PR, and the command for each row. Add lines-by-area rows, each with its `find … -print0 | xargs -0 cat | wc -l` command:
     - **data plumbing**: `src/lib/ky-sync-pipeline.ts`, `src/lib/ky-lrc-*`, `src/lib/accuracy-audit/`, `src/lib/source-health.ts`, `src/app/api/sync/`, `src/app/api/cron/`, `src/app/admin/`, `scripts/` and `.github/workflows/`
     - **UI**: `src/app/**/*.tsx` outside `api/` and `admin/`, plus `src/components/`
     - **other**: everything else under `src/`
  2. **Add the Type line.** Add to `.github/pull_request_template.md`, near the top: `Type: feature | fix | maintenance | docs (pick one; apply the matching "type: …" label)`. Give one-line definitions:
     - **feature**: new user-visible capability
     - **fix**: a user-visible defect corrected
     - **maintenance**: keeps existing behavior working (dependencies, sync and data plumbing, monitoring, refactors, CI, tests)
     - **docs**: docs or process only
  3. **Add the label instruction to manual §2:** open the PR with `gh pr create --label "type: <x>"`. If the label does not exist, put the type in the body and say so.
  4. **Hook into the one monthly check.** If `docs/ops/vendors.md` §Monthly check exists (WS9-08), add one line to it: "Maintenance: run the label count in CURRENT.md § Maintenance metrics, and add `Maintenance: <h> h owner; PRs feature/fix/maintenance/docs/unlabelled = a/b/c/d/e` to this month's `check` entry in `docs/ops/log.md`." Otherwise put that line under "Coordination" in the PR for WS9-08 to include. The label-count command to record in `CURRENT.md` is `gh pr list --state merged --search "merged:>=YYYY-MM-01 merged:<YYYY-MM-01(next month)" --limit 300 --json labels --jq '[.[] | ([.labels[].name | select(startswith("type: "))][0] // "unlabelled")] | group_by(.) | map({(.[0]): length}) | add'`.
- **Don't:**
  - Add a workflow, bot, schedule, dashboard or a second monthly checklist.
  - Back-label old PRs; W4 compares forward from here.
  - Create labels (Owner action).
- **Acceptance criteria:**
  - [ ] `CURRENT.md` has the metrics table, with both columns and a command for each row.
  - [ ] The PR template has the Type line and definitions.
  - [ ] Manual §2 has the label instruction.
  - [ ] The monthly line is in `docs/ops/vendors.md` or in the PR's Coordination list.
  - [ ] This PR carries `type: docs`, or says the label is missing.
- **Verify:** plain container. Run each metric command and paste the outputs. `gh label list` needs repo read access; if it is unavailable, say so.
- **Owner actions:**
  - [ ] Create the labels: `gh label create "type: feature" -c 1D76DB; gh label create "type: fix" -c D93F0B; gh label create "type: maintenance" -c 5319E7; gh label create "type: docs" -c 0E8A16`.
  - [ ] Each month (Nov–Apr), during the WS9-08 monthly check, record your honest hours estimate and the label counts.
- **Rollback:** revert the PR. The labels can stay.

---

### WS5-06a · Remove parked local-government and executive-order code

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 (merge by 11-14) | Opus | M | WS5-02 (soft: WS2-07) | E3, E1, E5, A1 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none for the code. The product decision was made on 2026-05-18 (local government paused), and executive orders were never wired in. Dropping the tables is Deferred.
- **Data-limit impact:** none. Nothing is fetched. This removes four dormant scrapers (Legistar, the governor's site, JCPS/FCPS and county calendars) that could still be triggered manually through `?source=`.
- **Ongoing cost:** removes about 1.3k lines across 6 lib files and parts of 7 others. That shrinks `ky-sync-pipeline.ts` by about 230 lines before WS4-06 and WS4-13 edit it, and drops 3 of the sync route's accepted `source` values. About 0.5 h/month less.
- **Why:** Parked code is about 1,100 lines that must still compile, lint and survive upgrades. It also keeps an AI generator path alive for content the site does not show (E3, E5). Restoring it later is a `git checkout` (O1).
- **Current state (verified 2026-10-06):**
  - **Lib files to delete:** `src/lib/ky-legistar-client.ts` (129 lines), `ky-executive-orders.ts` (189), `ky-school-boards.ts` (151), `ky-county-courts.ts` (221), `legistar-text.ts` (82) and `legistar-matter.ts` (111).
  - **`src/lib/ky-data-sources.ts`:**
    - imports at ~20–24. Keep line 21 (`getKyLegiScanClient`) and line 23 (`getKyOpenStatesClient`).
    - parked re-export blocks at ~49–83
    - `getAllKyDataSources()` at ~89–97, with no caller
    - five scripts import `getKyLegiScanClient` from this file, and that import stays
  - **`src/lib/ky-sync-pipeline.ts`:**
    - parked imports at ~10–15, ~25 and ~40–47
    - `syncLouisvilleOrdinances` (line 1883) through `syncCountyActions` (~2038–2101)
    - `SYNC_SOURCES_PAUSED_FROM_CRON` (line 2107), used by `scripts/manual-sync.ts` lines ~42 and ~84
    - parked `SYNC_SOURCES` keys at ~2114–2126: the `ordinances` lambda at 2114, `'school-boards'` at 2125 and `'county-actions'` at 2126
  - **`src/lib/ky-search-bills.ts`:** `fetchKyOrdinancesMatchingSearch` and `fetchKySchoolBoardMatchingSearch` (~631–690), with no caller.
  - **`src/lib/ky-content-generation.ts`:** `generateOrdinanceSummary`, `generateEOSummary` and `generateSchoolBoardSummary` (~114–155), with no caller once WS5-02 deletes `content-generation.ts`. Their type imports are at ~9–11. WS3-04 (W0) deletes one other line in this file.
  - **`src/types/kentucky.ts`:** `KYOrdinance`, `KYExecutiveOrder`, `KYSchoolBoardItem` and `KYCountyAction` (~228–290). `ky-intelligence.ts` imports `KYOrdinance`.
  - **`ky-intelligence.ts` and `anthropic-cache.ts`:** deleted by WS5-02 if WS2-07 had merged. Otherwise they are still imported by `src/app/api/intelligence/route.ts`, which reads `ky_ordinances` (~line 51).
  - **Comment mentions to keep in step:**
    - `src/components/ui/CivicCard.tsx` line 10, variant `'ordinance'` (no caller passes it)
    - `src/app/api/sync/[source]/route.ts` line 6
    - `README.md` line 5
    - `src/lib/source-health.ts` doc comment at ~97, which names `SYNC_SOURCES_PAUSED_FROM_CRON`
  - **`src/lib/source-health.ts`:** `UNMONITORED_SOURCES` (~99–107) lists these sources because their `ky_sources` rows still exist. Removing the keys would turn them into "unknown source" breaches.
- **Do:**
  1. Delete the 6 lib files.
  2. In `ky-data-sources.ts`, remove the parked imports and re-export blocks, keeping the LegiScan and Open States ones. Delete `getAllKyDataSources`.
  3. In `ky-sync-pipeline.ts`, remove:
     - the parked imports
     - the functions from `syncLouisvilleOrdinances` through `syncCountyActions`
     - the three parked `SYNC_SOURCES` keys
     - `SYNC_SOURCES_PAUSED_FROM_CRON`
     
     Update the header comment above `SYNC_SOURCES_DEFAULT`. **Do not touch any other function.**
  4. In `scripts/manual-sync.ts`, remove the `SYNC_SOURCES_PAUSED_FROM_CRON` import and the help line.
  5. Remove these unused pieces:
     - the two search functions from `ky-search-bills.ts`
     - the three generator functions and their type imports from `ky-content-generation.ts`, leaving the bill prompt byte-identical
     - the four interfaces from `src/types/kentucky.ts`, but only if `grep` finds no other user. If `ky-intelligence.ts` still exists, keep `KYOrdinance`.
  6. Remove the `'ordinance'` variant from `CivicCard.tsx` if `grep -rn "'ordinance'" src` finds no caller.
  7. If `ky-intelligence.ts` and `anthropic-cache.ts` still exist and `src/app/api/intelligence/` does not, delete them. If the route still exists, leave all three and say so in the PR.
  8. In `source-health.ts`, keep every `UNMONITORED_SOURCES` key. Change each parked reason string to `'archived <date> (WS5-06a); ky_sources row remains (tables deferred)'`. Rewrite the doc comment at ~97 so it no longer names `SYNC_SOURCES_PAUSED_FROM_CRON`.
  9. Write the next ADR in `docs/adr/`, or a PR-body note if `docs/adr/` does not exist. It records:
     - what was removed
     - the archive SHA (`main` before this PR)
     - the restore command `git checkout <sha> -- <paths>`
     - that the 4 tables and their `ky_sources` rows remain
  10. Update the README scope line (or leave it to WS5-04b if that PR is open) and the doc comment in `api/sync/[source]/route.ts`.
- **Don't:**
  - Change bills, legislators, votes or LRC sync logic.
  - Change the summary prompt or its hash inputs.
  - Write a migration.
  - Remove `UNMONITORED_SOURCES` keys.
  - Touch the topic classifier's "Local Government" topic (it tags state bills).
- **Acceptance criteria:**
  - [ ] `grep -rln "legistar\|Legistar\|ExecutiveOrder\|SchoolBoard\|CountyAction\|KYOrdinance\|ky_ordinances\|ky_executive_orders\|ky_school_board_items\|ky_county_actions" src scripts` prints nothing. Exception: if `src/app/api/intelligence/route.ts` still exists, it may print that file, `src/lib/ky-intelligence.ts` and `src/types/kentucky.ts` (for `KYOrdinance`), and the PR says so. (`source-health.ts` keeps kebab-case keys such as `'school-boards'`, which this pattern does not match.)
  - [ ] `grep -n "SYNC_SOURCES_PAUSED_FROM_CRON" -r src scripts` prints nothing.
  - [ ] `git diff main -- src/lib/ky-sync-pipeline.ts` shows deletions only, apart from the header comment and import lines.
  - [ ] `git diff main -- src/lib/ky-content-generation.ts` shows no change inside the bill-summary prompt or its hash inputs. If WS1-11 has landed, its pinned-hash test passes unchanged.
  - [ ] The orphan check passes with no new allowlist entries.
  - [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build` pass. `npm run typecheck:scripts` passes too, if it exists.
- **Verify:** plain container. Run the commands above; no secrets are needed. Optional owner check on a preview deployment: `GET /api/sync?source=ordinances` with a valid token now returns the "Unknown source" result.
- **Owner actions:**
  - [ ] Optional: tag the archive SHA with `git tag archive/local-gov-2026-11 <sha> && git push origin archive/local-gov-2026-11`.
- **Rollback:** revert the PR. The tables were never touched, so a revert fully restores manual sync.

---

### WS5-07 · Retire the LLM triage step and the two daily Claude Code Routines

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 10-30) | Sonnet | S | none (Routine action after WS9-02) | E5, E13, E14, E2, D7, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** What to keep from the advisory AI layer.
  - **Options:**
    - (a) Remove `triage-findings.ts` and its two workflow steps, and disable both Routines: "System health check" at 12:00 UTC and "kyvky.com accuracy spot check" at 13:05 UTC.
    - (b) Remove triage, and keep only the health-check Routine, weekly, during W3.
    - (c) Keep everything.
  - **Recommended:** (a).
    - WS9-01/02 route page-worthy alerts to the owner's phone, so the Routines' "someone is watching" role is covered.
    - The raw Slack digests, Sentry alerts and source-health breaches (plus WS4-08 pace alerts) already say what broke.
    - WS3 no longer builds a review queue, so there is no replacement evidence to wait for.
    - Each Routine run creates owner review work. The health-check Routine also had an orphan-branch pileup that needed its own protocol (decisions.md § 2026-07-18).
  - **Default:** the agent removes the triage code in W1 regardless. The owner disables both Routines once WS9-02's phone page has been confirmed. If they are still running on **2026-11-10**, `CURRENT.md` lists "Disable the two Routines (WS5-07)" as an **overdue owner action**.
- **Data-limit impact:**
  - **Removes the triage Anthropic calls:** about 30 daily source-health runs plus about 4 weekly audit runs a month, each small. Read the real spend from WS4-07's meter if it has merged; otherwise it is unknown [verify in the Anthropic console].
  - **Disabling the Routines** removes their Claude Code usage and any kyvky.com or LRC page fetches the spot-check Routine makes [verify by reading its prompt in the Claude Code web UI].
  - No new spend.
- **Ongoing cost:** removes 2 daily scheduled agent sessions (owner review, branch hygiene), 1 script (311 lines), 2 workflow steps and 1 Slack function. Estimated 1–3 h/month less. This is the second-largest reduction in WS5 and the largest in "process about the process" (E13).
- **Why:**
  - The project has a check, then an LLM that interprets the check, then a daily agent that inspects both. Each layer has its own failure modes (E5, E13).
  - The Routines are tied to the owner's personal account, which blocks a handover (E14).
  - Deterministic alerts that reach a person (D7, WS9) are the durable replacement (O1).
- **Current state (verified 2026-10-06):**
  - `scripts/triage-findings.ts` (311 lines) calls Anthropic with `KY_DEFAULT_ANTHROPIC_MODEL` and posts with `notifyTriageSlack`.
  - It runs from two workflow steps, both `continue-on-error: true`:
    - `.github/workflows/accuracy-audit.yml`, step "Triage findings" (~78–95)
    - `.github/workflows/source-health.yml`, step "Triage source health" (~84–99)
  - `notifyTriageSlack` is in `src/lib/slack-webhook.ts` (~546, doc comment at ~539).
  - `src/lib/accuracy-audit/history.ts` lines ~161–168 have comments saying triage reads the outage fields. The fields are also used by the Slack digest [verify by grep before touching].
  - `package.json` has `triage:findings` and `triage:findings:dry`.
  - The Routines are recorded in `TASKS.md` line ~181, decisions.md § 2026-07-18 (~1623) and decisions.md § 2026-07-31 "Triage agent on the check workflows" (~1952).
  - WS4-11's registry deliberately does not list Routines; it defers to `CURRENT.md`.
- **Do:**
  1. Delete `scripts/triage-findings.ts`. Remove both workflow steps. Remove the `ANTHROPIC_API_KEY` env line in `source-health.yml` if no other step there uses it. Keep it in `accuracy-audit.yml`, where the audit's LLM pass uses it.
  2. Remove `notifyTriageSlack`, and any helper only it uses, from `slack-webhook.ts`. Reword the two comments in `history.ts` so they no longer mention triage. Do not change the fields.
  3. Remove the two npm aliases.
  4. In `CURRENT.md` § Owner-account automations, set both Routines to "to disable after WS9-02 (WS5-07)". If `CURRENT.md` does not exist yet, put this in the PR body for WS5-03b.
  5. Write the next ADR. It supersedes decisions.md § 2026-07-31 "Triage agent" and, under (a), § 2026-07-18. Note in it that the Routines are an E14 handover blocker until disabled (for WS9-08 and WS8-14a).
- **Don't:**
  - Change the audit, the source-health evaluator, its thresholds or its Slack digests.
  - Remove the workflows' failure notifiers.
  - Disable Routines yourself.
  - Touch the parts of `source-health.yml` that WS9-01 edits beyond the triage step. If both are open, the second to merge rebases.
- **Acceptance criteria:**
  - [ ] `grep -rn "triage-findings\|triage:findings\|notifyTriageSlack" src scripts .github package.json` prints nothing.
  - [ ] Both workflows still parse: `python3 -c "import yaml,sys;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/accuracy-audit.yml .github/workflows/source-health.yml` exits 0.
  - [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container for the commands above. Workflow behavior needs secrets: after merge, the owner triggers `workflow_dispatch` on `source-health.yml` once and expects the Slack health digest with no triage follow-up.
- **Owner actions:**
  - [ ] Answer by 2026-10-24 if you want (b) or (c). Otherwise (a) applies.
  - [ ] After WS9-02's test page reaches your phone, disable both Routines in the Claude Code web UI (Routines → each → Disable). Record the date in `CURRENT.md`. Under (b), set the health-check Routine to weekly for W3 only.
  - [ ] Run `source-health.yml` once manually and confirm the digest arrives.
- **Rollback:** revert the PR and re-enable the Routines in the web UI. Disabled Routines are kept, so re-enabling them keeps their grants.

---

### WS5-08 · Move build- and script-only dependencies to dev and record `react-email` reachability

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 (before WS2-11c opens, about 11-21) | Sonnet | S | WS2-01, WS5-02 | E4, S2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none for this PR. Vendoring the email components so that `react-email` can be dropped is a separate Opus-tier choice, listed in Deferred.
- **Data-limit impact:** none. No email is sent and no digest preview is run (manual §4).
- **Ongoing cost:**
  - Smaller production dependency list.
  - One ADR that answers the recurring "socket.io advisory in production" question (S2) once, instead of at every audit.
  - Removes nothing from the install tree, because `react-email` stays.
- **Why:**
  - `dotenv`, `autoprefixer` and `postcss` are production dependencies but are used only by scripts or the build (E4).
  - `react-email` pulls in its preview CLI's socket.io stack (S2).
  - The obvious swap is not possible: on 2026-10-06, `@react-email/components` 1.0.12 and the individual `@react-email/*` component packages are deprecated on npm ("Package no longer supported"). Only `@react-email/render` (2.1.0) is current, and `react-email` 6.6.6 now bundles the components itself.
  - The honest fix is to prove the CLI is not shipped and to write that down.
- **Current state (verified 2026-10-06):**
  - **The package:**
    - `node_modules/react-email/package.json` (6.6.6) exports only `.` (`dist/index.mjs` / `dist/index.cjs`), plus a `bin.email` CLI at `dist/cli/index.mjs`.
    - Its dependencies include `socket.io`, `chokidar`, `esbuild`, `tailwindcss`, `commander` and `@react-email/render`.
    - The runtime entry `dist/index.mjs` imports only `react`, `react/jsx-runtime`, `@react-email/render`, `marked`, `prismjs` and `tailwindcss`. It does not import socket.io.
  - **Our imports** are all from the root specifier `'react-email'`:
    - `src/lib/email/welcome-email.tsx`, `src/lib/email/bill-digest-email.tsx`, `src/lib/email/brand.tsx`
    - `render` in `src/lib/digest/run-bill-digest-cron.tsx` line 2, `src/app/api/me/welcome-email/route.tsx` line 8 and `scripts/preview-welcome-email.tsx` line 16
  - **`dotenv`** is imported only by `scripts/load-env.ts` once WS5-02 deletes the two `transcribe.ts` files.
  - **`autoprefixer` and `postcss`** are referenced only by `postcss.config.js` (WS5-10 removes it).
  - **Builds already rely on devDependencies** (`typescript`, `@tailwindcss/postcss`). GitHub Actions runs `npm ci`, which installs devDependencies.
- **Do:**
  1. Confirm the registry state (allowed; not a data-limited vendor): `npm view @react-email/components deprecated` and `npm view @react-email/render version deprecated`. If `@react-email/components` is **no longer** deprecated, stop and report (manual §9), because the cheaper swap may be back on the table.
  2. Move `dotenv` to `devDependencies`, after checking that `grep -rln "dotenv" src` prints nothing.
  3. If `postcss.config.js` still exists (WS5-10 not merged), move `autoprefixer` and `postcss` to `devDependencies`. **Keep the `overrides.postcss` pin** (WS2's domain). Run `npm install` and commit the lockfile.
  4. Gather reachability evidence and paste it in the PR:
     - `grep -rnE "from ['\"]react-email/" src scripts` prints nothing (no subpath imports)
     - `npm ls socket.io --omit=dev` shows the path through `react-email`
     - after `npm run build`, `grep -rl "socket.io" .next/server --include=*.nft.json | head` [verify the trace-file layout for the installed Next version] shows whether any server trace includes socket.io. Expected: none.
  5. Add a `describe('react-email entry')` block to `src/lib/repo-invariants.test.ts` (or a small `src/lib/react-email-entry.test.ts`). It asserts that no file under `src/` or `scripts/` imports a `react-email/…` subpath.
  6. Write the next ADR, `NNNN-react-email-cli-not-shipped.md` (≤ 20 lines). It records:
     - the evidence
     - that the socket.io advisory is accepted as "installed, not reachable"
     - the revisit triggers: an advisory in `react-email`'s runtime entry; `react-email` dropping its component exports; or a server trace that includes socket.io
     
     Put "S2: accepted, see ADR" under "Coordination" for WS2-14.
- **Don't:**
  - Change email markup, copy, styles, the postal-address footer or `List-Unsubscribe` headers.
  - Change import specifiers.
  - Add `@react-email/components` or other deprecated packages.
  - Run `preview:digest` or `preview:welcome` with `--send` or `--inject`.
  - Upgrade React or MUI.
- **Acceptance criteria:**
  - [ ] `node -e 'const d=require("./package.json").dependencies;console.log(["dotenv","autoprefixer","postcss"].filter(k=>d[k]))'` prints `[]`.
  - [ ] The reachability evidence is in the PR, and the server-trace grep prints nothing.
  - [ ] The ADR exists, and the subpath-import test passes in `npm test`.
  - [ ] WS1-12's email tests pass unchanged, and both rendered emails still contain `KYVKY_POSTAL_ADDRESS` (if WS1-12 has merged).
  - [ ] `npm ls --omit=dev --all --parseable | wc -l` before and after is recorded.
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container. Run the commands above. The digest preview needs production user data, so the owner runs it.
- **Owner actions:**
  - [ ] After merge, run `npm run preview:digest` with no send flags (needs prod env) and check the HTML in a browser.
- **Rollback:** revert the PR. The lockfile reverts with it.

---

### WS5-09 · Remove the public `/design-system` page and the 712 KB design export

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | none | E3, E1, U13, T5, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** What to keep of the design-system work.
  - **Options:**
    - (a) Delete the in-app page (`src/app/design-system/`) and `design-system/design-system.html`. Keep `design-system/guidelines.md`, `audit.md`, `cleanup.md` and the assets index as the written spec.
    - (b) Keep the page and delete only the HTML export.
    - (c) Keep both.
  - **Recommended:** (a).
    - The written guidelines are the proof of design thinking (O4).
    - The page is a third copy of every token that must be kept in sync (`design-system/cleanup.md` "Golden rule").
    - It ships 106 KB of client code plus 140 KB of map data.
  - **Default:** (a) if no answer by **2026-11-10**.
- **Data-limit impact:** none.
- **Ongoing cost:** removes about 2,900 lines of `'use client'` code and one token copy. About 0.5 h/month less during design work.
- **Why:** A public, footer-linked style guide is overhead for a site whose users come to find their legislator (T5). The 712 KB export is a build artifact checked into the repo (E3).
- **Current state (verified 2026-10-06):**
  - `src/app/design-system/` holds `page.tsx` (2,887 lines, `'use client'`), `ky-map-data.ts` (140 KB in 11 lines) and `layout.tsx` (`robots: noindex`).
  - `src/app/components/SiteFooter.tsx` line 54 links `/design-system` in the legal links. No other `src/` file links to it.
  - `design-system/design-system.html` is 711,979 bytes and is linked only from `design-system/index.html`.
  - `src/lib/theme.ts` line ~56 says the tokens are "consumed by MUI and by the in-app design-system page" (step 4 rewrites it). `src/app/globals.css` line ~28 cites `design-system/guidelines.md`, which stays.
- **Do (under (a)):**
  1. Delete `src/app/design-system/` and `design-system/design-system.html`.
  2. Remove the footer link.
  3. Remove the `design-system.html` link from `design-system/index.html`. If only markdown links then remain, delete `index.html` and add a 3-line `design-system/README.md` that indexes them.
  4. Change the `theme.ts` comment to "consumed by MUI". Update the "Golden rule" in `design-system/cleanup.md` to list the remaining token locations.
  5. Remove `/design-system` from the README's hidden-routes line.
- **Don't:**
  - Change tokens, `theme.ts` values, `globals.css` values or `guidelines.md` content.
  - Rewrite git history to purge the 712 KB file.
- **Acceptance criteria:**
  - [ ] `grep -rn "design-system" src` returns only comments pointing to `design-system/guidelines.md`.
  - [ ] `test ! -e design-system/design-system.html` succeeds.
  - [ ] `grep -n "/design-system" src/app/components/SiteFooter.tsx` prints nothing.
  - [ ] `npm run build` passes, and `/design-system` returns 404 under `npm run start`.
  - [ ] `npx tsc --noEmit`, `npm test` and `npm run lint` pass.
- **Verify:** plain container. Run the build and `npm run start`, then `curl -s -o /dev/null -w "%{http_code}" localhost:3000/design-system`, which should print `404`. The footer can be checked visually on any page of the Vercel preview (owner, optional).
- **Owner actions:**
  - [ ] Answer by 2026-11-10.
- **Rollback:** revert the PR.

---

### WS5-10 · Remove the Tailwind and PostCSS toolchain

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 (merge by 11-14, else Deferred) | Sonnet | M | WS5-02, WS5-09 | E4, S1, U13 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** removes a second CSS system, a config file that Tailwind v4 most likely does not load, and one token copy. About 0.5 h/month less, and fewer upgrade surprises.
- **Why:** Tailwind is used in about 10 files, against about 130 that use MUI `sx`. Once WS5-02 deletes the dead ones, only 3 live files use it. `globals.css` keeps v3 directives under Tailwind v4 (E4).
- **Timing rule.** This is a global CSS change and should land well before the session and the Next 16 upgrade.
  - Merge by **2026-11-14**, before WS2-11a's 11-20 target and before WS2-11c opens.
  - If it cannot merge by then, close the PR unmerged and move this WP to Deferred (W5).
  - Do not schedule it after WS2-11c.
- **Current state (verified 2026-10-06):**
  - **Directives and config:**
    - `src/app/globals.css` lines 1–3: `@tailwind base; @tailwind components; @tailwind utilities;`.
    - `postcss.config.js` loads `@tailwindcss/postcss` and `autoprefixer`.
    - `tailwind.config.js` (65 lines) defines token aliases. Tailwind v4 does not load a JS config without an `@config` directive [verify in the v4 docs].
  - **Live Tailwind class users:**
    - `src/app/auth/layout.tsx` line 7
    - `src/app/error.tsx` lines ~28–83
    - `src/app/layout.tsx` lines ~111 and ~125
    - `src/components/ui/Tooltip.tsx` line ~178 adds `animate-fade-in`, which is defined nowhere
    - `src/components/ui/LegislativeStageTooltip.tsx` line ~99 passes `maxWidth="max-w-md"` [verify whether `Tooltip.tsx` reads that prop; line ~184 uses `TOOLTIP_MAX_WIDTH`]
  - **Not Tailwind:** the custom classes (`skip-link`, `sr-only`, `tooltip-container`, `member-card-*`, and `kv-*` in emails) are defined in `globals.css` or the email templates.
  - `CssBaseline` is mounted in `src/app/components/ClientThemeProvider.tsx` line ~16.
  - Next.js applies its own default PostCSS (with autoprefixer) when no `postcss.config.*` exists [verify in the Next docs for the installed version].
  - The container has no Supabase secrets and no Playwright browsers installed. Pages backed by data render empty or error states there.
- **Do:**
  1. **Before any change**, run `npm run build` and save the compiled CSS with `cat .next/static/css/*.css > /tmp/css-before.css`. Record:
     - (i) whether it contains a Tailwind preflight signature, for example `*,:after,:before{box-sizing:border-box` together with `border:0 solid`
     - (ii) which Tailwind utility classes used by the 3 live files appear in it
  2. Replace the Tailwind classes:
     - `auth/layout.tsx` and the two `layout.tsx` wrappers: use MUI `Box` `sx` with the same values (`display:flex`, `flexDirection:column`, `flex:1`, `minHeight:0`, `minHeight:'100vh'` on body, `px:2`, `py:{xs:3, sm:5}`)
     - `error.tsx`: use MUI `Box`, `Typography` and `Button`, with theme tokens rather than raw blue and gray
     - drop `animate-fade-in`, and fix the `max-w-md` prop usage. If `Tooltip.tsx` ignores the prop, leave it untouched and note it.
  3. Delete the three `@tailwind` lines, `tailwind.config.js` and `postcss.config.js`. Remove `tailwindcss` and `@tailwindcss/postcss` from `devDependencies`, and `autoprefixer` and `postcss` from whichever dependency list holds them. **Keep the `overrides.postcss` pin** (WS2). Run `npm install`.
  4. Build again and save `/tmp/css-after.css`. Then:
     - If the before-CSS had preflight, add to `globals.css` only the minimal base rules needed to keep box-sizing and border defaults. List each rule with its reason.
     - Diff the two files at the rule level: `npx prettier --parser css` on both, then `diff`. Paste the summary in the PR.
  5. Screenshots, if the tooling works in the container: `npx playwright install chromium`, then `npx playwright screenshot --viewport-size=390,844 <url> <file>` and the same at 1440×900. Take them before and after for pages that render without Supabase data:
     - `/auth/login`
     - `/about`
     - a 404 URL
     - the error page, forced by a temporary `throw` in a page that you do **not** commit
     
     If Playwright cannot install or run, write "screenshots not available" and rely on the CSS gate plus the Owner check.
  6. Update `design-system/cleanup.md` (the "Golden rule" token locations) and remove the README stack mention.
- **Don't:**
  - Restyle anything.
  - Change MUI theme values.
  - Touch email `className`s.
  - Add a CSS framework or a dependency (Playwright runs through `npx` and is not added to `package.json`).
  - Touch `next.config.ts` (WS2-11c).
  - Commit the forced-error `throw`.
- **Acceptance criteria:**
  - [ ] `ls tailwind.config.js postcss.config.js` fails for both files.
  - [ ] `grep -n "@tailwind" src/app/globals.css` prints nothing.
  - [ ] `grep -rn "tailwind" package.json` prints nothing, except `overrides` entries owned by WS2.
  - [ ] **CSS gate (container-checkable).** The PR shows the before/after compiled CSS sizes and the rule-level diff summary. Every removed rule is either a Tailwind utility that none of the 3 converted files still uses, or preflight that is replaced by a listed base rule.
  - [ ] No-data screenshots are attached, or the PR says "screenshots not available".
  - [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container for everything above. The data-page visual check is an Owner action on the preview.
- **Owner actions:**
  - [ ] Before merging, open the Vercel preview at 390 px and 1440 px and compare it with production. Check `/`, `/bills`, one bill page, `/members`, `/members/map`, `/meetings` and `/auth/login`. Expect no layout change.
- **Rollback:** revert the PR. That restores the config files, directives and dependencies.

---

### WS5-12a · Check for surname collisions and, if any, require a first-initial match on profile sponsor matching

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 if triggered | W0 owner check (by 10-13); W1 fix (by 10-30) | Opus | S | none | E10, N2, T5, C8, U11, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** whether the fix is needed. That depends on the owner's aggregate query.
  - **Trigger:** `surname_suffix_pairs > 0` **or** `no_legiscan_id > 0`.
  - **If triggered:** this WP is P0 and should merge by 10-30. Because it is P0, it may merge during the election freeze if it slips.
  - **If not triggered:** close it as "not needed now". WS5-12b pins the current behavior as a KNOWN RISK.
  - **Default:** if the query has not been run by **2026-10-16**, the agent applies the fix anyway. It only narrows matching, so it fails toward showing fewer bills rather than wrong ones.
- **Data-limit impact:** none. One read-only aggregate query on our own database (Owner), and synthetic test fixtures.
- **Ongoing cost:** one small helper and 3 tests. About 0.
- **Why:**
  - Member profiles serve the site's one real behavior (T5), and "what has my rep done" demand peaks before the 11-03 election (C8).
  - The profile's sponsor matching calls `matchLegislatorBySponsorName([leg], name)` with a one-element roster. In that case the last-name fallback's "single hit" rule accepts any sponsor whose normalized name **ends with** the member's surname. For example, "Anderson" also matches "Sanderson".
  - On the no-`legiscan_id` path, `resolveLegiscanPeopleIdFromBillSponsors` can then adopt another member's `people_id` by majority count. The profile would list the other member's bills (E10). This is inferred from code and not yet checked against data.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-member-utils.ts` `matchLegislatorBySponsorName` (~715): an exact match, then first+last, then a fallback that takes the last token (> 2 chars) and accepts legislators whose `last_name` equals it **or** whose normalized `name` `endsWith` it, returning the single hit.
  - `src/lib/member-profile-data.ts`:
    - `memberSponsorRole` (~36–49) and `billListsLegislatorAsSponsor` (~59–71) call it with `[leg]` (~44 and ~68).
    - `resolveLegiscanPeopleIdFromBillSponsors` (~74–110) uses `billListsLegislatorAsSponsor` to vote on a `people_id`.
    - `fetchSponsoredBillsForLegislator` (~250–287) takes the name path when `legiscan_id` is null or the by-id query returns nothing.
  - `ky_legislators` has `legiscan_id`, `last_name`, `chamber` and `active` (`supabase/migrations/001_kentucky_schema.sql` lines ~23–35).
- **Do (only if triggered or by default):**
  1. Add `sponsorNameMatchesLegislator(leg, sponsorName): boolean` to `src/lib/ky-member-utils.ts`. It returns true when either:
     - the normalized full name or first+last name equals the normalized sponsor string (the same first two rules as today), or
     - the sponsor string has at least 2 tokens, its last token **equals** `leg.last_name` (not `endsWith`), and its first token's first letter equals the first letter of `leg.first_name` (or of the first token of `leg.name`)
     
     Surname-only sponsor strings return false.
  2. In `member-profile-data.ts`, replace the two `matchLegislatorBySponsorName([leg], …)?.id === leg.id` calls with `sponsorNameMatchesLegislator(leg, …)`. Do not change `matchLegislatorBySponsorName` itself or its other callers, which pass full rosters.
  3. Add `src/lib/ky-member-sponsor-match.test.ts` (`node:test`, synthetic names only). It covers:
     - an exact match still matches
     - a same-surname sponsor with a different first initial does not match
     - a suffix surname ("Sanderson" vs member "Anderson") does not match
     - a surname-only sponsor does not match
  4. Under "Found, not fixed", note that `matchLegislatorBySponsorName`'s `endsWith` rule also applies to full-roster callers. WS5-12b pins it.
- **Don't:**
  - Change the by-`people_id` path, `matchLegislatorBySponsorName`, sync code or roster cadence.
  - Use real legislator names in fixtures.
- **Acceptance criteria:**
  - [ ] `grep -n "matchLegislatorBySponsorName(\[leg\]" src/lib/member-profile-data.ts` prints nothing.
  - [ ] The new test file passes, with the 4 cases above.
  - [ ] The PR's "Findings re-checked" cites N2.
  - [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container. Run the commands above. Production check (Owner): open 3 member profiles on the preview and confirm the sponsored-bill lists look unchanged, or are shorter only where a wrong bill was removed.
- **Owner actions:**
  - [ ] **By 2026-10-13**, run in the Supabase SQL editor (read-only, counts only, no names), and post the two numbers in the WS5-12a issue or PR:

    ```sql
    select
      (select count(*) from ky_legislators where active and legiscan_id is null) as no_legiscan_id,
      (select count(*) from ky_legislators a join ky_legislators b
         on a.id <> b.id and a.active and b.active and a.chamber = b.chamber
        and length(a.last_name) > 2
        and lower(b.last_name) like '%' || lower(a.last_name)) as surname_suffix_pairs;
    ```

  - [ ] If the fix merges, check 3 profiles on the preview before promoting.
- **Rollback:** revert the PR. The old matching returns.

---

### WS5-12b · Pin legislator name matching with characterization tests

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS5-12a | E10, N2, E7, T5, D2, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. Behavior changes beyond WS5-12a go in a separate follow-up PR, only on owner request.
- **Data-limit impact:** none. Tests use synthetic fixtures. No LegiScan, Open States or LRC calls.
- **Ongoing cost:** one test file, about 0 upkeep while the behavior is stable. It removes the debugging cost of silent mismatches, such as a wrong `legiscan_id` reconciliation or sponsorships attributed to the wrong member.
- **Why:** Matching people across LegiScan, Open States, LRC and free-text sponsor names decides whose votes and bills appear on "your legislator" pages, the site's one real behavior (T5). It has no tests (E7, E10). Any future split of the sync file needs these tests first.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-member-utils.ts`: `normalizeSponsorNameForMatch` (~290) and `matchLegislatorBySponsorName` (~715), plus `sponsorNameMatchesLegislator` if WS5-12a merged.
  - `src/lib/ky-member-committees.ts` `legislatorNameMatchesLegiscanSessionPerson` (~158) matches by substring in both directions, with a first-initial plus last-name fallback.
  - `src/lib/ky-sync-pipeline.ts` has three private helpers: `legiscanSessionRoleToChamber` (~1226), `legiscanSessionPeopleAtSeat` (~1233) and `legiscanSessionPeopleMatchingLegislatorName` (~1246). `reconcileKyLegislatorLegiscanIdsFromLatestSession` (~1283) uses them.
  - Inside `ky-sync-pipeline.ts`, `legislatorNameMatchesLegiscanSessionPerson` (import at line ~23) is used only at ~1275, inside a helper being moved. The `LegiScanSessionPerson` type (import at ~78) is used only in the helpers.
  - `normalizeKyLegislatorDistrictForDb` lives in `src/lib/ky-district-geo.ts`.
  - Existing tests use `node:test` (for example `src/lib/ky-sessions.test.ts`).
- **Do:**
  1. Create `src/lib/ky-legislator-matching.ts`. **Move** the three private helpers from `ky-sync-pipeline.ts` into it verbatim, exported, and import them back into the pipeline. Remove pipeline imports that become unused (expected: `legislatorNameMatchesLegiscanSessionPerson` and `LegiScanSessionPerson`). This is the only edit to `ky-sync-pipeline.ts`.
  2. Create `src/lib/ky-legislator-matching.test.ts` with at least 30 assertions, using **synthetic** names only (manual §7). Cover:
     - **`normalizeSponsorNameForMatch`:** honorifics (Rep., Representative, Sen., Senator), punctuation, hyphenated and apostrophe surnames, extra whitespace, case.
     - **`legislatorNameMatchesLegiscanSessionPerson`:**
       - exact match
       - full name contained in the target, and the reverse
       - first initial plus last name
       - a different first initial with the same last name (expect false)
       - an empty target
     - **`matchLegislatorBySponsorName`** (full roster):
       - exact match and first+last
       - a unique last-name fallback across a roster of ≥ 3
       - an ambiguous last name (expect null)
       - a last name of ≤ 2 characters (no fallback)
       - the **`endsWith` suffix case**: assert the current behavior and label it `// KNOWN RISK (WS5-12b)`
       - if WS5-12a did not merge, the **one-element-roster surname collision**, labelled the same way
     - **The moved helpers:**
       - role-to-chamber mapping ("Rep", "Sen", "Del", unknown)
       - seat filtering with district normalization, for example legacy 3-digit Senate strings as the comment at `ky-sync-pipeline.ts` ~1595 describes
       - wrong chamber excluded
       - a name match inside the right seat
       - a seat-only fallback candidate list
  3. Under "Found, not fixed" in the PR, list each KNOWN RISK case and the code path that reaches it.
- **Don't:**
  - Change any matching behavior in this PR.
  - Touch `runLegislatorsSync`'s fetching or roster cadence (WS4-12).
  - Use real legislator names or production data in fixtures.
- **Acceptance criteria:**
  - [ ] `git diff main -- src/lib/ky-sync-pipeline.ts` shows only three things: the removal of the three helper bodies, one added import, and the removal of imports that became unused (expected: `legislatorNameMatchesLegiscanSessionPerson` and `LegiScanSessionPerson`).
  - [ ] `node --import tsx --test src/lib/ky-legislator-matching.test.ts` passes, and `grep -c "assert\." src/lib/ky-legislator-matching.test.ts` ≥ 30.
  - [ ] Each KNOWN RISK case is present and documented in the PR.
  - [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container. Run the commands above; no secrets are needed.
- **Owner actions:** none.
- **Rollback:** revert the PR. Moving the helpers back restores the original file.

---

### WS5-13 · Re-measure maintenance after the session and grade each plumbing subsystem

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 (merge by 04-17) | Sonnet | S | none (soft: WS5-05) | E13, E5, E1, E12, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The owner supplies the hours.
- **Data-limit impact:** none.
- **Ongoing cost:** none. This is a one-time report that feeds WS7-13, WS8-14a, WS8-16, WS9-14 and WS5-16.
- **Why:**
  - The W4 decision and any partner conversation need to know what it costs to keep KYvKY running.
  - Numbers measured through a real session (E13, O3, O4) answer that; the audit's 25–45 h/month [I] cannot.
  - E5 (34% of code is data plumbing) can only be cut on evidence of which subsystems earned their upkeep.
- **Current state (verified 2026-10-06):**
  - No baseline or label data exists yet. WS5-05 creates both.
  - WS8-08 fixes this report's path at `docs/evaluation/2027-04-maintenance.md`.
  - Events are logged in `docs/ops/log.md` (WS9-04) and corrections in `/corrections` (WS3-14), if those WPs merged.
  - WS5-05 is Backlog, so its metrics table and PR labels may not exist. WS9-08's §Monthly check logs owner hours whether or not WS5-05 shipped.
- **Do:**
  1. Fill the W4 column of the `CURRENT.md` metrics table with the commands recorded there. **Fallback if that table does not exist (WS5-05 not merged):** run the commands listed in WS5-05's "Current state" table once on a temporary local checkout of `a4e543a` (`git worktree add <scratch dir> a4e543a`, removed afterwards) and once on `main`. Put both columns in the report instead.
  2. For November through March, take from the `check` entries in `docs/ops/log.md` (if WS5-05 did not ship, the PR-type share is "no data"):
     - **owner hours per month (primary)**
     - **merged-PR share by type (secondary)**, including the unlabelled share
  3. Build the **plumbing subsystem table**, one row per subsystem:
     - accuracy-audit checkers (`src/lib/accuracy-audit/`)
     - source-health (`src/lib/source-health.ts`)
     - each LRC scraper (calendar, committee materials, enrollment actions, popular names: `src/lib/ky-lrc-*`)
     - sync routes (`src/app/api/sync/`, `src/app/api/cron/`)
     - admin pages (`src/app/admin/`)
     
     For each row, give:
     - lines of code (`find … -print0 | xargs -0 cat | wc -l`)
     - commits touching it from 2026-11-01 to 2027-03-31 (`git log --first-parent main --since=2026-11-01 --until=2027-04-01 --oneline -- <paths> | wc -l`)
     - real problems it caught in session, counted from `docs/ops/log.md` entries and WS3-14 corrections that name it
     - a verdict: **keep**, **slim** or **cut**, with a one-line reason
  4. Write `docs/evaluation/2027-04-maintenance.md` (≤ 60 lines) with:
     - the before/after metrics table
     - hours and type share by month, with session months marked
     - the subsystem table
     - the top 3 sources of maintenance work
     - a plain statement of what a partner would need to staff (hours/month by area)
  5. In [DEFERRED.md](DEFERRED.md), fill the W4 status of the **WS5 rows only**, as `fired (date)`, `not fired` or `revived (WP)`. Filling a status is not a verdict.
- **Don't:**
  - Estimate missing months; mark them "no data".
  - Change another workstream's rows in `DEFERRED.md`.
  - Act on the verdicts. WS9-14, WS5-16 and WS8-16 decide.
- **Acceptance criteria:**
  - [ ] Every metric has a value or "no data", and each number has its command or source.
  - [ ] The subsystem table has all rows above, each with a verdict.
  - [ ] `wc -l docs/evaluation/2027-04-maintenance.md` ≤ 60.
  - [ ] Every WS5 row in `DEFERRED.md` has a W4 status, and `git diff` shows no other row changed.
- **Verify:** `gh` (repo read) and a plain container. No production secrets are needed.
- **Owner actions:**
  - [ ] Make sure each month from November to March has an hours line in `docs/ops/log.md`. Add best estimates for any missing month.
- **Rollback:** revert the PR.

---

### WS5-15 · Adopt "one in, one out" and enforce ceilings on dependencies, aliases, schedules, LLM callers and process-doc bytes

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS5-03a (soft: WS5-01b, WS5-08, WS4-11) | E1, E2, E12, E13, O1, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none in the normal case. The ceilings are measured at merge time, not chosen. One exception: the zero-growth spec files may have grown since the 2026-10-06 final pass and the growth cannot be trimmed back without losing executable content (step 3). Then the owner's PR review decides. **Default:** the measured value, with the reason recorded in the ADR.
- **Data-limit impact:** none.
- **Ongoing cost:**
  - One test block, and one ADR to write whenever something genuinely needs to grow (about 15 minutes).
  - It **prevents** the regrowth that produced E1, E2 and E13.
  - No workflow, schedule or dashboard.
- **Why:**
  - Deletions erode unless something stops regrowth. E1 (86 aliases, 75 env vars), E2 (18 schedules across 3 schedulers) and E13 (plumbing-heavy PRs) all grew one reasonable PR at a time.
  - The program spec itself was 1,166,748 bytes before the final pass, about 1.8× the 636 KB of logs that E12 criticises. Without a hard cap, the process problem moves rather than shrinks. So the workstream files get zero growth after the final pass, not a rounded-up allowance.
  - A visible "one in, one out" rule is also evidence of discipline for a partner (O1, O4).
- **Current state (verified 2026-10-06):**
  - **Production dependencies:** 32 direct. WS5-02 and WS5-08 reduce this.
  - **npm aliases:** 86. WS5-01a/b reduce this.
  - **Schedules:** 9 Vercel crons plus 9 GitHub `cron:` lines. WS4-12/13 change this to about 16 per WS4's definition of done. WS4-11 adds `src/lib/schedule-registry.ts`.
  - **Files that import `@anthropic-ai/sdk`:** count with `grep -rlE "from ['\"]@anthropic-ai/sdk" src scripts | wc -l` at merge.
  - **Spec and process-doc bytes:** 1,166,748 for `docs/program-spec/*.md` before the 2026-10-06 final pass (`cat docs/program-spec/*.md | wc -c`). Re-measure both sets on the PR branch:
    - **zero-growth files:** `01`–`09` and `appendix-a-findings.md`
    - **process docs in the folder:** the front-door files `README.md`, `TRACKER.md`, `OWNER-DECISIONS.md` and `DEFERRED.md`, plus `00-agent-operating-manual.md`. The manual is not zero-growth, because WS5-03a, WS9-03, WS9-04, WS9-07, WS5-15 (step 4), WS8-08 (step 4) and WS4-02's post-deploy edit each add or change a line in it. TRACKER.md and DEFERRED.md change as WPs merge and W4 statuses are filled.
  - **Dependency on WS5-01b is soft.** WS5-01b is Backlog. If it has not merged by 2026-12-01, proceed, and set `MAX_NPM_ALIASES` to the count measured on the branch.
  - **Existing caps elsewhere:** WS9-04 caps `docs/ops/` by lines, and WS9-07 tests the env-var catalog for drift. No other ceilings exist.
- **Do:**
  1. Write the next ADR, `NNNN-one-in-one-out.md`. It says:
     - A PR that adds a schedule, vendor, production dependency, env var, npm alias or LLM call site must remove one of the same kind, or cite a new ADR that justifies the growth.
     - Ceilings are raised only in a PR that adds such an ADR.
     - The zero-growth spec files (`01`–`09` and `appendix-a-findings.md`) do not grow after the 2026-10-06 final pass. A correction to a WP is made in place in its WP file, in a PR that names the WP ID. If the correction adds bytes, the same PR trims at least as many from that file (for example, a merged WP's stale Current-state detail), never a step, acceptance criterion or owner action of an open WP. Otherwise it needs an ADR that raises the ceiling. There is no separate amendments list.
     - After WS8-16's decision is recorded, the folder moves to `docs/archive/program-spec/` (WS8-16) and is frozen history. From then on, new work is specified only in short ADRs and `CURRENT.md`.
  2. Add a `describe('ceilings')` block to `src/lib/repo-invariants.test.ts`, or to WS5-03a's `frozen-docs.test.ts` if that file does not exist. It asserts:
     - `Object.keys(pkg.dependencies).length` ≤ `MAX_PROD_DEPS`
     - `Object.keys(pkg.scripts).length` ≤ `MAX_NPM_ALIASES`
     - the schedule count ≤ `MAX_SCHEDULES`. Use the registry length if `src/lib/schedule-registry.ts` exists; otherwise use `vercel.json` `crons.length` plus the number of `^\s*- cron:` lines in `.github/workflows/*.yml`.
     - the number of files under `src/` and `scripts/` importing `@anthropic-ai/sdk` ≤ `MAX_LLM_CALLERS`
     - the total bytes of `CURRENT.md`, `docs/adr/**` and, in the program-spec folder, `README.md`, `TRACKER.md`, `OWNER-DECISIONS.md`, `DEFERRED.md` and `00-agent-operating-manual.md` (each if present) ≤ `MAX_PROCESS_DOC_BYTES`
     - the total bytes of `0[1-9]-*.md` and `appendix-a-findings.md` in the program-spec folder ≤ `MAX_PROGRAM_SPEC_BYTES`. Nothing else in the folder counts toward it.
     
     For both, read `docs/program-spec/` if it exists, otherwise `docs/archive/program-spec/`, so the test survives WS8-16's move. If neither folder exists, the test fails.
  3. Set each constant to the value measured on the PR's branch. For `MAX_PROCESS_DOC_BYTES`, round up to the next 25,000. For `MAX_PROGRAM_SPEC_BYTES`, use the size after the 2026-10-06 final pass **exactly** (zero growth, no rounding):
     - If `docs/program-spec/README.md` or `TRACKER.md` records a post-final-pass byte count for the zero-growth files, use the lower of that count and the measured value.
     - If the measured value is higher, list in the PR which files grew since 2026-10-06 (`git log --oneline -- docs/program-spec/`). Then set the constant to the recorded count and trim each growth in the same PR, under the rule in step 1. If that is not possible without losing executable content, say so in the PR. The owner's review is the decision. **Default:** the measured value, with the reason in the ADR.
     - If no count is recorded, use the measured value.

     Comment each constant with the date, the measured value and "raise only with an ADR (see docs/adr/NNNN-one-in-one-out.md)".
  4. Add one sentence to manual §2's pickup checklist: "If your WP adds a dependency, alias, schedule, env var or LLM call site, say in the PR what it replaces, or link the ADR that raises the ceiling."
- **Don't:**
  - Re-cap `docs/ops/` (WS9-04) or env vars (WS9-07).
  - Add a workflow.
  - Lower another WP's planned additions by fiat; they cite an ADR or remove something.
  - Collapse or delete merged WP text from the program spec. It is the audit trail a partner reads, and the byte ceiling already stops growth.
  - Move `docs/program-spec/` yourself. WS8-16 moves it after the W4 decision.
- **Acceptance criteria:**
  - [ ] The ADR exists.
  - [ ] `npm test` passes with all six ceilings. Show once locally that adding a dummy dependency to `package.json` makes it fail. Show also that appending one byte to any of `01`–`09` or `appendix-a-findings.md` makes it fail, and that appending one byte to `TRACKER.md` does not. Do not commit either.
  - [ ] `MAX_PROGRAM_SPEC_BYTES` has no rounding allowance, and its comment cites its source (the recorded count or the measured value).
  - [ ] The test reads `docs/archive/program-spec/` when `docs/program-spec/` is absent. Show this once with a local `mv`; do not commit it.
  - [ ] Manual §2 has the sentence.
- **Verify:** plain container. Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
- **Owner actions:** none. Later ceiling raises are reviewed like any ADR.
- **Rollback:** revert the PR.

---

### WS5-16 · Write the maintain-mode profile, including dependency and framework currency

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 (merge by 04-24) | Sonnet | S | WS5-13 (soft: WS4-11, WS9-14) | E5, E13, E2, D1, D4, S1, S2, O1, O2, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none in this WP. It describes and does not switch anything. WS8-16 decides whether maintain mode applies; its default is maintain mode.
- **Data-limit impact:** none. Documentation only.
- **Ongoing cost:** none by itself. If maintain mode is chosen, applying the profile should cut ongoing hours, LegiScan queries and Anthropic spend, as the document quantifies. The one thing it keeps on purpose is a quarterly owner currency check, about 1.5 h a quarter, roughly 0.5 h/month [I]. It runs inside WS9-08's existing check, not as a new ritual.
- **Why:**
  - WS8-08 defines maintain mode in one sentence ("syncs and fixes only, a 2028 session check, no new features"), and WS8-16 defaults to it.
  - Nothing says which of the roughly 16–18 schedules, the LLM loops, the digest and the LRC scrapers should keep running between sessions, or what that costs.
  - Without this page, "maintain mode" would quietly mean "everything keeps running" (E5, E13, O2).
  - It would also quietly mean "nobody watches the dependencies". S1 is exactly that failure: Next 15 reaches end of support around 2026-10-21 with no plan in place. A long-lived site (O1) needs security updates merged and end-of-support dates watched even when nothing else changes (S1, S2).
- **Current state (verified 2026-10-06):**
  - **Schedules:** today's are in `vercel.json` (9) and `.github/workflows/` (9 cron lines). WS4-11's registry will list them.
  - **LLM loops:**
    - summary generation after sync (`src/lib/ky-content-generation.ts`)
    - the topic classifier
    - the weekly accuracy-audit LLM pass (`ACCURACY_LLM_SAMPLE`)
    - triage, unless WS5-07 merged
  - **Outbound email:** the digest (`/api/cron/notify`), signup notifications (`/api/cron/notify-signups`), the welcome email, and WS7-09's weekly email if built.
  - **Dependency and framework currency (verified 2026-10-06):**
    - `package.json` pins `next` at `15.5.22` and `@mui/material` at `^5.15.15`.
    - The workflows set `node-version: '24'` (for example `.github/workflows/accuracy-audit.yml` ~70). The Vercel project's Node version is a dashboard setting [verify at pickup, Owner].
    - `.github/dependabot.yml` does not exist today, and none is added: WS1-07 owns every GitHub security toggle and turns on Dependabot alerts and security updates. Dependabot version updates (former WS1-08) are Deferred.
    - WS2 defers the MUI v5 → v7/v9 migration, with stated triggers (`02-security-and-platform.md` Deferred). WS2's contingency rule says a critical Next alert is triaged within 72 hours.
    - Nothing in the program owns these checks after W4. WS9-08's §Monthly check runs December 2026 to April 2027 (its owner calendar event ends in April).
  - **Existing switches:** each must be verified at pickup. Examples are a workflow's `on.schedule`, a `vercel.json` cron entry, and env flags that WS7 and WS4 add.
- **Do:**
  1. Create `docs/evaluation/maintain-mode.md` (≤ 60 lines) with one table row per schedule, LLM loop and outbound email path, plus one **currency row**: "Dependency security updates and framework end-of-support check (Next, Node, MUI v5)". Its values are: Today = "monthly check Dec–Apr (WS9-08), Dependabot alerts (WS1-07)"; Maintain-mode state = **keep, quarterly**; How to switch it = "WS9-08 §Monthly check quarterly line; owner phone-calendar event"; Est. h/month = about 0.5 [I]; LegiScan = 0; Anthropic = 0; Owner = owner. Columns, for every row:
     - Job
     - Today (cadence)
     - Maintain-mode state (**keep** / **slow to X** / **off**)
     - How to switch it (the existing registry entry, cron line, workflow or env flag; no new mechanism)
     - Est. h/month
     - LegiScan queries/month
     - Anthropic $/month
     - Owner (`owner` for a human step, `automatic` for a scheduled job)
  2. Use the WS5-13 subsystem verdicts, WS9-14's review (if it exists), WS4's data budget (`docs/data-budget.md`) and WS4-16's data-cost sheet for the numbers. Cite the source of each number. Mark estimates [I].
  3. **Defaults to propose** (the owner can change them in WS8-16):
     - Keep the bills, legislators and votes syncs at a reduced interim cadence.
     - Keep the health check and paging.
     - Turn the weekly LLM audit pass off between sessions.
     - Turn LRC scrapers off for sessions that cannot change (WS4-09b).
     - Keep the digest on its existing schedule if anyone is subscribed.
     - Leave no Routines running.
     - Keep the currency row. Each quarter, merge or triage open Dependabot security PRs and alerts. Check the end-of-support dates for Next, Node and MUI v5 against each project's published support policy, and check WS2's deferred MUI v5 triggers. If any version is within 90 days of end of support, or a trigger has fired, record it as new work in `CURRENT.md` with an ADR, since the program spec is archived after W4. Do not upgrade inside the check.
  4. End with a totals row (h/month, queries/month, $/month) and a 3-line "how to apply" note. Applying is a separate PR, gated on an Owner action for any Vercel or Actions setting.
  5. In [DEFERRED.md](DEFERRED.md), fill the W4 status of the **WS1 and WS2 rows only**, as `fired (date)`, `not fired` or `revived (WP)`. Filling a status is not a verdict.
- **Don't:**
  - Change any code, schedule or setting.
  - Change any `DEFERRED.md` rows other than WS1's and WS2's.
  - Add a new kill-switch mechanism.
  - Restate WS4-16 or WS5-13 numbers without linking them.
- **Acceptance criteria:**
  - [ ] Every entry in the schedule registry (or every `vercel.json` cron and workflow `cron:` line), every LLM call site found by `grep -rlE "from ['\"]@anthropic-ai/sdk" src scripts`, and every outbound email path has a row.
  - [ ] The currency row exists with cadence "quarterly", an h/month estimate marked [I], and owner "owner". It names Next, Node and MUI v5, and links WS2's deferred MUI v5 triggers.
  - [ ] The "how to apply" note says the WS9-08 owner calendar event moves from monthly to quarterly after April 2027 instead of ending.
  - [ ] Every number has a source or an [I] mark.
  - [ ] `wc -l docs/evaluation/maintain-mode.md` ≤ 60.
  - [ ] Every WS1 and WS2 row in `DEFERRED.md` has a W4 status, and no other row changed.
- **Verify:** plain container. Run the greps above and `npm run lint` (docs only).
- **Owner actions:**
  - [ ] Read it before recording the WS8-16 decision.
  - [ ] If maintain mode applies: extend the "KYvKY monthly check" phone-calendar event (WS9-08) past April 2027 as a quarterly event (first working day of July, October, January and April).
- **Rollback:** revert the PR.

---

## Deferred

These rows are mirrored in the WS5 section of [DEFERRED.md](DEFERRED.md), where WS5-13 fills their W4 status.

| Item | Reason | Revisit trigger |
|---|---|---|
| Split `src/components/bills/BillDetailView.tsx` (1,269 lines, 8 inlined sub-components) (E10) | Belongs to WS6's bill-page redesign (U2/U8/U16). Splitting it before the redesign would mean doing it twice. | WS6's bill-page WP is picked up. |
| Split `src/components/search/SearchPageClient.tsx` (1,011 lines) (E10) | Search is used by 1.7% of visitors (T5). Low return before the session. | WS6 search work, or a search bug that takes more than 2 h to fix. |
| Split `ky-sync-pipeline.ts` into `src/lib/sync/` modules (formerly WS5-14a/b) (E10) | WS8 positions the offering as data contracts, exports and an API (WS8-02/04/12), not code adoption. Under maintain mode, a stable file needs no refactor. Line numbers would be stale by W5. | The WS8-16 decision is "continue", or a partner asks to run the code. Prerequisites: WS5-12b, WS4-05 and WS4-06 merged. Re-specify from current code when triggered. |
| Export and drop the four parked tables `ky_ordinances`, `ky_executive_orders`, `ky_school_board_items` and `ky_county_actions` (formerly WS5-06b) (E1, E3) | Near-zero upkeep, but it needs an owner production migration, CSV exports and the removal of 6 `UNMONITORED_SOURCES` keys, in the window where the owner already applies WS3, WS4 and WS7 migrations. | W4 maintain-mode cleanup, WS8-14b's data dictionary tagging the tables `parked`, or the owner choosing to batch it into a pre-freeze migration session. **Preconditions:** `test ! -e src/app/api/intelligence/route.ts && ! grep -rn "ky_ordinances\|ky_executive_orders\|ky_school_board_items\|ky_county_actions" src scripts`. Indexes and policies are in `002_indexes_and_rls.sql` lines ~10–82; grep `002` for all four names rather than relying on the range. |
| Replace `lucide-react` with MUI icons (formerly WS5-11) (E4) | Saves one dependency. The touched components (`CommitteeMeetingCard`, `HomeBillCarousel`, `DistrictMapCanvas`) are being edited by WS6-04a/b and WS6-06, and visual checks need Supabase data and a Mapbox token. | **Swap opportunistically in whichever WS6 PR next touches each file.** Drop the dependency when the count reaches 0 (`grep -rln "lucide-react" src`). Notes for that PR: `CommitteeMeetingCard.tsx` already imports MUI `Bookmark as BookmarkFilled` (line 5) and uses lucide `Bookmark` as the outline (line ~70), so swap to `BookmarkBorder`. `MapPin` in `DistrictMapCanvas.tsx` (~243) is the address marker on `/members/map`. Map its `MAP_MARKER_PIN.fill`/`color` to `sx.color` and keep the drop-shadow `style`; if it cannot match within 2 px or keep the colour, leave it on lucide. `ProfileFollowedCommitteesSection.tsx` imports lucide at line 14. |
| Remove `lottie-react` (E4) | WS6-04b deletes the last `HoverLottie` caller on home and removes `lottie-react` if it becomes unused. | WS6-04b merges. If the package is still used, revisit with U13. |
| Vendor the email components and drop `react-email` (WS5-08 option B) (E4, S2) | Needs an Opus-tier design: about 10 components (Html, Head, Body, Container, Section, Text, Link, Img, Heading, Preview) in `src/lib/email/components.tsx`, plus a render-identity test. The current advisory is not reachable (WS5-08 ADR). | A `react-email` runtime advisory, `react-email` dropping its component exports, or a server trace including socket.io. |
| WS5-10 if it misses 2026-11-14 | A global CSS change should not land between the Next 16 upgrade and the freeze. | W5, after the W4 decision. |
| Remove the direct `@mui/system` dependency (0 direct imports) | It is a transitive dependency of `@mui/material`, so removing the direct line saves nothing and risks version skew during WS2's work. | Any MUI major upgrade. |
| `adm-zip` is a devDependency but imported by `src/lib/ky-legiscan-dataset-import.ts` | Only scripts and Actions reach it today, through `accuracy-audit/checkers/votes.ts` → `legiscan-dataset-corpus.ts`. No route imports it, so production builds are fine. | Any API route or cron starts importing the dataset-import module. Then move `adm-zip` to `dependencies`. |
| Unused exports inside live files, for example `AiSummaryInline` and `AiSummaryTooltip` in `src/components/civic/AiAttribution.tsx`, and `fetchKyCommitteeMeetingsBrowse` in `src/lib/ky-committee-data.ts` (noted by WS3) | The orphan check is file-level. Chasing exports adds churn in files other WPs are editing. | The file is next edited for another reason; delete the export in that PR. |
| Renumber the duplicate `045` migrations (E1) | `apply-migration-sql.ts` does not track applied migrations, so renaming has no functional benefit, and history readers rely on the names. WS1-05b guards against new duplicates. | A migration tool that tracks applied files is adopted. |
| Move `TASKS.md` and `decisions.md` to `docs/archive/` (WS5-03a option (b)) | Freezing in place gives the same benefit without rewriting references in 50 files. | The owner picks (b) in WS5-03a. |
| Cut accuracy-audit plumbing (dismiss, prune, admin page) as part of E5 | The audit's design belongs to WS3 (A3, WS3-11a). Cutting it before the session removes evidence WS5-13 needs. | WS5-13 grades the audit **slim** or **cut**. Then reassess `scripts/dismiss-finding.ts`, `scripts/prune-accuracy-history.ts` and the admin page via WS5-16 / WS9-14. |
| Collapse merged WPs in `docs/program-spec/` to their tracker row (strategy-review suggestion) | The WP text is the record a partner or funder reads (O4). WS5-15's zero-growth ceiling already stops growth (corrections are made in place without growing the files), and WS8-16 moves the spec to `docs/archive/` after the W4 decision. | The spec ceiling is ever raised by ADR. |

## Findings re-checked (2026-10-06, `a4e543a`)

- **E3: confirmed, with additions.**
  - The import scan finds 39 never-imported files: 38 match E3, and the 39th is `src/app/lib/supabaseAdmin.ts` (S7, WS2-10).
  - Two more are dead because only those files import them: `src/lib/graph-database.ts` and `src/components/members/LegislatorDistrictMinimap.tsx`.
  - Total: 8,145 + 689 lines by `wc -l`, about 8.8k. E3 quoted 8,142.
  - After WS2-07 (W0) deletes `/api/intelligence`, `ky-intelligence.ts` and `anthropic-cache.ts` become orphans too, making 41. WS5-02 handles both cases.
  - The parked code is 6 lib files, and the pipeline range ~1883–2101 is confirmed.
  - `/design-system` is **linked in the public footer** (`SiteFooter.tsx` line 54).
- **S9 (WS2-04):** the minimap is rendered by no page, so the attribution breach is not live. WS2-04 is a P2/W1 guard test that depends on WS5-02. The minimap decision belongs to WS5-02, default (delete) on 2026-10-13.
- **E4: confirmed and refined.**
  - **Tailwind:** 3 live files plus two stray class tokens. The other 7 users are dead.
  - **`lucide-react`:** 7 files, 6 of them live.
  - **`react-email`:** `@react-email/components` 1.0.12 and the per-component packages are **deprecated on npm** (checked 2026-10-06). `react-email` 6.6.6 bundles the components, and its runtime entry imports `react`, `@react-email/render`, `marked`, `prismjs` and `tailwindcss`, not socket.io. A package swap is therefore impossible, so WS5-08 records reachability instead.
  - **`dotenv`, `autoprefixer`, `postcss`:** `dotenv` is used only by `scripts/load-env.ts` once the dead `transcribe.ts` files go. `autoprefixer` and `postcss` are used only by `postcss.config.js`.
- **E12: confirmed, with exact sizes.** `TASKS.md` is 203,404 bytes and `decisions.md` 432,317 (`wc -c`). 50 files outside `docs/program-spec/` mention them, with 35 mention lines in code, workflow and migration files. README drift is as listed in WS5-04b; `GET /api/bills/browse` is real and stays, and only the `/browse` *page* route is gone.
- **E12 writers after the freeze:** listed in WS5-03a's Current state; all remaining "decision note" steps follow manual §8, which WS5-03a rewrites.
- **U18: confirmed** at `README.md` line 17. The same wrong rule is in the dead `src/lib/tooltipGuidelines.ts` (~118), which WS5-02 deletes. The live tooltip copy (`tooltipContent.ts` ~52) is correct.
- **New, special-session copy [verify]:** `src/lib/ky-sessions.ts` (~363) says a special session can be called "by petition of 3/5 of the members of each chamber". Carried by WS5-04a (Ky. Const. §80).
- **E10: confirmed, with a sharper risk (erratum N2).** The one-element-roster calls can match any sponsor whose name **ends with** the member's surname (`ky-member-utils.ts` ~737: `nm.endsWith(last)`), and the no-`legiscan_id` path can then adopt another member's `people_id`. Inferred from code; WS5-12a puts the aggregate data check in W0.
- **E1 numbers: confirmed.** Values and commands are in WS5-05's Current-state table. A tenth `cron:` match in `backfill-vote-nv-counts.yml` is a comment.
- **E2 (owned by WS4), touched here:**
  - WS3 no longer builds a review queue, so WS5-07 relies on WS9-01/02 paging as the replacement for the Routines.
  - WS4-11's registry deliberately omits Routines, so their status lives in `CURRENT.md`.
- **D1, touched here:** WS4's re-check found that `sync:ky:dry` still calls LegiScan `getBill` on the legacy path. WS5-01b keeps the alias, because program-spec steps invoke it, and labels it in `scripts/README.md`.
- **Program size (O1, O4): confirmed.** Counted with `grep -h "^### WS" 0*.md | wc -l` and `cat docs/program-spec/*.md | wc -c`; the numbers are in [Program ledger and cut line](#program-ledger-and-cut-line).
- **Ledger:** `/licenses` is not a new page. `src/app/licenses/` exists today, and WS8-01b edits it. The new public pages are `/corrections` and `/methodology`.
- **O1 after W4: confirmed.** `.github/dependabot.yml` does not exist today, and WS9-08's check is scheduled only through April 2027. WS5-16 carries a currency row, and WS9-08 has the matching quarterly line.
- **TASKS.md / decisions.md reconciliation:**
  - TASKS.md "Maintained on autopilot" (~179–190, the two Routines): **superseded** by WS5-07.
  - TASKS.md #26 minimap (~307): **superseded** by WS5-02 (deleted).
  - decisions.md § 2026-07-31 "Triage agent" and § 2026-07-18 (Routine branch protocol): **superseded** by WS5-07's ADR.
  - decisions.md § 2026-05-18 (local government paused): **kept**, and completed by WS5-06a.
