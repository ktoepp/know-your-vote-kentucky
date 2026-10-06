# Appendix A — Evidence base (audit of 2026-10-06)

This appendix is the evidence base for the program spec. Every work package (WP) in `docs/program-spec/` cites the finding IDs below. A finding is closed only when a WP's acceptance criteria are met **or** it is explicitly listed in [`DEFERRED.md`](DEFERRED.md) (the deferred / not-doing register).

**Read the errata too.** Spec review re-checked these findings in the repo. Findings marked **[Corrected: see Errata]** are wrong or incomplete as first written. The corrected text and the owning WP are in § "Errata and new findings (spec review 2026-10-06)" at the end of this file, which also gives IDs **N1–N5** to defects that review found. Where a finding's text and its erratum disagree, the erratum is correct.

**Provenance.** Five read-only audits ran on 2026-10-06 against `main` @ `a4e543a` (PR #289):

- **code**: repository and code audit, which ran tsc, lint, tests and import scans
- **deps**: dependencies, infrastructure and vendors (`npm outdated`, `npm audit`, Supabase advisors, Actions API)
- **traction**: PostHog project 450281 and Supabase SELECT-only queries, with internal and bot traffic filtered
- **ux**: local production build screenshotted with Playwright, axe-core, and read-only production SQL. The live site was unreachable from the audit sandbox.
- **market**: web-search competitive scan. Competitor sites could not be fetched directly.

**Labels.**
- **[V]**: verified by the named audit, with the command, query or file.
- **[V2]**: additionally re-verified by hand in the repo.
- **[I]**: inferred.

Numbers are as of 2026-10-06. **Re-check any number before acting on it.**

**Publication note.** This repo is public. Findings are phrased as *what must change*, not how to exploit it. No personal data is included. S3 and S4 are summarized only; their details are in the owner's private security note.

---

## Key dates

| Date | Event | Why it matters |
|---|---|---|
| ~2026-10-21 | Next.js 15 reaches end of support (deps: endoflife data; **re-verify** against nextjs.org/support-policy) | Production runs 15.5.22 with open advisories |
| 2026-11-01 | LegiScan Public API enforcement of the new terms (per LegiScan's 2026-09-23 email quoted in decisions.md § 2026-09-29) | Violations can mean a permanent key ban |
| 2026-11-03 | Kentucky general election: all 100 House seats and half the Senate | Peak "how did my rep vote" demand |
| 2026-11-03 | NLnet funding deadline (owner's Notion) | Funder-facing numbers must be correct |
| ~2026-12-15 | Proposed code freeze before session | Nothing risky ships into session |
| 2027-01-05 | 2027 Regular Session convenes. It is a 30-legislative-day odd-year session and must adjourn by 2027-03-30. | First session the current architecture and analytics will ever observe |
| 2027-04 | Post-session evaluation window | Go / partner / maintain decision |

---

## T — Traction and measurement (traction audit unless noted)

- **T1** [V] About 2,394–2,396 unique human visitors, 2026-06-01 → 10-06; about 40% geolocate to Kentucky.
  - Weekly human visitors: 130–300.
  - Weekly Kentucky visitors, September: 83–104.
  - Monthly: Jun 108 · Jul 651 · Aug 589 · Sep 938 · Oct 1–6 134.
- **T2** [V] Retention is near zero.
  - Week-1 return, Jun 1–Sep 20 cohorts: 1.4% (best cohort 3.4%).
  - September visitors who also visited in the prior 30 days: 0.85% (8 of 938).
  - 79% of visitors view exactly one page.
  - Median session: 6–24 s.
- **T3** [V] Accounts and email are close to zero.
  - 16 accounts; 6 follow anything; 4 have the digest on.
  - `ky_notifications_log` holds 26 sends in total, and since July the digest reaches 1 recipient per month.
  - Opens and clicks are **not tracked**; only `delivery_status = sent` is stored.
- **T4** [V] Acquisition is organic search, mostly not Google.
  - Sessions: Bing ~646, Google 453, DuckDuckGo 204, Yahoo 141.
  - Referral plus social is about 1%. Partnerships produce no measurable traffic.
- **T5** [V] The one real behavior is "find my legislator".
  - District-map lookup: 5.5% of visitors.
  - Legislator-intent survey: 6 of 8 answers were "who my representatives are".
  - Search 1.7%, topic filter 0.5%, follows 0.17%.
- **T6** [V] Bot noise inflates the totals.
  - About 210 of September's 938 "human" visitors were 0–5 s, single-page, direct hits on `/auth/login`.
  - July included 111 visitors from Poland.
  - The current filters do not remove either.
- **T7** [V] The 2026 session (Jan–Apr) was never measured; PostHog starts 2026-06-01. Every number above is from the interim.
- **T8** [V] The PMF survey is underpowered.
  - 456 shown, 19 answered.
  - Its "≥2 sessions" targeting needs an app-side `$set_once` person property (TASKS.md "PMF survey — fix trigger timing").
- **T9** [V] Funder-facing figures are stale or inconsistent:
  - account count: 9 vs 16
  - the ask: $89k vs $86,873 vs ~$88,470
  - "live since February 2026" vs Supabase project created 2026-03-09
  - LegiScan budget line justified by a superseded "97% of cap" reading
  
  The owner's Notion rule "never lead with retention" conflicts with the Strategy page's own top KPI, the 30-day return rate. These are **owner documents (Notion), not repo files.**
- **T10** [V] `@vercel/analytics` was retired on 2026-09-22, so PostHog is the only analytics source. The Vercel MCP connector returned 403 for the team scope.

## E — Engineering and maintainability (code audit unless noted)

- **E1** [V] Size: about 68k lines of app code plus 9.7k lines of scripts.
  - 42 pages, 30 API routes, 86 npm scripts, 75 env vars.
  - 57 migrations (two are numbered `045`), 31 tables, 22 SQL functions.
- **E2** [V] **[Corrected: see Errata]** Schedules sprawl across three schedulers.
  - Vercel: 9 crons.
  - GitHub Actions: 6 scheduled workflows with 9 cron lines, plus 4 manual workflows and a Slack notifier.
  - Claude Code Routines: 2 daily ("System health check", "accuracy spot check").
  - The bills sync runs on **two** schedulers: Vercel daily and Actions every 6 h.
  - Schedules are duplicated by hand across `vercel.json`, the workflows, `source-health.ts` `MONITORED_SOURCES`, the README and TASKS.md. The README's sync table is missing about 7 of about 17 jobs.
  - `env-template.txt` says the health check runs "every 15m"; it actually runs daily.
- **E3** [V] Dead and parked code totals about 12.8k lines (about 19% of `src`):
  - **38 never-imported files (8,142 lines)**, including:
    - `src/lib/content-generation.ts` (1,584)
    - `src/app/components/SearchDiscoveryVerification.tsx` (976)
    - `src/lib/icons.tsx` (646)
    - the graph-query and graph-database modules
    - SpeakerNetwork, GraphVisualization, ProfessionalNavigation, SearchBar
    - two `transcribe.ts` files, which are the only users of the `openai` dependency
  - **Parked local-government and executive-order code**: about 1,100 lines (6 lib files plus `src/lib/ky-sync-pipeline.ts` lines ~1882–2096) and 4 tables.
  - **`/design-system`**: a 2,887-line page plus a 712 KB `design-system/design-system.html`.
- **E4** [V] Dependencies are redundant.
  - Tailwind is used in about 10 files (7 of them dead), against about 122–132 files using MUI `sx`. `globals.css` keeps v3-style directives under Tailwind v4.
  - `lucide-react` (7 files) sits beside `@mui/icons-material` (58), and `lottie-react` is used in 3 files.
  - `react-email` is in production dependencies and pulls in socket.io.
  - `autoprefixer`, `postcss` and `dotenv` belong in devDependencies.
- **E5** [V] About 34% of the code (about 27k lines) keeps the data correct: pipeline, audit, monitoring, sync routes, admin, scripts and workflows. UI is about 40%.
- **E6** [V] The LRC HTML scrapers are the most fragile part.
  - 4 modules plus parsers, 2,474 lines of cheerio.
  - Only the calendar has a structure-change guard (`ky-lrc-calendar-sync.ts` around line 582).
  - Snapshots in `fixtures/lrc/` are not used by any test.
  - All 4 Actions failures in the last 30 days were the LRC calendar job (9/20, 9/21, 9/27, 10/5). Retries were added in PR #289.
  - An earlier LRC URL-scheme change left 802 dead material URLs.
- **E7** [V] Tests: 5 files, 41 tests, all pass.
  - Covered: chunk reload, session discovery, session calendar, dataset store, telemetry filters.
  - **Zero** tests for LRC parsers, LegiScan status mapping, the digest builder, bill progress, auth, the summary input hash, or legislator name matching.
- **E8** [V] Nothing checks code before merge.
  - No CI runs on PRs; the only PR workflow is the Slack notifier.
  - `next.config.ts` sets `eslint.ignoreDuringBuilds: true`.
  - `tsconfig` excludes `scripts/`; type-checking `scripts/` gives 21 errors in 7 files.
  - `next lint` is deprecated. There is no Dependabot. The PR template checkboxes are honor-system.
- **E9** [V2] Two scripts crash when run. Commit `d00b4c4` placed an `import { fetchDatasetZipGated } …` line *inside a JSDoc comment* in:
  - `scripts/backfill-session-votes.ts` (~line 6)
  - `scripts/backfill-bill-history-from-datasets.ts` (~line 21)
  
  Both call the function and will throw `ReferenceError`. `.github/workflows/backfill-session-votes.yml` is therefore broken.
- **E10** [V] God files:
  - `src/lib/ky-sync-pipeline.ts` (2,332 lines; `runLegislatorsSync` about 306 lines; untested fuzzy name matching across LegiScan, Open States and LRC)
  - `src/components/bills/BillDetailView.tsx` (1,269 lines; the whole page is a `'use client'` component with 86 inline `sx` props and 8 inlined sub-components)
  - `SearchPageClient.tsx` (1,011 lines)
- **E11** [V] Bearer-token checks for cron and sync are copy-pasted into 6 routes, with non-constant-time comparison. There are 146 uses of `any` and 197 `console.*` calls.
- **E12** [V] Process docs have outgrown their purpose.
  - TASKS.md is 203 KB; decisions.md is 432 KB (112 entries since 2026-05-09); `docs/` holds 229 KB of markdown.
  - About 40% of bytes written in the last 8 weeks were process docs, and 38 of 72 non-merge commits touched them.
  - The README tells agents to "read first" about 160k tokens.
  - README drift: "no test suite" is stale, `/find-content` no longer exists, "/about is a stub" is stale, and it states "3/5 veto override", which is wrong (see U18).
- **E13** [V] Most recent work is plumbing.
  - Of the 51 PRs since #239: about 22 were data, audit or telemetry plumbing; about 12 docs only; about 12 user-visible.
  - The accuracy audit took 9 PRs in 8 weeks and was silently dead for about 3 weeks.
  - Estimated maintenance: 25–45 h/month between sessions, 1.5–2× in session [I].
- **E14** [V] Bus factor is one person plus her agents.
  - About 12 vendor accounts, 75 env vars, and 2 Claude Routines tied to the owner's account.
  - The account that owns the LegiScan key is unconfirmed (TASKS.md "Key ownership").
  - Operational knowledge lives in prose, not tests.

## A — AI summaries and classification

- **A1** [V2] **[Corrected: see Errata]** `src/lib/ky-content-generation.ts` builds its prompt from:
  - title, LegiScan description, status, topics and LegiScan subjects
  - optional `editor_notes`
  
  It does **not** use the bill text, although `legiscan_texts` is stored. It passes `Status` even though the prompt's rules forbid mentioning status. The model is `KY_DEFAULT_ANTHROPIC_MODEL` in `src/lib/anthropic-model.ts` (currently `claude-sonnet-4-6`, `max_tokens: 300`).
- **A2** [V] Summaries can describe a version of the bill that no longer exists.
  - In 2026, 141 of 433 enacted bills passed via committee substitute and 70 had title amendments.
  - Example: on the SB197 (2026) page, the title says "appropriation act" while the summary describes a business-incentive county tier system, so the page contradicts itself (ux).
- **A3** [V] The faithfulness audit reviews `ACCURACY_LLM_SAMPLE=8` summaries a week against a corpus of about 22.5k bills. It checks them against the same metadata the summary was built from, so it cannot catch errors relative to the bill text.
- **A4** [I] The "Who it may affect" clause is inferred from a 1–2 sentence description. That carries a reputational risk of confident errors on a civic site.
- **A5** [V] Meta descriptions use the LRC digest truncated mid-word ("…details Pa"). Elsewhere `ai_summary` is used, unlabeled, as the meta-description fallback.
- **A6** [V] Topic errors: HB1 (2026), a scholarship tax-credit bill, is tagged "Voting Rights" and "Elections". 386 of 1,737 bills in 2026 (22%) have no topics.
- **A7** [V] AI summaries cover 4,936 bills: 100% of the 2024, 2025 and 2026 regular sessions, and none earlier.
- **A8** [V/I] Cost is about $0.006 per bill. The bigger risk is the model being retired. Backfills could use the Batch API. A newer Sonnet-tier model exists; **confirm the ID and pricing from Anthropic docs at implementation time.**
- **A9** [V] Good practice already in place: generation is offline, runs after each sync, and regenerates only when the input hash changes; provenance columns are recorded (migration 034); the UI carries "AI-generated" disclosure plus a feedback link.

## S — Security, compliance, platform currency (deps and code audits)

- **S1** [V] **[Corrected: see Errata]** Framework currency.
  - `next` is pinned exactly at 15.5.22, which has critical and high advisories; 15.5.27 fixes them.
  - Next 16 is the current major. Upgrading is blocked by `@mui/material-nextjs` 5.18, which supports only next ≤15, so it forces an MUI v5 → v7/v9 migration across about 132 files.
  - Other upgrade work:
    - the custom `webpack()` hook in `next.config.ts`, since Turbopack becomes the default
    - `src/middleware.ts` → `proxy.ts`
    - `next lint` is removed
  - `package.json` says React 18.2, but the App Router runs Next's vendored React 19.
- **S2** [V] `npm audit --omit=dev` reports 15 vulnerabilities (2 critical, 10 high, 3 moderate):
  - `axios` 1.18, a direct dependency used for all outbound fetches
  - `undici`, via cheerio
  - socket.io and engine.io, via the `react-email` CLI
  - `maplibre-gl`, via react-map-gl (probably not shipped)
  
  The `overrides` pin vulnerable `sharp` 0.35.3 (needs ≥0.35.4) and `brace-expansion` 5.0.8 (needs ≥5.0.12).
- **S3** [V2] Harden admin-route access control (`src/middleware.ts`) and consolidate the six bearer-token checks (E11) into one constant-time guard. Details are in the owner's private security note. Owning WP: WS2-02.
- **S4** [V2] The post-signup session flow (`src/app/api/auth/establish-session/route.ts`) needs hardening per an owner decision. Details are in the owner's private security note. Owning WP: WS2-03.
- **S5** [V] **[Corrected: see Errata]** `vercel.json` sets CORS `*` with GET/POST/PUT/DELETE on `/api/(bills|search|intelligence|geo)`. Only `/api/bills/[id]/follow` mutates, and it uses a Bearer JWT, RLS and a rate limit, so the risk is low but the header is over-broad.
- **S6** [V] Supabase:
  - RLS is on for all tables except `ky_committee_materials_legacy_dupes_048`, which was created with CREATE TABLE AS. It holds public data.
  - `ky_increment_bill_view` is SECURITY DEFINER and callable by `anon`, so view counts can be inflated.
  - One function has a mutable `search_path`.
  - `pg_trgm` is installed in the `public` schema.
- **S7** [V] The `server-only` guard `src/app/lib/supabaseAdmin.ts` is imported by nothing; all 23 importers use `supabaseAdminCore` directly.
- **S8** [V] The CSP is Report-Only.
- **S9** [V] `src/components/members/LegislatorDistrictMinimap.tsx` disables attribution and hides the Mapbox logo, which breaches Mapbox's attribution requirement.
- **S10** [V] `/privacy` and `/terms` exist, but the launch checklist's legal review is unchecked. PostHog captures 5-digit ZIP codes.
- **S11** [V] Good practice already in place: Resend (Svix) and Sentry (HMAC) webhook signatures are verified; CAN-SPAM footer and one-click `List-Unsubscribe` are present; no secrets are in tracked files.
- **S12** [V2] `FEEDBACK.md` in this **public** repo contains feedback-givers' full names and email addresses. Removing them from git history is an owner decision.

## D — Data limits and vendors (deps audit unless noted)

- **D1** [V] **[Corrected: see Errata]** LegiScan.
  - **Terms:**
    - The Public API cap dropped from 30k to **10k queries/month** on 2026-10-01, with a limit of about 2 requests/s.
    - Enforcement starts 2026-11-01, and creating multiple keys risks suspension.
    - A $1,000/yr tier gives 30k.
  - **Measured usage:**
    - Aug 1,165 · Sep 947 · Oct 1–6 41.
    - Projected 2027 peak: about 3.5k–5.5k/month, at most 55% of the cap (TASKS.md 2026-10-06).
  - **Already in place:**
    - a single client (`src/lib/ky-legiscan-client.ts`) with a 650 ms serialized throttle
    - `change_hash` gating
    - hash-gated `getDataset` through a stored-ZIP cache
    - per-op and per-caller counters (migration 054)
  - **Gaps:**
    - The quota guard counts **successful** calls only.
    - A single manual script can burn most of a month; `backfill:vote-nv-counts` would use about 69%.
    - The "price before running" rule is enforced by people, not code.
    - `docs/reference/legiscan/LegiScan-API-Crash-Course.txt` and the README still say 30,000.
    - Key ownership is unconfirmed.
- **D2** [V] Open States v3 (Plural) bulk data is CC0. `/people` often returns 504s. Rate limits are unverified. It is stewarded by a for-profit company.
- **D3** [V] **[Corrected: see Errata]** The Kentucky LRC has no API or data feed. Four HTML scrapers plus Wayback backfills depend on its pages. Fetches have no documented politeness policy (User-Agent with contact, rate limit, conditional GET) [I: verify in code].
- **D4** [V] Current plans:
  - Supabase Pro (an org shared with another project; DB 197 MB)
  - Vercel Pro (required for the cron cadence)
  - free tiers for Resend (about 100/day), Mapbox (about 50k loads), PostHog, Sentry and GitHub Actions (public repo)
  
  Cash cost is about $55–75/month in the interim and $65–110 in session, roughly $700–1,100/yr [I].
- **D5** [V] GitHub Actions scheduled triggers fire up to 2 h late; on 10/5 one run was never assigned a runner. Vercel crons fire on time.
- **D6** [V] Single points of failure:
  - The Adobe Fonts kit `yru3sto` needs an active Creative Cloud plan.
  - Hostinger DNS forwards for the `.org` domains drop the path (TASKS.md 2026-08-22).
- **D7** [V] No alert reaches a phone; all alerting goes to Slack channels.

## U — Product and UX (ux audit unless noted)

- **U1** [V2] Member vote labels are wrong. `src/components/members/MemberProfileView.tsx` (~line 188) renders the raw LegiScan roll-call description.
  - About 385 House roll calls from Jan–Apr 2026 read like "House: Veto Override RCS# 155" when they were ordinary amendment or passage votes.
  - The bill page fixes this with `deriveRollCallLabel` (local to `BillDetailView.tsx`, around line 166); the member page does not.
- **U2** [V] Bill-page hierarchy is inverted.
  - The H1 is a 34px serif, roughly 60-word "AN ACT…" legal title, followed by the LRC digest.
  - The AI summary starts around y≈1095px on desktop and y≈1760px on mobile, in 13px gray text, truncated before "Who it may affect".
  - Metadata comes before the bill number and title.
- **U3** [V] Bill history is unclear.
  - It shows unlabeled "House Floor Vote — Failed 20–21, Absent 59" rows, e.g. seven of them on HB500 2026, a budget that passed.
  - A forced Title Case transform produces "Delivered To Secretary Of State".
  - Dotted glossary underlines cover nearly every phrase.
- **U4** [V] **[Corrected: see Errata]** The homepage is stale between sessions.
  - The newest action is 2026-04-27, and the carousels show April bills.
  - The session banner sends people to LRC even though `/meetings` has 91 upcoming meetings.
  - "Most viewed bills" ranks by lifetime views (the top bill has 78).
  - The H1 is a slogan with no Kentucky or legislature keyword.
  - There are three search boxes, and the feature cards repeat the CTAs.
- **U5** [V] Meetings are cluttered.
  - 13 of 91 upcoming rows are "Cancelled", and 12 committee/date pairs are duplicated as both cancelled and scheduled (e.g. Budget Review subcommittees on 2026-10-07).
  - Cards show no agenda preview.
  - Meetings are hidden under the Committees menu.
- **U6** [V] A ZIP lookup resolves to one point and returns one House and one Senate member, with no warning that a ZIP can span several districts. This is a correctness issue.
- **U7** [V] Mobile: `src/components/members/DistrictMapExplorer.tsx` (around line 690) sets `flex: '1 1 260px'`, which leaves a 216px gap between the address field and Search.
- **U8** [V] Listing pages are sparse and cluttered.
  - `/bills` fits 4–5 cards per desktop screen.
  - On mobile the filters fill the first screen, and Topic appears twice.
  - `/members` on mobile is 24,050px tall.
  - Cards carry "chip soup", and three status labels that all mean "became law" read differently.
- **U9** [V] **[Corrected: see Errata]** Party is shown only as a ~10px colored dot, i.e. by color alone.
- **U10** [V] The follow funnel leaks.
  - It requires name, email, password and verification before a follow.
  - The copy "Follow what Representative X sponsors" promises a legislator follow that does not exist.
  - There is no instant alert option.
- **U11** [V] Member profiles lack context.
  - There is no party-line context, no key votes, and no plain-language line per bill.
  - Sponsored bills and a large signup box sit above the voting record.
- **U12** [V] **[Corrected: see Errata]** `/bills` defaults to a session that ended in April. No 2027 bills exist yet; prefiling was abolished in 2022 (market).
- **U13** [V] Performance:
  - First-load JS is 380–407 kB gzipped, about 2.2–2.7 MB uncompressed, and 4.4 MB on desktop home (the Mapbox preview).
  - CLS is 0.38 on `/committees` and 0.13–0.15 on `/search`, because the nav auth area and the footer shift after hydration.
- **U14** [V] Accessibility (axe-core):
  - home: 6 contrast failures plus heading order
  - `/bills`: 20 contrast failures
  - HB500 page: 34 `aria-prohibited-attr` (vote-tally divs with `aria-label` and no role), 4 contrast failures, heading order
  - the initials avatar is 1.79:1
- **U15** [V] SEO is strong: ISR, canonical slugs, Legislation/Person/Event JSON-LD, sitemap and `llms.txt`. The weak points are meta descriptions (A5), the legal-title H1, and a keyword-free home H1.
- **U16** [V] Visual identity.
  - The site reads as a stock MUI template.
  - Trust content is strong on `/about` but thin at decision points.
  - AI disclosure doesn't say which bill version was summarized, and the "Beta" chip undercuts confidence.
  - Body text is 13–14px gray.
- **U17** [V] Meetings are the best interim content and are hard to reach. Agendas have 5–20 items, and none appear on cards.
- **U18** [V2] The README says Kentucky uses a "3/5 veto override". Kentucky overrides with a majority of members elected (51 House / 20 Senate). The in-app tooltip in `src/lib/tooltipContent.ts` is correct.

## C — Market and strategy (market audit)

- **C1** [V] No single KYvKY feature is unique:
  - LRC Bill Watch: official free alerts
  - FastDemocracy: free tracking and email
  - BillTrack50: free AI summaries
  - LegiScan: free tracking and roll calls
  
  The defensible niche is a **neutral, Kentucky-only, plain-language layer** linking each bill to every roll call, *your* legislators and committee agendas. Kentucky Public Radio's vote tracker covers 15 bills per session, hand-built from LRC vote PDFs.
- **C2** [V] CalMatters' **Digital Democracy** received $9M from Lever for Change in April 2026 ($1.8M/yr for 5 years) to expand to more states through newsroom partners.
  - It runs in California and Hawaiʻi (with Civil Beat, since Sept 2025).
  - It offers hearing transcripts, donor data, a weekly per-legislator email ("My Legislator", about 10k subscribers in California) and reporter tip sheets.
  - Its AI output is human-reviewed.
  - It is the main threat and the most credible partner.
- **C3** [V] Kentucky organizations already use BillTrack50 (Kentucky Civic Engagement Table). Advocacy trackers take positions. The open lane is neutral public accountability.
- **C4** [V] General AI is a partial substitute; one 2026 study found 29% of chatbot voting answers were inaccurate. The opportunity is to be the **source AI tools cite** (`llms.txt`, JSON-LD and stable URLs already exist).
- **C5** [V] Projects that survive are newsroom-owned, institution-attached or paid. The lessons: own distribution, and design for a weekly habit (a per-legislator email) rather than one-off bill-page visits.
- **C6** [V] Funding pots near Kentucky are small (Press Forward Bluegrass about $10k each; Trust for Civic Life ≤$25k; Knight Cities Challenge for Lexington). Most civic-info money flows through newsrooms.
- **C7** [V] Strategic options considered:
  1. "My Legislator for Kentucky" with a newsroom
  2. Digital Democracy Kentucky partner
  3. data and tip-sheet provider (B2B)
  4. election-cycle tool
  5. maintain mode
- **C8** [V] The 2026-11-03 general election makes "how did my rep vote" the highest-intent query for the next four weeks.

## O — Owner goals (stated 2026-10-06)

- **O1** A long-term project.
- **O2** Respects data limits: LegiScan, Open States and LRC load, vendor free tiers, and AI spend.
- **O3** Packaged as an offering to merge into or partner with a larger organization, e.g. CalMatters Digital Democracy.
- **O4** "At the very least proof of my thinking": the repo and docs should demonstrate rigor to a partner or funder.

---

## Errata and new findings (spec review 2026-10-06)

Spec reviewers re-checked the findings above in the repo (`a4e543a`; working tree `96365a2` changes docs only). The full evidence is in each workstream file's "Findings re-checked" section. This section repeats only the outcome, so that an agent reading this appendix first does not build on a wrong premise. The "Owning WP" column names the WP that acts on the corrected finding.

### Corrected findings

| ID | Correction (one line) | Owning WP |
|---|---|---|
| **S1** | Next 16 does **not** force an MUI migration. `@mui/material-nextjs` 7.3.9 and later peers `next ^16.0.0` and has no `@mui/material` peer (npm metadata, re-checked 2026-10-06), so the upgrade needs only a `@mui/material-nextjs` bump from the current `^5.18.0`. No MUI v5 → v7/v9 migration is in the program. | WS2-11c |
| **S5** | Understated. The CORS `*` group in `vercel.json` (~26) also covers `/api/intelligence`, which no page uses and which calls Anthropic at request time, and `/api/geo/zip`, which proxies Nominatim under a 1 request/second policy. | WS2-07 |
| **A1** | `legiscan_texts` holds **no bill text**. It stores version metadata and links only (`doc_id`, type, date, URL; migration 036 column comment), and LegiScan datasets carry no text either. Grounding summaries in text therefore needs a new, budgeted fetch. The `Status` input is still passed (`ky-content-generation.ts` ~105) and is not a hash input. | WS3-04 (drop `Status`); WS3-07 and WS3-08 (text source) |
| **D1** | "Remove the key" does **not** stop requests: with an empty key the client only warns and keeps sending keyless requests with retries (see **N3**). The brake that reaches every scheduler is `LEGISCAN_MONTHLY_QUERY_LIMIT`. Also: the counter write is fire-and-forget, and a LegiScan `status: "ERROR"` reply is retried up to 5 times, each retry counted. | WS4-02 (client); WS4-01 (budget doc); WS9-06a (runbook) |
| **D3** | Partly wrong. The LRC scrapers **do** send an identifying User-Agent (`KnowYourVoteKentucky/1.0 (+https://kyvky.com; <job>)`). They lack a contact address, a shared rate limit and conditional GET. Separately, `/api/lrc/bill-link-status` fetches LRC on every bill-page view. | WS4-09a (polite helper); WS6-03 (bill-page probe) |
| **E2** | There are **10** workflow files: 6 scheduled (9 cron lines), **3** manual-only and the Slack notifier, not "4 manual". Schedules are also duplicated in `src/lib/sentry-sync-cron.ts`, and one has already drifted: `MONITORED_SOURCES.dataset` in `src/lib/source-health.ts` (~81) says `0 8 * * 0,3` while `legiscan-dataset-weekly.yml` runs `0 11 * * 0` and `0 11 * * 3`. Quote schedules from `vercel.json` and the workflow files, never from `MONITORED_SOURCES`. | WS4-11 (one registry); WS4-12 |
| **U4** | Partly stale. "Recent legislative action" already hides itself after 30 days without substantive action (`LATEST_ACTION_WINDOW_DAYS`); only "Most viewed bills" shows April bills. "Most viewed" ranks by PostHog unique visitors over the past day and falls back to lifetime `view_count` only when PostHog server credentials are missing or fewer than 3 bills resolve [verify which path production uses, Owner]. | WS6-04b; WS6-10 |
| **U9** | Partly wrong. The avatar badge does contain a party letter (D/R), so party is not shown by color alone visually. But the badge is `aria-hidden` (`LegislatorAvatar.tsx` ~69) and about 9 px, so assistive technology gets no party at all, and no profile shows party as text. | WS6-08 |
| **U12** | By design, not a bug. `/bills` defaults to the most recent session through `getCivicDataSessionName` and flips to the 2027 RS automatically on 2027-01-05. The defect is the missing explanation. The market note "prefiling was abolished in 2022" conflicts with the live banner and the glossary tooltip [verify against LRC before repeating it]. | WS6-10; WS6-04a (decision 2) |

Other workstream re-checks refine findings without reversing them (for example S2's counts, S7's importer count, S8, S9 not being rendered anywhere, S10, E3, E8, U17). Read the owning workstream's "Findings re-checked" section before acting on any finding.

### New findings

Cite these IDs in WPs and PRs like any other finding. The WP tables predate these errata and may not list N-IDs, so every PR that acts on N1–N5 cites the N-ID in its "Findings re-checked" section.

| ID | Finding | Evidence (verified 2026-10-06) | Owning WP |
|---|---|---|---|
| **N1** | [V2] `npm run audit:accuracy:dry` still runs the Anthropic pass, so a "dry run" spends money. `docs/accuracy-audit.md` (~124) also names a `--skip-llm` flag that does not exist; the real flag is `--no-llm`. | `scripts/accuracy-audit.ts` ~177 passes `skipLlm: args.skipLlm` (`false` unless `--no-llm`), and `src/lib/accuracy-audit/types.ts` ~233 uses `overrides.skipLlm ?? (dryRun \|\| …)`, so the explicit `false` wins over `--dry-run`. | WS3-15 |
| **N2** | [I] Member-profile sponsor matching can adopt another member's LegiScan `people_id`. A sponsor whose name merely **ends with** the member's surname matches, and on the path where a member has no `legiscan_id`, `resolveLegiscanPeopleIdFromBillSponsors` can then pick up the wrong person. Inferred from code; the aggregate data check is in the owning WP. Related: E10. | `src/lib/ky-member-utils.ts` ~737 (`nm.endsWith(last)`); `src/lib/member-profile-data.ts` ~74, called at ~262 and ~306. | WS5-12a |
| **N3** | [V2] The LegiScan client sends **keyless** requests. With `LEGISCAN_API_KEY` empty it logs a warning and carries on, and every request is sent with an empty `key` and retried up to `MAX_RETRIES`. This is why removing the key is not a stop (D1). | `src/lib/ky-legiscan-client.ts` constructor ~129–130; `request()` ~166–189. | WS4-02 (step 5) |
| **N4** | [V2] A public read path uses the service-role client. `createServerClient()` prefers `SUPABASE_SERVICE_ROLE_KEY` over the anon key, so public bill-detail reads run with service-role privileges instead of under RLS. Related: S7. Until it is fixed, WS8-02's output allowlist limits what public endpoints return. | `src/lib/ky-bill-detail-server.ts` ~21–26. | WS2 § Deferred (S7 row; trigger: WS8-02 merged and its tests show the anon key returns the same data); WS8-02 (allowlist) |
| **N5** | [V2] The meetings list can silently drop **upcoming** meetings. `fetchKyMeetingsBrowseWindow` reads from the most recent session start (about 9 months back today) to 120 days ahead in ascending date order with `.limit(500)`, so if the window holds more than 500 rows the rows cut are the future ones. The client path for `/meetings?q=` has the same limit. Whether production currently exceeds 500 is unverified [verify: Owner SELECT count over the same window]. Related: U5, U17. | `src/lib/ky-ga-browse-server.ts` ~33–66 (`.limit(500)` ~53); `src/components/committees/MeetingsBrowse.tsx` ~160–172. | WS6-06 (fetch upcoming separately); WS3-06a (informed of the limit) |
