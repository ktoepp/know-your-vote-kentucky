# WS1 — Quality gates & test harness

## Purpose

KYvKY ships through AI coding agents straight to production, and today nothing checks a change before it merges (E8). Two scripts already crash on launch because of an `import` pasted into a comment (E9). The logic people trust most has no tests: bill status, bill progress, the AI summary hash, the email footer and the one behavior visitors actually use, find-my-legislator (E7, T5). This workstream sets up a small, free, secret-free gate on every pull request, and turns regression knowledge that now lives in prose and ad-hoc scripts into unit tests. It is the cheapest way to show a partner or funder that the project is run with rigor (O4) and can outlive any single agent session (O1, E14).

**Owned findings:** E7, E8, E9. All three are covered below. The parts deliberately not done are listed under Deferred.

**Program class:** 5 of this file's 13 WPs are Core (WS1-01, WS1-02, WS1-03, WS1-04, WS1-05a); the other 8 are Backlog.

**Definition of done for the workstream** (each item can be checked objectively):

1. Every pull request to `main` and every push to `main` runs `.github/workflows/ci.yml`. It type-checks `src/` and `scripts/`, lints, runs unit tests and runs `next build`, using **no repository secrets**. The WS1-04 PR body records each job's wall time (expected: 10 minutes or less per job).
2. A GitHub ruleset on `main` requires the CI checks to pass before a merge, and Dependabot alerts, Dependabot security updates, secret scanning and push protection are on (Owner actions, WS1-07, in W0; the toggles by 2026-10-20).
3. `npm run typecheck` and `npm run typecheck:scripts` both exit 0. `npm run lint` reports 0 errors, and its warnings stay at or below the recorded ceiling.
4. `npm test` covers these named behaviors: LegiScan `getDataset` gating (D1), district lookup against the committed boundaries (T5), LegiScan status mapping, display buckets and the progress meter including the 2027 session rollover, the summary input hash, email footer compliance for **every** email template, and repo invariants (migrations, script references, cron paths). The test count is reported as a baseline in the pre-session gate checks. It is not a target.
5. The pre-session gate checks (section below) appear as `met` in WS9-12's go/no-go before 2027-01-05.
6. Net ongoing cost is 0.5 h/month or less. The workstream retires one ad-hoc verification script (`scripts/verify-veto-status-mapping.ts`), and adds no schedules, no vendors and no version-update bot PR stream. (Dependabot security-update PRs, turned on in WS1-07, open only when an advisory affects a dependency.)
7. No WS1 PR merges during the election freeze (2026-10-31 → 11-05, WS9-03 default) unless it is a P0 fix.

**Interfaces with other workstreams**

- **S1 / WS2-01 (Next 15.5.x patch before end of support ~10-21) and D1 / WS4-02 (LegiScan attempt counting, W0, before 11-01).** WS1-04 depends on nothing and has a target merge date of **2026-10-12**. WS2-01 and WS4-02 should merge **after** WS1-04, so CI gates them; if WS1-04 has not merged by 2026-10-14, WS2-01 proceeds without it and pastes local output (WS2-01 step 1). WS1-07 (the ruleset) follows the day after WS1-04 merges. If WS1-07 is not done yet, nobody merges WS2-01 on a red CI run anyway. **WS4-03a and WS4-03b are W2 work (WS4-03a target merge 2026-11-13)**, not W0, so from the 2026-11-01 enforcement date until WS4-03a merges, nothing in code caps a single run. The two manual LegiScan-spending workflows (`backfill-vote-nv-counts.yml`, about 69% of the monthly cap per its header comment, D1; and `backfill-session-votes.yml`, which WS1-01 makes runnable again) are therefore disabled by an Owner action rather than by code: WS4-04's Owner actions (W0) disable both in GitHub → Actions (… menu → Disable workflow), WS4-03a's Owner actions re-enable them after it merges, and WS9-06a's runbook states that both stay disabled until WS4-03a merges and are never re-enabled to work around a cap. No code change is needed for this.
- **Lint command.** WS1-03 owns `npm run lint`. It lands in W0 and sets `"lint": "eslint . --max-warnings=W"`, which also lints `scripts/`. WS2-11c (Next 16, W2) carries the `@mui/material-nextjs` bump, depends on WS1-03 and must leave `npm run lint` exactly as WS1-03 set it.
- **`npm audit` in CI: not added.** An audit gate fails unrelated PRs whenever an advisory is published. The Dependabot alerts and security-update PRs that WS1-07 turns on, vetted by CI, handle advisories without that cost (see Deferred). `npm audit --omit=dev` remains a one-off check inside WS2-01 and WS2-14, not a CI step. CI runs only `npm run lint`, `npm run typecheck` (plus `typecheck:scripts`), `npm test` and `next build`.
- **GitHub security toggles (WS1-07) and SECURITY.md (WS2-08).** WS1-07 owns the repository security toggles: Dependabot alerts, Dependabot security updates, secret scanning and push protection. They are switched on in the same W0 Owner settings session as the ruleset. WS2-08 keeps only `SECURITY.md` and the private vulnerability reporting toggle; its owner decision covers only the `SECURITY.md` acknowledgement time. WS2-01's post-10-21 contingency (critical Next.js advisories detected by Dependabot alerts) and WS2-14's readiness check (no open secret-scanning alerts, Dependabot alerts reviewed) both rely on WS1-07, so its toggle steps must be done by **2026-10-20** even if WS1-04 slips. WS1 adds **no** `.github/dependabot.yml`: security updates do not need one, and version updates (former WS1-08) are deferred.
- **WS5-01a (archive one-off scripts, W0, default (a) from 2026-10-09) and WS5-01b (alias cut, W2).** WS5-01a archives `scripts/backfill-interim-calendar-2026.ts`, which holds 2 of WS1-02's errors. WS1-02 adapts to whichever order the two merge in (see WS1-02). WS5-01b must keep the `typecheck`, `typecheck:scripts` and `check` npm scripts, which its exempt list already names.
- **WS5-05 (PR "Type" field).** WS1-04 owns the PR template rewrite (former WS1-06). WS5-05 depends on WS1-04.
- **WS9-03 (election freeze 2026-10-31 → 11-05).** WS1 targets all W0/W1 merges for 2026-10-30 or earlier. WS1-09, WS1-10, WS1-12 and WS1-05b wait for W2 (target 2026-11-20).
- **WS9-10 / WS9-12 (session go/no-go).** WS9-12 runs the "Pre-session gate checks" below (former WS1-14), and WS9-10's go/no-go list cites them as "quality gate checks (`01-quality-gates.md` §Pre-session gate checks)". Once WS1-04 adds `npm run check`, WS9-12 step 2 runs it instead of separate `tsc` and test commands. There are no Dependabot version updates to pause in FZ.
- **WS7 (digest and My Legislators email).** WS1-13a (digest extraction) is deferred, and the caption fix is now the independent WS1-13; WS7's interface table already says so, and WS7 extracts and tests its own pure selection functions if WS7-09b/09c need them. WS1-12 adds an invariant that fails if any email template is missing from the compliance test, so WS7-09b's `MyLegislatorsEmail` is covered automatically. WS1-13 merges after WS7-07b if WS7-07b is open, because both edit `run-bill-digest-cron.tsx`. WS7-07a (the export fix) does not touch that file.
- **Repo invariants live in one file.** `src/lib/repo-invariants.test.ts` (WS1-05a) is the single home for file-reading repo invariants. Where practical, other workstreams' invariant and drift checks (WS4-11 schedule registry, WS5-02 orphan guard, WS5-03a frozen docs, WS9-07 env catalog) should add a `describe` block there rather than a new file. This is a recommendation, not a dependency. WS8 adds nothing here (WS8-14b is a one-off data dictionary with no test).
- **WS3-05a (ZIP ambiguity, W0).** WS3-05a creates `src/lib/ky-district-geo.test.ts` with synthetic squares and edits `ky-district-geo.ts`. WS1-15 uses a separate file (`src/lib/ky-district-boundaries.test.ts`) and does not touch `ky-district-geo.ts`, so they cannot conflict.
- **A1/A2 (summary grounding, WS3-09a–c).** WS1-11 pins the current summary input hash, with a target merge of 2026-10-30, ahead of WS3-09a (W2). WS3-09a keeps the v1 hash byte-identical and adds a v2 hash beside it with its own golden tests and regeneration estimate; WS3-12b's optional hash rewrite reuses WS1-11's v1 function and states its estimate too.
- **U8 (WS3-13 "became law" label, W4) and U1, E6, U14.** WS3-13 updates WS1-10's expectations in its own diff. WS3-01 (roll-call labels), WS4-05 (LRC parsers) and WS6-08 (axe) tests run automatically as `src/**/*.test.ts`. WS6-16 adds a secret-free `a11y` job to `ci.yml` and asks the owner to add it to the WS1-07 ruleset.
- **E10, S3/S4 and D1 tests.** These belong to their owning workstreams (WS5-12b, WS2-02/03, WS4-02/03a). WS1 provides the harness, CI and the one D1 gating invariant (WS1-05a), which the D1 owner may extend.
- **E12 (docs, WS5-04a/b).** WS1-04 corrects the single repo-root `README.md` line that claims there is no test suite. All other repo-root README drift belongs to WS5 (WS5-04a for the two wrong Kentucky-law lines, WS5-04b for the rewrite).
- **Operating manual (`00-agent-operating-manual.md`).** WS1-04 replaces §6's "[verify] build without env" note with the verified behavior and adds `npm run check`. WS1-02 updates §6's "Changes to `scripts/`" paragraph.
- **Tracker.** Steps below that record evidence "in the tracker" mean the WP's row in `docs/program-spec/TRACKER.md`. Owner decisions and their defaults are in `OWNER-DECISIONS.md`; deferred items, with their W4 status, are in `DEFERRED.md`.

**Out of scope:** browser end-to-end tests, coverage thresholds, CodeQL, visual regression, performance budgets (U13), accessibility checks (U14, WS6), Dependabot version updates (Deferred), and tests whose subject belongs to another workstream (listed above).

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS1-01 | Restore the missing dataset-store import in two backfill scripts | P0 | W0 | Sonnet | S | none | Core |
| WS1-02 | Type-check `scripts/` with its own tsconfig and clear the errors | P0 | W0 | Sonnet | M | WS1-01, WS1-04 (soft: WS5-01a) | Core |
| WS1-03 | Replace `next lint` with the ESLint CLI and a warning ceiling | P1 | W0 | Sonnet | S | none | Core |
| WS1-04 | Add a secret-free pull-request CI workflow and align the PR template | P0 | W0 (target merge 2026-10-12) | Sonnet | M | none | Core |
| WS1-05a | Assert that LegiScan `getDataset` is reached only through the gated store | P0 | W0 | Sonnet | S | none | Core |
| WS1-05b | Add repo-invariant tests for migrations, script references and cron paths | P2 | W2 | Sonnet | S | WS1-05a | Backlog |
| WS1-07 | Protect `main` with a ruleset that requires CI and turn on GitHub security alerts | P1 | W0 (toggles by 2026-10-20; ruleset the day after WS1-04 merges) | Owner | S | WS1-04 (ruleset steps only; the toggle steps depend on nothing) | Backlog |
| WS1-09 | Convert the bill-status regression script into unit tests | P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | Backlog |
| WS1-10 | Test status buckets and the progress meter end to end | P1 | W2 (target merge 2026-11-20) | Sonnet | M | WS1-09 | Backlog |
| WS1-11 | Extract and pin the AI summary input hash | P1 | W1 (target merge 2026-10-30) | Sonnet | S | none | Backlog |
| WS1-12 | Test that every outbound email carries the postal address and unsubscribe link | P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | Backlog |
| WS1-13 | Caption the digest progress meter with the newest event | P2 | W2 | Sonnet | S | none (merge after WS7-07b if WS7-07b is open) | Backlog |
| WS1-15 | Pin district lookup against the committed boundaries | P1 | W0 (target merge 2026-10-20) | Sonnet | S | none | Backlog |

**Retired IDs** (do not reuse; the program-wide map is in `TRACKER.md`):

| Former ID | Now |
|---|---|
| WS1-05 | Split into WS1-05a (D1 gating, W0) and WS1-05b (hygiene, W2). |
| WS1-06 | Folded into WS1-04 (PR template rewritten once, together with CI). |
| WS1-08 | Deferred (Dependabot version updates and `.github/dependabot.yml`). See Deferred. The security toggles it was once paired with are in WS1-07. |
| WS1-13a | Deferred (digest extraction). See Deferred. |
| WS1-13b | Renumbered WS1-13 and made independent. |
| WS1-14 | Folded into WS9-12 as "Pre-session gate checks" below. |

---

### WS1-01 · Restore the missing dataset-store import in two backfill scripts

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | E9, D1 |

- **Program class:** Core
- **Owner decision:** none. Whether to delete `backfill-session-votes` altogether is the E2/E3 consolidation owner's call (WS5-01a keeps both scripts). See Why.
- **Data-limit impact:** none. The agent does not run either script. Both need production secrets, and `backfill-session-votes` spends LegiScan queries even in discovery mode.
- **Ongoing cost:** none added. It makes one existing manual workflow usable again.
- **Why:** Commit `d00b4c4` (2026-09-29, "Hash-gate every LegiScan getDataset…") pasted the `import { fetchDatasetZipGated } …` line into the middle of a JSDoc comment in both scripts. Both call the function, so they throw `ReferenceError` at the first dataset fetch, and `.github/workflows/backfill-session-votes.yml` is broken (E9). The fix also restores the hash-gated `getDataset` path that the 2026-11-01 LegiScan enforcement relies on (D1). TASKS.md (around line 552) keeps `backfill-session-votes` as "a resumable discovery tool in case LegiScan ever backfills", so this WP repairs it rather than deleting it. WS4-03b edits both scripts and must merge after this WP (WS4 interface table).
- **Current state (verified 2026-10-06):**
  - `scripts/backfill-session-votes.ts` lines 6–7: line 6 ends "…the 2026-08-01 forced full re-import { fetchDatasetZipGated } from '../src/lib/legiscan-dataset-store';", and line 7 is the bare text `import proved`. Line 8 begins ` * it: \`getDataset\` ships…`. The real imports start at line 30 (`import './load-env';`), and `fetchDatasetZipGated(client, entry)` is called at line 147.
  - `scripts/backfill-bill-history-from-datasets.ts` lines 21–22: line 21 ends " * since last import { fetchDatasetZipGated } from '../src/lib/legiscan-dataset-store';", and line 22 begins `import — re-pulling an unchanged dataset returns identical bills and cannot`. The real imports are at lines 28–32, and the call is at line 195. This script has no npm script and no workflow.
  - A type check of `scripts/` reports `TS2304: Cannot find name 'fetchDatasetZipGated'` at `backfill-session-votes.ts(147,25)` and `backfill-bill-history-from-datasets.ts(195,23)`.
  - `fetchDatasetZipGated` is exported from `src/lib/legiscan-dataset-store.ts` line 106. It is the only code that calls `client.fetchDataset(` (line 125). Two other scripts (`ky-legiscan-bulk-seed.ts` line 16, `sync-ky-dataset.ts` line 29) already import it correctly.
- **Do:**
  1. In `scripts/backfill-session-votes.ts`, collapse lines 6–7 back into one comment line: line 6 must read ` * not work for older sessions, and the 2026-08-01 forced full re-import proved`, and line 7 (`import proved`) is deleted. The next line must still be ` * it: \`getDataset\` ships…`. Keep the rest of the comment byte-for-byte.
  2. In the same file, add `import { fetchDatasetZipGated } from '../src/lib/legiscan-dataset-store';` to the import block, after `import './load-env';`. `load-env` must stay the first import.
  3. In `scripts/backfill-bill-history-from-datasets.ts`, collapse lines 21–22 into one line: ` * since last import — re-pulling an unchanged dataset returns identical bills and cannot`, and delete the old line 22. Then add the same import line after `import './load-env';` (line 28).
  4. Run `grep -n "fetchDatasetZipGated" scripts/*.ts` and confirm that each of the two files has exactly one `import` line and that it is not inside a comment.
- **Don't:** run either script or its workflow; change call sites, flags or cost logic; delete the scripts or the workflow; touch `src/lib/legiscan-dataset-store.ts`.
- **Acceptance criteria:**
  - [ ] Neither file contains `import` inside a `/** … */` block. Check by reading the diff.
  - [ ] A type check of `scripts/` (WS1-02's config, or the one-off command under Verify) no longer reports TS2304 for `fetchDatasetZipGated`.
  - [ ] Apart from this WP's TRACKER.md row (manual §8), the diff touches only these 2 files. Each file changes by 2–4 lines.
  - [ ] `npx tsc --noEmit` and `npm test` still pass.
- **Verify** (plain container, no secrets):
  - `npx tsc --noEmit`
  - `npm test`
  - Scripts check, until WS1-02 adds a permanent config. This type check is the real verification of the fix:
    1. Write a throwaway config **outside the repo**, in the session scratchpad directory or `${TMPDIR:-/tmp}`: `D="${TMPDIR:-/tmp}"; printf '{"extends":"%s/tsconfig.json","compilerOptions":{"incremental":false},"include":["%s/scripts/**/*.ts","%s/scripts/**/*.tsx","%s/next-env.d.ts"],"exclude":[]}' "$PWD" "$PWD" "$PWD" "$PWD" > "$D/tsc-scripts.json"`.
    2. Run `npx tsc -p "$D/tsc-scripts.json" 2>&1 | grep -c fetchDatasetZipGated`.
    3. Expect `0` after the fix (it was `2` before). The total error count should drop from 21 to 19 (or from 19 to 17 if WS5-01a has already archived `backfill-interim-calendar-2026.ts`). The remaining errors belong to WS1-02.
- **Owner actions:** none required. A `--dry-run` of `backfill-bill-history-from-datasets.ts` would **not** show whether the fix works: in dry-run mode the script `continue`s before reaching `fetchDatasetZipGated` (DRY_RUN guards at ~133, ~148 and ~183; the "no LegiScan calls" claim is in the header at line 10), so it never threw before the fix either. It only shows that the module still loads. Do **not** dispatch `backfill-session-votes.yml`: its discovery mode spends at least 1 `getDatasetList`, and TASKS.md says it will find nothing new. From WS4-04's Owner action (W0) until WS4-03a merges (W2), this workflow and `backfill-vote-nv-counts.yml` stay disabled in the Actions UI (see Interfaces); repairing the script does not change that.
- **Rollback:** `git revert` of the single commit. The scripts return to their broken state, which affects nothing else.

---

### WS1-02 · Type-check `scripts/` with its own tsconfig and clear the errors

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | M | WS1-01, WS1-04 (soft: WS5-01a) | E8, E9, D1, E14 |

- **Program class:** Core
- **Owner decision:** none. One-off scripts get their types fixed here. Deleting them belongs to WS5-01a (E3).
- **Data-limit impact:** none. The agent never executes the scripts.
- **Ongoing cost:** about 0. One more `tsc` pass, roughly 30 s, runs in CI. It prevents the class of bug behind E9 in the scripts that spend LegiScan quota (D1: "a single manual script can burn most of a month").
- **Why:** `tsconfig.json` excludes `scripts/`, so the scripts that do all backfills, syncs and quota spending are never type-checked (E8). An E9-style break stays invisible until someone runs the script against production.
- **Current state (verified 2026-10-06):**
  - `scripts/` holds 58 TypeScript files (57 `.ts` and 1 `.tsx`, `preview-welcome-email.tsx`). One of them is the `load-env.ts` helper.
  - `tsconfig.json` has `"exclude": ["node_modules", "scripts"]` and `"incremental": true`.
  - A temporary config that extends it and includes `scripts/**/*.ts(x)` reports **21 errors in 7 files**, which matches E8:
    - `merge-duplicate-committees.ts`: 12. Line 77 is a cast of a select result. Lines 155–273 pass PostgREST builders to `act(…)`, whose `fn` parameter at line 126 is typed `() => Promise<{ error… }>`, while the builders are `PromiseLike`.
    - `backfill-vote-nv-counts.ts`: 3, at lines 56, 66 and 82 (TS2339 ×2, TS2345). **Root cause:** the helper `collectTargets(db: ReturnType<typeof createClient>)` (line 39) annotates its parameter with `ReturnType<typeof createClient>`, which resolves to `SupabaseClient<unknown, …, never, never>`, while `createClient(url, key)` at line 81 infers `SupabaseClient<any, "public", …>`. The query results therefore narrow to `never`.
    - `probe-legacy-material-urls.ts`: 1, at line 82 (TS2345). Same cause: `fetchAll(db: ReturnType<typeof createClient>)` at line 46, called with `createClient(url, key)` from line 80.
    - `backfill-interim-calendar-2026.ts`: 2, at lines 395 and 423. `.catch` is called on a `PromiseLike`. **WS5-01a's default archive list deletes this file.**
    - `backfill-bill-summaries.ts`: 1, at line 146. `row as KYBill` is not sufficiently overlapping.
    - `backfill-session-votes.ts` and `backfill-bill-history-from-datasets.ts`: 1 each. These are E9, fixed by WS1-01.
- **Do:**
  1. **Check what has merged.** If WS5-01a has merged, `backfill-interim-calendar-2026.ts` no longer exists: skip it, and expect 19 errors in 6 files before WS1-01, or 17 errors in 4 files after it. If WS5-01a is still open, fix the file anyway. WS5-01a's deletion still applies afterwards.
  2. Create `tsconfig.scripts.json` at the repo root:
     ```json
     {
       "extends": "./tsconfig.json",
       "compilerOptions": { "incremental": false, "noEmit": true },
       "include": ["next-env.d.ts", "scripts/**/*.ts", "scripts/**/*.tsx"],
       "exclude": ["node_modules"]
     }
     ```
     `exclude` must be restated, because a child config's `exclude` replaces the parent's.
  3. In `package.json`, add `"typecheck:scripts": "tsc -p tsconfig.scripts.json"` and extend the `check` script that WS1-04 added: `"check": "npm run typecheck && npm run typecheck:scripts && npm run lint && npm test"`.
  4. Run `npm run typecheck:scripts`. Fix each remaining error with **type-only** changes:
     - `merge-duplicate-committees.ts`: widen `act`'s `fn` to `() => PromiseLike<{ error: { message: string } | null }>`. At line 77, cast through `unknown` and keep the existing runtime check.
     - `backfill-vote-nv-counts.ts` and `probe-legacy-material-urls.ts`: change the import to `import { createClient, type SupabaseClient } from '@supabase/supabase-js';` and change the helper parameter from `ReturnType<typeof createClient>` to `SupabaseClient` (nv-counts line 39, probe line 46). Leave the queries and the `createClient` calls unchanged. (A reviewer confirmed in a scratch project that `(db: SupabaseClient)` receiving `createClient(url, key)` compiles with 0 errors under the repo's settings. Annotating the `createClient` result instead does **not** work, because the parameter type stays wrong.)
     - `backfill-interim-calendar-2026.ts` lines 395 and 423 (only if the file still exists): replace `.then(() => {}).catch(() => {})` with the two-argument form `.then(() => {}, () => {})`. Runtime behavior is the same: errors are swallowed.
     - `backfill-bill-summaries.ts` line 146: use `row as unknown as KYBill`, with a one-line comment that `generateBillSummary` reads only the selected columns. The column list is at line 111. (If WS1-11 has merged first, the line number will have moved.)
  5. In `.github/workflows/ci.yml` (created by WS1-04), add a step after "Type-check app" in the `checks` job:
     ```yaml
           - name: Type-check scripts
             run: npm run typecheck:scripts
     ```
  6. In `docs/program-spec/00-agent-operating-manual.md` §6, replace the sentence "Once the CI work for E8 lands, use whatever scripts type-check it adds." with "Run `npm run typecheck:scripts`; CI runs it on every PR."
  7. If any fix seems to need a runtime change, stop and list it under "Found, not fixed" in the PR (operating manual §9).
- **Don't:** change runtime behavior, queries, flags or output; delete or rename scripts; touch `src/`; add `// @ts-ignore` or `any` casts except at the existing cast sites named above; turn on `strict` options beyond what the root config already has.
- **Acceptance criteria:**
  - [ ] `npm run typecheck:scripts` exits 0.
  - [ ] `npm run typecheck` exits 0, and `npm test` passes with no fewer tests than on `main`.
  - [ ] `git diff --stat` shows only `tsconfig.scripts.json`, `package.json`, `.github/workflows/ci.yml`, `docs/program-spec/00-agent-operating-manual.md`, and the script files that had errors at the time of the PR and still exist (at most the 5 listed in Do step 4).
  - [ ] No new `@ts-ignore`, `@ts-expect-error` or `as any` appears in the diff. Check with `git diff | grep -E "ts-ignore|ts-expect-error|as any"`, which must print nothing.
  - [ ] `npm run check` exits 0, and the PR's CI run shows the new "Type-check scripts" step green.
- **Verify** (plain container): `npm run typecheck:scripts`, `npm run typecheck`, `npm test`, `npm run check`.
- **Owner actions:** none.
- **Rollback:** revert the commit. The revert also removes the "Type-check scripts" CI step, so nothing is left dangling.

---

### WS1-03 · Replace `next lint` with the ESLint CLI and a warning ceiling

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | E8, S1 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** removes a deprecation that Next 16 turns into a hard break (S1). Adds nothing.
- **Why:** `next lint` is deprecated and removed in Next 16 (E8, S1). It also lints only Next's default folders, so `scripts/` is not linted. The ESLint CLI already works with the repo's flat config. This WP owns the lint command (see Interfaces).
- **Current state (verified 2026-10-06):**
  - `package.json` line 11: `"lint": "next lint"`. Output: the deprecation notice, then 0 errors and 2 warnings, both `react-hooks/exhaustive-deps` in `src/app/components/TopProgressBar.tsx` lines 88 and 92.
  - `eslint.config.mjs` uses `FlatCompat` with `next/core-web-vitals` and declares no `ignores`.
  - On a checkout with **no `.next/` directory**, `npx eslint .` reports 0 errors and 3 warnings: the 2 above, plus an unused `eslint-disable` directive in `scripts/audit-legiscan-subjects.ts` line 52. Runtime is about 9 s. After a local `npm run build`, the `.next/` chunks add about 11 `react/no-find-dom-node` errors until Do step 1's `ignores` lands. Those are build output, not regressions.
- **Do:**
  1. In `eslint.config.mjs`, add a first array element `{ ignores: [".next/**", "node_modules/**", "public/**", "design-system/**", "next-env.d.ts"] }`. Keep the `FlatCompat` extension as it is.
  2. Remove the unused directive at `scripts/audit-legiscan-subjects.ts` line 52, and only that directive.
  3. Run `npx eslint .` and record the warning count W (expected: 2).
  4. Set `"lint": "eslint . --max-warnings=W"`, with W as the literal number.
  5. In `next.config.ts`, leave `eslint.ignoreDuringBuilds: true` in place. Replace the comment block above `const nextConfig` (lines 4–10) with: "Lint runs in CI (`npm run lint`, ESLint CLI) and gates merges. The build does not repeat it. The Next 16 upgrade (S1) deletes this key." Leave the config value unchanged.
- **Don't:** add `next/typescript` or other rule sets, which would surface the 146 `any` uses (E11, not this WP); fix the `TopProgressBar` hook warnings, since changing effect dependencies can change behavior (see Deferred); run `@next/codemod`, which needs network and rewrites more than needed; narrow the lint scope to `src` only.
- **Acceptance criteria:**
  - [ ] `npm run lint` exits 0 without printing the `next lint` deprecation notice, including after a local `npm run build` (the `.next/` ignore works).
  - [ ] Adding a new warning anywhere makes `npm run lint` exit non-zero. Check locally by adding an unused `eslint-disable` comment to any file, then revert it.
  - [ ] Files under `scripts/` are linted: `npx eslint scripts --max-warnings=0` exits 0. Before this change, the same command reported the unused directive in `scripts/audit-legiscan-subjects.ts`, which shows the folder is in scope.
  - [ ] `npx tsc --noEmit` and `npm test` still pass.
- **Verify** (plain container): `npm run lint`, `npx tsc --noEmit`, `npm test`.
- **Owner actions:** none.
- **Rollback:** revert. `next lint` keeps working until the Next 16 upgrade.

---

### WS1-04 · Add a secret-free pull-request CI workflow and align the PR template

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 (target merge 2026-10-12) | Sonnet | M | none | E8, E7, E12, S1, O4 |

- **Program class:** Core
- **Owner decision:**
  1. **Node version.** Options: `24`, which the 9 existing workflows that set up Node all use, or whatever Vercel's Project Settings → Node.js Version says [verify; it is not readable from the repo]. Recommended: match Vercel. **Default: agents proceed immediately with `'24'`.** If Vercel differs, the owner changes one line later.
  2. **Run `next build` in CI?** Options: (a) yes, as a separate `build` job, about 4–5 min; (b) no, and rely on Vercel's preview-deployment check. Recommended: (a). The build passed with no environment variables at all (see Current state), so it is a hermetic check that does not depend on Vercel's preview env. **Default: agents proceed immediately with (a).** The owner can delete the job in review.
- **Data-limit impact:** none for LegiScan, Open States or Anthropic. The workflow references no secrets, so no step can reach Supabase or a paid API. With Supabase unconfigured, the build generates no bill or member pages (`generateStaticParams` falls back to `[]`), so it fetches no LRC pages [verify on the first run: the build log should show "Supabase not configured" and no per-bill routes]. `next build` fetches the Instrument Sans font from Google Fonts (`src/app/layout.tsx` line 4), which is unmetered. GitHub Actions minutes are free for public repos (D4) [verify that the repo is still public]. If the repo goes private, the estimate is about 2 jobs × 6 min × ~50 PRs/month ≈ 600 min/month.
- **Ongoing cost:** about 0 h/month. Bumping `actions/*` major versions when GitHub deprecates them is about 1 h/year. It **removes** the honor-system checklist burden and the debugging of post-merge breaks. It adds no schedules: the workflow is event-triggered only.
- **Why:** No CI runs on PRs; the only PR workflow is the Slack notifier (E8). The Next 15 end-of-support patch (WS2-01, ~10-21) and the LegiScan attempt counting needed before 11-01 enforcement (WS4-02) both land in W0, and the per-run LegiScan budget (WS4-03a/03b) follows in W2. They need an automatic gate that does not depend on production secrets, so this WP depends on nothing and ships first. The PR template's honor-system checkboxes (E8) are replaced in the same PR, so a partner reviewing the repo (O4) sees one evidence-based format.
- **Current state (verified 2026-10-06):**
  - `.github/workflows/` holds 10 workflows. Only `slack-repo-events.yml` triggers on `pull_request`. The 9 that run code all use `actions/checkout@v4`, `actions/setup-node@v4`, Node 24 (`source-health.yml` writes it unquoted) and `npm ci`. `slack-repo-events.yml` uses no actions and no Node setup.
  - `package.json` has no `typecheck` or `check` script. `test` is `node --import tsx --test "src/**/*.test.ts"`.
  - Baselines: `npx tsc --noEmit` exits 0 (~37 s). `npm test` gives 41/41 pass (~1.5 s). `npm run lint` gives 0 errors.
  - **`next build` with no env vars** (no Supabase, Sentry, PostHog or Mapbox; Node 22; this audit container): **exit 0**. It printed "Supabase not configured" and produced 229 static pages in about 4 min. `generateStaticParams` in `src/app/bills/[id]/page.tsx` line 17 and `src/app/members/[slug]/page.tsx` line 25 already `.catch(() => [])`. `next.config.ts` wraps the config in `withSentryConfig`.
  - `README.md` line 68 says "There is no Jest/Vitest suite — `npm run test:env` only validates `.env.local`", which is stale (E12).
  - `docs/program-spec/00-agent-operating-manual.md` §6 marks the env-less build as "[verify]".
  - `.github/pull_request_template.md` has the sections Summary, Changes, Deploy notes, Copy & voice and Verification. Verification contains 5 checkboxes (`tsc`, lint, build, email preview, data). The manual's §2 body has these sections: WP, Summary, Changes, Acceptance criteria, Verification, Data-limit spend, Deploy notes, Copy & voice, Owner actions remaining, Rollback, Found, not fixed.
- **Do:**
  1. In `package.json`, add `"typecheck": "tsc --noEmit"` and `"check": "npm run typecheck && npm run lint && npm test"`. (WS1-02 later adds `typecheck:scripts` to `check`.)
  2. Create `.github/workflows/ci.yml`:
     ```yaml
     # Merge gate. Uses no repository secrets by design: nothing here can reach
     # Supabase, LegiScan, Anthropic or any paid API. Do not add secrets.
     name: CI
     on:
       pull_request:
       push:
         branches: [main]
       workflow_dispatch:
     permissions:
       contents: read
     concurrency:
       group: ci-${{ github.event.pull_request.number || github.ref }}
       cancel-in-progress: true
     jobs:
       checks:
         name: checks
         runs-on: ubuntu-latest
         timeout-minutes: 15
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: '24'
               cache: npm
           - run: npm ci
           - name: Type-check app
             run: npm run typecheck
           - name: Lint
             run: npm run lint
           - name: Unit tests
             run: npm test
       build:
         name: build
         runs-on: ubuntu-latest
         timeout-minutes: 20
         env:
           NEXT_TELEMETRY_DISABLED: '1'
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: '24'
               cache: npm
           - run: npm ci
           - run: npm run build
     ```
     Use `pull_request`, never `pull_request_target`. Add no `paths-ignore`: a required check that never runs leaves docs-only PRs stuck as pending. WS1-02 adds the "Type-check scripts" step; do not wait for it.
  3. If the owner chose option (b) for decision 2 before the PR merges, delete the `build` job.
  4. Replace `README.md` line 68 with: "Unit tests: `npm test` (Node's built-in runner via `tsx`, files `src/**/*.test.ts`). `npm run check` runs type checks, lint and tests. CI (`.github/workflows/ci.yml`) runs the same plus `next build` on every PR."
  5. In `docs/program-spec/00-agent-operating-manual.md` §6, replace the `npm run build` "[verify]" bullet with: "`npm run build`: passes with no env vars (verified 2026-10-06). CI runs it on every PR." Add `npm run check` as the one-command local gate.
  6. **PR template.** Rewrite `.github/pull_request_template.md` to follow the manual's §2 section order. Keep the existing HTML-comment guidance for Deploy notes and Copy & voice. The Copy & voice comment must still mention `docs/voice-and-tone.md` and `KYVKY_POSTAL_ADDRESS`. In Verification, replace the `tsc`/lint/build checkboxes with: "CI (`checks`, `build`) is green: link the run. For anything CI cannot run (needs production secrets), paste the command and the tail of its output." Keep the email-preview and data checkboxes as conditional items. Under WP, add the comment "Non-program PRs: write `none` and keep the other sections." In the manual §2, change the sentence "The repo's `.github/pull_request_template.md` still applies: fill in its sections and add the program sections" to say the template now matches this body.
  7. Open the PR. Paste into the PR body: the CI run URL, the tail of each job's log, and **each job's wall time**.
  8. **If the `build` job fails only because Sentry's source-map upload lacks `SENTRY_AUTH_TOKEN`**, stop and report it per manual §9. Do not add secrets, and do not disable or edit Sentry in `next.config.ts`. Any other build failure is also reported and not worked around.
- **Don't:** reference `secrets.*` or add `env:` values copied from `env-template.txt`; trigger any sync or script; add Slack notifications (failures show on the PR); add caching beyond `setup-node`'s npm cache; change the existing 10 workflows; add `npm audit` (see Deferred); add bots or Actions that parse PR bodies.
- **Acceptance criteria:**
  - [ ] `grep -c "secrets\." .github/workflows/ci.yml` prints `0`.
  - [ ] `grep -c "pull_request_target" .github/workflows/ci.yml` prints `0`.
  - [ ] The PR's own CI run shows `checks`, and `build` unless (b) was chosen, as green. The link and each job's wall time are in the PR body.
  - [ ] A throwaway commit on the PR branch that adds a type error makes `checks` fail. Revert the commit before review and link the red run in the PR body.
  - [ ] The `build` job log shows no Sentry upload error that fails the job [verify on the first run: with no `SENTRY_AUTH_TOKEN`, the plugin should skip the upload with a warning]. If it does fail, Do step 8 applies.
  - [ ] `npm run check` exists and exits 0.
  - [ ] README line 68 and manual §2 and §6 are updated as in Do steps 4–6.
  - [ ] The template's `##` headings match the manual's §2 headings in the same order (`grep "^## " .github/pull_request_template.md`). `grep -c "KYVKY_POSTAL_ADDRESS" .github/pull_request_template.md` is 1 or more, and the template has no checkbox for `tsc`, `lint` or `build`.
- **Verify:**
  - Plain container: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"`. `js-yaml` is present transitively; the fallback is `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`. Also run `npm run check` and `npm run build`.
  - On GitHub: the PR's Checks tab.
- **Owner actions:** answer the two decisions if you disagree with the defaults. After merge, do WS1-07's ruleset steps (make the checks required). WS1-07's security-toggle steps do not wait for this WP.
- **Rollback:** delete `.github/workflows/ci.yml` and revert the template. If WS1-07 has marked the checks as required, remove them from the ruleset first, or every PR will block.

---

### WS1-05a · Assert that LegiScan `getDataset` is reached only through the gated store

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | D1, E8, E9 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none. The test only reads files. It protects LegiScan quota by failing CI when a new code path downloads a dataset without the hash gate.
- **Ongoing cost:** about 0.
- **Why:** The 2026-11-01 LegiScan terms make an ungated `getDataset` call a compliance and quota risk (D1). Commit `d00b4c4` routed every dataset fetch through `fetchDatasetZipGated`, and E9 showed how easily a script can drift from it. WS4-02 changes the LegiScan client in W0, and WS4-03a/03b rewire the client and the LegiScan scripts in W2, so this check should be in place before any of that work merges. This file also becomes the single home for repo invariants (see Interfaces).
- **Current state (verified 2026-10-06):**
  - `.fetchDataset(` appears under `src/` and `scripts/` only at `src/lib/legiscan-dataset-store.ts` line 125. The method definition at `src/lib/ky-legiscan-client.ts` line 431 is `async fetchDataset(`, with no leading dot, so it does not match.
  - The raw LegiScan op string `op: 'getDataset'` appears only at `src/lib/ky-legiscan-client.ts` line 433.
  - Existing tests use `node:test` and `node:assert/strict` (for example `src/lib/ky-sessions.test.ts`).
- **Do:**
  1. Create `src/lib/repo-invariants.test.ts`. Start with a header comment: "Repo invariants: tests that read files, not behavior. Add new invariants here as `describe` blocks rather than new files." Resolve paths from `process.cwd()`, since `npm test` runs at the repo root, and assert first that `src/` and `scripts/` exist so a wrong cwd fails loudly.
  2. Write a small recursive walker over `src/` and `scripts/` that collects `.ts`, `.tsx` and `.mjs` files. It skips `node_modules` and every `*.test.ts` file, so this test file can never match itself.
  3. Build the search needles at runtime, so that the literal never appears in the source: `const dotFetch = '.' + 'fetch' + 'Dataset(';` and `const opRe = new RegExp('op:\\s*[\'"]get' + 'Dataset[\'"]');`.
  4. `describe('LegiScan dataset gating (D1)')`:
     - Test: files containing `dotFetch` equal exactly `['src/lib/legiscan-dataset-store.ts']`. Failure message: "Route getDataset through fetchDatasetZipGated (D1, LegiScan terms)."
     - Test: files matching `opRe` equal exactly `['src/lib/ky-legiscan-client.ts']`. Failure message: "Only the LegiScan client may issue getDataset (D1)."
  5. Add a comment that the D1 owner (WS4-02/03a) updates the allowlists in the same PR if it moves these call sites.
- **Don't:** modify any LegiScan code; add a new npm script or a CI step (the file runs under `npm test`); add dependencies.
- **Acceptance criteria:**
  - [ ] `npm test` passes, with 2 new tests.
  - [ ] Temporarily adding a file `scripts/tmp-gate-check.ts` that contains `client.fetchDataset(1, 'x')` makes the first test fail. Delete the file and note the check in the PR.
  - [ ] The code diff touches only `src/lib/repo-invariants.test.ts`, plus this WP's TRACKER.md row (manual §8).
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** delete the test file.

---

### WS1-05b · Add repo-invariant tests for migrations, script references and cron paths

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS1-05a | E1, E2, E8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. The tests only read files.
- **Ongoing cost:** about 0. It reduces the cost of the E2/E3 consolidation, because dangling references fail in CI instead of at 05:00 UTC in a cron.
- **Why:** Two migrations share the number `045` (E1), and nothing stops a third collision. Schedules and scripts are referenced by hand across `package.json`, 10 workflows and `vercel.json` (E2), so a deletion or rename can break a cron silently. WS5-01a/b check these once with shell one-liners in its acceptance criteria. This WP makes the same checks permanent.
- **Current state (verified 2026-10-06):**
  - `supabase/migrations/` holds 57 files, `001_…` through `056_…`, with `045_get_votes_for_legislator_perf.sql` and `045_ky_signup_notified.sql` sharing a number. Migrations are applied by hand through `scripts/apply-migration-sql.ts` (`npm run db:apply-sql`), one file at a time.
  - `package.json` has 86 scripts (WS5-01b cuts this to 40 or fewer). The `scripts/…` paths they reference use the extensions `.ts` (77), `.tsx` (1) and `.mjs` (2). All exist today.
  - Workflows call 13 distinct `npm run …` scripts, all defined.
  - `vercel.json` `crons` has 9 entries, routed to `/api/sync`, `/api/cron/notify`, `/api/cron/health-check` and `/api/cron/notify-signups`.
  - `src/lib/repo-invariants.test.ts` exists after WS1-05a.
- **Do:** add these `describe` blocks to `src/lib/repo-invariants.test.ts`:
  1. **Migrations.** Every file in `supabase/migrations/` matches `/^\d{3}_[a-z0-9_]+\.sql$/`. Migration numbers are unique, except the grandfathered pair: exempt exactly the two `045` filenames above, by name, in a constant with a comment citing E1 and saying the files are already applied to production and must not be renamed. Any other duplicate fails, and so does a third `045`.
  2. **npm script targets.** For every `package.json` script, each `scripts/<path>.(ts|tsx|mjs)` it mentions exists. Match the full extension so that `.tsx` is not read as `.ts`.
  3. **Workflow script names.** Every `npm run <name>` in `.github/workflows/*.yml` is a key in `package.json` `scripts`. Use a regex over the file text; do not add a YAML dependency.
  4. **Cron routes.** Every `vercel.json` `crons[].path`, with the query string stripped, maps to an existing `src/app<path>/route.ts`.
- **Don't:** rename or renumber migrations; add a new npm script or a CI step; add dependencies; overlap WS4-11's schedule-registry assertions (WS4-11 checks schedules against the registry, while this checks that targets exist; both stay).
- **Acceptance criteria:**
  - [ ] `npm test` passes, with at least 4 new tests.
  - [ ] Temporarily adding `supabase/migrations/056_dup_check.sql` makes the uniqueness test fail. Remove the file afterwards and note the check in the PR.
  - [ ] Temporarily renaming the target of an npm script makes test 2 fail. Revert afterwards.
  - [ ] The code diff touches only `src/lib/repo-invariants.test.ts`, plus this WP's TRACKER.md row (manual §8).
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`.
- **Owner actions:** none.
- **Rollback:** revert the added `describe` blocks.

---

### WS1-07 · Protect `main` with a ruleset that requires CI and turn on GitHub security alerts

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 (toggles by 2026-10-20; ruleset the day after WS1-04 merges) | Owner | S | WS1-04 (ruleset steps only; the toggle steps depend on nothing) | E8, E14, S1, S2, S12 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:**
  1. **Admin bypass.** Options: (a) no bypass; (b) repository admins may bypass, for emergency hotfixes when CI itself is broken. Recommended: (b), because a solo maintainer must not be locked out mid-session (W3). **Default:** (b).
  2. **"Require branches to be up to date before merging."** Recommended: off, because it causes rebase churn with many agent PRs and gives little benefit at this scale. **Default:** off.
  3. **Dependabot security-update PRs.** Options: (a) alerts only, with the owner opening fixes by hand; (b) alerts plus automatic security-update PRs, which CI (WS1-04) vets like any other PR. Recommended: (b): CI exists, the PRs open only when an advisory affects a dependency, and no `.github/dependabot.yml` is needed. **Default:** (b). If WS1-04 has not merged when the toggles are switched on, still choose (b); the bot PRs simply wait for CI like every other PR.
- **Data-limit impact:** none. These are GitHub features with no LegiScan, Open States, LRC or Anthropic use. They are free for public repositories [verify the repo is still public; if it goes private, secret scanning and push protection may need a paid GitHub plan].
- **Ongoing cost:** about 0.25 h/month: triaging Dependabot alerts and reviewing the occasional security-update PR (S2's advisory backlog is cleared by WS2-01 first). No schedule, no new vendor, no version-update PR stream (former WS1-08, Deferred). It **replaces** an ad-hoc `npm audit` habit and is what WS2-01's post-10-21 contingency and WS2-14's readiness check read.
- **Why:** CI that is not required is advice, not a gate (E8). The ruleset should be live before the W0 P0 merges it is meant to gate (WS2-01, WS4-02). After Next 15's end of support (~10-21, S1), new advisories reach the owner only through Dependabot alerts (S2), and secret scanning with push protection stops a credential from landing in this public repo (a neighbouring risk to S12). All of this is one Owner settings session of about 20 minutes. WS2-08 keeps only `SECURITY.md` and private vulnerability reporting.
- **Current state (verified 2026-10-06):** the repo cannot show rulesets or settings. The audit reported no branch protection [verify in Settings → Rules]. There is no `.github/dependabot.yml` (checked: the file does not exist), which matches E8's "there is no Dependabot". Whether Dependabot alerts, secret scanning and push protection are already on cannot be read from the repo [verify in Settings → Code security; GitHub turns some of these on by default for public repos].
- **Do** (owner, in the GitHub UI). Steps 1–3 do not depend on WS1-04 and must be done by **2026-10-20**; steps 4–5 follow the day after WS1-04 merges.
  1. Settings → Code security [verify the menu name; older UIs call it "Code security and analysis"]: make sure **Dependency graph** is on, then turn on **Dependabot alerts**.
  2. In the same page, turn on **Dependabot security updates** per decision 3. Leave "Grouped security updates" off and do **not** create `.github/dependabot.yml`; security updates do not need one, and version updates are deferred.
  3. In the same page, turn on **Secret scanning** and **Push protection**. If the page offers other secret-scanning options (validity checks, non-provider patterns), leave them at their defaults.
  4. Settings → Rules → Rulesets → New branch ruleset "main". Target the default branch. Turn on "Require a pull request before merging" with 0 required approvals. Turn on "Require status checks to pass" with `checks`, plus `build` if WS1-04 kept it; use the names as they appear on a CI run. Turn on "Block force pushes" and "Restrict deletions". Set the bypass list per decision 1.
  5. Test the ruleset: on any open agent PR with a red CI run, or a throwaway PR with a deliberate type error, confirm GitHub shows "Merging is blocked". Close a throwaway PR unmerged.
  6. Record the dates, which toggles are on, decision 3's answer and a screenshot (or the ruleset's JSON export link) in WS1-07's `TRACKER.md` row (and in `docs/ops/log.md` if WS9-04 has created it). Do not paste secrets, tokens or alert details.
- **Don't:** require reviews from code owners (there is only one human); require signed commits (agent harnesses may not sign); add required checks for the Slack notifier or for scheduled workflows; add `.github/dependabot.yml` or turn on version updates (Deferred); turn on CodeQL (Deferred); bypass push protection for a real secret (if it blocks a push, remove the secret; a false positive is the owner's call only); paste alert contents into public issues or PRs (`SECURITY.md`, WS2-08, sets the private channel).
- **Acceptance criteria:**
  - [ ] Settings → Code security shows Dependabot alerts, Dependabot security updates (or "off", if decision 3 was (a)), Secret scanning and Push protection as enabled, on or before 2026-10-20.
  - [ ] The repository has no `.github/dependabot.yml` (`test ! -f .github/dependabot.yml` exits 0 on `main`).
  - [ ] A PR with a failing CI run shows "Merging is blocked".
  - [ ] WS1-07's `TRACKER.md` row shows the dates, the toggle list and decision 3's answer.
- **Verify:** manual, in the GitHub UI. With the owner's `gh` auth (not available to agents in a plain container): `gh api repos/{owner}/{repo}/rulesets` lists the ruleset; `gh api repos/{owner}/{repo}/vulnerability-alerts` returns HTTP 204 when Dependabot alerts are on; `gh api repos/{owner}/{repo} --jq .security_and_analysis` shows the secret-scanning, push-protection and security-update states [verify the field names in the response]. `test ! -f .github/dependabot.yml` runs in a plain container.
- **Owner actions:** all of the above. When WS6-16 merges, add `a11y` to the required checks. If a security-update PR arrives in FZ or W3, it may merge as a fix when CI is green and it is not a major-version bump (operating manual §2: no dependency majors in FZ); a major bump waits for W4 unless the owner treats it as P0 (see WS2-11c's critical-advisory rule). During the election freeze (2026-10-31 → 11-05) only a P0 merges.
- **Rollback:** disable the ruleset (Settings → Rules). If security-update PRs prove noisy, switch decision 3 to (a) by turning that one toggle off; keep alerts, secret scanning and push protection on, because WS2-01's contingency and WS2-14 depend on them.

---

### WS1-09 · Convert the bill-status regression script into unit tests

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | E7, E14 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. The tests are pure: no LegiScan calls and no DB.
- **Ongoing cost:** **removes** one ad-hoc script that people had to remember to run. CI runs the cases on every PR.
- **Why:** LegiScan status mapping decides what "Vetoed", "Chaptered" or "Veto Override" means on every bill page. Its regression cases live in a script that runs only when someone remembers, so nothing gates them (E7). Other regressions are documented only in comments (E14: operational knowledge in prose). It waits for W2 because the mapper is not changing before the election, and the freeze makes W1 merges costly.
- **Current state (verified 2026-10-06):**
  - `src/lib/map-legiscan-bill-status.ts` (236 lines) is pure. It exports `mapLegiScanBillStatus(statusCode, lastAction, history?)` (line 147) and the veto, override and line-item helpers (lines 25–98). Its comments name regressions: SB197 2026RS; HB604/HB92 2022RS; HB1/HB3 2010SS; HB13 2017RS ("Acts, ch. 194"); HB193 2021RS and HB306 2016RS ("line items vetoed" with no chapter); recommittal versus forward referral (expected cases at lines 224–225).
  - `scripts/verify-veto-status-mapping.ts` (178 lines) has **18** cases, all passing (`18/18 passed`, run 2026-10-06).
  - `decisions.md` line ~988 records "22 regression cases pass (`npm run verify:bill-status`), incl. comma-form and chapter-less line-item cases and a full-veto guard". Line ~1461 says the script "covers SB70, override-still-law, line-item-still-chaptered, signed-still-chaptered, forward-referral preserved". The drop from 22 to 18 is not explained anywhere. decisions.md is append-only.
  - `package.json` has `"verify:bill-status": "tsx scripts/verify-veto-status-mapping.ts"`.
- **Do:**
  1. Create `src/lib/map-legiscan-bill-status.test.ts`. Port all 18 cases verbatim as a table-driven `describe`/`test`, one `test` per case named by the case `name`.
  2. **Recover lost cases.** Compare the 18 against the decisions.md ~988 and ~1461 descriptions (SB70; override still law; line-item still chaptered, including comma-form and chapter-less; signed still chaptered; forward referral preserved; full-veto guard), and against `git log -p -- scripts/verify-veto-status-mapping.ts` to find any removed cases. Add each missing case as a test, and list in the PR which ones you recovered and from where.
  3. Add a case for each comment-documented regression that is still not covered. Build the inputs from the comment text only, for example `statusCode 5`, `lastAction 'delivered to Secretary of State'`, `history [{action:'line items vetoed (Acts Ch. 202)'}]` → `'Chaptered'`. Also add `mapLegiScanBillStatus(2,'recommitted to House Appropriations & Revenue (H)')` → `'In Committee'` and `mapLegiScanBillStatus(2,'to Senate Agriculture (S)')` → `'Engrossed'`, from the lines 224–225 comment.
  4. Add helper tests for `legiscanActionIndicatesVetoOverride`: "veto overridden", "vetoes overridden", "overrode the veto" → true; "vetoed" → false.
  5. If a recovered or comment-derived case fails, do not change the mapper. Mark the case `test.todo` with the observed output, and list it under "Found, not fixed".
  6. Delete `scripts/verify-veto-status-mapping.ts`. Change the npm script to `"verify:bill-status": "node --import tsx --test src/lib/map-legiscan-bill-status.test.ts"`, so the historical decisions.md references still work. (WS5-01b keeps this alias because the program spec references it.)
- **Don't:** modify `src/lib/map-legiscan-bill-status.ts`; use live LegiScan data or saved API responses containing anything other than action text.
- **Acceptance criteria:**
  - [ ] `npm test` passes, with at least 25 new tests (18 ported plus at least 7 recovered or added).
  - [ ] `npm run verify:bill-status` runs the new test file and exits 0.
  - [ ] `scripts/verify-veto-status-mapping.ts` is deleted, and `git grep -l verify-veto-status-mapping -- . ':!docs/program-spec' ':!decisions.md'` prints nothing.
  - [ ] The PR lists the cases recovered under Do step 2, and any `test.todo` entries with their observed output.
- **Verify** (plain container): `npm test`, `npm run verify:bill-status`, `npx tsc --noEmit`.
- **Owner actions:** none.
- **Rollback:** revert. The script and its npm script come back.

---

### WS1-10 · Test status buckets and the progress meter end to end

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 (target merge 2026-11-20) | Sonnet | M | WS1-09 | E7, E14, U8, U3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The tests pin **current** behavior. UX workstreams that intend to change labels (U8 in WS3-13, U3) update the expectations in their own PRs, so every change to a status meaning shows up in a diff.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. It makes the later status-label changes (WS3-13 in W4, U3) safer.
- **Why:** The bill status shown on cards, filters, the progress meter and the digest comes from a chain: LegiScan code → `mapLegiScanBillStatus` → `classifyKyBillBrowseBucket` / `effectiveKyBillDisplayStatus` → `getBillProgress`. No step after the mapper is tested (E7: "Zero tests for … bill progress"). `getBillProgress` also reads the wall clock, so its output changes on its own when a session ends. It lands in early W2, after the election freeze, because it makes the one production-code change in WS1's test work, well before WS3-13 (W4).
- **Current state (verified 2026-10-06):**
  - `src/lib/bill-display.ts` (674 lines) exports `effectiveKyBillDisplayStatus` (line 186), `isActivePendingBillStatus` (123), `classifyKyBillBrowseBucket` (255), `billMatchesBrowseStatusFilter` (300), `billStatusChipLabel` (313) and `getKyBillNextAction` (462). It imports only types and `@/lib/civic-date`.
  - `src/lib/ky-bill-progress.ts` (215 lines) exports `billProgressKind` (73) and `getBillProgress(bill)` (126). Line 145 calls `sessionHasEnded(bill.session)` with no date. The "passed over" / "committee substitute" guard comment, citing SR231, is at lines ~194–196.
  - `src/lib/ky-sessions.ts` line 330 is `sessionHasEnded(sessionName, asOf = new Date())`, which already accepts `asOf`. The "2027 Regular Session" record exists (2027-01-05 → 2027-03-30).
  - `KYBill` (`src/types/kentucky.ts` line 87) has about 20 required fields.
- **Do:**
  1. Add an optional second parameter to `getBillProgress(bill: KYBill, asOf: Date = new Date())` and pass it to `sessionHasEnded(bill.session, asOf)` at line 145. This is the only production-code change. Existing callers are unchanged.
  2. Create `src/lib/bill-display.test.ts` with a local `makeBill(overrides: Partial<KYBill>): KYBill` helper. Use synthetic IDs and titles, never personal data. Cover:
     - `classifyKyBillBrowseBucket` for every status string `mapLegiScanBillStatus` can return ("Introduced", "In Committee", "Engrossed", "Passed Chamber", "Enrolled", "Passed", "Signed", "Chaptered", "Veto Override", "Vetoed", "Failed", "Failed in Committee", "Referred", "Reported", "Draft").
     - `effectiveKyBillDisplayStatus` for a simple resolution adopted by roll call (an `HR`/`SR` number, status `Introduced`, `last_action` containing an adoption vote) versus a pending one.
     - `billMatchesBrowseStatusFilter` for the `all` key and one bucket key.
  3. Create `src/lib/ky-bill-progress.test.ts`, passing a fixed `asOf` everywhere. Cover:
     - `billProgressKind` for HB, SB, HJR, SJR, HCR, SCR, HR and SR.
     - For an `HB` in "2026 Regular Session" with `asOf` 2026-02-01 (in session): each bucket → expected `reachedIndex` and `terminal`. "Vetoed" → terminal `vetoed`, and "Failed" → terminal `failed`.
     - The same pending bill with `asOf` 2026-10-06 (after sine die) → `terminal: 'adjourned'` and `statusLabel: 'Adjourned Sine Die'`.
     - A "2027 Regular Session" pending bill with `asOf` 2027-01-06 → not adjourned, and with `asOf` 2027-04-01 → adjourned. This is the session-rollover check that the pre-session gate checks look for.
     - The concurrent-resolution and simple-resolution stage counts, and the "passed over" / "committee substitute adopted" guard (the SR231 regression in the lines ~194–196 comment).
  4. Add one chain test per LegiScan code 1–12. Feed `mapLegiScanBillStatus(code, '')` into `makeBill({status})`, then into `getBillProgress(bill, asOf)`, and assert that `reachedIndex` is within range and that `terminal` is consistent with the bucket.
  5. Where behavior looks wrong (for example U8's three different "became law" labels), assert the current output, add a `// U8: current behavior, not endorsed (WS3-13 changes this)` comment, and list it in the PR.
- **Don't:** change labels, buckets or stage logic; touch React components; import Supabase.
- **Acceptance criteria:**
  - [ ] `npm test` passes, with at least 35 new tests across the two files.
  - [ ] No test reads the real clock: `grep -n "new Date()" src/lib/ky-bill-progress.test.ts src/lib/bill-display.test.ts` prints nothing.
  - [ ] The only non-test diff is the `asOf` parameter in `src/lib/ky-bill-progress.ts`, under 5 changed lines.
  - [ ] `npx tsc --noEmit` passes.
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** revert. The `asOf` default keeps every caller unchanged in either direction.

---

### WS1-11 · Extract and pin the AI summary input hash

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (target merge 2026-10-30) | Sonnet | S | none | E7, A1, A2, A7, A8, A9, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none in this WP. Any later change to the hash inputs is the AI workstream's decision (WS3-09a) and must carry its own cost estimate.
- **Data-limit impact:** none. Anthropic is not called, and the hash values are unchanged, so no regeneration is triggered.
- **Ongoing cost:** about 0. It guards Anthropic spend (O2). If the hash payload changes, about 1,700 current-session bills (the 2026 RS has 1,737, A6) regenerate automatically, at most 300 per 6-hourly run, for roughly $10 at about $0.006 per bill (A8). All 4,936 summarized bills (A7) regenerate, for roughly $30, only if someone runs the script with `--all-sessions` [verify the current price]. Today either would happen without review.
- **Why:** Regeneration "only when the input hash changes" is the core AI-spend control (A9), yet the hash function sits inside a script and has no tests (E7). WS3-09a–c change the summary inputs to fix A1/A2 (adding bill text); WS3-09a does it with a separate v2 hash so that v1 stays pinned. That change has to be a deliberate, reviewed event, not a side effect. The target merge of 10-30 keeps it ahead of WS3-09a (W2) and outside the election freeze.
- **Current state (verified 2026-10-06):**
  - `scripts/backfill-bill-summaries.ts` lines 61–79: a private `summaryInputHash(row)` builds a SHA-1 of `JSON.stringify({title, description, topics (sorted), subjects (sorted subject_name), editor_notes only when set})`. `needsRegen` is at line 81. `import { createHash } from 'node:crypto'` is at line 22, and its only use is inside `summaryInputHash` (line 78).
  - The script defaults to the active session (`getCivicDataSessionName()`, line 97). `--all-sessions` widens it (header line 10, flag at line 35).
  - `.github/workflows/sync-ky-bills-status.yml` line 137 runs `npm run backfill:bill-summaries -- --limit=300` after each sync, without `--all-sessions`.
  - Migration `034_ky_bill_ai_summary_metadata.sql` documents the base inputs in its `ai_summary_input_hash` column comment (title, description, sorted topics, sorted subject names). `038_ky_bills_editor_notes.sql` (lines ~11–30) documents that `editor_notes` also feeds the hash.
  - Nothing under `src/` computes the hash.
- **Do:**
  1. **First, before moving any code, compute golden values.** Copy the original `summaryInputHash` (lines 61–79, plus the `createHash` import) into a scratch file **outside the repo** (the session scratchpad). Run it with `npx tsx` on the three fixture rows from step 4, and save the hex outputs. Paste the scratch script and its output into the PR body.
  2. Create `src/lib/ai-summary-input-hash.ts` exporting `summaryInputHash(row: { title: string | null; description: string | null; topics: string[] | null; legiscan_subjects: Array<{ subject_name?: string | null } | null> | null; editor_notes?: string | null }): string`. Move the body **verbatim**, including the `editor_notes` comment. Use `import { createHash } from 'node:crypto'`.
  3. In `scripts/backfill-bill-summaries.ts`, delete the local function, import it from `../src/lib/ai-summary-input-hash`, and **remove the now-unused `import { createHash } from 'node:crypto'` at line 22**. Leave `needsRegen` and everything else as is.
  4. Create `src/lib/ai-summary-input-hash.test.ts`. Assert:
     - The golden hashes from step 1 for 3 synthetic rows: minimal and all nulls; topics and subjects in shuffled order; with `editor_notes`.
     - Topic and subject order does not matter.
     - `editor_notes` that is `null`, `''` or `'   '` gives the same hash as no notes.
     - Changing any one input field changes the hash.
  5. At the top of the test file, add: "A golden-value change regenerates AI summaries on the next syncs: about 1,700 current-session bills automatically, at most 300 per 6-hourly run (about $10), or all 4,936 (about $30) if someone runs `--all-sessions` (A7/A8). Inputs are documented in migrations 034 (base) and 038 (editor_notes). Update these values only in a PR that states the regeneration estimate and has the owner's approval."
- **Don't:** change the payload, the algorithm or the field order; touch `src/lib/ky-content-generation.ts`; run the backfill script.
- **Acceptance criteria:**
  - [ ] The golden values in the test equal the pre-refactor function's output, and the PR shows the scratch computation.
  - [ ] `npm test` passes, with at least 5 new tests.
  - [ ] `npm run typecheck:scripts` passes, or the scripts check from WS1-01's Verify if WS1-02 has not merged.
  - [ ] `grep -n "createHash" scripts/backfill-bill-summaries.ts` prints nothing.
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`, `npm run typecheck:scripts`. `npm run backfill:bill-summaries:dry` would need production secrets and Anthropic spend, so **do not run it**.
- **Owner actions:** none.
- **Rollback:** revert. The values are identical, so neither direction triggers regeneration.

---

### WS1-12 · Test that every outbound email carries the postal address and unsubscribe link

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | E7, E8, S11, T3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. The templates render locally, with no Resend call.
- **Ongoing cost:** about 0. It turns a CLAUDE.md rule (CAN-SPAM postal address) into a CI check, and it covers new templates automatically instead of relying on agents to remember (E8's honor-system pattern).
- **Why:** CLAUDE.md requires every outbound email footer to include `KYVKY_POSTAL_ADDRESS`. Today only a PR-template reminder enforces that (S11 says the address is present, but nothing keeps it there). WS7-09b will add a third template in W2, so the test must fail when a template is missing from it. It lands before WS7-09b.
- **Current state (verified 2026-10-06):**
  - `src/lib/kyvky-contact.ts` line 5 exports `KYVKY_POSTAL_ADDRESS`.
  - `src/lib/email/` holds `bill-digest-email.tsx`, `welcome-email.tsx` and `brand.tsx`. The two exported email components are `BillDigestEmail` (`bill-digest-email.tsx` line 209) and `WelcomeEmail` (`welcome-email.tsx` line 16). `brand.tsx` exports only `emailLogoSrc`, `EmailBrandHeader` and `EMAIL_DARK_MODE_CSS`, which are parts, not emails.
  - `BillDigestEmail` takes `postalAddress` (line 239) and `unsubscribeHref` (line 235), and renders them at lines ~358–365. `WelcomeEmail` renders the constant directly at line 131.
  - `src/lib/digest/run-bill-digest-cron.tsx` passes `postalAddress={KYVKY_POSTAL_ADDRESS}` (line 587) and sets `List-Unsubscribe` / `List-Unsubscribe-Post` headers at lines ~605–615. It renders with `render` from `react-email`. The welcome email is sent from `src/app/api/me/welcome-email/route.tsx`.
- **Do:**
  1. Create `src/lib/email/email-compliance.test.ts`. Use `React.createElement`, because the test glob is `*.test.ts` and has no JSX.
  2. Render `WelcomeEmail` with synthetic `https://example.com/...` hrefs, using `render(el, { plainText: true })` and `render(el)` from `react-email`. Assert that both outputs contain `KYVKY_POSTAL_ADDRESS`.
  3. Render `BillDigestEmail` with one section containing one synthetic bill group, `postalAddress: KYVKY_POSTAL_ADDRESS` and `unsubscribeHref: 'https://example.com/api/unsubscribe/test-token'`. Assert that the HTML and the plain text contain the address and the unsubscribe href.
  4. **Template coverage invariant.** Read every `.tsx` file in `src/lib/email/` as text, collect each name matching `/export function (\w+Email)\s*\(/`, and assert that this test file's own source text contains `createElement(<Name>` for each one. Failure message: "Add new email templates to email-compliance.test.ts (CLAUDE.md CAN-SPAM postal address)." Today this collects `BillDigestEmail` and `WelcomeEmail`.
  5. **Digest send wiring.** Read `src/lib/digest/run-bill-digest-cron.tsx` as text and assert that it contains `postalAddress={KYVKY_POSTAL_ADDRESS}`, `'List-Unsubscribe'` and `'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'`. This text check is permanent: WS1-13a's extraction is deferred. If WS7-05 has merged, the hrefs are wrapped in `withEmailCampaign`; the assertions above are unaffected.
- **Don't:** send email, construct `Resend`, or change templates or copy.
- **Acceptance criteria:**
  - [ ] `npm test` passes, with at least 5 new tests.
  - [ ] Temporarily deleting the address line from `welcome-email.tsx` makes a test fail. Revert afterwards and note it in the PR.
  - [ ] Temporarily adding `export function TestOnlyEmail() { return null; }` to a file in `src/lib/email/` makes the coverage invariant fail. Revert afterwards.
  - [ ] Test data uses only `example.com` addresses and synthetic names.
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`.
- **Owner actions:** none.
- **Rollback:** delete the test file.

---

### WS1-13 · Caption the digest progress meter with the newest event

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | none (merge after WS7-07b if WS7-07b is open) | E7, T3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The code comment already states the intent ("The first event line (chronologically newest …) is the specific milestone that triggered this digest entry"). This WP makes the code match it.
- **Data-limit impact:** none.
- **Ongoing cost:** none.
- **Why:** Events for a bill are sorted **oldest first** (line ~455), and then `lines[0]` is used as the meter caption (line ~475), which the comment describes as the newest. A bill with two events in one digest is captioned with the older milestone, for example "Passed House" when the triggering event was "Sent to Governor". This is a small accuracy defect in an email, found only by reading the code (E7). The fix is independent of the deferred digest extraction (WS1-13a). If an agent is executing WS7-07b, which edits the same file, it may fold this change in and close WS1-13 as `superseded`.
- **Current state (verified 2026-10-06):** in `src/lib/digest/run-bill-digest-cron.tsx` (653 lines), line ~455 is `evs.sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());` (ascending). Lines ~456–459 map `evs` to `lines` in that order. Line ~475 is `const specificMilestone = lines[0]?.detail?.trim() || undefined;`. The comment at lines ~471–474 says "newest". `BillDigestLine` is exported from `src/lib/email/bill-digest-email.tsx` (line 17), which already exports a small helper (`joinWithAnd`, line 170).
- **Do:**
  1. In `src/lib/email/bill-digest-email.tsx`, add `export function digestMeterCaption(lines: BillDigestLine[]): string | undefined`. It returns the trimmed `detail` of the **last** element (the newest, since `lines` is oldest first), or `undefined` if that is empty.
  2. In `run-bill-digest-cron.tsx`, replace line ~475 with `const specificMilestone = digestMeterCaption(lines);`, import the helper, and rewrite the comment to say that `lines` is oldest first and the caption uses the last (newest) line. Keep the oldest-first display order of `lines`.
  3. Create `src/lib/email/bill-digest-email.test.ts` covering: two lines → the second line's detail; one line → that line; an empty array → `undefined`; a whitespace-only detail → `undefined`.
- **Don't:** change display order, copy, caps or the meter's terminal logic; touch selection or send logic; run `preview:digest` (it needs production secrets).
- **Acceptance criteria:**
  - [ ] The two-line test expects the newer line's detail, and it passes.
  - [ ] `grep -n "lines\[0\]" src/lib/digest/run-bill-digest-cron.tsx` prints nothing.
  - [ ] Apart from this WP's TRACKER.md row (manual §8), the diff touches only `run-bill-digest-cron.tsx`, `bill-digest-email.tsx` and the new test file. The `run-bill-digest-cron.tsx` change is under 10 lines.
  - [ ] WS1-12's compliance tests still pass.
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** none.
- **Rollback:** revert.

---

### WS1-15 · Pin district lookup against the committed boundaries

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 (target merge 2026-10-20) | Sonnet | S | none | T5, E7, U6, C8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Landmark coordinates.** Should the test also pin 2–3 known addresses to their expected districts? Options: (a) the owner supplies 2–3 coordinate → House/Senate district pairs she has confirmed (for example, a public building in Bardstown and one in Frankfort) [verify each value with the owner; the agent must not invent district numbers]; (b) structural checks only. Recommended: (a), because it catches a boundary file swapped for the wrong vintage. **Default if there is no answer by 2026-10-16:** (b). Land the structural tests, and add landmarks in a follow-up PR when the owner supplies them.
- **Data-limit impact:** none. The test reads committed files. No geocoder, Mapbox or Census call.
- **Ongoing cost:** about 0. The test runs in about 50 ms (measured with a scratch probe on 2026-10-06).
- **Why:** Find-my-legislator is the one behavior visitors actually use (T5: 5.5% of visitors; 6 of 8 survey answers), and the election makes it peak (C8). Nothing tests it (E7). A bad GeoJSON regeneration, or a change to how district names are parsed, would silently send voters to the wrong representative in election week. WS3-05a tests only its new bbox helper on synthetic squares (U6), and WS5-12b tests name matching, not the lookup. Target merge is 2026-10-20, the end of W0, so the test is in place before the election window opens. If it slips, it is a test-only PR, so the owner may approve a merge up to 2026-10-30 (before the election freeze); after that it waits for W2.
- **Current state (verified 2026-10-06):**
  - `src/components/members/DistrictMapExplorer.tsx` fetches `/geo/ky-sldl.geojson` and `/geo/ky-sldu.geojson` (lines ~249–253). `resolvePoint` calls `findDistrictFeatureAtPoint` for the House and Senate collections (lines ~336–337), then `districtNameFromCensusFeature` and `parseKyDistrictNumber` (lines ~97–110) to match a legislator.
  - `src/lib/ky-district-geo.ts` (60 lines) exports `parseKyDistrictNumber` (line 8), `normalizeKyLegislatorDistrictForDb` (21; House → `HD-001…HD-100`, Senate → `SD-01…SD-38`), `findDistrictFeatureAtPoint` (40; returns the first feature containing the point) and `districtNameFromCensusFeature` (56; reads `properties.NAME`).
  - `public/geo/ky-sldl.geojson`: 100 features (99 Polygon, 1 MultiPolygon). `public/geo/ky-sldu.geojson`: 38 features (37 Polygon, 1 MultiPolygon). Properties are Census fields, for example `NAME: "19"`, `LSY: "2022"`. The files come from `scripts/build-ky-district-geojson.ts`.
  - `@turf/bbox`, `@turf/boolean-point-in-polygon` and `@turf/helpers` are dependencies. `@turf/point-on-feature` is **not** installed.
  - A scratch probe (2026-10-06) found that every feature has an interior grid point that maps back to itself, and that no such point falls in two features.
- **Do:**
  1. Create `src/lib/ky-district-boundaries.test.ts`. Do **not** use `src/lib/ky-district-geo.test.ts`, which WS3-05a creates. Read both files from `process.cwd()/public/geo/`.
  2. For each chamber (House: `ky-sldl`, 100; Senate: `ky-sldu`, 38), assert:
     - the feature count equals N;
     - every feature is a Polygon or MultiPolygon with a non-empty `NAME`;
     - `parseKyDistrictNumber(NAME)` values are unique and cover exactly 1..N;
     - `normalizeKyLegislatorDistrictForDb(chamber, NAME)` matches `/^HD-\d{3}$/` (House) or `/^SD-\d{2}$/` (Senate) for every feature, so each boundary maps to a DB district key.
  3. Write a test-local helper `interiorPoint(feature)`. Using `@turf/bbox`, scan grids of 11×11, then 41×41, then 101×101 points strictly inside the bbox, and return the first one that `booleanPointInPolygon` places inside **that feature alone**. Fail the test if none is found.
  4. For every feature, assert that `findDistrictFeatureAtPoint(fc, ...interiorPoint)` returns a feature with the same `NAME`, and that exactly one feature in the collection contains that point. This catches overlapping or mislabelled polygons.
  5. If the owner answered decision (a), add a `describe('landmarks')` with the supplied coordinates and expected House/Senate districts, each with a comment naming the place (public buildings only, no residential addresses).
- **Don't:** modify `src/lib/ky-district-geo.ts`, the GeoJSON files or `DistrictMapExplorer.tsx`; call any geocoder; add dependencies; use residential addresses or personal data.
- **Acceptance criteria:**
  - [ ] `npm test` passes, with at least 6 new tests, and the new file runs in under 2 s.
  - [ ] Temporarily changing one feature's `NAME` in a **copy** of the House file loaded by a scratch variant of the test makes the uniqueness test fail. Do not commit any change to `public/geo/`. Describe the check in the PR.
  - [ ] The code diff touches only `src/lib/ky-district-boundaries.test.ts`, plus this WP's TRACKER.md row (manual §8).
- **Verify** (plain container): `npm test`, `npx tsc --noEmit`, `npm run lint`.
- **Owner actions:** answer the landmark decision by 2026-10-16 if you want option (a).
- **Rollback:** delete the test file.

---

## Pre-session gate checks (consumed by WS9-12; replaces the former WS1-14)

These checks are WS1's input to the session go/no-go. WS9-12 runs them between 2026-12-28 and 2027-01-04 and records them in its go/no-go row "quality gate checks". No separate WS1 PR is needed.

1. In a plain container, on a fresh clone of `main`: `npm ci && npm run check && npm run build`. Paste the tails.
2. A green CI run on `main` dated 2026-12-15 or later, either from a push or from Actions → CI → Run workflow. If the agent cannot dispatch workflows, the **owner** clicks Run workflow and pastes the URL. The row stays `not met` until then.
3. The `main` ruleset still requires `checks` (and `build`, and `a11y` if WS6-16 added it). Reuse the WS1-07 evidence plus `gh api repos/{owner}/{repo}/rulesets` output if the owner's `gh` auth is available. Whether WS1-07's security toggles are still on is checked by WS2-14, not repeated here. Do not open a new red PR to re-test.
4. The run includes the WS1-10 session-rollover tests (2027-01-06 in session, 2027-04-01 adjourned) and the WS1-15 district boundary tests.
5. **Session baseline:** list every `src/**/*.test.ts` file and its test count. This is a reported baseline for W4, not a target.

During FZ and W3, CI and its required checks stay unchanged. Dependency updates other than non-major security fixes (WS1-07's security-update PRs) wait until W4 (operating manual §2 forbids dependency majors in FZ).

## Deferred

The program-wide register, with each row's W4 status, is `DEFERRED.md`.

| Item | Reason | Revisit trigger |
|---|---|---|
| Dependabot **version** updates via `.github/dependabot.yml` (former WS1-08, with the FZ pause and W4 restore steps of the former WS1-14) | It would be WS1's largest recurring cost (about 1 h/month of bot-PR review) on a project whose core critique is that it is overbuilt. It would run only from W1 to mid-December, overlapping the election freeze and WS2-11a/11c's `package.json` and lockfile rewrites, and WS2 recommends security updates only until W4. Advisories still arrive through WS1-07's Dependabot alerts and security-update PRs (WS1-07 Do steps 1–2), which CI vets. | The W4 decision is "continue" or "partner", **and** the S1 migration (WS2-11c) has merged. When revisited, [verify against GitHub's Dependabot docs whether `ignore` conditions such as `version-update:semver-major` also suppress security updates]. If they do, exclude majors with grouping and limits instead of `ignore`. |
| Extract digest selection into pure, tested functions (former WS1-13a) | An M-size verbatim refactor of a ~530-line function (`runBillDigestCron`, lines 120–653) for a feature that reaches 1 recipient a month (T3). WS7-05, WS7-07b and WS7-09c edit the same file in W2, so a refactor then guarantees rebase conflicts. The one real defect it surfaced is fixed on its own in WS1-13. If revived, the move list must include `milestoneScore` (line 34), `DIGEST_CAP` / `COMMITTEE_DIGEST_CAP` (lines 30/32), and the weekly gate's `dow` (line 146) with lines 167–172. `now` must be passed through to `getBillProgress(bill, now)` (WS1-10), and `withEmailCampaign` decoration (WS7-05) must be carried over. | W4 shows the digest or the My Legislators email has more than about 25 active recipients, or a digest selection regression reaches production. If WS7-09b/09c need shared pure selection functions earlier, WS7 extracts and tests them itself. |
| A standalone pre-session drill PR (former WS1-14) | WS9-12 already collects FZ drill results. A separate WP and PR for about 15 minutes of checks is process overhead. | none. The checks live in "Pre-session gate checks" above. |
| Remove `eslint.ignoreDuringBuilds` (seed idea) | Once CI lints (WS1-03/04), linting again in the Vercel build only adds build time, and it would block a production hotfix over a lint warning. Next 16 removes the `eslint` key entirely (S1). E8's concern, that nothing lints before merge, is closed by WS1-04 plus WS1-07. | The Next 16 upgrade (WS2-11c) deletes the key. |
| Rename or renumber a `045` migration | Both files are applied to production by hand (`scripts/apply-migration-sql.ts`). Renaming changes nothing in the DB and risks confusing anyone matching files to history. WS1-05b grandfathers the pair and blocks new collisions. | If the project adopts `supabase db push` or another migration-history tool: [verify] whether production has a `supabase_migrations.schema_migrations` table. |
| Fix the 2 `react-hooks/exhaustive-deps` warnings in `TopProgressBar.tsx` | Adding `start`/`finish` to the dependency arrays can re-run effects every render and change visible behavior. The warning ceiling (WS1-03) keeps the count from growing. | The next WP that touches `TopProgressBar.tsx` (for example U13 performance or the S1 upgrade). |
| Coverage reports, thresholds or test-count targets | Coverage percentages and test counts are weak signals for a project this size and invite low-value tests. The definition of done uses named behaviors instead. | A partner's or funder's due diligence (W4) asks for coverage numbers. |
| Browser end-to-end tests (Playwright) in CI | High upkeep and flaky against a DB-backed app that has no secret-free test database. U14's axe check (WS6-16) covers the most valuable browser assertion, and WS1-15 pins the lookup data. | Two production regressions in W3 that unit tests could not have caught. |
| CodeQL default setup | It adds an alert stream for a solo maintainer to triage. WS1-07's Dependabot alerts, secret scanning and push protection cover the highest-value cases. | W4 partner packaging, or a security finding that CodeQL would have caught. |
| `npm audit` as a CI gate | It fails unrelated PRs whenever a new advisory is published. WS1-07's Dependabot alerts and security-update PRs (vetted by CI) handle advisories without blocking other work. WS2-01 and WS2-14 still run `npm audit --omit=dev` once each. | WS1-07's Dependabot alerts or security updates are turned off. |
| `workflow_run` retry for "no runner" cancellations (TASKS.md "Watch" item, 2026-10-06) | This is a scheduled-job reliability item (D5), not a merge gate. It stays open in TASKS.md for its owner. | It recurs, per TASKS.md. |
| Tests for legislator name matching (E10), auth flows (S3/S4), quota-guard counting (D1), LRC parsers (E6) and roll-call labels (U1) | Each belongs to its owning workstream (WS5-12b, WS2-02/03, WS4-02/03a, WS4-05, WS3-01). WS1 provides the harness (`npm test`, CI) only. | none. Tracked in those workstreams. |

## Findings re-checked (2026-10-06, `a4e543a`)

- **E7: confirmed.** 5 test files, 41 tests, all pass in about 1.3 s via `npm test` (`node --import tsx --test "src/**/*.test.ts"`). There is no test for status mapping, progress, the digest, the summary hash, auth or name matching. **Also untested, and not listed in E7: district lookup** (`src/lib/ky-district-geo.ts` and the committed boundary files), the one behavior T5 shows visitors use. WS1-15 adds it. A regression harness for status mapping exists as a script (`scripts/verify-veto-status-mapping.ts`, 18/18 passing), but nothing runs it automatically; decisions.md ~988 says it once had 22 cases. WS1-09 folds it into `npm test` and recovers missing cases.
- **E8: confirmed, with corrections.**
  1. Type-checking `scripts/` with a config that extends `tsconfig.json` gives exactly **21 errors in 7 files**. 2 of them are E9. The two Supabase errors come from helper parameters annotated `ReturnType<typeof createClient>`, not from the call sites (WS1-02).
  2. `npm run lint` (`next lint`) passes with 0 errors and 2 warnings. The ESLint CLI (`npx eslint .`) already works with the existing flat config: 0 errors and 3 warnings on a checkout without `.next/`.
  3. **`next build` succeeds with no environment variables at all**: exit 0, 229 static pages, about 4 min on Node 22. This resolves the "[verify]" in operating manual §6, and it is why WS1-04 can run the build in CI without secrets.
  4. **Disagreement with the seed:** keep `eslint.ignoreDuringBuilds` rather than remove it (see Deferred). E8's risk is closed by CI lint plus a required check.
  5. "There is no Dependabot": confirmed, there is no `.github/dependabot.yml`. WS1-07 turns on Dependabot alerts and security updates, which need no config file. Version updates stay off by design (Deferred).
- **E9: confirmed.** Both scripts have the import inside a JSDoc comment: `backfill-session-votes.ts` lines 6–7 (line 7 is the bare text `import proved`) and `backfill-bill-history-from-datasets.ts` lines 21–22. tsc reports TS2304 at `backfill-session-votes.ts:147` and `backfill-bill-history-from-datasets.ts:195`. `backfill-bill-history-from-datasets.ts` has no npm script or workflow, and its `--dry-run` never reaches the broken call, so a dry run cannot show the bug. According to TASKS.md (around line 552), the `backfill-session-votes` workflow has a settled outcome: no upstream pre-2018 roll calls exist. WS1-01 repairs both anyway (2-line fixes), so that the hash-gated path stays intact for the D1 enforcement date. WS5-01a keeps both scripts.
- **E1 (two `045` migrations): confirmed.** Migrations are applied one file at a time by `scripts/apply-migration-sql.ts`, so the duplicate number is a hygiene issue, not a runtime one. WS1-05b handles it.
- **E2: workflow count is off by one.** The repo has **10** workflow files: 6 scheduled, 3 manual-only (`backfill-session-votes`, `backfill-vote-nv-counts`, `probe-legacy-material-urls`) and the Slack notifier. E2's "4 manual workflows" implies 11. 9 of the 10 set up Node 24 and run `npm ci`. The Slack notifier uses neither.
- **New, not in Appendix A:** `getBillProgress` reads the wall clock (`sessionHasEnded(bill.session)` with no `asOf`, `ky-bill-progress.ts` line 145), so its output changes on its own at each sine die. WS1-10 handles it.
- **New, not in Appendix A:** a digest caption ordering defect. `run-bill-digest-cron.tsx` sorts events oldest first (line ~455) but captions with `lines[0]`, which its comment calls newest (line ~475). WS1-13 handles it.
- **TASKS.md / decisions.md reconciliation:** no open TASKS.md item covers CI, Dependabot, lint migration or test infrastructure, so there is nothing to supersede. decisions.md lines ~988 and ~1461 cite `npm run verify:bill-status`; WS1-09 keeps that command working. The TASKS.md "Watch: no-runner retry" item is kept as is (Deferred).
