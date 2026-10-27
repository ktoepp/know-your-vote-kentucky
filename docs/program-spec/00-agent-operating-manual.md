# 00 · Agent operating manual

Every agent executing a work package (WP) from this program spec follows this manual, at either tier, locally or in a plain cloud container. The owner (Katie Toepp) is the only human on the project. Agents write code, migrations and docs, and they open pull requests. The owner merges, deploys, spends money and touches production.

**Precedence.** §4 (data limits) and §5 (production safety) override everything, including WP text. Outside those two sections, a WP's specific instructions override this manual's defaults. If a WP seems to require breaking §4 or §5, stop and follow §9.

Facts below were checked in the repo on 2026-10-06 (`main` @ `a4e543a`; the spec itself was added on top and changes no code). Baseline on that date: `npx tsc --noEmit` exits 0, `npm run lint` reports 0 errors (warnings exist, for example in `TopProgressBar.tsx`), and `npm test` passes 41 of 41.

**Edits to this manual.** Several WPs change named lines of this manual (for example WS1-02, WS1-04, WS4-02, WS5-03a, WS5-15, WS8-08, WS9-03, WS9-04 and WS9-07). Each changes only the lines its WP names. Other files cite this manual by section number, so section numbers stay fixed. This manual counts toward WS5-15's `MAX_PROCESS_DOC_BYTES` ceiling, not `MAX_PROGRAM_SPEC_BYTES`.

---

## 1. Reading order

Read in this order before changing anything:

1. The program front door in `docs/program-spec/`:
   - **`README.md`**: the overview, principles, the Core program by window, the April 2027 criteria and the budgets.
   - **`TRACKER.md`**: one row per WP with ID, title, priority, window, tier, size, depends on, **Class** (Core or Backlog) and status (every row starts at `todo`). It also holds **the retired-ID map**: IDs that were retired, split or moved, and what replaced them. Retired IDs are never reused. If your WP ID appears there, follow the map.
   - **`OWNER-DECISIONS.md`**: the owner-decision calendar (every WP's Owner decision default, sorted by date) and the owner-only actions.
   - **`DEFERRED.md`**: the deferred / not-doing register from every workstream, with revisit triggers and the W4 status columns. Appendix A counts a finding as closed when it is listed there.

   The window calendar, the W0 queue and the W2 cut line are in §2 of this manual.
2. This manual.
3. The workstream file that contains your WP. Read the whole WP and the workstream intro, not only your WP's table row.
4. `docs/program-spec/appendix-a-findings.md`: at least every finding your WP cites, and the errata at its end (N1–N5). Its numbers are as of 2026-10-06, so re-check any number before you act on it. The WP tables predate the errata and do not list N-IDs: if your PR acts on N1–N5, cite the N-ID under "Findings re-checked".
5. `CLAUDE.md` and, if your WP touches user-facing copy, `docs/voice-and-tone.md`.
6. The files the WP lists under **Current state**. Open them yourself. Line numbers are approximate.

**Do not read `TASKS.md` (about 203 KB) or `decisions.md` (about 432 KB) in full.** Grep them for your topic, the file names you will touch, and your finding IDs. For example, `grep -n -i "veto override\|RCS#" TASKS.md decisions.md`. For any overlapping open item, say in the PR whether your WP **keeps**, **supersedes** or **folds in** it.

Do not follow the repo-root `README.md`'s "For AI agents → Read first" list (E12). It points you at the 160k-token docs and contains stale facts. For example, it says "3/5 veto override", which is wrong: Kentucky overrides with a majority of members elected (U18).

## 2. Picking up a WP

**Before you start, confirm all of the following:**

- [ ] The program spec is on `main`: `git ls-files docs/program-spec/TRACKER.md docs/program-spec/00-agent-operating-manual.md` prints both paths on your branch. If it does not, the owner has not merged the spec PR yet. Stop and ask (§9). Do not branch from the spec branch, and do not add spec files to your PR.
- [ ] The WP's row in `TRACKER.md` says `todo`. If it says `in-progress` or `review`, someone else has it. Stop. Also run `gh pr list --state all --search "<WSn-NN> in:title"`: an open PR whose title starts with the WP ID means someone has it, whatever the row says. If `gh` is unavailable, write "PR search unavailable" in the PR body.
- [ ] The WP's **Program class** is Core, or the owner has given a written go-ahead for this Backlog WP (see "Core vs Backlog" below).
- [ ] Every WP under **Depends on** is `done`, or the WP explicitly allows parallel work.
- [ ] Today's date falls inside the WP's **Window** (calendar below), or inside the grace period that applies to it.
- [ ] Your tier matches the WP's **Tier** (§3).
- [ ] Any **Owner decision** the WP lists is answered, or its stated default applies because the stated date has passed. If the WP says "blocked until answered", stop. `OWNER-DECISIONS.md` lists every default by date. If it disagrees with the WP file, the WP file wins. Note the mismatch under "Found, not fixed".

**Window calendar.** Dates are inclusive. If `README.md` or `TRACKER.md` shows different dates, stop and ask (§9).

| Window | Dates | What may merge |
|---|---|---|
| **W0 "Now"** | 2026-10-06 → 10-20 | Anything that passes §6. P0 first, in W0-queue order (below). |
| **W1 "Election"** | 2026-10-21 → 11-03 | As W0. Code PRs merge by **10-30**. |
| **Election freeze** | 2026-10-31 → 11-05 | **P0 fixes only.** Docs/test-only PRs (changing only `docs/**`, root `*.md` files and `src/**/*.test.ts`) may also merge. This is WS9-03's default option (a), applied from 2026-10-17 if unanswered, and it stays "pending owner confirmation" until WS9-03 merges. |
| **W2 "Build"** | 2026-11-04 (code from 11-06) → 12-14 | Migrations, refactors, dependency majors. See the W2 cut line below. |
| **FZ "Freeze"** | 2026-12-15 → 2027-01-04 | Fixes, drills and readiness only. No refactors, no migrations, no dependency majors. |
| **W3 "Session"** | 2027-01-05 → 03-30 | Small fixes only. |
| **W4 "Evaluate"** | 2027-04-01 → 04-30 | Evaluation, partner packaging, docs and fixes. |
| **W5 "Later"** | set by the W4 decision (WS8-16) | Only what that decision opens. |

- **W0 grace period.** W0 holds 40 WPs (24 of them Core) for one reviewer. A W0 WP that is **P1 or P2** and has not merged by 10-20 is **not late**. It may open and merge until **2026-10-30**, unless the WP states its own earlier hard deadline (for example a "merge by 10-16" or "hard deadline" line), which still applies. After 10-30 it waits until 2026-11-06 (W2). Do not let a P1/P2 W0 PR delay review of a P0 in the W0 queue.
- **P0 in the freeze.** A P0 that slips past 10-30 may merge during the election freeze. Any other W0 or W1 code PR that misses 10-30 waits until 11-06.
- **W2 cut line: 2026-12-07 (program-wide).** A W2 WP that its workstream marks optional or cuttable (for example WS3's cut order, WS6's optional list, WS8-05b) and that has not merged by 2026-12-07 moves where its workstream says (W4, W5 or `DEFERRED.md`). If the workstream names no destination, it gets a row in `DEFERRED.md` with a revisit trigger. Either way its tracker row becomes `deferred`, and it does not slip into FZ. Earlier WP-specific deadlines still hold: **WS2-11c** (Next 16) merges by **2026-12-01** or stops under its own stop rule, and WS6's rule that no site-wide visual or auth change opens after 2026-12-01 stands. WS3's 2026-12-07 go/no-go and WS7's 2026-12-07 retention-bet cut line use the same date.
- If the window and its grace period have both passed, stop and ask (§9).

**W0 queue (P0 only, in merge order).** Agents pick up, and the owner reviews and merges, W0 P0 WPs in this order before any W0 P1/P2 WP. A later item may be worked in parallel when its dependencies are met, but it does not jump the review queue. Every item here is Core. If `README.md` or `TRACKER.md` gives a different order, stop and ask (§9).

| # | WP | Tier | Note |
|---|---|---|---|
| 1 | WS1-01 | Sonnet | Two broken backfill imports. |
| 2 | WS1-04 | Sonnet | Secret-free PR CI. Target merge 10-12. Later PRs rebase on it. |
| 3 | WS1-05a | Sonnet | `getDataset` reached only through the gated store. |
| 4 | WS2-01 | Sonnet | Next.js 15 patch and production advisories. If WS1-04 has not merged by 10-14, proceed without it. |
| 5 | WS2-02 | Opus | Harden admin-route access control: one constant-time guard for the six bearer-token checks. |
| 6 | WS2-03 | Opus | Harden the post-signup session flow (owner decision). Owner decisions are due 10-13. |
| 7 | WS2-05 | Sonnet | Personal data out of `FEEDBACK.md`. Does not start before its 10-13 decisions. |
| 8 | WS3-01 | Sonnet | Roll-call labelling library. |
| 9 | WS3-02 | Sonnet | Member-profile vote labels (after WS3-01). |
| 10 | WS3-03a | Sonnet | Unmatched roll calls and the outcome chip (after WS3-01). |
| 11 | WS3-04 | Sonnet | Summary basis label and audience clause. |
| 12 | WS3-05a | Sonnet | ZIP-center notice. |
| 13 | WS4-01 | Sonnet | One data budget. Then the owner does **WS4-04** (Owner, P0) by 10-20. |
| 14 | WS4-02 | Opus | Count every LegiScan attempt, before the 11-01 enforcement. |
| 15 | WS7-07a | Sonnet | Account data export. May merge up to 10-30 or in the freeze. |
| 16 | WS9-06a | Opus | LegiScan quota and ban-risk runbook, before 11-01. |
| 17 | WS1-02 | Sonnet | Type-check `scripts/` (after WS1-01 and WS1-04). |
| 18 | WS7-01 | Sonnet | KPI definitions and baseline. Then the owner does **WS7-03** (Owner, P0) before the NLnet deadline (11-03). |

Owner-only P0 work in W0: **WS4-04** (after WS4-01, by 10-20), **WS7-03** (after WS7-01, before 11-03), and the **WS5-12a** owner check by 10-13 (WS5-12a is Backlog until that check triggers it; then the fix becomes P0 and merges by 10-30). The W0 Owner WPs at P1/P2 (WS1-07, WS2-15, WS7-06, WS9-02) follow the grace period above.

### Core vs Backlog

Every WP carries a **Program class** line, and `TRACKER.md` has a Class column. One reviewer can merge about 4–5 agent PRs a week, roughly 40–50 before the 12-15 freeze, so the program commits to a Core set of 45 WPs and holds the other 122 as Backlog.

- **Core.** Agents work Core WPs first: in W0 in the queue order above, otherwise in tracker order within the window. No Core WP depends hard on a Backlog WP. A soft dependency on one (for example WS1-02 on WS5-01a) does not wait.
- **Backlog.** Pick up a Backlog WP only when the Core WPs in its window are merged or blocked, or when its written trigger fires, and in either case only after the owner gives a go-ahead. Link or quote that go-ahead in the PR body.
- **Fresh check at pickup.** Backlog text may be weeks or months old when it is picked up. Before you change anything, re-verify every **Current state** item and every cited finding against current `main`, and record the result under "Findings re-checked". If the WP no longer fits the code, follow §9.
- **Missed windows.** A Backlog WP that has not merged by the end of its window (by the 12-07 cut line for W2) does not slide into FZ or W3. Its tracker row becomes `deferred` and it gets a row in `DEFERRED.md`, unless the owner says otherwise.

**Branch.** Name it `wp/wsN-NN-short-slug`, for example `wp/ws3-02-member-vote-labels`. If your harness assigns a branch (for example `claude/<name>`), use that branch and put the WP ID in the PR title. Branch from current `main`.

**One WP per PR.** Sub-WPs (`WSn-NNa`, `WSn-NNb`) are separate PRs. Do not bundle "while I was here" fixes. If you notice something out of scope, note it under "Found, not fixed" in the PR body (§9).

**PR title:** `WSn-NN: <the WP's imperative title>`.

**Open as a draft.** Mark the PR ready only when every acceptance box is ticked or explained. Never merge your own PR. The repo's `.github/pull_request_template.md` now matches this body: fill in every section, in this order:

```markdown
## WP
[WSn-NN · Title](docs/program-spec/<workstream-file>.md#anchor) · Findings: U1, …
Findings re-checked: <each cited finding, and any N1–N5 erratum acted on: still true / changed / already fixed, with evidence>

## Summary
<user-visible effect first, 2–4 sentences>

## Changes
- <grouped by area>

## Acceptance criteria
<copied verbatim from the WP, each ticked [x] or left [ ] with a reason>

## Verification
<commands run, with pasted tail of the output. State which ran in a plain container
and which need production secrets (and so were left for the owner).>

## Data-limit spend
Planned: <from the WP's Data-limit impact> · Actual: <LegiScan queries, Open States calls,
LRC fetches, Anthropic $ — or "none"> · Counter before/after: <if applicable>

## Deploy notes
<migration path and order, env vars, schedule changes — or "None.">

## Copy & voice
<delete if no user-facing copy changed>

## Owner actions remaining
- [ ] <each human-only step, in order, with the exact command or setting>

## Rollback
<from the WP, made specific to this diff (revert SHA, down-migration SQL, env flag)>

## Found, not fixed
<out-of-scope issues noticed — or "none">
```

## 3. Model routing

**Opus-tier WPs** cover cross-cutting design, migrations, auth, data-pipeline correctness, and AI prompt and grounding design. **Sonnet-tier WPs** are local and pattern-following.

**A Sonnet-tier agent must stop and hand off** (§9) when any of the following happens:

- The change needs to touch any of these files, unless the WP names that file under **Do**:
  - `src/middleware.ts`, anything under `src/app/api/auth/`, RLS policies, or `supabase/migrations/`
  - `src/lib/ky-legiscan-client.ts`, `src/lib/legiscan-quota.ts`, `src/lib/ky-sync-pipeline.ts`, or the LRC sync modules
  - `src/lib/ky-content-generation.ts` or any other AI prompt
- The diff grows beyond the files the WP lists, or more than about 50% past the WP's **Size**.
- Acceptance needs a judgement the WP did not make. Examples: picking a label wording that changes meaning, choosing between two data sources, or deciding what to do with existing production rows.
- A test that is unrelated to your change fails, or the baseline in this manual's header no longer holds.
- You would need any external call that the WP did not budget.

**An Opus-tier agent must hand to the owner** when any of these come up:

- money or a vendor plan
- a legal, terms or licence question
- any production setting, secret or key
- a history rewrite
- personal data
- partner or outreach wording
- anything in §5

The handoff itself: commit what is safe and open the draft PR. Then write under "Owner actions remaining" or "Questions" exactly what is needed, and set the tracker row to `blocked` (§8).

## 4. Data-limit protocol (O2)

Before **any** external call (LegiScan, Open States, the LRC site, the Wayback Machine, Anthropic, Resend, Mapbox), do all of the following:

1. **Estimate.** Write down how many calls, which operations, and the cost in money. Use the WP's **Data-limit impact** field as the ceiling. If the WP says "none", you make zero external calls.
2. **Check the counter.** For LegiScan, run `npm run check:legiscan-quota`. It needs production secrets, so this is usually an Owner action. Pass `--planned=N` to compare your estimate with the cap and the planning target.
3. **Dry-run first.** Read the script's header comment before you run it, because "dry-run" means three different things in this repo:
   - **No DB writes, but the vendor is still called.** Examples: `scripts/manual-sync.ts --dry-run`, and `scripts/backfill-bill-summaries.ts --dry-run`, which still generates through Anthropic and so still spends money. `npm run audit:accuracy:dry` also still calls Anthropic until WS3-15 merges (N1); until then, add `--no-llm` (`npm run audit:accuracy:dry -- --no-llm`) to skip that pass.
   - **Plan only, no LegiScan calls.** Example: `npm run sync:ky:dataset:dry`.
   - **Estimate is the default and `--live` is needed to write.** Examples: `backfill-vote-nv-counts.ts`, `backfill-session-votes.ts`, `merge-duplicate-committees.ts` and `repair-agenda-bill-links.ts`.
4. **Set a stop condition.** For example `--limit=N`, a maximum number of queries, or a dollar cap. If the actual spend reaches the WP's budget, stop, even if the work is unfinished.
5. **Record it.** Put the planned spend, the actual spend, and the counter readings before and after in the PR's "Data-limit spend" section.

**LegiScan (D1).** One mistake here can get the key banned permanently.

- **Limits:**
  - The cap is **10,000 queries per month** (`LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT` in `src/lib/legiscan-quota.ts`).
  - The rate limit is about 2 requests per second, sliding.
  - Audited enforcement starts **2026-11-01**.
- **Calling the API:**
  - All calls go through `getKyLegiScanClient()` in `src/lib/ky-legiscan-client.ts`. That client applies the 650 ms serialized throttle, the quota guard (a hold at 95%), and the per-op and per-caller counters.
  - Never call `api.legiscan.com` any other way. Never add concurrency, and never lower `RATE_DELAY`.
  - The `backfill-vote-nv-counts` and `backfill-session-votes` GitHub Actions workflows (each about 69% of the cap) stay disabled from WS4-04 until WS4-03a merges. Never run or re-enable either to work around a cap.
- **The key:**
  - There is **one key**. Never create, request or rotate a key.
  - Never print the key in logs, PRs or fixtures.
- **The counter undercounts.** It records successful calls only. Add 10% to your estimate.
- **Budget rules:**
  - No single WP may spend more than **1,000 queries** unless its Data-limit field says otherwise *and* the owner approves the run in an Owner action.
  - No run may take the month total above **60%** of the cap (6,000). The projected peak in session is 3,500–5,500 a month.
  - In W3 (session), agent-initiated LegiScan spend is zero.
- **Cheaper paths:**
  - Prefer the hash-gated `getDataset` path over per-bill `getBill` loops. Prefer `change_hash` gating.
  - Never re-fetch a roll call that is already stored.
- **Caller tag.** Tag spend with `LEGISCAN_CALLER=wp-wsn-nn` (lowercase, `[a-z0-9-]`, at most 32 characters; see `src/lib/legiscan-caller.ts`). Every distinct tag becomes a permanent key in the counter, so use only that one tag per WP.
  - **And pass `--budget=N`, equal to the WP's Data-limit ceiling.** Once WS4-03a has merged (W2, target 2026-11-13), any caller tag that is not a `perRunCap` key in `src/lib/data-budget.ts`, including every `wp-wsn-nn` tag, gets a budget of 0 and fails on its first LegiScan call unless `--budget=N` is passed. The client reads `--budget=N` from the process arguments when no budget scope is open. A script that does not accept `--budget` (for example one whose argument parser rejects unknown flags) cannot be used for a WP's LegiScan spend. A budget above 1,000 also needs `--owner-approved` (WS4-03b) and the owner's approval in an Owner action, as above.
  - **Any LegiScan call path a WP adds** (a new script, fetcher or CLI mode, for example a WS3-07 spike or a WS3-08 `getBillText` fetcher) accepts `--budget=N` through `parseBudgetFlag` and runs inside `withLegiscanRunBudget(resolveRunBudget(tag, budget), …)` from `src/lib/legiscan-run-budget.ts` (all added by WS4-03a). If the WP merges before WS4-03a, it takes `--budget=N` anyway, enforces it as a hard call count in the script, and says in the PR that it switches to the shared helper once WS4-03a lands.
  - Before WS4-03a merges, `--budget` is not enforced by the client. Use `--limit=N` or the script's own cap as the stop condition (step 4 above).
- **Attribution (CC BY 4.0).** Any surface that shows or serves LegiScan-derived data takes its wording from `src/lib/legiscan-attribution.ts` or from `src/components/civic/LegiScanCredit.tsx`. Never remove or weaken an existing credit.

**Open States (D2).** Its rate limits are not verified, and `/people` often returns 504. Make no retry loops without backoff and a maximum attempt count. Prefer the CC0 bulk data where a WP allows it. Budget calls exactly like LegiScan calls.

**Kentucky LRC site (D3, E6).** There is no API. To keep the load low:

- Reuse the existing User-Agent pattern: `KnowYourVoteKentucky/1.0 (+https://kyvky.com; <job-name>)`.
- Make requests serially, at most 1 per second [policy, set by this manual].
- Add no new scrapers and no new crawl targets.
- Tests and parser work use saved pages in `fixtures/lrc/`, never live fetches.
- The same rules apply to the Wayback CDX endpoint used by `backfill-lrc-calendar-wayback.ts`.

**Anthropic (A8).**

- The model ID lives only in `src/lib/anthropic-model.ts` (`KY_DEFAULT_ANTHROPIC_MODEL`). Change it only when the WP says so, and confirm the ID and pricing from Anthropic's docs at the time [verify].
- The current cost is about $0.006 per bill summary. Every generation run takes `--limit=N`.
- Prompt evaluation uses a fixed sample that the WP names, for example 20 bills. It never uses the whole corpus.
- Agents never launch full backfills. A backfill is an Owner action with a dollar estimate.

**Free tiers (D4).** Never send email: Resend allows about 100 a day on the free tier. Never run `npm run preview:digest` with `--send`, `--inject` or `--inject-committee`. Those flags send real email or write synthetic rows to production, and rendering a preview needs production user data, so a digest preview is an Owner action. Add no new vendor, schedule, cron or workflow unless the WP replaces an existing one (E2).

## 5. Production safety

**Agents never do any of the following, unless the step is explicitly marked Owner action and the owner is doing it:**

- **Apply migrations to production.** This covers `npm run db:apply-sql`, Supabase MCP `apply_migration` or `execute_sql` with DDL or DML, and the dashboard.
- **Run syncs, backfills, repairs or merges against production.** This includes every `--live` flag and every script without `--dry-run`.
- **Make external calls beyond the WP's budget** (§4).
- **Send email.**
- **Change settings** in Vercel, Supabase, DNS, GitHub (including branch protection and Actions secrets), PostHog, Sentry or Resend.
- **Create, rotate or print keys or secrets.** Never commit `.env*` files.
- **Rewrite git history, force-push `main`, or merge PRs.**
- **Query personal data.** Any production read must be SELECT-only and must be one the WP calls for. Never read rows from user tables (`ky_user_profiles`, follows, `ky_notifications_log`). Use aggregate counts only.

**Writing migrations.**

- **File name:** `supabase/migrations/NNN_short_name.sql`, where `NNN` is the next unused number. Run `ls supabase/migrations | tail`: the highest on 2026-10-06 is `056`. Two files are already numbered `045` (E1), so never reuse a number.
- **Idempotent.** Use `IF NOT EXISTS` / `IF EXISTS` and `CREATE OR REPLACE`. `scripts/apply-migration-sql.ts` runs the whole file as one query and does not track which migrations have been applied.
- **RLS.** Every new table enables RLS in the same file.
- **Down SQL.** Put it in the PR's Rollback section.
- **Deploy notes.** Give the exact Owner command, with the explicit path: `npm run db:apply-sql -- supabase/migrations/NNN_short_name.sql`. With no argument the script falls back to re-applying migration `004`. Also state the order: migration before merge, or after.

**Handing off an Owner action.** Each human-only step goes in the PR's "Owner actions remaining" checklist. Each item should be one step that can be checked, with:

- the exact command or the dashboard path
- whether it needs production secrets
- the expected result
- what to do if the result differs

Example: `- [ ] Run npm run check:legiscan-quota (needs prod env). Expect Used < 6,000. If higher, skip step 3.`

## 6. Verification standards

**Every PR, in a plain cloud container, with no secrets needed:**

- `npx tsc --noEmit`: exits 0.
- `npm run lint`: 0 errors. Add no new warnings in the files you touched.
- `npm test`: all pass. Add tests as the WP requires, as `src/**/*.test.ts` files run by `node --test` through `tsx`.
- `npm run build`: passes with no env vars (verified 2026-10-06). CI runs it on every PR.
- `npm run check`: the one-command local gate. It runs `npm run typecheck`, `npm run lint` and `npm test` in that order and must exit 0.
- Because `next.config.ts` sets `eslint.ignoreDuringBuilds: true` (E8), a green build does not mean lint is clean. Run lint separately.

**Changes to `scripts/`.** `tsconfig.json` excludes `scripts/` (E8), so tsc does not check them. Re-read every import line in your diff. Commit `d00b4c4` put an `import` inside a JSDoc comment and broke two scripts (E9). Run `npm run typecheck:scripts`; CI runs it on every PR.

**UI changes.**

- Take screenshots at **390px** and **1440px** widths from `npm run dev` or `npm run start`, before and after, and attach them to the PR.
- Check keyboard focus order and visible focus.
- Once the WS1/WS6 work for U14 adds an axe check, run it and report 0 new violations on the pages you touched. Until then, write "axe: not yet available".

**Data, sync and AI changes.**

- Prove correctness with unit tests against fixtures, either saved LegiScan JSON or saved LRC HTML. Never use live calls.
- Anything that needs real production data goes in Owner actions, with the exact command and the result to expect.

Paste the tail of each command's output into the PR. "Tests pass" without output does not count.

## 7. Copy and data rules

- **User-facing copy** follows `docs/voice-and-tone.md`:
  - neutral and non-partisan
  - honest sourcing that names public sources
  - no em dashes and no semicolons
  - "select" rather than "tap" or "click"
  - "Log in" and "Sign up"
  - "KYvKY" with a lowercase v
  - no internal system names
  
  Never describe a bill or a legislator as good or bad, and never imply a position. Check copy in the built output, as §Conventions of that guide describes.
- **Accuracy is a trust feature.** Never guess at a vote label, a status or a count. If the data cannot support a statement, show less, and say where the data comes from (U1, A2).
- **Email.** Every footer includes `KYVKY_POSTAL_ADDRESS` from `src/lib/kyvky-contact.ts` (CAN-SPAM, `CLAUDE.md`). Keep the one-click `List-Unsubscribe` header (S11). Digest copy follows §2 "Bill digest email" of the voice guide.
- **AI output.** Keep the "AI-generated" disclosure and the feedback link (A9). Never present AI text as official LRC text.
- **No personal data** in code, fixtures, tests, logs, screenshots or PRs. Use synthetic names and `example.com` addresses. `FEEDBACK.md` already contains personal data (S12). Do not copy from it, and do not edit it unless your WP is the one that handles it.
- **The repo is public.** Describe security work as the required end behavior, for example "every HTML response carries the Content-Security-Policy header". Do not write exploit steps, and do not include payloads or probing commands in PRs, commits, issues or docs.
  - Never describe how an unfixed security issue currently behaves, in any public file, PR, commit or issue. Where a WP says "details in the owner's private security note", ask the owner for the note in the session, work from it, and never copy its contents into the repo. Tests and PR text name the configurations covered without explaining what they protect against.

## 8. Updating status

In the **same PR**, edit your WP's row in `docs/program-spec/TRACKER.md`. This row edit is always allowed, even when a WP says its diff touches only named files: such a limit covers code and other docs, not your own TRACKER row. Every row starts at `todo`. Use these values:

| Status | When to set it |
|---|---|
| `in-progress` | When you claim the WP. A one-line commit is enough. |
| `review` | When the PR is ready. |
| `done` | When merging this PR completes the WP. |
| `awaiting-owner` | When the code is complete but Owner actions remain. |
| `blocked` | When you stopped under §9. Link the PR or issue. |
| `deferred` | When the W2 cut line (§2), a missed Backlog window (§2 "Core vs Backlog") or an Owner decision moved the WP out of its window. Name where it went (W4, W5 or `DEFERRED.md`), and add its `DEFERRED.md` row in the same PR. |

If the tracker conflicts with another branch, rebase and resolve **only your own row**. Do not change any WP's Class: only the owner moves a WP between Core and Backlog.

Write a decision note only when the WP says to. Until the decisions.md work from WS5 replaces it, append at most about 15 lines to the bottom of `decisions.md`, under the heading `## YYYY-MM-DD — WSn-NN: <title>`. Cover the decision, the options you rejected, and when to revisit it. Never edit earlier entries, because the file is append-only. Do not add entries to `TASKS.md`. The program spec is now the roadmap for the work it covers.

## 9. When blocked or when the spec is wrong

Stop. Do not improvise scope. These count as blocks:

- a finding no longer holds, or is already fixed
- a file or function the WP names does not exist
- an acceptance criterion contradicts another one, or contradicts §4 or §5
- a dependency is not done
- an Owner decision is open and has no default
- the work needs spend that was not budgeted

What to do:

1. Commit any safe, partial work that stands on its own.
2. Open a draft PR, or an issue if you have no code, titled `WSn-NN: BLOCKED — <one line>`.
3. Write a "Questions" section. Give the evidence (file and line, command output) and the options with your recommendation. Say what you will do by default if the WP sets a default.
4. Set the tracker row to `blocked`.
5. End your session and report the PR or issue link.

If a finding is wrong or already fixed, say so explicitly under "Findings re-checked" with evidence, and do only what remains. Never build on a finding you have disproved.

## 10. Kickoff prompt template

The owner copies this, fills in the angle brackets, and gives it to an agent:

```text
You are executing work package <WSn-NN> from the Know Your Vote Kentucky program spec,
in the repo know-your-vote-kentucky (branch from current main).

1. Read, in order: docs/program-spec/README.md, your WP's row in docs/program-spec/TRACKER.md,
   docs/program-spec/00-agent-operating-manual.md (follow it exactly; §4 and §5 override
   everything), docs/program-spec/<workstream-file>.md (the whole of <WSn-NN> and the
   workstream intro), and the findings it cites in docs/program-spec/appendix-a-findings.md.
   Grep TASKS.md and decisions.md for the topic; do not read them whole.
2. Confirm: tracker row is `todo`, the WP is Core (or Backlog with the owner's go-ahead:
   <link or "n/a">), dependencies are `done`, today is inside the WP's window, your tier is
   <Sonnet|Opus>. If any check fails, stop and report.
3. Re-check each cited finding in the code before building on it.
4. Implement only the WP's "Do" steps, respecting "Don't". One WP, one PR.
5. External-call budget for this run: <LegiScan N queries | Open States N | LRC N | Anthropic $N | none>.
   Do not exceed it. You may not touch production, send email, change settings or rotate keys.
6. Verify per manual §6 and paste output. Update the tracker row in the same PR.
7. Open a DRAFT PR titled "<WSn-NN>: <title>" using the manual §2 body, with every Owner action
   as a checklist item. Do not merge.
8. If blocked or the spec is wrong, follow manual §9 and stop.

Reply at the end with: PR link, acceptance checklist status, actual spend, and Owner actions.
```
