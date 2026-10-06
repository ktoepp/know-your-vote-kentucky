# KYvKY deferred and not-doing register

This file holds what the program deliberately does not do, and every row from each workstream's Deferred table, with its revisit trigger. Appendix A counts a finding as closed when a WP's acceptance criteria are met **or** the finding is listed here. Full reasons are in each workstream file's Deferred section.

A Backlog WP that misses its window (by the 12-07 cut line in W2) also gets a row here when its tracker row becomes `deferred` (manual §2 "Core vs Backlog").

## 1. Program-level "not doing"

| Not doing | Why | Revisit when |
|---|---|---|
| A second state, a multi-state schema, or renaming the `ky_` tables | The defensible niche is Kentucky-only (C1). The project is run by one person (E14). Digital Democracy expands through newsroom partners (C2). | WS8-16 chooses partner option 2 with a signed, funded agreement. The data cost comes from WS4-16's per-state sheet. |
| Web Push API / instant per-event alerts | 4 accounts have the digest on (T3). It would need a new schedule or trigger and more sends against Resend's ~100/day (D4). | More than 200 digest or weekly-email subscribers, or a partner requires it. |
| A native mobile app | 79% of visitors view one page and arrive by search (T2, T4). An app adds a platform and store accounts for one person. | A partner provides distribution and maintenance. Never as a solo build. |
| Hearing transcripts, donor and campaign-finance data | These are Digital Democracy's differentiators (C2). They need new sources and heavy processing (O2). | A Digital Democracy partnership supplies them (WS8-16). |
| Local-government and executive-order features | The product was parked on 2026-05-18. WS5-06a removes the code. Dropping the 4 tables stays Deferred until they are exported. | WS8-14b tags them parked and the owner confirms an export. The feature itself returns only on a W4 partner request. |
| AI summaries for sessions before 2024 (~17.5k bills, A7) | Spend and quality risk before text grounding is proven (12-07 go/no-go). | Grounding passes in session **and** a partner or research request funds it. The owner runs it with a dollar estimate. |
| MUI v5 → v7/v9 migration, a full visual refresh, a Turbopack build | Not required for Next 16 (S1 erratum). About 132 files touched right before the session. | An MUI v5 advisory with no v5 patch, MUI v5 dropping React 19, Next dropping `--webpack`, or a W4 redesign. Checked quarterly (WS9-08 monthly check, carried past W4 by WS5-16). |
| Anthropic Batch API, a model-evaluation set in WS4, a token-metering ledger | About $0.006 per bill. The Console limit plus `--max-usd` is enough. | A single regeneration estimated above $25 (metering) or $50 (batch), or a model retirement before 2027-04-30 (WS4-07). |
| A legislator-follows table, a party-line statistic | The weekly email is keyed to districts, and follows would point at departing members after the election. A party-line statistic needs editorial review. | WS7-13 shows signup friction is the bottleneck, or a partner with editorial review asks. |
| LRC record-vote PDF scraping, text-diffing of bill versions | A new crawl target and a fragile parser (E6, D3). | W4 shows unmatched roll calls still confuse readers after WS3-03a, with LRC load measured under WS4-09a; or a partner asks for diffs. |
| Productizing a public API: OpenAPI, a `/data` page, API keys, an SLA, OCD bill IDs, oEmbed, bulk files | No consumer exists. WS8-03, WS8-12 and WS8-15 are trigger-gated. | A written partner request for ingestion or bulk data (WS8 trigger rule). |
| Splitting `ky-sync-pipeline.ts`, `BillDetailView` beyond WS6-09a, and `SearchPageClient` | Large refactors near the session. Characterization tests come first. | W4, after WS5-12b, WS4-05 and WS4-06, if WS8-16 chooses go or partner. |
| Dependabot **version** updates, CodeQL, Playwright end-to-end tests in CI, coverage targets | Recurring triage for one maintainer. Security alerts and security-update PRs stay **on** (WS1-07). | A W4 decision to continue or partner, plus WS2-11c merged; or a security finding CodeQL would have caught. |
| A paid paging service, Supabase PITR, a separate Supabase org, moving the repo to an organization | Cash and vendors are not justified at this scale. | WS8-16 chooses a mode that transfers operations, or a W3 incident shows Slack phone paging failed. |
| Open and click tracking pixels, a retargeted PMF survey, a second analytics source | The privacy page's promises and an underpowered sample (T3, T8, T10). | Weekly-email subscribers exceed the WS8-08 floor and the privacy promise is revisited, or a funder requires a PMF metric. |
| The LegiScan paid tier | The projected peak is at most 55% of the cap (D1). | The measured 2027 peak is 5,000/month or more, or a partner needs a second state (WS4-04, WS4-16). |
| A git history rewrite for `FEEDBACK.md` | Owner decision (S12). The default removes the data at HEAD only, with a guard test. | The owner chooses WS2-05 (b) or (c), or a person named in the file asks. |
| An explicit `LEGISCAN_DISABLED` switch | `LEGISCAN_MONTHLY_QUERY_LIMIT=1` already works as the brake. The client refusing to send with an empty key is **not** deferred: WS4-02 step 5 builds it (N3). | The documented brake fails a WS9-06a drill. |
| Collapsing merged WPs to tracker rows | The WP text is the audit trail for O4 until the decision. | After WS8-16, the spec moves to `docs/archive/program-spec/` (WS8-16 step 4). |

## 2. Consolidated Deferred register

One row per row in each workstream's Deferred table, plus the trigger-gated WPs (rows `3.G1`, `3.G2`, `8.G1`–`8.G3`). Row numbers are stable; other files cite them (for example WS9 cites 9.1–9.13).

**W4 status rule.** Only the row's **W4 owner** WP fills its W4 status, as `fired (date)`, `not fired` or `revived (WP)`. No workstream resolves another's row. Filling a status is not a verdict, so WS7-13's "no verdict" rule still holds.

| W4 owner | Fills rows | Class |
|---|---|---|
| WS5-16 | WS1 and WS2 (its currency row already reads WS2's triggers) | Backlog (W4 promotion) |
| WS9-14 | WS3 and WS9 | Backlog |
| WS4-16 | WS4 | Backlog |
| WS5-13 | WS5 | Backlog (W4 promotion) |
| WS6-20 | WS6 | Backlog |
| WS7-13 | WS7 | Core |
| WS8-16 | WS8 (and copies every other row's status into the decision doc) | Backlog (W4 promotion) |

Six of the seven W4 owners are Backlog. If one is not picked up in W4, its rows stay blank, and WS8-16 (or the default maintain-mode record) reads them as `not reviewed (<owner WP>)`.

| # | WS | Item | Revisit trigger | W4 owner | W4 status |
|---|---|---|---|---|---|
| 1.1 | WS1 | Dependabot version updates and `.github/dependabot.yml` (former WS1-08) | W4 continue or partner, and WS2-11c merged | WS5-16 | |
| 1.2 | WS1 | Extract the digest selection into pure functions (former WS1-13a) | More than ~25 active email recipients, or a digest regression in production | WS5-16 | |
| 1.3 | WS1 | A standalone pre-session drill PR (former WS1-14) | none; folded into WS9-12 | WS5-16 | |
| 1.4 | WS1 | Remove `eslint.ignoreDuringBuilds` | WS2-11c deletes the key | WS5-16 | |
| 1.5 | WS1 | Renumber a duplicate `045` migration | A migration-history tool is adopted | WS5-16 | |
| 1.6 | WS1 | Two `exhaustive-deps` warnings in `TopProgressBar.tsx` | The next WP that touches the file | WS5-16 | |
| 1.7 | WS1 | Coverage reports, thresholds and test-count targets | Partner or funder due diligence asks | WS5-16 | |
| 1.8 | WS1 | Playwright end-to-end tests in CI | Two W3 regressions that unit tests could not catch | WS5-16 | |
| 1.9 | WS1 | CodeQL default setup | W4 partner packaging, or a finding CodeQL would have caught | WS5-16 | |
| 1.10 | WS1 | `npm audit` as a CI gate | WS1-07's Dependabot alerts are turned off | WS5-16 | |
| 1.11 | WS1 | `workflow_run` retry for "no runner" cancellations | It recurs (TASKS.md watch item) | WS5-16 | |
| 1.12 | WS1 | Tests owned by other workstreams (E10, S3/S4, D1, E6, U1) | none; tracked by their owners | WS5-16 | |
| 2.1 | WS2 | MUI v5 → v7/v9 migration | An MUI v5 advisory with no v5 patch, v5 drops React 19, or a W4 redesign | WS5-16 | |
| 2.2 | WS2 | Turbopack build (former WS2-11d) | Next drops `--webpack`, or a partner's build requires it | WS5-16 | |
| 2.3 | WS2 | Replace axios with `fetch` | Parser and client tests exist, or a high axios advisory goes unpatched for more than 14 days | WS5-16 | |
| 2.4 | WS2 | Move `pg_trgm` out of `public` | The advisor raises it to ERROR, or a W4 schema cleanup is tested on a branch | WS5-16 | |
| 2.5 | WS2 | Leaked-password protection (only if the plan lacks it) | A plan change | WS5-16 | |
| 2.6 | WS2 | CSP enforcement (WS2-12a/b) | The W4 decision (WS2-12b) | WS5-16 | |
| 2.7 | WS2 | CSP without `unsafe-inline`/`unsafe-eval` | A partner's security review requires it (W5) | WS5-16 | |
| 2.8 | WS2 | Public reads that use the service-role client (N4) | WS8-02 merged and its tests show the anon key returns the same data, or W4 | WS5-16 | |
| 2.9 | WS2 | E11 counts (`any`, `console.*`) | CI exists: add a warning for touched files. Or a log is found to leak | WS5-16 | |
| 2.10 | WS2 | Git history rewrite of `FEEDBACK.md` | The owner chooses (b), or a named person asks | WS5-16 | |
| 2.11 | WS2 | HTTP Basic option for `/admin` | The owner asks | WS5-16 | |
| 3.1 | WS3 | Summaries before 2024 (A7) | W4 traffic to pre-2024 bills, or a partner funds them | WS9-14 | |
| 3.2 | WS3 | Chunked summaries of bills over the size cap | More than 5% of enacted bills exceed the cap, or a partner asks | WS9-14 | |
| 3.3 | WS3 | A "checked by a person" label and a review queue | SMEs join, or a partner brings reviewers | WS9-14 | |
| 3.4 | WS3 | A 100-bill labelled topic evaluation set | Topic pages or filters reach ≥ 3% of visitors in W3 | WS9-14 | |
| 3.5 | WS3 | LLM topic classification | WS3-12a misses its 50% recovery target | WS9-14 | |
| 3.6 | WS3 | A structured `affects[]` field and audience lens pages | Grounded audience clauses pass WS3-11a at ≥ 95% for a session | WS9-14 | |
| 3.7 | WS3 | Detecting LRC cancellation notices | A real cancellation page is captured in `fixtures/lrc/` | WS9-14 | |
| 3.8 | WS3 | Repairing past duplicate meeting rows | WS3-06b is built and future duplicates remain | WS9-14 | |
| 3.9 | WS3 | Motion labels from LRC record votes | A partner supplies motion data, or the LRC publishes a feed | WS9-14 | |
| 3.10 | WS3 | Text-diffing bill versions | W4 partner conversations ask for it | WS9-14 | |
| 3.G1 | WS3 | WS3-05b (ZIP → districts) | ZIP lookups ≥ 30% of map lookups, or reader reports | WS9-14 | |
| 3.G2 | WS3 | WS3-06b (LRC time and room updates) | A committee-event email reaches more than 10 recipients a month | WS9-14 | |
| 4.1 | WS4 | Move the bills sync and LRC calendar to Vercel, and a no-runner retry | Two missed GitHub runs of a session-critical job in W3, or the 10/5 failure recurs | WS4-16 | |
| 4.2 | WS4 | A cross-process LegiScan lock | Any LegiScan 429, a second state, or a new scheduled LegiScan job | WS4-16 | |
| 4.3 | WS4 | A dataset-only minimum-quota switch | A further cap cut, or a quota hold in session | WS4-16 | |
| 4.4 | WS4 | A `LEGISCAN_DISABLED` switch | The brake fails a WS9-06a drill | WS4-16 | |
| 4.5 | WS4 | Anthropic token metering | A regeneration estimated above $25, or a partner asks for per-bill cost | WS4-16 | |
| 4.6 | WS4 | A Batch API path | An approved regeneration above $50, or a retirement forces a corpus regeneration | WS4-16 | |
| 4.7 | WS4 | Summary model evaluation | A retirement date before 2027-04-30 (WS3 opens a model-switch WP) | WS4-16 | |
| 4.8 | WS4 | An Open States call counter | Limits published, 429s, or more than 50 calls a day | WS4-16 | |
| 4.9 | WS4 | A Resend send counter | Owned by WS7-09c | WS4-16 | |
| 4.10 | WS4 | Conditional GET and content-hash skip for LRC | WS4-15 finds caching headers | WS4-16 | |
| 4.11 | WS4 | Open States `/people` → CC0 bulk export | Down more than 7 days, terms change, or the January roster update fails | WS4-16 | |
| 4.12 | WS4 | Anthropic prompt caching | The grounded prompt exceeds the minimum cacheable prefix | WS4-16 | |
| 4.13 | WS4 | Automated usage reads for Mapbox, PostHog and Sentry | Visitors reach ~10× September 2026, or a vendor emails about limits | WS4-16 | |
| 4.14 | WS4 | LRC record-vote scraping | A partner or the owner prioritizes pre-2018 votes | WS4-16 | |
| 4.15 | WS4 | Name-matching tests | none; owned by WS5-12b | WS4-16 | |
| 5.1 | WS5 | Split `BillDetailView.tsx` beyond WS6-09a | WS6 bill-page work is picked up | WS5-13 | |
| 5.2 | WS5 | Split `SearchPageClient.tsx` | WS6 search work, or a search bug that takes more than 2 h | WS5-13 | |
| 5.3 | WS5 | Split `ky-sync-pipeline.ts` (former WS5-14a/b) | WS8-16 "continue", or a partner runs the code. Prerequisites: WS5-12b, WS4-05, WS4-06 | WS5-13 | |
| 5.4 | WS5 | Export and drop the 4 parked tables (former WS5-06b) | W4 maintain-mode cleanup, WS8-14b's parked tag, or an owner migration batch | WS5-13 | |
| 5.5 | WS5 | Replace `lucide-react` (former WS5-11) | Swap opportunistically in WS6 PRs; drop the dependency at 0 uses | WS5-13 | |
| 5.6 | WS5 | Remove `lottie-react` | WS6-04b merges | WS5-13 | |
| 5.7 | WS5 | Vendor the email components and drop `react-email` | A runtime advisory, the component exports are dropped, or a server trace includes socket.io | WS5-13 | |
| 5.8 | WS5 | WS5-10, if it misses 11-14 | W5, after the W4 decision | WS5-13 | |
| 5.9 | WS5 | The direct `@mui/system` dependency | Any MUI major upgrade | WS5-13 | |
| 5.10 | WS5 | `adm-zip` is a devDependency used from `src/` | A route or cron imports the dataset-import module | WS5-13 | |
| 5.11 | WS5 | Unused exports inside live files | The next edit of that file | WS5-13 | |
| 5.12 | WS5 | Renumber the `045` migrations | A migration tool that tracks applied files | WS5-13 | |
| 5.13 | WS5 | Move `TASKS.md` and `decisions.md` to `docs/archive/` | The owner picks WS5-03a (b) | WS5-13 | |
| 5.14 | WS5 | Cut the accuracy-audit plumbing | WS5-13 grades the audit slim or cut | WS5-13 | |
| 5.15 | WS5 | Collapse merged WPs to tracker rows | The spec ceiling is raised by ADR | WS5-13 | |
| 6.1 | WS6 | Legislator follows (former WS6-13) | WS7-09a option (b), or a partner requires them | WS6-20 | |
| 6.2 | WS6 | A party-line statistic | A partner with editorial review asks | WS6-20 | |
| 6.3 | WS6 | A Cards/List toggle on `/bills` | `/bills` sessions exceed 15% of visitors in W3 | WS6-20 | |
| 6.4 | WS6 | Card chip density | Same trigger as 6.3 | WS6-20 | |
| 6.5 | WS6 | Instant per-event alerts | More than 200 digest subscribers, or a partner requires them | WS6-20 | |
| 6.6 | WS6 | Animated live-feed preview on the home page | WS6-20 shows signed-in return worth a feed | WS6-20 | |
| 6.7 | WS6 | Full visual refresh / MUI v7 restyle | A W4 partner design system, or the WS2 trigger | WS6-20 | |
| 6.8 | WS6 | Converting the bill page's client children to server components | WS6-09a's JS report shows more than 350 kB | WS6-20 | |
| 6.9 | WS6 | `/search` redesign | Search exceeds 5% of visitors in session | WS6-20 | |
| 6.10 | WS6 | Browse legislators by voting pattern | A partner request, or WS6-20 | WS6-20 | |
| 6.11 | WS6 | An interactive legislative-process flowchart | WS6-20, if guide traffic grows | WS6-20 | |
| 6.12 | WS6 | Welcome-email iconography | WS7 touches the welcome email | WS6-20 | |
| 6.13 | WS6 | Status-label wording | Owned by WS3-13 | WS6-20 | |
| 6.14 | WS6 | Signed-in mobile accessibility sweep | The owner provides a test account and a preview | WS6-20 | |
| 6.15 | WS6 | A home signup band | WS6-20 | WS6-20 | |
| 6.16 | WS6 | Optional W2 WPs not merged by 12-05 (WS6-12b, 14, 15, 16, 17a, 17b) | WS6-20 decides on each | WS6-20 | |
| 6.17 | WS6 | Dark mode | none | WS6-20 | |
| 7.1 | WS7 | Open tracking pixels and Resend click tracking | More than 500 subscribers **and** the privacy promise is changed after legal review | WS7-13 | |
| 7.2 | WS7 | `delivered`/`delayed` log states and a precedence table | Logged sends exceed ~500 a month | WS7-13 | |
| 7.3 | WS7 | A returning-visitor marker and a retargeted PMF survey | The owner chooses WS7-06 (a) or (b), or the project continues and KPI-3 exceeds 5% | WS7-13 | |
| 7.4 | WS7 | PMF score as a funder metric | A retargeted survey reaches 40 responses | WS7-13 | |
| 7.5 | WS7 | Remove the weekly-email code (W5) | KPI-6 is below WS8-08's floor of 20 | WS7-13 | |
| 7.6 | WS7 | Fold followed-bill events into the weekly email and retire the digest (W5) | Weekly subscribers on 2027-03-30 exceed March's digest recipients | WS7-13 | |
| 7.7 | WS7 | Building the weekly email after the cut line | WS7-08 recorded it as deferred and WS8-16 continues the project | WS7-13 | |
| 7.8 | WS7 | A per-legislator follow | Readers ask outside their own districts, and the weekly email is above the floor | WS7-13 | |
| 7.9 | WS7 | An email-only subscription with no account | WS6-12a is not built, and W4 shows many lookups with few opt-ins | WS7-13 | |
| 7.10 | WS7 | Legislator social handles | A partner supplies a maintained dataset | WS7-13 | |
| 7.11 | WS7 | An `outbound_link_clicked` event | Autocapture is turned off | WS7-13 | |
| 7.12 | WS7 | Per-user digest time zone and send-time review | Reader feedback, or a clear KPI-7 pattern by hour | WS7-13 | |
| 7.13 | WS7 | Welcome-email iconography | Welcome emails exceed 50 a month | WS7-13 | |
| 7.14 | WS7 | A second analytics source | PostHog pricing or terms change, or due diligence asks | WS7-13 | |
| 8.1 | WS8 | OpenAPI and a `/data` page (retired WS8-04) | A written partner request, with WS8-02 option (b) shipped | WS8-16 | |
| 8.2 | WS8 | A migration-parsed data dictionary with a drift test (retired WS8-06) | A partner takes over operations | WS8-16 | |
| 8.3 | WS8 | A jurisdiction seam in code (retired WS8-13) | W4 "partner" with a funded second state | WS8-16 | |
| 8.4 | WS8 | A session-identifier map to Open States | Part of a triggered WS8-03 request | WS8-16 | |
| 8.5 | WS8 | `CODEOWNERS` and `CITATION.cff` | A second maintainer joins, or a researcher asks how to cite | WS8-16 | |
| 8.6 | WS8 | A code of conduct | The first accepted outside PR | WS8-16 | |
| 8.7 | WS8 | A reporter tip sheet | A newsroom commits in writing for a session | WS8-16 | |
| 8.8 | WS8 | oEmbed and an "Embed" button | A newsroom has embedded the card in 2 or more stories | WS8-16 | |
| 8.9 | WS8 | Bill-level OCD IDs | A partner's ingestion requires them | WS8-16 | |
| 8.10 | WS8 | API keys, rate limits, an SLA, a status page | More than 1,000 non-browser calls a day for a week, or a contract requires it | WS8-16 | |
| 8.11 | WS8 | Re-hosting raw LegiScan texts and datasets | LegiScan's terms change, or a partner pays for a mirror | WS8-16 | |
| 8.12 | WS8 | A second state or multi-state schema | W4 "partner" with a funded agreement | WS8-16 | |
| 8.13 | WS8 | Hearing transcripts and donor data | A partner supplies or funds them | WS8-16 | |
| 8.G1 | WS8 | WS8-03 (OCD person and division IDs) | A written ingestion request | WS8-16 | |
| 8.G2 | WS8 | WS8-12 (per-session file) | A written bulk-data request | WS8-16 | |
| 8.G3 | WS8 | WS8-15 (embeddable card) | A written newsroom commitment by 2026-11-20 (default: not built) | WS8-16 | |
| 9.1 | WS9 | A paid paging service | A missed page that mattered, or a partner requires on-call | WS9-14 | |
| 9.2 | WS9 | Supabase point-in-time recovery | More than 500 accounts or subscribers, or a partner requires a recovery point | WS9-14 | |
| 9.3 | WS9 | A baseline migration that matches production | WS9-11b drift above 0 and W4 continue or partner | WS9-14 | |
| 9.4 | WS9 | The full account-transfer order (retired WS9-09) | WS8-16 picks a mode that moves accounts | WS9-14 | |
| 9.5 | WS9 | Moving the repo to a GitHub organization | A partner agreement or LOI | WS9-14 | |
| 9.6 | WS9 | A separate Supabase org | WS8-16 picks a mode that moves accounts | WS9-14 | |
| 9.7 | WS9 | A `.org` rebrand of the canonical host | A partner or funder requires `.org` as the primary host | WS9-14 | |
| 9.8 | WS9 | A transfer rehearsal with a second admin | A partner LOI (W5) | WS9-14 | |
| 9.9 | WS9 | A font-fallback guard test | WS6-17b keeps Adobe Fonts and a later CSS change removes the fallback | WS9-14 | |
| 9.10 | WS9 | A monthly cash ledger or cron reminder | A partner requires monthly cost reporting | WS9-14 | |
| 9.11 | WS9 | A roster invariant in source-health | WS9-13 finds a defect, or W4 continues toward the 2028 election | WS9-14 | |
| 9.12 | WS9 | A reader-report runbook | WS3-14 has not merged by FZ | WS9-14 | |
| 9.13 | WS9 | A `LEGISCAN_DISABLED` switch (the empty-key half is **not** deferred: WS4-02 builds it) | A WS9-06a stop that sends keyless requests, or the WS4-03a review | WS9-14 | |
