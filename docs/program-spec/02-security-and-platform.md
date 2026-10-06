# WS2 — Security, compliance & platform currency

## Purpose

KYvKY is a public civic site run by one person. Its credibility with users, funders and a possible partner (O3, for example CalMatters Digital Democracy) depends on two things. First, nothing embarrassing should be findable: open critical advisories, operator routes whose access control needs hardening, personal data in a public repo, or a privacy page that leaves out vendors. Second, the platform must still be supported when the 2027 session starts. This workstream closes those gaps with the smallest changes that hold. Most of its work packages (WPs) **remove** code, copies, data flows or exposure rather than add process (O1, O2, O4).

**Owned findings:** S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S12, E11. All are addressed below, or deferred in [Deferred](#deferred) with a reason. This file names the work for S3 and S4 but not their details, which are in the owner's private security note. The owner hands that note to the agent that picks up WS2-02 or WS2-03.

**Program class:** 6 of this file's 19 WPs are **Core** (WS2-01, WS2-02, WS2-03, WS2-05, WS2-11a, WS2-11c). The other 13 are **Backlog**: picked up only after the Core items in their window are done, or when their trigger fires, with a fresh Current-state check at pickup (manual, "Core vs Backlog").

**Shape by window.**

- **W0** carries only what must land before Next 15 end of support (~10-21), LegiScan enforcement (11-01) and the election (11-03): Core WS2-01, WS2-02, WS2-03 and WS2-05; then Backlog WS2-06a, WS2-07, WS2-09a, and the Owner-only WS2-15.
- **W1** (election) carries only tests, docs and copy: WS2-04, WS2-08 and WS2-09b.
- **W2** carries the Core platform chain (WS2-11a → WS2-11c) as **P0**, plus the Backlog database hardening migration (WS2-06b) and one deletion (WS2-10).
- **CSP enforcement (WS2-12a/b) and the legal review (WS2-13) wait for W4**, so the first session ever measured (T7) runs on a configuration that has already been observed in production. The Turbopack switch is deferred.
- **WS1 owns** the lint command (WS1-03) and all GitHub security toggles (WS1-07). No `.github/dependabot.yml` is added: Dependabot version updates (former WS1-08) are deferred in WS1. WS2 does not duplicate any of this.

### Definition of done (measurable, checked by WS2-14 in FZ)

1. `npm audit --omit=dev` reports **0 critical and 0 high**. Any remaining moderate advisories are listed in the WS2-14 PR, each with a reachability note.
2. Production runs a **supported Next.js major** (16.x) with React 19 declared in `package.json`, merged by **2026-12-01** and live before FZ (2026-12-15). If WS2-11c hits its stop rule, production stays on the latest 15.5.x and WS2-14 records the accepted risk.
3. **Admin-route access control is hardened, and every operator route compares secrets in constant time through one shared guard** (WS2-02). Admin routes reject any request without a valid operator token. Unit tests and one route-level test cover the configurations listed in the owner's private security note, and the WS2-02 grep (`[!=]== *(syncKey|cronSecret|adminToken|provided)|(syncKey|cronSecret|adminToken) *[!=]==`) returns nothing.
4. **The post-signup session flow is hardened per the owner's decision** (WS2-03), and the checks listed in the owner's private security note pass. The Owner has recorded the aggregate count that note asks for and, if it is above 0, a decision.
5. The Supabase advisors show **0 ERROR-level items**. The only WARN items left are the ones listed under Deferred.
6. The CSP stays **Report-Only through W3**, with the unused `api.anthropic.com` origin removed (WS2-07). Enforcement is revisited in W4 (WS2-12a/b).
7. No **shipped** Mapbox surface hides the Mapbox wordmark or attribution, and a test guards against regressions (WS2-04).
8. `FEEDBACK.md` contains no names, email addresses, phone numbers or name-bearing file slugs of feedback-givers. Its schema no longer asks for them, and a test guards it (WS2-05).
9. Data flows that are not needed are cut (WS2-09a), and `/privacy` names every remaining service that receives personal or behavioral data, including Adobe Fonts (WS2-09b). The legal review is recorded as "not done; revisit in W4" unless a trigger in WS2-13 fires.
10. `SECURITY.md` is published and private vulnerability reporting is on (WS2-08). The other GitHub security toggles are on per WS1-07.
11. Every vendor account that can deploy, change DNS, read user data or spend money has 2FA on and recovery codes stored (WS2-15).
12. **Net maintenance goes down**:
    - 6 duplicated auth blocks become 1.
    - 1 public request-time LLM endpoint is removed.
    - 1 anonymous database write path is removed.
    - Up to 2 data processors (Speed Insights, Slack personal data) are removed rather than disclosed.
    - No new schedule, vendor or dashboard is added.

### Owner decision sheet (answer once; defaults apply automatically)

Each WP repeats its own decision in full. This table exists so the owner can answer everything in one sitting. **If a row is unanswered by its date, the default applies and the agent proceeds.**

| # | Decision | WP | Default | Applies if unanswered by |
|---|---|---|---|---|
| 1 | How to harden the post-signup session flow (options in the owner's private security note) | WS2-03 | the note's recommended option | 2026-10-13 |
| 2 | Existing-account follow-up (only if the Owner's count from the private note is above 0) | WS2-03 | accept and record, revisit in W4 | 2026-10-31 |
| 3 | `FEEDBACK.md` git history: (a) HEAD only, (b) history rewrite, (c) private repo | WS2-05 | (a) | 2026-10-13 |
| 4 | Outreach notes in the public repo: move to gitignored `docs/feedback/`, or keep public | WS2-05 | move | 2026-10-13 |
| 5 | View counts: (a) retire client increments, (b) server route, (c) keep | WS2-06a/b | (a) | 2026-10-13 |
| 6 | `/api/intelligence`: (a) delete, (b) strip LLM, (c) keep | WS2-07 | (a) | 2026-10-13 |
| 7 | ZIP in PostHog: drop, 3-digit prefix, or keep and disclose | WS2-09a | drop | 2026-10-13 |
| 8 | PostHog person traits: stop sending email and name | WS2-09a | yes | 2026-10-13 |
| 9 | Sentry `sendDefaultPii` | WS2-09a | `false` | 2026-10-13 |
| 10 | Slack signup alert: drop display name and masked email, or keep and disclose | WS2-09a | drop | 2026-10-13 |
| 11 | Vercel Speed Insights: remove, or keep and disclose | WS2-09a | remove | 2026-10-13 |
| 12 | PostHog session replay wording on `/privacy` | WS2-09b | conservative copy that is true either way | 2026-10-24 |
| 13 | `SECURITY.md` acknowledgement time | WS2-08 | 5 business days | 2026-10-31 |
| 14 | Service-role wrapper: (a) wire it in with a lint rule, (b) delete it | WS2-10 | (b) | 2026-11-04 |
| 15 | Legal review: (a) pro bono, (b) paid, (c) skip and say so | WS2-13 | (c) until a W4 trigger | 2027-04-01 |

The minimap decision belongs to WS5-02 (default: delete). WS2-04 follows it.

### Interfaces with other workstreams

| This WS changes | Affects | Note |
|---|---|---|
| WS2-01 patch round | WS1-04 (PR CI) | Prefer to open WS2-01 after WS1-04 merges, so CI gates it. If WS1-04 has not merged by 2026-10-14, WS2-01 proceeds and pastes local output. |
| WS2-01: residual advisories in `react-email` → socket.io (S2) | E4, WS5-08 | WS2 patches versions only. WS5-08 owns the `react-email` swap. |
| Lint command | WS1-03 | WS1-03 owns `npm run lint` (`eslint . --max-warnings=W`). WS2 no longer changes it. WS2-11c depends on WS1-03. |
| GitHub security toggles, Dependabot | WS1-07 | WS1-07 owns every GitHub security toggle: Dependabot alerts and security updates, secret scanning and push protection. No `.github/dependabot.yml` is added; version updates (former WS1-08) are deferred in WS1, and WS2 recommends security updates only until W4. WS2-08 adds only `SECURITY.md` and the private vulnerability reporting toggle; its owner decision covers only the acknowledgement time. |
| WS2-02: one shared operator guard | WS9-08 (health-check route) | WS9-08 must not touch the guard lines and rebases on WS2-02. |
| WS2-03: the post-signup session flow (S4) | U10, WS6-12a | WS2-03 ships `src/components/auth/ResendConfirmationButton.tsx`, which WS6-12a must reuse. WS6-12a depends on WS2-03 and must keep DoD #4. |
| WS2-04: Mapbox attribution guard | WS5-02 | WS5-02 deletes the unrendered minimap by default. WS2-04's guard test protects the live map surfaces and any future map. |
| WS2-04: Mapbox token URL restriction (Owner, W2) | D4, WS9-08 | Scheduled for W2, not W0 or W1. WS9-08's vendor inventory should record whether it is on. |
| WS2-05: outreach notes leave the public repo by default | WS8 (outreach WPs) | WS8 links to no outreach log in the repo. |
| WS2-06a/b: freezes `ky_bills.view_count` (S6) | U4, U15, WS6-04b | The column stays but stops growing. Readers: the home fallback ranking (`src/lib/ky-home-bill-highlights.ts` ~143–144), `src/lib/home-bill-curated.ts` and `HomeCuratedBillList.tsx`, and **`src/lib/sitemap-data.ts` ~72–74, which orders a sitemap slice by `view_count`, so that ordering becomes static.** The U4/U15 owner (WS6-04b) decides what to do with each. |
| WS2-06b: migration number | Other W2 migrations (WS3-08, WS3-09a, WS3-11b, WS6-11a, WS7-07b, WS7-09a, WS8-07a) | WS2-06b takes the next unused number at PR time, as every migration does, not a hard-coded `057`. WS4 adds no migration (04 DoD 11). |
| WS2-07: removes `/api/intelligence` (S5) | E3, WS5-06a | `src/lib/ky-intelligence.ts` and `src/lib/anthropic-cache.ts` become unused. WS5-06a deletes them. |
| WS2-09a/b: analytics and `/privacy` | T2, T5, T8, WS6 (Typekit) | District-level lookup analysis still works. `person_profiles: "always"` is not changed. If WS6 drops Adobe Fonts, it also removes Adobe Fonts from `/privacy` (WS6 ~line 1269). |
| WS2-10: deletes `src/app/lib/supabaseAdmin.ts` by default | WS5-02 orphan test | If WS5-02 has merged, WS2-10 removes the wrapper's `ALLOWLIST` entry in the same PR. |
| WS2-11c: Next 16, `middleware.ts` → `proxy.ts` | U13; every W2 UI WP; WS5-02 orphan test | See [W2 platform sequence](#w2-platform-sequence). WS5-02's entry-point list already includes `src/proxy.ts`. |
| WS2-12a/b (W4) | WS8-15 (`/embed`) | If WS8-15 is built in W2 and needs a shared header builder, WS2-12a may be pulled forward. It must not loosen the site-wide policy. |
| WS2-14 readiness record | WS5-03a/b, WS9-12 | Recorded as an ADR or `CURRENT.md` entry per WS5-03a/b, never appended to a frozen `decisions.md`. WS9-12 collects the result. |
| WS2-15: account 2FA | WS9-08 | WS9-08's `docs/ops/vendors.md` should carry a "2FA + recovery stored (yes/no)" column. No secrets in the repo. |
| README API table, admin notes | E12, WS5-04b | WS2 edits only the rows it invalidates. Rebase on WS5-04b if it lands first. |

### W2 platform sequence

`src/middleware.ts` (later `src/proxy.ts`), `next.config.ts` and `package.json` are shared across WS2, WS5 and WS6 in W2. Merge in this order:

1. **Before W2:** WS5-02 (deletes dead files, W1). WS1-03 (ESLint CLI, W0).
2. **WS2-11a** (React 19 types). Target merge **2026-11-20**.
3. **WS5-08 and WS5-10** (package and CSS toolchain changes). Merge before WS2-11c opens if they are ready; otherwise they rebase on it.
4. **WS2-11c** (Next 16). Opens by **2026-11-21**, merges by **2026-12-01**. **Freeze point:** while WS2-11c is open, no other PR edits `src/middleware.ts`, `src/proxy.ts`, `next.config.ts` or the `next`/`react` lines of `package.json`.
5. **W2 UI WPs** (WS6-*) rebase on WS2-11c after it merges. WS6-17a and WS6-17b merge after WS2-11c (WS6's own rule).
6. **WS2-06b**: the Owner applies the migration by **2026-12-10**.

### Out of scope

- A MUI v5 → v7/v9 migration. It is not required for Next 16; see Findings re-checked, S1.
- An authentication redesign beyond WS2-03's decision (U10 and WS6-12a own the funnel).
- Penetration testing, WAF or bot-management vendors, paid security tooling, a second state, a Push API, or a native app.
- LegiScan key ownership and quota work (D1, E14, owned elsewhere).
- Bot filtering in analytics (T6).

---

## WP summary

| ID | Title | Class | Priority | Window | Tier | Size | Depends on |
|---|---|---|---|---|---|---|---|
| WS2-01 | Patch Next.js 15 and clear production dependency advisories | Core | P0 | W0 | Sonnet | S | none (prefer after WS1-04) |
| WS2-02 | Harden admin-route access control and consolidate six bearer-token checks into one constant-time guard | Core | P0 | W0 | Opus | M | none |
| WS2-03 | Harden the post-signup session flow (owner decision) | Core | P0 | W0 | Opus | M | none |
| WS2-04 | Guard Mapbox attribution on every shipped map surface | Backlog | P2 | W1 | Sonnet | S | WS5-02 |
| WS2-05 | Remove personal data from FEEDBACK.md and block its return | Core | P0 | W0 | Sonnet | S | none |
| WS2-06a | Stop the browser view-count write | Backlog | P1 | W0 | Sonnet | S | none |
| WS2-06b | Harden Supabase grants: revoke anonymous execute, pin search_path, drop the legacy dupes table | Backlog | P1 | W2 | Opus | S | WS2-06a |
| WS2-07 | Narrow CORS to public reads and retire the unused /api/intelligence route | Backlog | P1 | W0 | Sonnet | S | none |
| WS2-08 | Publish SECURITY.md | Backlog | P2 | W1 | Sonnet | S | none (toggles: WS1-07) |
| WS2-09a | Cut analytics, error-tracking and alert personal data | Backlog | P1 | W0 | Sonnet | S | none |
| WS2-09b | Make /privacy match the real data flows | Backlog | P1 | W1 | Opus | S | WS2-09a |
| WS2-10 | Close the unused service-role wrapper gap | Backlog | P3 | W2 | Sonnet | S | none |
| WS2-11a | Declare React 19 in package.json and fix type fallout | Core | P0 | W2 | Opus | M | WS2-01 |
| WS2-11c | Upgrade to Next 16, bump @mui/material-nextjs, rename middleware to proxy | Core | P0 | W2 | Opus | M | WS2-02, WS2-11a, WS1-03 |
| WS2-12a | Extract and correct the CSP in a tested function | Backlog | P3 | W4 | Sonnet | S | WS2-11c |
| WS2-12b | Enforce the CSP after a production Report-Only check | Backlog | P2 | W4 | Opus | S | WS2-12a |
| WS2-13 | Get a legal review of /privacy and /terms when a trigger fires | Backlog | P3 | W4 | Owner | S | WS2-09b |
| WS2-14 | Run the pre-session security readiness check | Backlog | P1 | FZ | Sonnet | S | WS2-01, WS2-02, WS2-03, WS2-05, WS2-06b, WS2-07, WS2-09b, WS2-11c, WS2-15 |
| WS2-15 | Confirm 2FA and recovery codes on every vendor account that can deploy, change DNS, read user data or spend money | Backlog | P1 | W0 | Owner | S | none |

**Retired or moved IDs** (WS2-06, WS2-09, WS2-11b, WS2-11d) are mapped in [TRACKER.md](TRACKER.md). A bare "WS2-06" means WS2-06a (the `useEffect` deletion); a bare "WS2-09" means both halves.

---

## Work packages

### WS2-01 · Patch Next.js 15 and clear production dependency advisories

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none (prefer after WS1-04) | S1, S2 |
- **Program class:** Core

- **Owner decision:** none.
- **Data-limit impact:** none. The npm registry is the only external call.
- **Ongoing cost:** neutral. This retires the `sharp` override, so there is one fewer pin to track. The decisions.md 2026-07-27 brace-expansion pin is superseded by a newer value; it is not removed.
- **Why:**
  - Production runs `next` 15.5.22. `npm audit --omit=dev` reports 2 critical (`next`, `maplibre-gl`) and 11 high. Next 15 reaches end of support around 2026-10-21 [verify against nextjs.org/support-policy], and the election (W1) is the peak-traffic window.
  - Patching within 15.x now is the lowest-risk way to enter W1 clean (S1, S2, O1).
- **Current state (verified 2026-10-06):**
  - `package.json`:
    - `"next": "15.5.22"` (exact pin)
    - `"eslint-config-next": "15.5.22"`
    - `"axios": "^1.18.1"`
    - `overrides`: `"sharp": "0.35.3"`, `"brace-expansion": "5.0.8"`, `"postcss": "8.5.23"`
  - `npm audit --omit=dev` on 10-06: **16 vulnerabilities** (2 critical: `next` and `maplibre-gl`; 11 high; 3 moderate). The appendix said 15.
    - next ≤15.5.23
    - maplibre-gl ≤6.4.0, an auto-installed peer of `react-map-gl` (latest 6.12.0; `react-map-gl` 8 peers `maplibre-gl >=1.13.0`)
    - sharp ≤0.35.5-rc.1
    - axios 1.0.0–1.19.0
    - brace-expansion 4.0.0–5.0.11, and `minimatch` (high) through the same chain
    - undici 7.0.0–7.29.0, via `cheerio`
    - socket.io-parser and engine.io, via `react-email`
    - nanoid, source-map-js, fast-uri, browserslist, dompurify (via `posthog-js`), fflate, baseline-browser-mapping
  - Registry facts on 10-06:
    - `next@15.5.27` is the latest 15.x (published 2026-09-30). Its optional `sharp` range is `^0.34.3 || ^0.35.4`.
    - `sharp@0.35.5`, `brace-expansion@5.0.12` and `axios@1.20.0` are the latest versions.
  - The app imports only `react-map-gl/mapbox` (4 files). `maplibre-gl` is installed but not shipped; it is still patched so the audit is clean.
  - Earlier rounds (TASKS.md around lines 238–239, decisions.md around line 1780) show that a blanket `npm audit fix` churned the eslint devtree and "netted +1". Avoid it.
- **Do:**
  1. Check whether WS1-04 (PR CI) has merged. If it has, CI gates this PR. If it has not merged by 2026-10-14, proceed without it (Next 15 end of support is ~10-21) and paste local tsc, lint, test and build output.
  2. Run `npm audit --omit=dev` and `npm audit`, and save the summary counts for the PR.
  3. In `package.json`:
     - set `"next": "15.5.27"` and `"eslint-config-next": "15.5.27"`, keeping exact pins
     - set `"axios": "^1.20.0"`
  4. In `overrides`:
     - **Remove** `"sharp"`. With next 15.5.27, npm resolves sharp to the newest version in `^0.35.4`, which should be 0.35.5. If `npm ls sharp` then shows anything below 0.35.5, re-add the override as `"sharp": "0.35.5"` instead.
     - Set `"brace-expansion": "5.0.12"`.
     - Leave `postcss` unchanged.
  5. Run `npm install`. Then refresh the vulnerable transitive packages within their existing ranges: `npm update undici socket.io-parser engine.io maplibre-gl minimatch nanoid source-map-js fast-uri browserslist dompurify fflate baseline-browser-mapping`. Run `npm ls maplibre-gl` and confirm it is above the vulnerable range `npm audit` printed (≤6.4.0 on 10-06).
  6. Re-run `npm audit --omit=dev`. If high or critical items remain that `npm update` could not reach, try `npm audit fix --omit=dev`. Inspect `git diff package-lock.json` and reject the result if any of `eslint`, `@typescript-eslint/*`, `react-email`, `@mui/*` or `react` changes major version. Never use `--force`.
  7. Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build`.
  8. Smoke-test locally with `npm run build && npm run start`, using no production secrets. Check that `/`, `/bills`, `/privacy`, `/licenses` and `/members/map` render. If Supabase env vars are absent, pages may show empty states; that is fine. Note it in the PR.
  9. Write a decision note of at most 15 lines titled `WS2-01: dependency patch round`. Append it to `decisions.md` under `## 2026-10-xx — WS2-01: dependency patch round`, **unless WS5-03a has already frozen that file**; in that case write it as an ADR in `docs/adr/` per WS5-03a. Record:
     - the sharp override was removed because next 15.5.27 accepts `sharp ^0.35.4` natively
     - the brace-expansion pin moved to 5.0.12
     - the contingency rule from step 10
  10. **Contingency rule, to write into the decision note.** After 2026-10-21, new advisories are detected by Dependabot alerts (turned on by WS1-07). The owner triages any critical Next.js alert within 72 hours. If it has no 15.x patch, WS2-11c becomes P0 and is pulled forward. In W1, this needs an Owner go-ahead.
- **Don't:**
  - Upgrade to Next 16, React 19 or any MUI major.
  - Replace axios (see Deferred).
  - Touch `react-email` imports (E4, WS5-08).
  - Run `npm audit fix --force`.
  - Change runtime code.
- **Acceptance criteria:**
  - [ ] `npm ls next` shows 15.5.27, and `npm ls sharp` shows 0.35.5 or higher.
  - [ ] `npm ls axios` shows 1.20.0 or higher, and `npm ls brace-expansion` shows only 5.0.12.
  - [ ] `npm ls maplibre-gl` shows a version above the range `npm audit` reported as vulnerable.
  - [ ] `npm audit --omit=dev` reports 0 critical and 0 high. Any residual moderate items are listed in the PR with their dependency path and whether they are shipped to the browser or server.
  - [ ] `npm audit` (including dev) does not get worse than the before-count.
  - [ ] tsc, lint, test and build pass, with output tails pasted.
  - [ ] No major-version change in the lockfile other than what step 4 caused.
  - [ ] The decision note exists (decisions.md or ADR).
- **Verify:**
  - In a plain container: `npm audit --omit=dev`, `npm ls next sharp axios brace-expansion maplibre-gl`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Needs production: the post-deploy check under Owner actions.
- **Owner actions:**
  - [ ] Merge, then in the Vercel deployment check that the build used next 15.5.27.
  - [ ] Open one bill page, `/members/map` (one ZIP lookup), and a legislator page with a portrait in production. Expect no errors in the browser console. Portraits go through `next/image`, which uses sharp locally; [verify] whether Vercel uses its own image service.
- **Rollback:** revert the PR (package.json and package-lock.json) and redeploy, or use Vercel instant rollback to the previous deployment (Owner).

---

### WS2-02 · Harden admin-route access control and consolidate six bearer-token checks into one constant-time guard

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Opus | M | none | S3, E11 |
- **Program class:** Core

- **Owner decision:** none required. One optional choice: admin access is by the `x-admin-token` header only, as today, or the header plus HTTP Basic, so a plain browser can prompt for the token. **Default: header only.** Basic is added only if the owner asks.
- **Data-limit impact:** none. The route test exercises only the unauthorized path, which makes no external call.
- **Ongoing cost:** goes down. Six copy-pasted auth blocks become one tested guard, and a future secret change touches one file.
- **Why:**
  - Admin-route access control needs hardening (S3; details in the owner's private security note).
  - Six routes each re-implement bearer parsing with a non-constant-time comparison (E11).
  - Required behavior: every operator route **rejects any request without a valid operator token**, compares secrets in constant time, is checked both at the edge and in the admin layout, and **still denies if a call site forgets `await`**.
- **Current state (verified 2026-10-06):**
  - `src/middleware.ts` lines ~10–21 hold the `/admin` check (S3; the private note describes it).
  - `src/app/admin/layout.tsx` has no gate of its own; the gate lives only in middleware.
  - The admin pages read operational tables with the service-role client:
    - `src/app/admin/sync-status/page.tsx` reads `ky_sync_state` and quota usage
    - `src/app/admin/accuracy/page.tsx` reads `ky_accuracy_runs`
  - Six identical `getBearerToken` / `authenticate` copies, each called as `if (!authenticate(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` inside an `async` handler:
    - `src/app/api/sync/route.ts` (~35–54; GET and POST)
    - `src/app/api/sync/[source]/route.ts` (~22–40; POST)
    - `src/app/api/cron/notify/route.ts` (~11–27; GET)
    - `src/app/api/cron/health-check/route.ts` (~33–50; GET)
    - `src/app/api/cron/notify-signups/route.ts` (~19–36; GET)
    - `src/app/api/cron/slack-test/route.ts` (~8–24; GET and POST)
  - Each accepts `SYNC_API_KEY` or `CRON_SECRET` (trimmed).
  - In Next 15, middleware runs on the Edge runtime, so `node:crypto` is unavailable there.
  - `npm test` runs `node --import tsx --test "src/**/*.test.ts"`. Importing a route handler from a test works today: calling the slack-test `GET` with a plain `Request` and no token returns 401 (checked 2026-10-06).
  - **Pitfall:** Web Crypto makes the helpers async. `if (!someAsyncCheck(h))` compiles under `--strict` and is always false, so it would let every request through. The lint config has no `no-misused-promises` rule. The design below makes that mistake deny the request, and the acceptance grep catches it.
- **Do:**
  1. Create `src/lib/auth/shared-secret.ts`. It must have no `node:` imports and use only Web Crypto (`globalThis.crypto.subtle`), so it runs on both Edge and Node. Export:
     - `extractBearerToken(headers: Headers): string | null`. This strips a case-insensitive `Bearer ` prefix and trims, the same as today.
     - `secretsMatch(provided: string | null, expected: string | undefined): Promise<boolean>`. It returns false if either side is empty. Otherwise it SHA-256-digests both values and compares the two 32-byte digests with an XOR-accumulate loop that has no early exit.
     - `isOperatorRequestAuthorized(headers: Headers, env?: NodeJS.ProcessEnv): Promise<boolean>`. It accepts `SYNC_API_KEY` or `CRON_SECRET` (both trimmed) and returns false when neither is configured. It may log a single warning, but never values.
     - `checkAdminAccess(headers: Headers, env?): Promise<AdminAccess>`, a string status that is `'ok'` or one of the denial statuses the private note lists. It reads `ADMIN_TOKEN` and the `x-admin-token` header.
  2. Create `src/lib/auth/operator-guard.ts` exporting `rejectUnlessOperator(req: Request): Promise<NextResponse | null>`. It returns `null` when authorized, and otherwise `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`, the body every route uses today.
  3. In each of the six routes, delete the local `getBearerToken` and `authenticate`, and start **every** exported handler with exactly:
     ```ts
     const denied = await rejectUnlessOperator(req);
     if (denied) return denied;
     ```
     Every handler is already `async`; keep it so. This shape denies by default: if `await` is ever dropped, `denied` is a Promise, which is truthy, so the handler returns early instead of running the operation.
  4. In `src/middleware.ts`, use `const access = await checkAdminAccess(request.headers)`. Continue only when `access === 'ok'`. A wrong token gets 401. Every other denial status gets the response the private note gives. Switch on the string value. Never test the result for truthiness.
  5. Add defense in depth in `src/app/admin/layout.tsx`. Make it an async server component that reads `await headers()` from `next/headers`, calls `await checkAdminAccess(...)`, and calls `notFound()` unless the result is exactly `'ok'`. The admin pages are already `force-dynamic`.
  6. Add `src/lib/auth/shared-secret.test.ts` (node:test, run by `npm test`). Cover:
     - no secrets configured → deny
     - wrong token → deny
     - a token of a different length → deny
     - `SYNC_API_KEY` accepted, and `CRON_SECRET` accepted
     - surrounding whitespace in env values is trimmed
     - a lowercase `bearer` prefix is accepted
     - an empty or wrong `x-admin-token` header → a denial status
     - each admin configuration listed in the private note → the status the note gives
     - `rejectUnlessOperator` returns a 401 response with no header, and `null` with the right token (set env in the test with dummy values)
  7. Add `src/lib/auth/operator-routes.test.ts`, a route-level test. Import `GET` and `POST` from `src/app/api/cron/slack-test/route.ts` and assert that each returns **401** with no `Authorization` header and with a wrong bearer token, with `SYNC_API_KEY` and `CRON_SECRET` set to dummy values. **Never call a handler with a valid token in tests**, because that would run the operation (here, a Slack post).
  8. Update the docs:
     - `env-template.txt`: list `ADMIN_TOKEN` as a placeholder with a one-line description.
     - `README.md` lines ~40 and ~166: describe the admin access check as it is after this PR.
- **Don't:**
  - Change which secrets are accepted, or rename env vars.
  - Touch the user-JWT path (`src/lib/supabase/route-auth.ts`) or the webhook signature checks (S11 is already good).
  - Log secrets.
  - Describe earlier admin behavior or bypass techniques in code comments, the PR or commits; the repo is public. The PR says "S3: see the owner's private note".
  - Rename `middleware.ts` (that is WS2-11c).
- **Acceptance criteria:**
  - [ ] `grep -rn "function getBearerToken\|function authenticate" src/app/api` returns nothing.
  - [ ] `grep -rnE "[!=]== *(syncKey|cronSecret|adminToken|provided)|(syncKey|cronSecret|adminToken) *[!=]==" src` returns nothing.
  - [ ] `grep -rnE "rejectUnlessOperator\(|isOperatorRequestAuthorized\(|checkAdminAccess\(" src | grep -v "await " | grep -v "^src/lib/auth/"` returns nothing (every call site awaits).
  - [ ] `shared-secret.ts` has no `node:` import, and the unit and route-level tests pass.
  - [ ] Admin routes reject any request without a valid operator token: locally, `/admin/sync-status` renders only with the right `x-admin-token`, and a wrong header gets 401. Tests cover the configurations listed in the private note.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - In a plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
  - Locally: run `npm run dev` with a dummy `ADMIN_TOKEN` in `.env.local` (not the production value) and open `/admin/sync-status` in a browser, then repeat for the configurations the private note lists. Use a header extension for the positive case, or rely on the unit tests.
  - Needs production: the Owner checks below.
- **Owner actions:**
  - [ ] **Before merge**, check in Vercel → Project → Settings → Environment Variables that `ADMIN_TOKEN` is set for Production to a random value of 32 or more characters, and do the pre-merge check in the private note.
  - [ ] After deploy, confirm in the Vercel logs that the next scheduled crons (`/api/sync?source=bills` at 05:00 UTC and `/api/cron/health-check` at 14:00 UTC) return 200.
  - [ ] Call `/api/cron/slack-test` once with the bearer token (needs the production secret). Expect 200 and one smoke-test message per configured Slack channel.
  - [ ] Open `/admin/sync-status` with your token to confirm access.
- **Rollback:** revert the PR. No data or env changes are involved.

---

### WS2-03 · Harden the post-signup session flow (owner decision)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Opus | M | none | S4 |
- **Program class:** Core

- **Owner decisions:**
  1. **How to harden the post-signup session flow. Decide by 2026-10-13.** The options, the recommended default and the file-level steps for each are in the owner's private security note. **Default if unanswered by 2026-10-13: the note's recommended option.** If the owner picks another option, this WP is **blocked**: the agent stops and reports to the owner privately (manual §9), with no specifics in the public PR.
  2. **Existing accounts.** Only needed if the Owner's aggregate count (Owner actions) is above 0. **Default if unanswered by 2026-10-31: accept and record, revisit in W4.** The alternative is described in the private note.
- **Data-limit impact:** none for the agent. The Owner's single end-to-end signup test sends 1 confirmation email (Supabase Auth mailer [verify whether it relays through Resend SMTP]).
- **Ongoing cost:** neutral or lower. The new resend button is a shared component that WS6-12a reuses instead of rebuilding.
- **Why:** the post-signup session flow needs hardening per an owner decision (S4; details in the owner's private security note).
- **Current state (verified 2026-10-06):**
  - The files in the post-signup flow and their current behavior are listed in the private note.
  - `src/app/auth/verify/page.tsx` shows two buttons after a link is opened, "Go to profile" (`/profile`) and "Browse bills" (`/bills`) (~lines 132–135); it does not redirect.
  - `src/lib/auth-redirect.ts` `safeAuthRedirectPath(next, fallback = '/profile')` accepts only relative, non-`/auth` paths.
  - `src/app/auth/register/page.tsx` line ~120 calls `trackUserRegistered`.
  - `src/components/auth/` holds `AuthPaperLayout.tsx` and `PasswordField.tsx`. `src/lib/auth/` does not exist yet (WS2-02 creates it).
- **Do** (keep it to the security minimum):
  1. Make the flow changes for the chosen option exactly as the private note lists them, including the register-page and login-page states and copy it names. Copy follows `docs/voice-and-tone.md` (no em dashes or semicolons; use "select"). Keep the `trackUserRegistered` call unchanged and do not rename analytics events (T owner).
  2. Add `src/components/auth/ResendConfirmationButton.tsx`: a small client component that calls `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })` [verify the signature in the installed `@supabase/supabase-js`] and disables itself for 60 seconds after each use. Label: "Send the link again". WS6-12a reuses it.
  3. Preserve `next=`. Append the safe `next` path (through `safeAuthRedirectPath`) to `emailRedirectTo`. On `/auth/verify`, when a safe `next` is present, point the primary button at it. Otherwise keep the current `/profile` and `/bills` buttons. If this takes more than about 30 lines, keep the current buttons and note it in the PR.
  4. Update any docs the change makes inaccurate.
- **Don't:**
  - Change existing users' rows, or query them (manual §5).
  - Build an option the owner did not choose, or decision 2's alternative.
  - Change Supabase dashboard settings (Owner).
  - Send email.
  - Change files beyond the private note's list and the steps above.
  - Describe the issue in code comments, the PR or commits; the repo is public. The PR says "S4: see the owner's private note".
  - Commit any temporary toggle, stub or mock used to take screenshots.
- **Acceptance criteria:**
  - [ ] The acceptance checks in the private note pass. The PR records "private checks: pass" without listing them.
  - [ ] The unit tests the private note lists pass.
  - [ ] `src/components/auth/ResendConfirmationButton.tsx` exists and is used by the register page.
  - [ ] Screenshots of the changed register-page state at 390px and 1440px are attached, taken either from a local-only toggle that is not committed or by the Owner on the preview.
  - [ ] The copy passes the voice-guide conventions (manual §7).
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - In a plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, plus the greps in the private note.
  - Needs production: the Owner preview test below. Previews use the production Supabase project [verify], so the test creates a real account.
- **Owner actions:**
  - [ ] **Before merge**, check the Supabase Authentication settings the private note lists.
  - [ ] **Required:** enable leaked-password protection, which the 2026-07-04 advisor flagged (migration 037 header). If it is not available on the current plan [verify], tell the WS2-14 agent so the Deferred table records it with that reason.
  - [ ] On the Vercel preview, sign up once with a mailbox you control and run the end-to-end checks in the private note. One Slack signup alert should arrive. Take the two screenshots if the agent could not.
  - [ ] **Delete that test account afterwards** in Supabase → Authentication → Users, or record in the PR that one test account exists, so the account count used in funder figures (T3, T9) stays accurate.
  - [ ] Run the one aggregate count the private note gives, with no row data (manual §5). Record only the number in the PR. If it is above 0, answer decision 2 (default: accept and record).
- **Rollback:** revert the PR. No migration is involved.

---

### WS2-04 · Guard Mapbox attribution on every shipped map surface

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W1 | Sonnet | S | WS5-02 | S9 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** none in this WP. Whether to delete the unrendered minimap is WS5-02's decision (default: delete, applied 2026-10-13).
- **Data-limit impact:** none. Map loads are unchanged.
- **Ongoing cost:** none. One fast guard test is added.
- **Why:**
  - `LegislatorDistrictMinimap.tsx` hides the Mapbox wordmark and attribution (S9), which Mapbox's terms require. Re-checking found it is **not rendered anywhere**, so the breach is in code but not in production. That makes this P2, not P0.
  - Mapbox is the free-tier map vendor for the one behavior users rely on, "find my legislator" (T5). A test keeps every shipped surface compliant, including any future map.
- **Current state (verified 2026-10-06):**
  - `src/components/members/LegislatorDistrictMinimap.tsx`:
    - line ~156 hides `.mapboxgl-ctrl-bottom-left`, `.mapboxgl-ctrl-bottom-right` and `.mapboxgl-ctrl-top-right` with `display: 'none'`
    - line ~169 sets the attribution control off
    - its only importer is `LegislatorDistrictMinimapLazy.tsx`, which nothing imports
  - The live map surfaces that import `react-map-gl` keep the defaults: `src/components/members/DistrictMapCanvas.tsx`, `src/components/members/DistrictMapExplorer.tsx` (it only styles `.mapboxgl-ctrl-group button`, line ~781) and `src/components/home/LandingDistrictMapPreview.tsx`.
  - `src/lib/ky-district-thumbnail.ts` (~line 118) builds Static Images URLs with no `logo` or `attribution` parameter [verify that Mapbox's Static Images defaults include attribution].
  - The public token `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is used in the browser, and also with no browser Referer by `scripts/generate-district-thumbnails.ts` and by `/api/geo/district-thumbnail` (it fetches, or redirects to, a tokenized Static Images URL).
- **Do:**
  1. If WS5-02 deleted the minimap and its Lazy wrapper, go to step 2. If the owner kept it (WS5-02 option (b)), fix it in this PR:
     - remove the attribution-off prop, or set the compact form that react-map-gl 8 accepts [verify the prop type in `node_modules/@vis.gl/react-mapbox`]
     - remove the bottom-left and bottom-right selectors from the `display: 'none'` rule, keeping top-right hidden
     - add `pointerEvents: 'auto'` for `.mapboxgl-ctrl-bottom-left` and `.mapboxgl-ctrl-bottom-right` so the links can be selected
  2. Add `src/lib/mapbox-attribution.test.ts`. It reads every `src/**/*.ts` and `src/**/*.tsx` file, **skipping every `*.test.ts` file**, and fails if any file:
     - sets the attribution control to false
     - contains a `logo=false` or `attribution=false` query parameter
     - has a string containing `mapboxgl-ctrl-bottom-` whose next 3 lines contain `display: 'none'` or `display: "none"`
     
     Build the patterns so the literal strings never appear in the test source, for example `new RegExp('attribution' + 'Control\\s*=\\s*\\{\\s*false')` and `new RegExp('(logo|attribution)' + '=false')`. Use plain `fs` and `RegExp`.
- **Don't:**
  - Change map styles, sizes or tokens.
  - Add a new map surface.
  - Touch the explorer's ZIP logic (U6, U7).
  - Change the Mapbox account (Owner, and not before W2).
- **Acceptance criteria:**
  - [ ] The guard test passes on current `main`.
  - [ ] It fails when the attribution-off prop is added to any live map component (demonstrate once locally; do not commit the failing state).
  - [ ] The test does not match its own source.
  - [ ] If the minimap still exists, it shows the wordmark and attribution in a screenshot from a local page that renders it (not committed), or the PR says why it could not be rendered.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Owner actions:**
  - [ ] **Optional, W2 only (on or after 2026-11-04), not in W0 or W1:** URL-restrict the public Mapbox token in Mapbox → Access tokens to `www.kyvky.com`, `kyvky.com`, your Vercel preview domain pattern and `localhost` [verify the feature and how Mapbox treats requests with no Referer]. This protects the roughly 50k free loads (D4, O2).
    - Immediately afterwards, check `/members/map` (one ZIP lookup), the home map preview, one district thumbnail (`/api/geo/district-thumbnail`), and `npm run generate:district-thumbnails` for one district if you run it locally.
    - If anything fails, remove the URL restriction in Mapbox → Access tokens the same day.
    - Record the result in WS9-08's vendor inventory.
- **Rollback:** revert the PR. Do not hide attribution as a "fix". For the token restriction, remove it in Mapbox → Access tokens.

---

### WS2-05 · Remove personal data from FEEDBACK.md and block its return

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | S12 |
- **Program class:** Core

- **Owner decisions** (decide by 2026-10-13). **This WP does not start before the decisions are answered or the deadline passes** (manual §2).
  1. **Git history.**
     - (a) Remove the data from the current file only. It stays in git history and in existing clones and forks. **Recommended and the default.**
     - (b) Rewrite history with `git filter-repo`, force-push, and ask GitHub Support to purge cached views and pull-request refs. This breaks open branches and PRs and still cannot reach forks. **If the owner chooses (b), the agent does not open a PR**, because a public PR diff (`refs/pull/N`) would keep the removed values. The owner removes the data and rewrites history directly, temporarily lifting WS1-07's force-push block, and then asks GitHub Support to purge PR refs and cached views. The agent's only task is then step 3 (the guard test) in a later PR.
     - (c) Make the repository private. This undercuts O4 (public proof of rigor) and changes GitHub Actions minutes from free to metered [verify the current plan limits] (D4).
     - Whatever the choice, the owner decides whether to tell the named people.
  2. **Outreach notes in a public repo.** `FEEDBACK.md` also logs outreach to named organizations, some of them party-affiliated. For a brand whose defensible lane is neutrality (C1, C3) and whose repo is meant as public proof of rigor (O3, O4), keeping these logs public works against the owner's goals.
     - **Default: move them out.** Entries whose `Theme:` includes `outreach` leave `FEEDBACK.md` (HEAD only, no history rewrite), replaced by a one-line pointer: "Outreach notes are kept outside the public repo."
     - Alternative: keep them public.
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. A test replaces the honour-system rule.
- **Why:** The public repo contains feedback-givers' full names and email addresses (S12). The file's own header (line ~17) says raw artifacts belong in gitignored storage, but nothing enforces it, and the file's schema and privacy paragraph actively ask for names and emails.
- **Current state (verified 2026-10-06):**
  - `FEEDBACK.md` is 111 lines with sections Open, In progress, Actioned and Won't do, and 5 entries. It contains 3 `@` characters.
  - Personal data appears in more than prose:
    - `From:` lines (entries around lines 44, 54, 80 and 98)
    - `Artifact:` paths whose slugs contain a person's name or a private group's name (around lines 48, 58 and 86)
    - a `Source:` line that names a private group chat (around line 43)
  - The **Entry schema** (line ~28) reads `- From: Full Name <email@example.com>`, and the **Privacy** paragraph (line ~21) says name and email "may be captured".
  - One entry (around line 52) has `Theme: outreach, distribution`.
  - Raw artifacts belong in the gitignored `docs/feedback/` (line ~17).
  - It is referenced from `README.md` line 15, `src/components/civic/AiAttribution.tsx` line ~42 and `scripts/set-bill-editor-note.ts` lines ~4 and ~11.
- **Do** (decision 1 = (a) or (c)):
  1. Edit `FEEDBACK.md`:
     - Replace every person's name with a neutral role descriptor, for example "a reader" or "a county official", with no location finer than "Kentucky".
     - Delete every email address and phone number.
     - Replace any `Artifact:` path whose slug contains a person's name or a private group's name with a neutral slug, for example `docs/feedback/2026-06-23-reader-email.md`. Record the old-to-new **mapping only in the Owner actions of the PR as "rename the file for entry #N to <new slug>"**, without writing the old slug.
     - Replace any `Source:` text that names a private group or chat with a neutral description such as "in-person (group chat)".
     - Keep each entry's substance, dates, theme tags and issue numbers.
     - Under decision 2's default, remove entries whose `Theme:` includes `outreach` and add the one-line pointer.
     - Do **not** quote removed values in the PR, commit message or anywhere else.
  2. Fix the instructions that invite names:
     - Change the schema line to `- From: <role descriptor, e.g. "a reader">   ← omit line entirely if anonymous`.
     - Rewrite the **Privacy** paragraph to match the new rule.
     - Add one rule to "How to use this file": "No names, email addresses, phone numbers or other contact details of people who gave feedback. Store raw artifacts in `docs/feedback/` (gitignored) and refer to them by a neutral file name with no personal names."
  3. Add `src/lib/repo-hygiene.test.ts`. It reads `FEEDBACK.md` and fails on:
     - any email address whose domain is not on the allowlist `kyvky.com` and `example.com`
     - any US phone pattern
     - any `From:` line that contains `<` or `@`
  4. Grep the other tracked root and `docs/` markdown files for email addresses outside the allowlist. Report counts only, not values, under "Found, not fixed" in the PR. Do not edit those files in this WP.
- **Don't:**
  - Rewrite git history or force-push.
  - Change outreach content beyond decision 2.
  - Edit TASKS.md or decisions.md.
  - Copy any removed data anywhere, including the PR body.
- **Acceptance criteria:**
  - [ ] `FEEDBACK.md` contains no non-allowlisted email addresses, no personal names and no name-bearing file slugs. The reviewer confirms by reading the diff, **including every `Artifact:`, `From:` and `Source:` line**.
  - [ ] `grep -n "From: Full Name" FEEDBACK.md` returns nothing.
  - [ ] `repo-hygiene.test.ts` passes, and fails when a synthetic `person@example.org` line or a `From: A <a@b.c>` line is added locally (do not commit either).
  - [ ] Under decision 2's default, `grep -n "^- Theme:.*outreach" FEEDBACK.md` returns nothing.
  - [ ] The PR body contains no removed values.
- **Verify:** in a plain container, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- **Owner actions:**
  - [ ] **Before merge**, if decision 2 is "move", copy the outreach entries from the current `FEEDBACK.md` into your local, gitignored `docs/feedback/` (git history also keeps them).
  - [ ] Rename the local raw files in `docs/feedback/` to the neutral slugs listed in the PR.
  - [ ] Decide whether to tell the people whose details were public.
  - [ ] Record decisions 1 and 2.
- **Rollback:** revert the PR. Reverting re-publishes the data in HEAD, so prefer a forward fix.

---

### WS2-06a · Stop the browser view-count write

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | S6 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** what to do about view counts. **Decide by 2026-10-13.**
  - **(a) Retire client increments.** Remove the browser RPC call now (this WP), revoke anonymous execute later (WS2-06b), and keep the `view_count` column frozen as the existing fallback ranking. **Recommended and the default.**
  - (b) Move the increment behind a rate-limited server route. This adds a route and one database write per view. Under (b) this WP is blocked and re-scoped.
  - (c) Keep it as is and accept the inflation risk. Under (c) this WP and WS2-06b's REVOKE are skipped.
  - **Default: (a).**
- **Data-limit impact:** none. Supabase load goes down, because there is no longer one write per bill page view.
- **Ongoing cost:** goes down. One client write path is removed.
- **Why:**
  - `ky_increment_bill_view` is SECURITY DEFINER and callable by `anon`, so anyone can inflate counts (S6).
  - It also sets `ky_bills.updated_at = now()` on every view (migration 011). `src/lib/sitemap-data.ts` (~lines 45–54) uses `updated_at` as the sitemap `lastModified`, so viewing a bill (or a bot hitting it) makes the bill look modified to search engines. Removing the browser call stops this churn now, before election traffic.
  - The home rankings already use PostHog first (`src/lib/ky-home-bill-highlights.ts` ~lines 10–40).
- **Current state (verified 2026-10-06):**
  - `src/components/bills/BillDetailView.tsx` lines ~835–857 hold the `useEffect` that calls `.rpc('ky_increment_bill_view', …)` and uses a `sessionStorage` key (~841–851).
  - `view_count` readers: `src/lib/ky-home-bill-highlights.ts` (~143–144, the fallback ranking), `src/lib/home-bill-curated.ts` (~27–34), `src/components/home/HomeCuratedBillList.tsx`, and `src/lib/sitemap-data.ts` (~72–74, orders a sitemap slice).
- **Do:**
  1. In `BillDetailView.tsx`, delete the view-count `useEffect` and its `sessionStorage` key.
  2. Leave every `view_count` read untouched: `ky-home-bill-highlights.ts`, `home-bill-curated.ts`, `HomeCuratedBillList.tsx` and `sitemap-data.ts`. They belong to the U4/U15 owner (WS6-04b).
  3. Under "Found, not fixed", note that the function remains callable by `anon` until WS2-06b is applied.
- **Don't:**
  - Write or apply a migration (WS2-06b).
  - Drop the `view_count` column or the function.
  - Change any ranking or sitemap code.
- **Acceptance criteria:**
  - [ ] `grep -rn "ky_increment_bill_view" src` returns nothing.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- **Owner actions:** [ ] After deploy, open one bill page in production and confirm there is no console error.
- **Rollback:** revert the PR.

---

### WS2-06b · Harden Supabase grants: revoke anonymous execute, pin search_path, drop the legacy dupes table

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | S | WS2-06a | S6 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** follows WS2-06a's decision. Default (a).
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. One anonymous grant and one table are removed, and 037's "BY DESIGN" exception is retired.
- **Why:** The remaining S6 advisor items are the anonymous execute grant on `ky_increment_bill_view`, a legacy table without RLS, and a function with a mutable `search_path`. They are low-risk cleanup, so the migration waits for W2 instead of adding a production database step during the busiest owner window.
- **Current state (verified 2026-10-06):**
  - `supabase/migrations/011_ky_bill_view_count.sql` defines the function and grants it to `anon` and `authenticated`.
  - `037_ky_advisor_function_hardening.sql` kept that grant "BY DESIGN".
  - `048_ky_committee_materials_drop_legacy_duplicates.sql` lines ~90–100 created `ky_committee_materials_legacy_dupes_048` with CREATE TABLE AS. Its comment says it is "safe to drop once probe:committee-links confirms". TASKS.md (around line 110) records that 802 of 802 legacy URLs were probed dead on 2026-07-31.
  - Functions created without `SET search_path`, not fixed by 037:
    - `update_updated_at_column()` (001, ~line 188)
    - `public.ky_immutable_array_to_string(text[], text)` (040)
    
    The advisor reported **one**. Confirm which before pinning.
  - The highest migration is `056`, and two files share `045` (E1). Other W2 WPs also add migrations; WS4 adds none.
- **Do:**
  1. Rebase onto current `main` immediately before opening the PR. Run `ls supabase/migrations | tail` and take the next unused number NNN. Do not assume `057`.
  2. Create `supabase/migrations/NNN_ky_advisor_hardening.sql`. Make it idempotent:
     - `REVOKE EXECUTE ON FUNCTION public.ky_increment_bill_view(uuid) FROM PUBLIC, anon, authenticated;` Keep `service_role`. Add a `COMMENT ON FUNCTION` that says it was retired by WS2-06 and that `view_count` is frozen.
     - Add `ALTER FUNCTION … SET search_path = pg_catalog, public;` for each function the advisor flags. If the advisor output is not available to the agent, pin both candidates; the change is harmless to them.
     - `DROP TABLE IF EXISTS public.ky_committee_materials_legacy_dupes_048;`
     - Add a header comment that supersedes 037's "BY DESIGN" note and states that `pg_trgm` stays in `public` (see Deferred).
  3. Put the down SQL in the PR's Rollback section and the exact Owner command in Deploy notes.
- **Don't:**
  - Move `pg_trgm`.
  - Drop the `view_count` column or the function.
  - Change RLS on any other table.
  - Apply the migration.
  - Query user tables.
- **Acceptance criteria:**
  - [ ] The migration is idempotent: re-running it is a no-op, because it uses `IF EXISTS` and repeatable `REVOKE` and `ALTER`.
  - [ ] `ls supabase/migrations | cut -c1-3 | sort | uniq -d` prints only `045`.
  - [ ] The PR has deploy notes giving the order and the exact command.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - In a plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, the `uniq -d` check, and a read-through of the SQL.
  - Needs production: everything under Owner actions.
- **Owner actions** (apply by **2026-12-10**, before FZ):
  - [ ] Before applying, open Supabase → Advisors → Security and note the current items, including which function is flagged for `search_path`.
  - [ ] Optional: export `ky_committee_materials_legacy_dupes_048` to CSV from the table editor if you want a copy.
  - [ ] Run `npm run db:apply-sql -- supabase/migrations/NNN_ky_advisor_hardening.sql` (needs production env). WS2-06a is already deployed, so the order relative to the merge does not matter.
  - [ ] Re-run the Advisors. Expect these to be gone:
    - the anon-executable SECURITY DEFINER item for `ky_increment_bill_view`
    - the RLS-disabled table
    - `function_search_path_mutable`
    
    Expect `extension_in_public` (pg_trgm) to remain; it is deferred.
- **Rollback (down SQL):**
  - `GRANT EXECUTE ON FUNCTION public.ky_increment_bill_view(uuid) TO anon, authenticated;`
  - `ALTER FUNCTION <each pinned function> RESET search_path;`
  - The dropped table cannot be restored from the migration. Its rows were dead duplicate URLs (TASKS.md 2026-07-31). Use the CSV export if one was taken.

---

### WS2-07 · Narrow CORS to public reads and retire the unused /api/intelligence route

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | S5, S8 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** what to do with `/api/intelligence`. **Decide by 2026-10-13.**
  - **(a) Delete it. Recommended and the default.** No page calls it: `grep "api/intelligence"` outside `src/app/api` and `README.md` finds nothing. It calls Anthropic at request time, up to a 200-call daily ceiling (`route.ts` ~lines 69–78), which contradicts the "generation is offline" practice (A9).
  - (b) Keep it but remove the LLM step.
  - (c) Keep it as is.
  - **Default: (a).**
- **Data-limit impact:** none to execute. The worst-case Anthropic spend falls by up to 200 calls a day (O2).
- **Ongoing cost:** goes down. One public route and one source of rate-limit table writes are removed.
- **Why:**
  - `vercel.json` grants `Access-Control-Allow-Origin: *` with GET/POST/PUT/DELETE and an `Authorization` header to `/api/(bills|search|intelligence|geo)` (S5).
  - Only GET is needed cross-origin. A keyless public read API for bills and search is also a plausible partner asset (O3).
  - `/api/geo/zip` proxies OpenStreetMap Nominatim, whose usage policy caps us at 1 request a second (comment in `src/app/api/geo/zip/route.ts`). It should not be open to browsers on other sites.
  - The Report-Only CSP lists `api.anthropic.com` in `connect-src`, although browsers never call Anthropic (S8). Removing it is one line and needs no separate WP.
- **Current state (verified 2026-10-06):**
  - `vercel.json` `headers[0]` covers `/api/:group(bills|search|intelligence|geo)/:path*`.
  - The only mutating route in that group is `src/app/api/bills/[id]/follow/route.ts` (GET, POST, DELETE), which uses a Bearer JWT.
  - All others are GET-only: `bills/route.ts`, `bills/[id]/route.ts`, `bills/browse/route.ts`, `search/route.ts`, `intelligence/route.ts`, `geo/zip/route.ts` and `geo/district-thumbnail/route.ts`.
  - `README.md` lines ~141, ~154 and ~163 document `/api/intelligence` and its rate-limit counters.
  - `next.config.ts` line ~151: the Report-Only `connect-src` includes `https://api.anthropic.com`, and the comment at line ~136 lists it "defensively".
- **Do:**
  1. In `vercel.json`:
     - change the source to `/api/:group(bills|search)/:path*`
     - set `Access-Control-Allow-Methods` to `GET, OPTIONS`
     - set `Access-Control-Allow-Headers` to `Content-Type`
     
     Without `Authorization` in the allowed headers, cross-origin authenticated calls fail preflight, which is intended. Same-origin calls are unaffected.
  2. With the default (a), delete `src/app/api/intelligence/route.ts`. Leave `src/lib/ky-intelligence.ts` and `src/lib/anthropic-cache.ts` in place for WS5-06a, and note under "Found, not fixed" that they are now unused.
  3. In `next.config.ts`, remove `https://api.anthropic.com` from the Report-Only `connect-src` and its comment line. Change nothing else in the policy (WS2-12a).
  4. Update `README.md`: remove the `/api/intelligence` row and its rate-limit notes. If any rows still describe the public read API, add one line: "Public read endpoints `/api/bills*` and `/api/search` allow cross-origin GET."
- **Don't:**
  - Change `/api/geo/zip` behavior or validation (U6 is owned elsewhere).
  - Add API keys or new rate limits.
  - Delete library files.
  - Change any other CSP directive or the header name.
- **Acceptance criteria:**
  - [ ] `vercel.json` grants CORS only to `bills|search`, with `GET, OPTIONS` and `Content-Type` only.
  - [ ] `src/app/api/intelligence/` is gone under (a), and `grep -rn "api/intelligence" src README.md` returns nothing.
  - [ ] `grep -n "api.anthropic.com" next.config.ts` returns nothing.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - In a plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, and `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`.
  - Needs production or preview: the Owner check below.
- **Owner actions:**
  - [ ] On the Vercel preview, open a bill page and `/members/map` and check that follow, search and ZIP lookup still work.
  - [ ] In devtools → Network, confirm that a response from `/api/bills` carries the narrowed `Access-Control-Allow-Methods`.
- **Rollback:** revert the PR (`vercel.json`, `next.config.ts` and the route file).

---

### WS2-08 · Publish SECURITY.md

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W1 | Sonnet | S | none (toggles: WS1-07) | S2, S12 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** the acknowledgement time stated in `SECURITY.md`. **Default: 5 business days** if unanswered by 2026-10-31. Dependabot and the other GitHub security toggles are WS1-07's, not decided here.
- **Data-limit impact:** none.
- **Ongoing cost:** none. One static file and one GitHub setting.
- **Why:**
  - A `SECURITY.md` tells researchers where to report, which a partner's due diligence will look for (O3, O4).
  - Dependabot alerts (WS1-07) catch the advisory class (S2). Secret scanning and push protection (WS1-07) catch committed credentials, a neighbouring risk to S12. Personal data in `FEEDBACK.md` is guarded by WS2-05's test, not by GitHub.
- **Current state (verified 2026-10-06):**
  - There is no `SECURITY.md` at the root, in `docs/` or in `.github/`.
  - `.github/` contains `pull_request_template.md` and workflows.
  - `README.md` line ~170 already names `katie@kyvky.com` as the vulnerability-report inbox.
  - `docs/launch-checklist.md` lines ~60–63 confirm a human reads that inbox.
- **Do:**
  1. Create `SECURITY.md` at the repo root, at most about 40 lines, with plain neutral copy:
     - **Supported:** the production site and `main` only.
     - **How to report:** email `katie@kyvky.com`, or GitHub private vulnerability reporting.
     - **Expectations:** acknowledgement within the decided number of business days; no bug bounty; please do not test against other users' accounts or degrade service.
     - **Out of scope:** findings that need physical access, social engineering, or third-party services' own bugs.
     - No exploit examples.
  2. Add a "Security" line to `README.md` linking to `SECURITY.md`.
- **Don't:**
  - Add workflows, CodeQL, or `.github/dependabot.yml` (Dependabot version updates, former WS1-08, are deferred in WS1).
  - Change settings yourself.
- **Acceptance criteria:**
  - [ ] `SECURITY.md` exists and follows the voice guide.
  - [ ] The README links to it.
  - [ ] The Owner action below is copied into the PR.
- **Verify:** in a plain container, `npm run lint` (no code change) and a read-through.
- **Owner actions:**
  - [ ] GitHub → repo → Settings → Code security [verify the menu name]: turn on **Private vulnerability reporting**. The other toggles are WS1-07's.
- **Rollback:** delete `SECURITY.md`; the setting can be toggled off.

---

### WS2-09a · Cut analytics, error-tracking and alert personal data

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | S10 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decisions** (decide by 2026-10-13; defaults shown; each removes a flow rather than disclosing it):
  1. **ZIP in PostHog** (`district_map_lookup`): (a) stop sending `zip` and keep `lookup_type` and the districts **(default)**; (b) send the 3-digit prefix; (c) keep it and disclose it.
  2. **PostHog person traits:** stop sending `email` and `name`, and keep the Supabase user id, `account_type` and `email_verified`. **Default: yes.** Existing PostHog person properties stay until you delete them in PostHog.
  3. **Sentry `sendDefaultPii`:** set it to `false` on server, edge and client. **Default: false.** Sentry keeps stack traces and route tags, but not IP addresses, cookies or request headers.
  4. **Slack signup alert:** (a) drop the display name and masked email, and post only "New verified KYvKY sign-up" **(default)**; (b) keep them and disclose it. With 16 accounts, the owner can look users up in Supabase when needed.
  5. **Vercel Speed Insights:** (a) remove the component and the dependency **(default)**; (b) keep it and disclose it. WS6 measures layout shift with its own lab script (`npm run a11y -- --metrics`, WS6) and adds no web-vitals dependency, so the U13 owner does not need field data from Speed Insights [verify with the WS6 owner]. PostHog was made the only analytics source on 2026-09-22 (T10).
- **Data-limit impact:** none. PostHog event volume is unchanged.
- **Ongoing cost:** goes down. One dependency and one processor are removed by default, and fewer flows need disclosure.
- **Why:** PostHog captures 5-digit ZIP codes (S10). Re-checking found more personal data leaving the site than needed: PostHog identify sends email and name, Sentry sends default PII in all three runtimes, the Slack alert carries a display name and masked email, and Speed Insights is a second analytics processor. Cutting these is cheaper than disclosing them and shortens the privacy page (WS2-09b).
- **Current state (verified 2026-10-06):**
  - `src/lib/analytics.ts`:
    - lines ~199–214: `trackDistrictMapLookup` sends `zip`; the call site is `src/components/members/DistrictMapExplorer.tsx` ~line 344
    - lines ~284–292: `postHogPersonTraits` sends `email` and `name`
  - `sentry.server.config.ts` line ~26, `sentry.edge.config.ts` line ~26 and `instrumentation-client.ts` line ~103 all set `sendDefaultPii: true`.
  - `src/lib/slack-webhook.ts` ~580–589: `notifyNewUserSlack({ email, displayName })` posts the display name and `maskEmail(email)`. Its only caller is `src/lib/new-signup-notifications.ts` line ~61.
  - `src/app/layout.tsx` line 5 imports `SpeedInsights` from `@vercel/speed-insights/next`, and line ~134 renders `<SpeedInsights />`. `@vercel/speed-insights` is a dependency.
- **Do:**
  1. Remove `zip` from the `trackDistrictMapLookup` payload and its type, and update the call site.
  2. Remove `email` and `name` from `postHogPersonTraits`.
  3. Set `sendDefaultPii: false` in all three Sentry inits.
  4. Under decision 4 (a), change `notifyNewUserSlack` to take no personal fields and post `*KYvKY: new verified user*`. Update the caller. Keep the return shape and the claim/rollback logic unchanged.
  5. Under decision 5 (a), remove the `SpeedInsights` import and element from `layout.tsx` and `@vercel/speed-insights` from `package.json`, then run `npm install`.
  6. Under "Found, not fixed", list for WS2-09b which flows remain.
- **Don't:**
  - Change `person_profiles`, autocapture or event names (T owner).
  - Touch `/privacy` (WS2-09b).
  - Add a cookie banner or consent manager, which would be a new vendor.
- **Acceptance criteria:**
  - [ ] `grep -n "zip:" src/lib/analytics.ts` returns no event payload key (under default (a)).
  - [ ] `postHogPersonTraits` sends no email or name.
  - [ ] `grep -rn "sendDefaultPii: true" sentry.*.ts instrumentation-client.ts` returns nothing.
  - [ ] Under the defaults, `grep -rn "speed-insights" src package.json` returns nothing, and `notifyNewUserSlack` has no `email` or `displayName` parameter.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- **Owner actions:**
  - [ ] Optional: delete the `email` and `name` person properties from existing PostHog persons.
  - [ ] Optional, under decision 5 (a): turn Speed Insights off in the Vercel project [verify the setting location].
  - [ ] After deploy, confirm the next signup alert (or the slack-test call) still reaches `#user-signups` without personal fields.
- **Rollback:** revert the PR. Analytics properties resume on the next deploy.

---

### WS2-09b · Make /privacy match the real data flows

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Opus | S | WS2-09a | S10 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** the session-replay sentence. The code does not set `disable_session_recording`, so whether PostHog records sessions is a PostHog project setting. **Default if unanswered by 2026-10-24:** write conservative copy that is true either way: "PostHog may record anonymized page interactions to help us fix usability problems. Text typed into forms is masked." [verify PostHog's masking default for inputs before merge; if it is not masked by default, drop the second sentence]. The Owner may edit this one sentence in the PR before merge.
- **Data-limit impact:** none.
- **Ongoing cost:** none. A short checklist comment in the page source keeps it accurate.
- **Why:**
  - The launch checklist's legal review is unchecked (S10). An accurate page is the precondition for any review (WS2-13) and for partner due diligence (O3).
  - `/privacy` (last updated 2026-05-13) lists only Supabase, Resend, Vercel and Sentry. Data also reaches PostHog, Mapbox, OpenStreetMap Nominatim, Adobe Fonts and, unless WS2-09a removed them, Slack and Speed Insights.
- **Current state (verified 2026-10-06):**
  - `src/app/privacy/page.tsx`:
    - `LAST_UPDATED = '2026-05-13'` (line 12)
    - the "Who we share it with" list (~lines 66–90) names Supabase, Resend, Vercel and Sentry
    - it says Sentry receives "no personal content from emails" (~82–83)
  - `instrumentation-client.ts` lines ~10–35: PostHog with `autocapture: true`, `person_profiles: "always"` and `capture_exceptions: true`. `api_host` defaults to `us.i.posthog.com`. PostHog is not initialized on Vercel previews.
  - **ZIP lookups are geocoded by Mapbox from the browser** (`mapboxGeocodeZip`, `src/lib/mapbox-geocode.ts` ~line 75, called at `DistrictMapExplorer.tsx` ~389). Only if Mapbox misses does the browser call `/api/geo/zip` (~392), which sends the ZIP to Nominatim from the server.
  - Typed address text also goes from the browser to `api.mapbox.com` geocoding (`src/lib/mapbox-geocode.ts`).
  - `src/app/layout.tsx` lines ~88–107 preconnect to `use.typekit.net` and `p.typekit.net` and load `https://use.typekit.net/yru3sto.css` on every page (D6), so Adobe receives every visitor's IP address and page loads.
  - `src/app/layout.tsx` ~line 4 uses `next/font/google`, which self-hosts fonts at build time [verify no runtime request to Google].
  - `next.config.ts` ~lines 142–151: the Report-Only CSP's `script-src`, `style-src`, `font-src`, `frame-src` and `connect-src` list the third-party origins.
- **Do:**
  1. Rewrite the `/privacy` sections "What we collect", "Who we share it with" and "How long we keep it" so every remaining service that receives personal or behavioral data is named, with what it gets and why. Follow `docs/voice-and-tone.md`: plain words, no em dashes or semicolons. Cover at least:
     - **PostHog:** pages viewed and clicks, an approximate location derived from IP, an anonymous visitor ID, district lookups (not ZIP codes, after WS2-09a), survey answers and error events. Account users are linked by an internal ID. The session-replay sentence from the decision.
     - **Mapbox:** map tiles, and the address or ZIP code you type into map search, sent from your browser.
     - **OpenStreetMap Nominatim:** used only as a fallback when Mapbox cannot find a ZIP code. The ZIP code is sent from our server without your identity.
     - **Adobe Fonts (Typekit):** font files and a usage request from your browser, which includes your IP address.
     - **Sentry:** error reports without IP addresses, cookies or request headers (after WS2-09a). Correct the "no personal content from emails" line if it no longer fits.
     - **Slack and Vercel Speed Insights:** only if WS2-09a kept them.
     - **Anthropic:** AI summaries are generated from public bill data, and no personal data is sent.
     - Keep Supabase, Resend and Vercel.
  2. Update `LAST_UPDATED` to the merge date.
  3. Add a short comment block at the top of `page.tsx`: "When you add a vendor that receives user or visitor data, update the list below and LAST_UPDATED. Every third-party origin in the CSP in next.config.ts must map to a vendor named here."
  4. Leave `/terms` unchanged unless it contradicts the new privacy text. If it does, fix only the contradiction.
  5. Put a one-paragraph plain description of the data flows in the PR body, for any later reviewer (WS2-13).
- **Don't:**
  - Change analytics or vendor code (WS2-09a).
  - Claim compliance with any law.
  - Present the page as lawyer-reviewed.
- **Acceptance criteria:**
  - [ ] `/privacy` names PostHog, Mapbox, OpenStreetMap Nominatim, Adobe Fonts, Supabase, Resend, Vercel and Sentry, plus Slack and Speed Insights if WS2-09a kept them.
  - [ ] Every third-party origin in the CSP's `script-src`, `style-src`, `font-src`, `frame-src` and `connect-src` maps to a vendor named on the page or to `'self'`. The PR includes the origin-to-vendor table.
  - [ ] The copy passes the voice-guide checks. Screenshot at 390px.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, and `npm run start` to view `/privacy`.
- **Owner actions:**
  - [ ] Confirm whether PostHog session replay is on (PostHog → Project settings → Session replay [verify]) and edit the one sentence if needed.
  - [ ] Merge by 2026-10-31 so the page is accurate for election traffic.
- **Rollback:** revert the PR.

---

### WS2-10 · Close the unused service-role wrapper gap

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W2 | Sonnet | S | none | S7 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** **Decide by 2026-11-04.**
  - (a) Wire the wrapper in: switch every `src/app` importer (12 on 10-06) to `@/app/lib/supabaseAdmin` and add one `no-restricted-imports` rule forbidding `supabaseAdmin` and `supabaseAdminCore` in `src/components/**`. No custom test.
  - **(b) Delete the unused wrapper `src/app/lib/supabaseAdmin.ts`** and record the rationale. **Recommended and the default.** It is pure deletion.
- **Data-limit impact:** none.
- **Ongoing cost:** goes down under (b): one orphan file and one allowlist entry are removed.
- **Why:**
  - The `server-only` wrapper exists but nothing imports it (S7).
  - The service-role key is not `NEXT_PUBLIC_`, and Next inlines only `NEXT_PUBLIC_` variables into browser bundles, so a client import cannot leak the key; it would get a `null` client. A fence is defense in depth for a leak that cannot happen today, so the cheapest honest fix is to remove the dead wrapper.
- **Current state (verified 2026-10-06):**
  - `src/app/lib/supabaseAdmin.ts` is 2 lines: `import 'server-only'` plus a re-export.
  - `src/app/lib/supabaseAdminCore.ts` holds the client. Its comment (~27–29) says the fence lives in the wrapper.
  - `grep -rln supabaseAdminCore src` returns 23 files: **22 importers plus the wrapper**. 12 importers are under `src/app` and 10 under `src/lib` (including `src/lib/digest/run-bill-digest-cron.tsx`). Recount at pickup.
  - 27 `scripts/*.ts` files import the core module directly. `server-only` throws outside the React server condition, so plain-Node `tsx` scripts cannot use the wrapper.
  - WS5-02's orphan test puts the wrapper on its `ALLOWLIST` pending this decision.
- **Do** (default (b)):
  1. Delete `src/app/lib/supabaseAdmin.ts`.
  2. Update the comment in `supabaseAdminCore.ts`: the key is server-only because it is not `NEXT_PUBLIC_`; shared with `scripts/`.
  3. If WS5-02's orphan test exists, remove the wrapper's `ALLOWLIST` entry.
  
  Under (a): do what the decision describes for every `src/app` importer that exists at pickup.
- **Don't:**
  - Change `scripts/` or `src/lib/**` imports.
  - Change client creation.
  - Add a custom boundary test.
- **Acceptance criteria:**
  - [ ] Under (b): `src/app/lib/supabaseAdmin.ts` does not exist, and `grep -rn "app/lib/supabaseAdmin'" src` returns nothing.
  - [ ] Under (a): `grep -rln "supabaseAdminCore" src/app src/components` lists only `src/app/lib/supabaseAdmin.ts`, and the lint rule fires on a deliberate local violation (not committed).
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`.
- **Owner actions:** none.
- **Rollback:** revert the PR.

---

### WS2-11a · Declare React 19 in package.json and fix type fallout

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W2 | Opus | M | WS2-01 | S1 |
- **Program class:** Core

- **Owner decision:** none. Target merge **2026-11-20** (see W2 platform sequence).
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. The declared React finally matches the React that actually runs, so types and tests stop describing a different runtime.
- **Why:**
  - `package.json` declares React 18.2, but the App Router runs Next's vendored React 19.2 (S1).
  - Next 16 needs React 19, and Next 15 reaches end of support around 2026-10-21, so this is on the critical path to DoD #2.
  - Doing this on Next 15, where the `next` peer range already allows `^19.0.0`, keeps WS2-11c small.
- **Current state (verified 2026-10-06):**
  - `package.json` has `react` and `react-dom` at `18.2.0`, and `@types/react` and `@types/react-dom` at `^18.x`.
  - `node_modules/next/dist/compiled/react` reports `19.2.0-canary-0bdb9206-20250818`.
  - Installed `@mui/material` is 5.17.1 (`package.json` `^5.15.15`). 5.17.1 and 5.18.0 (the last v5) both peer React `^17 || ^18 || ^19`. `lottie-react@2.4.1` and `next@15.5.27` also allow React 19. `react-map-gl` 8 and Emotion 11 [verify with `npm ls` after install].
  - There is no `src/pages` directory.
- **Do:**
  1. Set `react` and `react-dom` to `^19.2.0` (match the minor version Next vendors) and `@types/react` and `@types/react-dom` to `^19`. Optionally bump `@mui/material`, `@mui/system` and `@mui/icons-material` to `^5.18.0`.
  2. Run `npm install` and resolve any `npm ls` peer errors.
  3. Run `npx tsc --noEmit` and fix the errors. Expected classes:
     - `useRef()` now requires an argument
     - the global `JSX` namespace becomes `React.JSX`
     - `ReactElement` props default to `unknown`
     - `defaultProps` is removed on function components
     
     Fix mechanically. Do not refactor components.
  4. **Stop rule.** If more than about 40 files need edits, stop. Revert the package.json and lockfile to React 18 types and open a `BLOCKED` draft PR (manual §9) with per-directory error counts. Propose splits, for example WS2-11a1 (type fixes that also compile under `@types/react` 18) followed by WS2-11a2 (the version bump). Never leave a PR with React 19 declared and `tsc` failing.
  5. Run `npm test`, `npm run lint` and `npm run build`. Then `npm run start` and click through `/`, `/bills`, a bill page, `/members/map`, `/meetings`, `/auth/login` and `/profile` (logged-out view). Expect no console errors that are new compared with the baseline.
- **Don't:**
  - Upgrade Next or MUI majors.
  - Change behavior.
  - Change `@mui/material-nextjs` (WS2-11c).
- **Acceptance criteria:**
  - [ ] `npm ls react react-dom` shows 19.2.x with no invalid peers.
  - [ ] tsc, lint, test and build pass.
  - [ ] The smoke list was checked with no new console errors, and screenshots of home and a bill page are attached.
- **Verify:** in a plain container, `npm ls react react-dom`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. The smoke check uses `npm run start` with no production secrets; empty states are fine.
- **Owner actions:** [ ] Check one bill page, `/members/map` and the login page on the preview.
- **Rollback:** revert the PR (package.json, the lockfile and the type fixes).

---

### WS2-11c · Upgrade to Next 16, bump @mui/material-nextjs, rename middleware to proxy

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W2 | Opus | M | WS2-02, WS2-11a, WS1-03 | S1, S3 |
- **Program class:** Core

- **Owner decision:** none. **Opens by 2026-11-21, merged by 2026-12-01**, so it can soak for two weeks before FZ.
  - If it is not mergeable by 12-01, stop. Production stays on the latest 15.5.x for the session, and WS2-14 records the risk.
  - If a critical 15.x advisory then appears with no patch (detected by Dependabot alerts, WS1-07), the Owner decides whether to ship this in FZ. FZ normally forbids dependency majors.
- **Data-limit impact:** none for the agent. The Owner's preview smoke test does one ZIP lookup: 1 Mapbox geocoding request, plus 1 Nominatim call only if Mapbox misses.
- **Ongoing cost:** goes down. The project returns to a supported major, which removes the end-of-support risk for about the next year [verify Next 16's support window].
- **Why:** Next 15 reaches end of support around 2026-10-21 (S1). The 2027 session (W3) must run on a supported framework. The admin gate from WS2-02 must survive the rename (S3).
- **Current state (verified 2026-10-06):**
  - `next@16.3.8` is the latest 16.x. Its peers are React `^18.2 || ^19` and it needs Node `>=20.9`.
  - `@sentry/nextjs@10.63.0` lists next `^16.0.0-0` as a peer.
  - `@mui/material-nextjs`: installed 5.18.0, which caps `next` at ≤15. Versions 7.3.9 and 7.3.10 peer `next ^13 || ^14 || ^15 || ^16`, React 17–19, `@emotion/react ^11.11.4`, and optionally `@emotion/cache ^11.11.0` and `@emotion/server ^11.11.0`. They have **no** `@mui/material` dependency. Installed `@emotion/react` and `@emotion/cache` are 11.14.0. 7.x exports subpaths through a `./*` wildcard.
  - `src/app/components/ClientThemeProvider.tsx` line 4 imports `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`.
  - `src/middleware.ts` exports `middleware` and `config.matcher`. The matcher excludes `monitoring` (the Sentry tunnel).
  - `next.config.ts`:
    - has an `eslint.ignoreDuringBuilds` key (WS1-03 leaves it for this WP to delete)
    - has a custom `webpack()` hook (`@mui/material/esm` alias)
    - passes `withSentryConfig` `webpack` options (`automaticVercelMonitors`, `treeshake`)
    - sets `images.remotePatterns`
  - `eslint.config.mjs` uses `FlatCompat` → `compat.extends('next/core-web-vitals')`. After WS1-03, `npm run lint` is `eslint . --max-warnings=W`.
  - 15 files under `src/app` already type `params` and `searchParams` as `Promise<…>`, and no un-awaited `cookies()` or `headers()` calls were found.
  - `unstable_cache` is used in 7 `src/lib` modules: `ky-bills-browse-server.ts`, `ky-committees-browse-enriched.ts`, `ky-ga-browse-server.ts`, `ky-legislator-roster-server.ts`, `ky-home-bill-highlights.ts`, `ky-committee-data.ts` and `ky-feed-server.ts`.
  - The OG image is the static file `src/app/opengraph-image.jpg`.
- **Do:**
  1. Read the official Next 16 upgrade guide at implementation time and list in the PR every breaking change that applies to this repo, citing the guide's section. The items below are the expected ones; [verify] each against the guide.
  2. Set `"next"` and `"eslint-config-next"` to the latest 16.x, pinned exactly. Set `"@mui/material-nextjs": "^7.3.9"` (npm may install 7.3.10 or later within 7.x; that is fine).
  3. Run `npm install`. Then run `npm run lint`. If `FlatCompat` with `next/core-web-vitals` fails under eslint-config-next 16, switch `eslint.config.mjs` to the flat-config export documented for eslint-config-next 16 [verify the import path], keeping the same rule set and WS1-03's `ignores` and warning ceiling. List it in the PR's breaking-change table.
  4. Rename `src/middleware.ts` → `src/proxy.ts` and the exported function `middleware` → `proxy`, keeping `config.matcher` unchanged. Confirm in the guide which runtime `proxy` uses. `shared-secret.ts` from WS2-02 uses Web Crypto, so it works on either runtime.
  5. In `next.config.ts`:
     - Remove the `eslint` key if Next 16 no longer accepts it. Linting runs through `npm run lint` (WS1-03).
     - Review the `images` defaults that changed in 16 (for example `minimumCacheTTL`, `qualities`, and `localPatterns` for local images with query strings) and set explicit values only where behavior would otherwise change.
  6. Change `ClientThemeProvider.tsx` to import from `@mui/material-nextjs/v16-appRouter` [verify the path resolves in the installed version; if it does not, keep `v15-appRouter` if it still resolves and note it].
  7. Build. If `next build` defaults to Turbopack and refuses the custom `webpack()` hook, set `"build": "next build --webpack"` and record it in the PR. That is the supported end state for the session; the Turbopack switch is Deferred.
  8. Check that `unstable_cache` call sites still compile and behave the same. Do not migrate them to `"use cache"`.
  9. Run the full verification. Then `npm run start` and work through the smoke list:
     - `/`, `/bills`, one bill page, `/members`, one member page, `/members/map` (render only, no lookups)
     - `/meetings`, `/committees`, `/search?q=education`
     - `/auth/login`, `/privacy`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image.jpg`
     - `/admin/sync-status` without a token, which must not render (WS2-02)
     
     Check that MUI styles render with no flash of unstyled content on `/`.
- **Don't:**
  - Upgrade MUI past v5.
  - Adopt new Next 16 features (Cache Components, `"use cache"`, the React Compiler).
  - Refactor pages.
  - Remove the webpack hook (Deferred).
  - Change lint rules (WS1 owns them).
  - Merge after 2026-12-14.
- **Acceptance criteria:**
  - [ ] `npm ls next` shows 16.x, and `src/proxy.ts` exists while `src/middleware.ts` does not.
  - [ ] `npm ls @mui/material-nextjs @emotion/cache @emotion/server` shows 7.3.9 or higher and no invalid peers.
  - [ ] `shared-secret` and route-level tests still pass, and `/admin/*` is still gated locally.
  - [ ] tsc, lint, test and build pass. `npm run lint` keeps WS1-03's warning ceiling.
  - [ ] The smoke list is complete with no new console errors, and a screenshot of home at 1440px shows styled output.
  - [ ] The PR lists every applicable breaking change from the guide and how each was handled.
  - [ ] Bundle size for `/` and a bill page is reported before and after from the `next build` output (U13 interface).
- **Verify:** in a plain container, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run start`. The production-like checks are Owner actions.
- **Owner actions:**
  - [ ] Confirm that the Vercel project's Node.js version is 20.9 or higher (Project → Settings → General [verify]).
  - [ ] On the preview, run the same smoke list. Do one ZIP lookup on `/members/map`, log in, follow and unfollow one bill, and open `/admin/sync-status` with your token.
  - [ ] After the production deploy, watch the next day of Vercel cron runs and Sentry for new errors.
- **Rollback:** Vercel instant rollback to the last 15.x deployment (Owner). Then revert the PR. No data migrations are involved.

---

### WS2-12a · Extract and correct the CSP in a tested function

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W4 | Sonnet | S | WS2-11c | S8 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** none. This WP runs in W4 together with WS2-12b, or earlier only if WS8-15's `/embed` route needs a shared header builder.
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. The policy moves into one tested function.
- **Why:**
  - The CSP is Report-Only (S8). Without a `report-uri` or `report-to`, violations appear only in visitors' consoles and are never collected.
  - The policy **would break analytics if enforced as is**: it omits the PostHog hosts and the external portrait hosts.
  - Correcting it has value only as the first step of enforcement, so it waits for W4 with WS2-12b. The one urgent line (`api.anthropic.com`) is removed by WS2-07.
- **Current state (verified 2026-10-06):**
  - `next.config.ts` `headers()` (~105–160) holds a `Content-Security-Policy-Report-Only` array with directives `default-src`, `script-src` (`'unsafe-inline' 'unsafe-eval'` plus Mapbox), `style-src`, `font-src`, `img-src`, `worker-src`, `frame-src`, `connect-src`, `frame-ancestors`, `base-uri` and `form-action`. It is applied to `/((?!api/sync).*)`.
  - PostHog hosts: `instrumentation-client.ts` line ~11 sets `api_host` from `NEXT_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`), and `src/app/layout.tsx` lines ~93–94 preconnect to `us-assets.i.posthog.com` and `us.i.posthog.com`.
  - Portrait hosts are in `next.config.ts` `images.remotePatterns`, and unlisted hosts use a plain `<img>` (comment in `next.config.ts`).
  - Sentry uses a same-origin tunnel at `/monitoring`.
- **Do:**
  1. Create `src/lib/security-headers.ts` exporting:
     - `CSP_HEADER_NAME`, set to `'Content-Security-Policy-Report-Only'`
     - `buildContentSecurityPolicy(env): string`
     
     `next.config.ts` imports both and uses `CSP_HEADER_NAME` as the header key.
  2. Derive the PostHog origins from `NEXT_PUBLIC_POSTHOG_HOST`, with the same default as `instrumentation-client.ts`:
     - `https://us.i.posthog.com` → also `https://us-assets.i.posthog.com`
     - `https://eu.i.posthog.com` → also `https://eu-assets.i.posthog.com`
     - any other host → the host origin only, with a code comment explaining why
  3. Make these policy changes:
     - add the PostHog API and assets origins to `connect-src`, and the assets origin to `script-src` (posthog-js lazy-loads extensions [verify which in production])
     - set `img-src` to `'self' data: blob: https:`, since images are low-risk and portrait hosts vary
     - add `object-src 'none'`
     - keep `'unsafe-inline'` and `'unsafe-eval'`; nonces are deferred
     - check that Mapbox tile and geocoding origins (`api.mapbox.com`, `*.tiles.mapbox.com`, `events.mapbox.com`) are in `connect-src`
     - drop any origin for a vendor that WS2-09a or WS6 removed
  4. Add `src/lib/security-headers.test.ts`. It asserts:
     - the PostHog origin is present in `connect-src` for the US default and for an EU host
     - `api.anthropic.com` is absent
     - `frame-ancestors 'none'` and `object-src 'none'` are present
     - `CSP_HEADER_NAME` is the Report-Only name
- **Don't:**
  - Enforce the policy (WS2-12b).
  - Add a reporting endpoint or vendor.
  - Change the other security headers.
- **Acceptance criteria:**
  - [ ] The policy and header name come from one tested module, and the tests pass.
  - [ ] The header is still Report-Only.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Owner actions:** none. Validation happens in production under WS2-12b, because PostHog does not run on previews.
- **Rollback:** revert the PR.

---

### WS2-12b · Enforce the CSP after a production Report-Only check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W4 | Opus | S | WS2-12a | S8 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** whether to enforce at all, made in W4 with the go/partner/maintain decision. **Default: enforce in W4 only if the production check below is clean; otherwise keep Report-Only and revisit when a partner's security review asks (W5).**
- **Data-limit impact:** none.
- **Ongoing cost:** small. Any new third-party origin then needs a policy edit.
- **Why:** A Report-Only CSP provides no protection (S8). Enforcement is held until after the 2027 session, because a missed origin could silently block analytics (T10, the only source) or the map (T5) during the first measured session (T7). The gain is modest while `'unsafe-inline'` and `'unsafe-eval'` remain and `X-Frame-Options: DENY` already covers framing.
- **Current state (verified 2026-10-06):** the policy is in `next.config.ts` until WS2-12a moves it. `instrumentation-client.ts` lines ~16–22 skip `posthog.init` when `NEXT_PUBLIC_VERCEL_ENV === 'preview'`, so **a preview can never show PostHog CSP violations**.
- **Do:**
  1. Require the Owner's **production** Report-Only list (Owner actions) to be empty. If it is not, fix the policy in WS2-12a's module first and ask the Owner to re-check.
  2. Change `CSP_HEADER_NAME` to `Content-Security-Policy`. Update the comment in `next.config.ts` and the test.
  3. Leave `'unsafe-inline'` and `'unsafe-eval'` in place; removing them is Deferred.
- **Don't:**
  - Add nonces or hashes.
  - Add a reporting vendor.
  - Change other headers.
- **Acceptance criteria:**
  - [ ] The response header is `Content-Security-Policy`, and the test asserts it.
  - [ ] The production Report-Only list recorded by the Owner after WS2-12a deployed is empty.
  - [ ] tsc, lint, test and build pass.
- **Verify:** in a plain container, `npm test` and `npm run build`. The browser checks are Owner actions.
- **Owner actions:**
  - [ ] **Gate, before this PR opens:** after WS2-12a is deployed, open devtools → Console on **www.kyvky.com** for `/`, `/bills`, a bill page, a member page with a portrait, `/members/map` (one address search), `/meetings`, `/auth/login` (log in and follow a bill). Record any `[Report Only]` messages. Report-Only is harmless in production.
  - [ ] **The day after enforcement**, compare PostHog daily events and Sentry events with the previous week. **Stop condition:** if daily PostHog events drop by more than about 20%, or map lookups fail, revert to Report-Only the same day.
- **Rollback:** a one-line revert of `CSP_HEADER_NAME` to Report-Only, then redeploy.

---

### WS2-13 · Get a legal review of /privacy and /terms when a trigger fires

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W4 | Owner | S | WS2-09b | S10 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** who reviews, and the budget.
  - (a) A pro bono review through a law-school clinic or a media-law or nonprofit legal-aid program [verify which are available in Kentucky].
  - (b) A paid hourly review.
  - **(c) Skip for now and state plainly in partner materials that the policy is not lawyer-reviewed. Default.**
  - **Triggers that move this to (a) or (b) in W4, folded into WS8 partner packaging:** a partner or funder asks for it, or the W4 decision is "go" or "maintain" (solo continuation). A merger partner such as CalMatters would apply its own counsel and policy, so a review before W4 may be superseded (O3).
- **Data-limit impact:** none. Money: only under (b), with the budget set by the owner.
- **Ongoing cost:** none.
- **Why:** The launch checklist's legal review is unchecked (S10). WS2-09b makes the text accurate first, so a reviewer's time goes to legal questions rather than to fact-finding. Doing it before W4 would use scarce owner time in the build window for an outcome that may be superseded.
- **Current state (verified 2026-10-06):**
  - `docs/launch-checklist.md` § "D. Legal review" (~lines 65–71) has two unchecked boxes and says the drafts are "honest practical text, not lawyer-written".
  - TASKS.md lines ~177, ~193 and ~218 list legal review as a roadmap item. This WP **folds in** those items.
- **Do** (Owner):
  1. Under (c), add one line to `docs/launch-checklist.md` §D (an agent may make this edit in a docs-only PR): "Deferred to W4 partner packaging (WS2-13); not lawyer-reviewed as of <date>."
  2. If a trigger fires, send the reviewer the live `/privacy` and `/terms` URLs and the data-flow paragraph from WS2-09b's PR body, then record the outcome.
- **Don't:** let an agent draft legal language for the reviewer to sign off on. An agent implements the reviewer's requested edits in a follow-up S-sized PR.
- **Acceptance criteria:**
  - [ ] `docs/launch-checklist.md` §D records option (c) with a date, **or** its boxes are ticked with the date and the reviewer type (no personal names).
  - [ ] Any requested edits are merged.
- **Verify:** manual.
- **Owner actions:** everything in Do.
- **Rollback:** not applicable.

---

### WS2-14 · Run the pre-session security readiness check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Sonnet | S | WS2-01, WS2-02, WS2-03, WS2-05, WS2-06b, WS2-07, WS2-09b, WS2-11c, WS2-15 | S1, S2, S3, S4, S6, S8, S9, S10, S12 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** none. It is a one-off check whose results go in the PR, TRACKER.md and one ADR, not in a new process document.
- **Why:** This verifies the workstream's definition of done before the 2027 session (W3), when only small fixes are allowed. It also gives partners a dated security posture statement (O3, O4).
- **Current state (verified 2026-10-06):** not applicable. This WP runs in FZ. Each item below names its source WP.
- **Do:**
  1. In a plain container:
     - run `npm audit --omit=dev`, and list any high or critical items with their path
     - run `npm ls next react`
     - run the greps from the acceptance criteria of WS2-02, WS2-05, WS2-06a, WS2-07, WS2-09a and WS2-10, and WS2-03's checks from the owner's private security note (record pass or fail only)
     - run `npm test`
  2. Write a readiness table in the PR body with one row per DoD item: **met**, **not met** or **deferred** (for items this spec deliberately moved to W4 or Deferred, such as CSP enforcement and the legal review, and for Backlog WPs that were not picked up), with evidence. For DoD #3 and #4, the evidence is "private checks: pass" or "fail", nothing more.
  3. Record the result per WS5-03a/b: as an ADR in `docs/adr/` (for example `NNNN-ws2-security-readiness.md`) or a `CURRENT.md` entry. If WS5-03a has not landed, record it in the PR body only. Never append to a frozen `decisions.md`.
  4. Update the Status of the WS2 rows in [TRACKER.md](TRACKER.md).
- **Don't:**
  - Fix anything in this PR beyond doc and tracker updates. Open separate fix PRs, which FZ allows.
  - Probe production.
- **Acceptance criteria:**
  - [ ] Every DoD item has a status (met, not met, deferred) with evidence.
  - [ ] Every "not met" item has a fix PR or an explicit Owner-accepted risk.
  - [ ] The ADR, `CURRENT.md` entry or PR-body record exists.
- **Verify:** in a plain container, the commands in Do. The rest are Owner actions.
- **Owner actions:**
  - [ ] Supabase Advisors: only the WARN items in the Deferred table remain.
  - [ ] GitHub: no open secret-scanning alerts, and Dependabot alerts are reviewed (WS1-07).
  - [ ] In production, check in the browser that devtools show the Report-Only CSP header, and that `/admin/sync-status` without a token does not render.
  - [ ] Confirm that `CRON_SECRET`, `SYNC_API_KEY` and `ADMIN_TOKEN` exist in Vercel Production. Check presence only; never copy values.
  - [ ] Confirm WS2-15's account table is complete.
  - [ ] **Rollback drill (about 10 minutes).** Run it between **19:00 and 23:30 UTC**, when no Vercel cron runs (crons run at 00:00, 05:00, 06:00, 06:15, 11:00, 12:00, 13:30, 14:00, 14:45, 18:00, and 15:30 on Sundays, per `vercel.json`; re-check before the drill).
    1. In Vercel → Deployments, instant-roll back production to the previous deployment.
    2. Load `/` and note the deployment it serves.
    3. **Roll forward explicitly:** promote the latest deployment, or use "Undo rollback" [verify the label in Vercel → Deployments]. After an instant rollback, new deployments may not auto-promote until this is done [verify].
    4. **Expected result:** the production domain serves the latest `main` commit SHA, checked on the Vercel deployment page.
    5. Record how long it took.
- **Rollback:** not applicable. Docs only.

---

### WS2-15 · Confirm 2FA and recovery codes on every vendor account that can deploy, change DNS, read user data or spend money

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Owner | S | none | E14, D4, D6 |
- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup

- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 1 hour once. No code, no schedule, no vendor.
- **Why:** For a solo-run civic site during an election, the most likely real compromise is a takeover of a vendor account, not an app bug. About 12 vendor accounts sit with one person (E14), and a partner's due diligence will ask (O3). This needs only the owner's time.
- **Current state (verified 2026-10-06):** no record in the repo. The vendor list comes from code and docs (WS9-08 Current state): GitHub, Vercel, Supabase, Hostinger (DNS, mailbox, forwarding), Resend, Mapbox, Anthropic, LegiScan, Open States, PostHog, Sentry, Slack, Adobe (Fonts kit), Google Search Console, Bing Webmaster, and the Claude account that runs the Routines.
- **Do** (Owner, in this order, by **2026-10-20**):
  1. GitHub, Vercel, Supabase and Hostinger first: they can deploy, change DNS or read user data.
  2. Then Resend, Anthropic, LegiScan, PostHog, Sentry, Mapbox, Slack, Adobe, the Claude account, Open States and the search consoles.
  3. For each account: turn on 2FA (an authenticator app or passkey, not SMS where avoidable), save recovery codes in your password manager, and confirm the recovery email is one you control.
  4. Record **yes/no per vendor and the date only**, with no secrets, codes or account emails. Put it in the WS2-15 row of TRACKER.md, and once WS9-08 lands, in a "2FA + recovery stored" column of `docs/ops/vendors.md`.
- **Don't:** paste recovery codes, account emails or screenshots of security settings anywhere in the repo.
- **Acceptance criteria:**
  - [ ] Every listed vendor has a yes/no and a date.
  - [ ] Any "no" has a reason (for example "vendor does not offer 2FA") and a revisit date.
- **Verify:** manual.
- **Owner actions:** everything in Do.
- **Rollback:** not applicable.

---

## Deferred

Each row's W4 status (`fired` / `not fired` / `revived`) is kept in [DEFERRED.md](DEFERRED.md); WS5-16 fills the WS2 rows in W4.

| Item | Finding | Reason | Revisit trigger |
|---|---|---|---|
| MUI v5 → v7/v9 migration (about 132 files) | S1 | Not required for Next 16: `@mui/material-nextjs` 7.3.9 and later supports next 16 without depending on `@mui/material`, and `@mui/material` 5.17/5.18 supports React 19. A 132-file restyle before session breaks the FZ rule and adds no user value. | A security advisory in `@mui/material` v5 with no v5 patch, MUI v5 dropping React 19 support, or W4 choosing a redesign (U16). These triggers are checked quarterly (January and April) in `docs/ops/vendors.md` §Monthly check (WS9-08). |
| Build with Turbopack and remove the custom `webpack()` hook (was WS2-11d) | S1 | No user, security or data-limit value. It risks Sentry source-map symbolication before the session, and it created a W2 sequencing constraint with WS5-10. WS2-11c ships with `next build --webpack` if needed. | Next drops the `--webpack` flag, or a partner's build requires Turbopack. W4/W5. |
| Replace axios with native `fetch` (20 files: LegiScan, Open States and LRC clients, scripts) | S2 | Patching (WS2-01) clears the advisory. Rewriting the HTTP layer of untested scrapers (E6, E7) risks data correctness. | After LRC parser fixture tests and LegiScan client tests exist (E6/E7 owner), or if axios has another high advisory with no patch within 14 days. |
| Move `pg_trgm` out of `public` | S6 | `ky_bills_popular_name_search` (migration 044) pins `search_path TO pg_catalog, public` and uses the `%` operator and `similarity()`. Moving the extension would break popular-name search unless every dependent function is re-pinned. The advisor rates it WARN. | A Supabase advisor upgrade to ERROR, or a W4 schema cleanup tested on a Supabase branch [verify branch availability on the plan]. |
| Leaked-password protection, **only if** it is unavailable on the current Supabase plan | S4 | WS2-03 makes it a required Owner action. This row applies only if the Owner reports it is not available. | A plan change. |
| CSP enforcement (WS2-12a/b) | S8 | Moved to W4 so the first measured session (T7) is not put at risk. Preview checks cannot see PostHog, so validation must happen in production while Report-Only. | W4 decision; see WS2-12b. |
| CSP without `'unsafe-inline'` / `'unsafe-eval'` (nonces or hashes) | S8 | Nonces need per-request rendering, which conflicts with the ISR and static pages the SEO depends on (U15). Mapbox GL may need a CSP-specific build [verify]. | W5, if a partner's security review requires it. |
| Public read paths that use the service-role client (`src/lib/ky-bill-detail-server.ts` `createServerClient()` ~21–26, found by WS8) | S7, N4 | Switching to the anon key is a behavior change that depends on RLS for every table read. WS8-02's output allowlist limits what can leave. | W4, or when WS8-02 lands and its tests can show the anon key returns the same data. A PR that acts on it cites N4 under "Findings re-checked". |
| E11 code-quality counts (146 `any`, 197 `console.*`) | E11 | Not a security defect. The sampled logs (`ky-legiscan-client.ts`, the sync routes) print error messages, not secrets or keys. A bulk cleanup is churn. | When WS1's CI exists, add `@typescript-eslint/no-explicit-any` as a warning for touched files only. Revisit if a log is found to leak a secret or personal data. |
| Git history rewrite for `FEEDBACK.md` | S12 | Owner decision in WS2-05. The default (a) does not rewrite. | The owner chooses (b), or a named person asks for removal. |
| HTTP Basic option for `/admin` | S3 | Not needed unless the owner wants browser access without a header extension. | Owner request. |

## Findings re-checked

- **S1 is partly wrong.** The appendix says Next 16 "forces an MUI v5 → v7/v9 migration across about 132 files". This was checked on 2026-10-06 against npm metadata and the published `@mui/material-nextjs@9.4.0` tarball:
  - `@mui/material-nextjs` 7.3.9 and later declares `next ^16.0.0` as a peer.
  - From 6.x on, it has **no** `@mui/material` peer or dependency; 9.4.0 depends only on `@babel/runtime`.
  - Installed `@mui/material@5.17.1` and the last v5, 5.18.0, both peer React 19.
  
  So the Next 16 path needs only a `@mui/material-nextjs` bump, now inside WS2-11c. The vendored React is `19.2.0-canary-0bdb9206-20250818`.
- **S2 is stale in detail.** On 10-06 the count is **16** (2 critical: `next` and `maplibre-gl`; 11 high, including `minimatch` through the brace-expansion chain; 3 moderate), not 15. The `sharp` fix threshold is **0.35.5** (advisory range ≤0.35.5-rc.1), not 0.35.4. Next 15.5.27 accepts `sharp ^0.34.3 || ^0.35.4` natively, so the override can be dropped. The axios fix is **1.20.0**. `maplibre-gl` is installed but not shipped (only `react-map-gl/mapbox` is imported); WS2-01 patches it anyway.
- **S3 and S4 are confirmed; the specifics stay private.**
- **S5 is understated.** The CORS group also covers `/api/intelligence`, which no page uses and which spends Anthropic budget at request time, and `/api/geo/zip`, which proxies Nominatim under a 1 request/second policy.
- **S6 needs these additions:**
  - Two functions lack `search_path` in the migrations (`update_updated_at_column`, `ky_immutable_array_to_string`), while the advisor reported one. Confirm before pinning.
  - **New:** `ky_increment_bill_view` also bumps `ky_bills.updated_at`, which feeds sitemap `lastModified`. WS2-06a stops this in W0.
  - The legacy dupes table is safe to drop (TASKS.md: 802 of 802 URLs dead).
  - Moving `pg_trgm` would break popular-name search (deferred).
- **S7 needs a count correction.** `grep -rln supabaseAdminCore src` returns 23 files, but one is the wrapper itself: there are **22 importers** (12 in `src/app`, 10 in `src/lib`), not 23. Plus 27 scripts use the core module, and `server-only` throws under plain-Node `tsx`, so the wrapper cannot be used everywhere. The key is not `NEXT_PUBLIC_`, so it cannot be inlined into a browser bundle. WS2-10 therefore defaults to deleting the unused wrapper. WS8 also found a public read path that uses the service-role client (Deferred).
- **S8 is worse than stated.** There is no `report-uri` or `report-to`, so no reports are collected. The policy omits the PostHog hosts and the external portrait hosts, so enforcing it as is would break analytics. PostHog does not run on previews, so a preview check cannot validate it. Enforcement moves to W4.
- **S9 is confirmed in code but not shipped.** `LegislatorDistrictMinimap.tsx` hides attribution, but no page renders it: its only importer, `LegislatorDistrictMinimapLazy.tsx`, is never imported. The breach is not live. WS2-04 is downgraded from P0/W0 to P2/W1 and becomes a guard test for the live surfaces. WS5-02 deletes the minimap by default.
- **S10 is broader than stated.** `/privacy` (2026-05-13) omits PostHog, Mapbox (address and ZIP geocoding from the browser), Nominatim (server-side fallback only), Adobe Fonts (every page load), Slack and Speed Insights. PostHog identify sends email and name. Sentry has `sendDefaultPii: true` in all three runtimes. The Slack signup alert carries a display name and a **masked** email, not the full address.
- **S12 is confirmed and broader.** Beyond prose, names appear in `Artifact:` file slugs and a `Source:` line, and the file's own schema and privacy paragraph ask for names and emails. WS2-05 fixes all four.
- **E11 is confirmed:** there are exactly 6 copies. All six handlers are `async`, which is why WS2-02 uses a guard that still denies when a call site forgets `await`. The `any` and `console` counts were not re-measured (deferred).
