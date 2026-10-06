# WS7 — Retention loop & honest measurement

## Purpose

KYvKY has real reach but almost no return visits. About 2,400 human visitors came between June and early October, mostly from organic search, but Week-1 return is 1.4% and the digest reaches one person a month (T1–T4). The one behavior people repeat is "find my legislator" (T5). The market lesson is that civic tools survive on a weekly habit they own, such as a per-legislator email, not on one-off bill-page visits (C5, C2).

This workstream does two things, in this order:

1. **It makes the numbers honest and reproducible.** One written set of KPI definitions with bot and internal filtering, corrected funder figures, and a session measurement protocol committed **before** the 2027 session starts (T6–T10). The April decision's thresholds and verdict rules are **not** written here. They live only in `docs/evaluation/README.md` (WS8-08). WS7 defines how each number is measured and supplies the measured values.
2. **It runs one cheap retention bet.** A weekly "My Legislators" email keyed to a subscriber's House and Senate districts, built entirely from data already in the database. It needs zero extra LegiScan, Open States or LRC calls and no AI text (C5, O2). The bet has a hard cut line (2026-12-07). If it misses the cut line, it is deferred to W5 rather than built in FZ or W3.

**Owned findings:** T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, C5. Each is addressed by a WP below. Nothing owned is deferred outright. Items considered and dropped are listed in [Deferred](#deferred).

**Program class:** 15 of this file's 21 WPs are Core (WS7-01, WS7-03, WS7-06, WS7-07a, WS7-07b, WS7-08, WS7-09a, WS7-09b, WS7-09e, WS7-09c, WS7-09d, WS7-14, WS7-11, WS7-12, WS7-13: measurement, funder figures, the export fix, mail-log integrity and the signed-in weekly email); the other 6 (WS7-02a, WS7-02b, WS7-03b, WS7-05, WS7-09f, WS7-10) are Backlog. Definition-of-done items 1, 3–6 and 8 are met by Core WPs. Items 2 and 7 rely in part on Backlog WPs (WS7-02a/02b for the internal-traffic doc and flag, WS7-05 for digest and welcome link labels). If those are not picked up, WS7-13 reports those parts as "not done (Backlog)".

### Definition of done (checked by WS7-13 in W4; each item objectively checkable)

1. **One definition of every KPI.** `docs/metrics.md` exists and defines each KPI with a runnable query and stated caveats. Each KPI is marked **decision** or **context**. Every metric in `docs/evaluation/README.md` (WS8-08) maps to exactly one `docs/metrics.md` KPI ID, or names the other workstream that measures it (WS7-08's metric map).
2. **Bot and internal traffic are excluded the same way everywhere.** Every ledger query applies the exclusion rules in `docs/metrics.md`. `docs/analytics-internal-traffic.md` describes the real PostHog configuration and contains no personal address. After WS7-02b, the owner's browsers are excluded by the URL flag, not by email traits.
3. **A baseline and a ledger exist.** `docs/metrics.md` has ledger rows for Jun–Sep 2026 (baseline), Oct 2026 through Mar 2027, and the 2026-10-20 → 11-04 election period, each with its query date.
4. **The measurement plan was pre-registered.** WS7-08's protocol section and WS8-08's criteria were both merged to `main` before 2027-01-05. The evidence is the date of the **first** commit that introduced each section (`git log -S`, see WS7-08), not the file's latest commit. `docs/metrics.md` contains no decision thresholds.
5. **Funder figures match the ledger.** The WS7-03 checklist is complete before 2026-11-01, with every corrected Notion page listed.
6. **The retention bet ran, or its deferral is recorded.** Either (a) the My Legislators email was enabled on or before **2027-01-11** and sent in every W3 week in which a subscriber had activity, with sends, delivery states and email-attributed visits in the ledger; or (b) the 2026-12-07 cut line recorded "deferred to W5" in WS7-08's protocol, and WS8-08's "not measured (deferred)" rule applies to the email metrics.
7. **Email measurement respects the privacy page.** No open-tracking pixels and no per-recipient click tracking are on. Email content links carry campaign labels (WS7-05, WS7-09b). `ky_notifications_log` rows older than 365 days are deleted automatically, as `/privacy` promises (WS7-07b). `/api/me/export` returns 200 and includes committee follows (WS7-07a).
8. **Net process does not grow beyond what is stated.** WS7 adds no schedule, no vendor and no dashboard. It adds at most one email product (two in total during W3), and WS8-08 carries a W4 consolidation rule that leaves one email product after W5 or records why two remain. It adds at most one env var (`MY_LEGISLATORS_SEND`). Each WS7 PR states its net added non-test lines under `src/`, and WS7-13 totals them.

### Interfaces with other workstreams

| This WS needs or changes | Other side | Note |
|---|---|---|
| WS7-08 metric map, WS7-13 measured values | C7, O3, O4 (WS8-08 criteria, WS8-16 decision) | **WS8-08 owns all thresholds and verdict rules**, in `docs/evaluation/README.md` only. WS7-08 supplies the KPI definitions and query names for every WS8-08 metric and must merge by 2026-12-07 so WS8-08 can merge by its 2026-12-14 deadline. WS8-08 depends on WS7-08, cites the KPI IDs, gates on KPI-3 only and adopts WS7-08's email consolidation rule. WS7-13 fills the measured values and hands them to WS8-16 by 2027-04-15; WS8-16 takes them as the source for every WS7-measured metric. |
| WS7-14 election-period readout | O3 (WS8-10 partner brief, WS8-11 conversations) | WS8-10 (W2 refresh) and WS8-11's materials cite WS7-14's dated "Citable figures" rows (filtered) instead of raw T1/T2, rather than running their own queries. |
| WS7-09a district-keyed subscription | U10 (WS6-12a email link; WS6-13 retired) | One subscription model: district numbers. WS6 has retired WS6-13 (legislator follows) to its Deferred list. WS6-12a defines the `weekly:<house>-<senate>` intent, and WS7-09f (the signed-out path) consumes it. WS7-09d is the signed-in opt-in only. |
| WS7-09f signed-out path | U10, C5 (WS6-12a step 5) | If WS6-12a merges after WS7-09d, WS6-12a renders `EmailLinkForm` on the lookup result itself, and WS7-09f only adds the intent consumer and the `SignupCta` body. If WS6-12a merges first, WS7-09f does both. WS7-09f never auto-subscribes. It preselects and focuses the opt-in button, as WS6-12a specifies. |
| WS7-10 saved-districts store | T5 (WS6-18 "how members voted") | **WS7-10 owns** `src/lib/saved-districts.ts`, the key `kyv:myDistricts`, and the only write path (an explicit `Remember` button). WS6-18 reads through `readSavedDistricts()` and never writes. WS6-10 keeps WS7-10's home card under the hero. |
| WS7-09b labels votes in the weekly email | U1 (WS3-01 `src/lib/roll-call-label.ts`, WS3-02 `buildMemberRollVotes`) | The email must not repeat the mislabelled member votes. WS7-09b and WS7-09e use WS3-01's labels as merged. |
| WS7-09d, WS7-09f, WS7-10 act after a lookup | U6 (WS3-05a ZIP notice and lookup type), U7 (WS6-01) | WS3-05a lists no candidate districts. WS7 treats **every** ZIP lookup (`lastLookupType === 'zip'`, WS3-05a's state in `DistrictMapExplorer.tsx`) as unresolved and offers "email me" or "remember" only after an address or map-click result. Whichever merges second rebases on `DistrictMapExplorer.tsx`. |
| WS7-09f replaces the map `SignupCta` body | WS6-02 step 4 | WS6-02's copy is interim. WS7-09f replaces the same `body` in W2. |
| WS7-02b, WS7-05, WS7-09a, WS7-09d, WS7-10 add data flows | S10 (WS2-09a person traits, WS2-09b `/privacy` rewrite) | Each WP adds its own one-line disclosure to `/privacy`. If WS2-09b is open, coordinate in the PR so WS2-09b carries the line. Session recording is WS2-09b's owner action (see Findings re-checked); WS7 does not answer it. |
| WS7-07a owns `/api/me/export` | S10 (WS6's former WS6-13 export step) | WS7-07a adds committee follows. No other WP edits the export route in W0–W2 except WS7-07b, which adds `kind`. |
| WS7-07b, WS7-05 edit `run-bill-digest-cron.tsx` | E7 (WS1-12 compliance test, WS1-13 caption fix; WS1-13a deferred) | WS7 does not refactor the digest. WS1-13a (digest extraction) is deferred in WS1, so WS7-09 extracts and tests its own pure functions. WS1-13 merges after WS7-07b if WS7-07b is open. WS1-12's text check on the digest file is unaffected by `withEmailCampaign`. |
| WS7-09b adds `MyLegislatorsEmail` | WS1-12 template-coverage invariant | WS1-12's invariant requires every `*Email` template in the compliance test. WS7-09b adds it there, or into its own test file if WS1-12 has not merged (WS1-12 then picks it up). |
| WS7-09c adds a send path and one env var | E2 (WS4-11 registry), E11 (WS2-02 bearer helper), E1 (WS5-15 ceilings, WS9-07 env catalog), D4 (WS4 defers the Resend counter to WS7) | No new cron. WS7-09c adds a note to the WS4-11 registry row for `/api/cron/notify` if the registry exists. It does not touch the route's auth block (WS2-02). It adds `MY_LEGISLATORS_SEND` to WS9-07's catalog if it exists, and satisfies WS5-15's "one in, one out" rule in the PR. |
| WS7-09c kill switch | WS9-06b email section | WS9-06b's email "Stop" step also unsets `MY_LEGISLATORS_SEND` and redeploys, once WS7-09c has merged. |
| WS7-09c stop rule | WS9-10 session runbook (weekly checks) | WS9-10's weekly check includes "My Legislators complaints this week (Resend dashboard or the KPI-7 SQL)". WS7-12 reports the numbers monthly. |
| WS7-09e roster at send time | WS9-13 (roster after the January seating) | The email resolves the current member per district at send time. WS9-13 verifies the roster after seating. |
| WS7-13 measured values | E13 (WS5-13 maintenance hours), WS6-20 (product review) | WS5-13's hours and WS4-16's costs are WS8-08 inputs measured by those workstreams. WS6-20 reads WS7-12 and WS7-13. |

### Out of scope

- A legislator-follow feature, a signup-funnel redesign, a homepage redesign and a member-profile redesign (WS6).
- Changing the bill digest's selection logic or copy, except the `kind` filter (WS7-07b) and link labels (WS7-05). The caption fix is WS1-13.
- Open tracking, tracking pixels, per-recipient click tracking, or a new email vendor.
- Decision thresholds and verdict rules (WS8-08), the partner package and outreach (WS8).
- New dashboards, notebooks, a second analytics vendor, a session-replay policy (WS2-09b), or consent tooling.
- AI-written text in any email. The voice guide says digest emails carry no AI summaries.
- Push notifications, SMS, native apps, a second state.

---

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS7-01 | Define the KPIs once, record a filtered baseline, and close the Tier-1 handoff | P0 | W0 | Sonnet | M | none | Core |
| WS7-02a | Correct the internal-traffic doc | P1 | W0 | Sonnet | S | none | Backlog |
| WS7-02b | Add a URL flag that turns analytics off in the owner's browsers | P2 | W2 | Sonnet | S | WS7-02a | Backlog |
| WS7-03 | Correct funder-facing figures before the NLnet deadline | P0 | W0 | Owner | S | WS7-01 | Core |
| WS7-03b | Correct the launch month on /about | P1 | W1 | Sonnet | S | WS7-03 | Backlog |
| WS7-05 | Label email links by campaign instead of tracking opens | P2 | W2 | Sonnet | S | none | Backlog |
| WS7-06 | Stop the underpowered PMF survey and close the intent survey | P2 | W0 | Owner | S | none | Core |
| WS7-07a | Fix the account data export | P0 | W0 | Sonnet | S | none | Core |
| WS7-07b | Separate email kinds, record complaints, and trim the mail log | P1 | W2 | Opus | M | WS7-07a | Core |
| WS7-08 | Map every April decision metric to one KPI and write the measurement protocol | P1 | W2 | Sonnet | S | WS7-01 | Core |
| WS7-09a | Store a subscriber's districts and weekly opt-in | P1 | W2 | Opus | M | none | Core |
| WS7-09b | Build the My Legislators email from a pure builder and template | P1 | W2 | Opus | M | WS3-01, WS3-02 (soft: WS1-12) | Core |
| WS7-09e | Load the email's input in one pass per run | P1 | W2 | Opus | M | WS7-09b, WS3-02 | Core |
| WS7-09c | Send the weekly email from the notify cron under a daily send budget | P1 | W2 | Opus | M | WS7-09a, WS7-09e, WS7-07b | Core |
| WS7-09d | Offer the weekly email to signed-in visitors after a lookup and in preferences | P1 | W2 | Sonnet | M | WS7-09a, WS3-05a | Core |
| WS7-09f | Let signed-out visitors start the weekly email from an email link | P1 | W2 | Sonnet | S | WS7-09d, WS6-12a | Backlog |
| WS7-10 | Remember my legislators on this device and show them on the home page | P2 | W2 | Sonnet | M | WS3-05a | Backlog |
| WS7-14 | Record the October and election-period readout for the partner brief | P1 | W2 | Sonnet | S | WS7-01, WS7-06 | Core |
| WS7-11 | Run the pre-session measurement and email readiness drill | P1 | FZ | Sonnet | S | WS7-01, WS7-07b, WS7-08, WS7-14; WS7-09c and WS7-09d if shipped | Core |
| WS7-12 | Record the in-session monthly readouts | P1 | W3 | Sonnet | S | WS7-11 | Core |
| WS7-13 | Fill measured values for the April decision | P1 | W4 | Sonnet | S | WS7-12, WS8-08 | Core |

**Retired IDs.** WS7-04 (folded into WS7-01 step 10), WS7-02 and WS7-07 (split into `a`/`b`) are not reused; the full map is in `TRACKER.md`. WS7-09e (data loader) and WS7-09f (signed-out path) are lettered after `d`, so WS7-09c is the send path and WS7-09d the signed-in opt-in.

**Execution notes.**

- **W0 (to 2026-10-20) is measurement and two P0 fixes.** Core: WS7-01, WS7-06 (owner clicks), WS7-07a and WS7-03 (owner pass before NLnet on 11-03). WS7-07a is P0 and may merge up to 2026-10-30, or during the election freeze. WS7-02a (Backlog) follows only with an owner go-ahead.
- **W1 has at most one tiny PR.** WS7-03b (Backlog) merges by **2026-10-30**, and only if the verified launch month is not February. WS9-03's election freeze runs 2026-10-31 → 11-05 and allows P0 fixes only. Nothing else from WS7 opens in W1.
- **W2 starts 2026-11-06.** WS7-14 first (due **2026-11-10**). The email chain is WS7-07b and WS7-09a and WS7-09b in parallel → WS7-09e → WS7-09c. WS7-09d starts after WS7-09a. Backlog, after the Core chain and with an owner go-ahead: WS7-09f (after WS7-09d and WS6-12a), WS7-05, WS7-02b and WS7-10. WS7-08 merges by **2026-12-07**.
- **Cut line, Monday 2026-12-07.** If WS7-09c **and** WS7-09d are not both merged by then, the weekly email is deferred to W5: open PRs in the chain are closed unmerged, nothing in the chain merges in FZ or W3, WS7-08 records "deferred to W5", and WS7-11 skips its email steps. If WS7-09c and WS7-09d merged but WS7-09f did not, the email ships for signed-in visitors only, and WS7-08 records that limitation (it affects how KPI-6 subscribers can be read in W4).
- **FZ is the WS7-11 drill only. W3 is WS7-12 readouts, and fixes follow the manual's W3 small-fix rule. W4 is WS7-13.**

---

## Work packages

### WS7-01 · Define the KPIs once, record a filtered baseline, and close the Tier-1 handoff

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | M | none | T1, T2, T4, T5, T6, T7, T8, T10, C5, E12 |

- **Program class:** Core
- **Owner decision:** which number is the headline reach figure for funders and partners.
  - **Options:**
    - (a) **KY human visitors**: unique people geolocated to Kentucky, after test-account and bot exclusions
    - (b) all human visitors after exclusions
    - (c) both, always side by side
  - **Recommended:** (c), with (a) listed first. (a) is the honest civic-reach number. Geolocation also removes most automation and foreign spikes, such as the 111 Polish visitors in July (T1, T6). (b) is larger and inflates easily.
  - **Default:** (c) if the owner has not answered by **2026-10-13**.
- **Data-limit impact:**
  - None against LegiScan, Open States, LRC or Anthropic.
  - PostHog: read-only aggregate HogQL queries through the PostHog MCP, if the agent session has it. They do not count against the event quota.
  - Supabase: **Owner-only.** The agent writes the KPI-6/KPI-7 SQL and marks those ledger cells "Owner to run". The agent does not run SQL against production tables, even with a Supabase MCP connected.
- **Ongoing cost:** about 1 h/month in W3 to add one ledger row (WS7-12). It **replaces** ad-hoc PostHog digging and the Tier-1 handoff's 7 planned insights, and it closes 4 open backlog items. It adds no schedule, no vendor and no dashboard.
- **Why:** Every number in T1–T5 had to be rebuilt by hand by the traction audit, because the filters on PostHog's tiles miss bots (T6) and PostHog is the only analytics source (T10). Funders, partners and the April decision need one definition, one exclusion rule and one reproducible query per KPI (O4). C5's habit thesis can only be tested if return visits are measured the same way before and during the session (T7). The Tier-1 handoff still lists tasks that would add events and insights the KPIs make unnecessary (E12).
- **Current state (verified 2026-10-06):**
  - **PostHog project 450281** and **dashboard 1656654** are confirmed by `docs/handoff-tier1-analytics-driven-2026-09-15.md` lines ~14–18. The following were read in PostHog by the spec author and are **[verify: PostHog UI/MCP, read 2026-10-06 by spec author]** before relying on them:
    - The default test-account filter is cohort 339637 "Internal / Test users" (`not_in`) plus `$current_url not_icontains vercel.app`, with `test_account_filters_default_checked: true`.
    - Cohort 339637 is: person property `$internal_or_test_user = true`, OR has viewed a page whose URL contains `vercel.app` in the last 30 days. It matched 2 persons.
    - Bot signature: `$pageview` on `/auth/login` with `$referring_domain = '$direct'`, 2026-09-01 → 10-06, about 205 persons, each with exactly 1 pageview, almost all "Chrome", US share mostly Linux from cloud regions, about 4 from a search engine.
    - Autocapture recorded 39 outbound clicks from 30 persons on `/members/%`, 2026-09-01 → 10-06.
  - **Client** (`instrumentation-client.ts` ~lines 22–55): `posthog-js` 1.396.9, initialised only outside Vercel previews, with `person_profiles: "always"`, `autocapture: true`, `capture_pageview: false`. Pageviews come from `src/app/components/PostHogPageviewTracker.tsx`.
    - `posthog-js` already drops events from browsers with `navigator.webdriver` set and from known bot user agents (`node_modules/posthog-js/lib/src/utils/blocked-uas.js` `isLikelyBot`; `opt_out_useragent_filter` defaults to false). `save_campaign_params` defaults to true, so `utm_*` properties are captured.
  - **Events** (`src/lib/analytics.ts`): `district_map_lookup` (`trackDistrictMapLookup` ~199, with `matched`, `lookup_type`, districts; WS2-09a removes `zip`), `search_performed`, `bill_followed`, `committee_followed`, `user_registered`, `signup_cta_clicked`, `topic_filter_used`.
  - **No `docs/metrics.md` exists.** KPI wording lives in Notion (T9) and in PostHog tile names.
  - **Supabase tables for counts:** `ky_user_profiles` (`email_verified_at`), `ky_bill_follows`, `ky_committee_follows`, `ky_notification_preferences` (`digest_frequency`, `unsubscribed_all_at`, `suppressed_at`), `ky_notifications_log` (`delivery_status`, `sent_at`).
  - **Tier-1 handoff** (`docs/handoff-tier1-analytics-driven-2026-09-15.md`, `TASKS.md` line ~17):
    - Task 1 (`source` on `search_performed`) shipped in PR #268 (`trackSearchPerformed` ~80 has `source`). Its two-week split validation is not done.
    - Task 2 (`outbound_link_clicked`) is not started (`grep -rn outbound_link_clicked src` prints nothing). Autocapture already records these clicks.
    - Task 3 (per-member votes) is implemented by WS6-18.
    - Task 4 (social handles) is not started and needs a manual load for about 138 members.
    - Task 5 (homepage live feed) is superseded by WS6-10 and WS7-10 (WS6 Deferred).
  - `TASKS.md` may be frozen by WS5-03a (merge by 10-20) when this runs.
- **Do:**
  1. Create `docs/metrics.md` (≤ 250 lines) with these sections: **Definitions**, **Exclusions**, **Queries**, **Caveats**, **Ledger**, **Citable figures**.
  2. **Exclusions.** Write these rules once. Every PostHog query applies all three:
     - **E-test:** the project's test-account filter (cohort 339637, and URL not containing `vercel.app`). In HogQL, exclude cohort members with the cohort operator HogQL supports [verify the exact syntax, for example `person_id NOT IN COHORT 339637`, with PostHog docs search before relying on it].
     - **E-auth-bot:** exclude any person whose pageviews in the period are all on paths starting `/auth/`, number at most 2, and all have `$referring_domain = '$direct'`. Cite the evidence above.
     - **E-internal:** exclude persons or events carrying WS7-02b's internal marker, once WS7-02b merges. Before that, write "n/a (pre-WS7-02b)".
  3. **Definitions.** Define each KPI in one sentence with its unit, period, query name and a **decision** or **context** tag. Decision KPIs get ledger columns; context KPIs get a query and are run on demand.
     - **KPI-1 KY human visitors (decision):** unique persons with ≥ 1 `$pageview` where `$geoip_country_code = 'US'` and `$geoip_subdivision_1_code = 'KY'`, after exclusions. Reported per calendar month (UTC) and per ISO week (Monday–Sunday UTC). The **in-session weekly median** is WS8-08's reach metric.
     - **KPI-2 Human visitors (context):** KPI-1 without the Kentucky condition.
     - **KPI-3 Week-1 return (decision):** among KPI-1 persons whose first pageview since 2026-06-01 falls in ISO week W, the share with ≥ 1 `$pageview` in ISO week W+1, after exclusions. This is the gating return metric (WS8-08). Also record PostHog's built-in weekly retention (first-time `$pageview` → `$pageview`, test accounts filtered) once per ledger row as "PostHog retention (no E-auth-bot)", for continuity with T2's 1.4%.
     - **KPI-4 30-day return (context):** among KPI-1 persons whose first pageview falls in month M, the share with a pageview on a different UTC day within 30 days of the first day. Reported, never gating. It is the Strategy page's KPI (T9).
     - **KPI-5 Lookup rate (decision):** the share of KPI-1 persons with ≥ 1 `district_map_lookup` where `matched = true`.
     - **KPI-6 Accounts and subscribers (decision; Supabase, Owner-run, aggregate counts only):** accounts; verified accounts; accounts with ≥ 1 bill or committee follow; accounts with the digest on (`digest_frequency <> 'off'`, not unsubscribed, not suppressed); after WS7-09a, My Legislators subscribers (`my_legislators_weekly`, not unsubscribed, not suppressed, verified).
     - **KPI-7 Email (decision; Supabase part Owner-run):** sends per month by `delivery_status` (and by `kind` after WS7-07b), unique recipients per month by `kind`, `bounced` and `complained` counts; plus **email-attributed visitors**: unique persons with a `$pageview` where `utm_medium = 'email'`, by `utm_campaign` (after WS7-05 or WS7-09b).
     - **KPI-8 Acquisition mix (context):** the share of KPI-1 persons by first-touch `$referring_domain`, grouped as search (Bing, Google, DuckDuckGo, Yahoo, Ecosia, Brave and any other search domain seen), direct, social, partner and other. **Partner** means `utm_medium = 'partner'`. Document the partner-link convention `?utm_source=<partner-slug>&utm_medium=partner&utm_campaign=<placement>` and add an empty "partner slugs" list (T4).
     - **KPI-9 Weekly-email opt-in source (decision input for WS8-08 partner signals):** count of `my_legislators_opt_in` events with `action = 'on'`, grouped by the person's first-touch medium: `partner` (initial `utm_medium = 'partner'`), `search` (initial referring domain in the KPI-8 search group), `direct`, `email`, `other`. Use PostHog's initial-campaign person properties [verify the names, for example `$initial_utm_medium` and `$initial_referring_domain`, in the project's property definitions]. Write the query now and mark the ledger cell "n/a (pre-WS7-09d)". It needs no code beyond WS7-09d's event.
  4. **Queries.** For each KPI, put one HogQL block (or one SQL block for the Supabase parts of KPI-6/7) under `### KPI-n` in Queries, with the period as an obvious literal to edit. Start from this skeleton for KPI-1 and adapt it after testing:

     ```sql
     -- KPI-1: KY human visitors, one month (edit both dates)
     SELECT uniq(person_id)
     FROM events
     WHERE event = '$pageview'
       AND timestamp >= toDateTime('2026-09-01') AND timestamp < toDateTime('2026-10-01')
       AND properties.$geoip_country_code = 'US'
       AND properties.$geoip_subdivision_1_code = 'KY'
       AND NOT (properties.$current_url ILIKE '%vercel.app%')
       AND person_id NOT IN (                       -- E-auth-bot
         SELECT person_id FROM events
         WHERE event = '$pageview'
           AND timestamp >= toDateTime('2026-09-01') AND timestamp < toDateTime('2026-10-01')
         GROUP BY person_id
         HAVING countIf(NOT (properties.$pathname LIKE '/auth/%')) = 0
            AND count() <= 2
            AND countIf(properties.$referring_domain != '$direct') = 0)
       -- E-test: add the cohort exclusion here [verify syntax]
     ```
  5. **Two handoff queries** (answering Tasks 1 and 2 from existing data, no new events):
     - `search_performed` split by `source` for any two-week window.
     - Outbound links on profiles: `$autocapture` on `/members/%` with an external `elements_chain_href`, grouped by host.
  6. **Caveats.** Write them plainly:
     - Identity is per browser, so returns on another device or after cleared storage count as new people.
     - Safari limits script-set storage for sites not visited in 7 days [verify current WebKit policy], so KPI-3 and KPI-4 undercount iPhone returns.
     - Geolocation is approximate. Mobile carriers and VPNs can place Kentuckians elsewhere.
     - The 2026 session (Jan–Apr) was never measured because PostHog starts on 2026-06-01 (T7). There is no session baseline.
     - PostHog is the only analytics source (T10). This file's ledger is the durable record if the vendor changes.
     - No PMF score is reported (WS7-06).
  7. **Run the queries** if the session has PostHog MCP read access (read-only SQL and retention queries, aggregates only). Fill **Ledger** rows for Jun, Jul, Aug and Sep 2026 and Oct 1–6. Columns: period, KPI-1 (month), KPI-1 (weekly median), KPI-3, PostHog retention (no E-auth-bot), KPI-5, KPI-6 ("Owner to run"), KPI-7 ("Owner to run"), KPI-9 ("n/a"), query date. If the agent has no PostHog access, leave the cells marked "Owner to run" with the query name.
  8. **Reconcile with T1/T2.** If the KPI-2 Jun–Sep total is not within about ±15% of T1's 2,394–2,396, or the PostHog retention value is not within about ±1 pp of T2's 1.4%, explain the difference in the PR (different exclusion or window). Do not tune the rules to match.
  9. **Citable figures.** Add up to 6 rows ("as of" date, figure, exact wording allowed, KPI and query): KY human visitors Jun–Sep, human visitors Jun–Sep, accounts (Owner to fill), lookup rate, week-1 return, and the top acquisition source. WS7-03 uses this table.
  10. **Close the Tier-1 handoff** (formerly WS7-04). Insert a "Status (WS7-01, <date>)" table at the top of `docs/handoff-tier1-analytics-driven-2026-09-15.md`:

      | Task | Disposition | Where it lives now |
      |---|---|---|
      | 1 | **Done** (PR #268). Validation is the `search_performed` split query. | `docs/metrics.md` |
      | 2 | **Superseded:** answered from autocapture, no new event. | `docs/metrics.md` outbound-link query |
      | 3 | **Implemented by WS6-18** (uses WS3-01's labels). | WS6 |
      | 4 | **Dropped** (see WS7 Deferred). | none |
      | 5 | **Superseded** by WS6-10 (calendar-aware home) and WS7-10 (saved legislators card). | WS6, WS7 |
      | PMF survey | **Stopped** (WS7-06). | WS7-06 |

      Mark the "Ground rules" filter list (`email not_icontains …`) as superseded by `docs/metrics.md` Exclusions. Do not delete history.
  11. **TASKS.md.** If WS5-03a has not frozen it, append "→ dispositioned by WS7 (see docs/program-spec/07 'TASKS.md reconciliation')" to the items at lines ~17, ~23, ~401, ~421 and ~635. If it is frozen, edit nothing and paste the dispositions from this file's [TASKS.md reconciliation](#tasksmd-reconciliation) section into the PR body so WS5-03b's `CURRENT.md` mapping picks them up.
- **Don't:**
  - Create, edit or delete PostHog insights, dashboards, cohorts, surveys or settings (Owner).
  - Read or paste row-level personal data (persons, emails, distinct IDs). Query aggregates only.
  - Run SQL against production Supabase.
  - Add events or change app code.
  - Change the test-account filter.
  - Put decision thresholds in `docs/metrics.md` (WS8-08 owns them).
  - Implement any handoff task or delete the handoff file.
- **Acceptance criteria:**
  - [ ] `docs/metrics.md` exists, is ≤ 250 lines, and has the six sections.
  - [ ] KPI-1 to KPI-9 each have a definition, a decision/context tag, a query, and at least one caveat or a pointer to the shared caveats.
  - [ ] E-test, E-auth-bot and E-internal are each written once, and every PostHog query includes them (or says "n/a" for E-internal).
  - [ ] Ledger rows for Jun–Sep 2026 and Oct 1–6 exist, and each blank cell says "Owner to run" or "n/a" with the query name.
  - [ ] The reconciliation with T1 and T2 is stated in the PR.
  - [ ] The handoff doc starts with the status table, and every row has a disposition.
  - [ ] No personal data appears in the doc or the PR. Check: `grep -nE "@|distinct_id" docs/metrics.md` shows only the `utm_` convention text, if anything.
  - [ ] Either `TASKS.md` lines ~17, ~23, ~401, ~421 and ~635 carry the disposition pointer, or `git diff --stat` shows no `TASKS.md` change and the PR body lists the dispositions.
- **Verify:**
  - Plain container: `npm run lint` and `npm test` stay green (docs-only change).
  - Needs PostHog read access, agent or owner: run each decision-KPI query once and paste the result into its ledger cell.
  - Needs production read (Owner): run the KPI-6/KPI-7 SQL counts in the Supabase SQL editor (SELECT only).
- **Owner actions:**
  - [ ] Answer the headline decision by 2026-10-13.
  - [ ] If the agent had no PostHog access, run each query in PostHog → SQL and paste the results into the ledger in the PR.
  - [ ] Run the KPI-6/KPI-7 Supabase counts (SELECT only) and fill those cells, and the accounts row in Citable figures.
  - [ ] Optional: on dashboard 1656654, delete tiles whose definitions now conflict with `docs/metrics.md`, and save at most the KPI-1, KPI-3 and KPI-5 queries as insights there. Do not create a new dashboard.
  - [ ] Veto any handoff disposition in review.
- **Rollback:** revert the PR. Nothing reads these files programmatically.

---

### WS7-02a · Correct the internal-traffic doc

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | T10, T6, S10 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** removes upkeep. The current doc describes a filter method that is not in use and will stop working once WS2-09a removes email from PostHog person traits.
- **Why:** `docs/analytics-internal-traffic.md` in this **public** repo names a personal address and tells the owner to filter internal users by email, while the project actually filters by cohort 339637 and a `vercel.app` rule (T10). An agent following it would build the wrong filter, and the address should not be in a public file.
- **Current state (verified 2026-10-06):**
  - `docs/analytics-internal-traffic.md` "What must be configured in the PostHog UI" item 1 says to filter by `email` and names a personal address. Item 4 says to turn on "Filter out bots".
  - The actual filter is cohort 339637 plus `vercel.app` (see WS7-01 Current state, [verify]).
  - `instrumentation-client.ts` ~lines 17–22 skip PostHog on Vercel previews and in development unless `posthogInDev`.
  - `posthog-js` 1.396.9 already filters `navigator.webdriver` and known bot user agents.
- **Do:**
  1. Rewrite `docs/analytics-internal-traffic.md` (≤ 60 lines) with four sections:
     - **What the code does:** previews and development are not captured; built-in bot filtering by `posthog-js`.
     - **What PostHog is configured to do:** cohort 339637's definition and the `vercel.app` rule, marked "read 2026-10-06 [verify before relying on it]".
     - **What is not excluded today:** the owner's own browsing on `www.kyvky.com`, unless the browser also visited a `vercel.app` URL in the last 30 days. State that WS7-02b adds a URL flag, and that E-internal in `docs/metrics.md` stays "n/a" until then.
     - **Where residual bots are handled:** E-auth-bot in `docs/metrics.md`.
  2. Remove the email-filter instructions and the personal address. Removing the address from git history is out of scope here (WS2-05 handles the similar `FEEDBACK.md` case as an owner decision).
- **Don't:** change code, PostHog settings or cohorts.
- **Acceptance criteria:**
  - [ ] `grep -niE "@[a-z0-9.-]+\.(com|org|net)|email → does not contain" docs/analytics-internal-traffic.md` prints nothing.
  - [ ] The doc is ≤ 60 lines and has the four sections.
- **Verify:** plain container: `npm run lint`, `npm test` (docs only).
- **Owner actions:** none.
- **Rollback:** revert the PR.

---

### WS7-02b · Add a URL flag that turns analytics off in the owner's browsers

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS7-02a | T10, T6 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** how a browser the owner flags as internal is handled.
  - **Options:**
    - (a) **stop capturing** in that browser (`posthog.opt_out_capturing()`), so no cohort upkeep is needed
    - (b) keep capturing, but tag the person with `kyvky_internal: true` and add that property to cohort 339637
  - **Recommended:** (a). It needs no upkeep (T10), and the owner can still test events by visiting `?kyvky_internal=0`, checking, and flagging back on.
  - **Default:** (a) if the owner has not answered by **2026-11-16**.
- **Data-limit impact:** none.
- **Ongoing cost:** removes upkeep: one URL the owner opens once per browser and device. Cohort 339637 matches only 2 persons, so the traffic removed is small; this is why the code is P2.
- **Why:** The owner's signed-out browsing on phones and other devices is not reliably excluded (T10). A first-party flag is the only exclusion that needs no email traits (WS2-09a removes them).
- **Current state (verified 2026-10-06):**
  - `instrumentation-client.ts` ~line 22: `if (posthogKey && !isPreviewDeploy && (…))` wraps `posthog.init(...)` (~23–55), immediately followed by `recordChunkReloadOutcome((name) => posthog.capture(name))` (~58).
  - `posthog-js` 1.396.9 persists the opt-out flag itself: its defaults include `opt_out_capturing_persistence_type: 'localStorage'` (`node_modules/posthog-js/lib/src/posthog-core.js` ~172).
  - `src/lib/analytics.ts` `resetIdentity` (~321) is called on logout.
- **Do:**
  1. Create `src/lib/internal-traffic.ts` with no React import. Export `readInternalFlagFromUrl(search: string): 'on' | 'off' | null`, reading `kyvky_internal=1` or `kyvky_internal=0` (anything else → `null`).
  2. In `instrumentation-client.ts`, **inside** the `if (posthogKey …)` block, immediately after `posthog.init(...)` and **before** `recordChunkReloadOutcome`:
     - under (a): flag `on` → `posthog.opt_out_capturing()`; flag `off` → `posthog.opt_in_capturing()`. Write no other storage key, because `posthog-js` persists its own opt-out flag.
     - under (b): flag `on` → `posthog.register({ kyvky_internal: true })` and `posthog.setPersonProperties({ kyvky_internal: true })`, and persist `kyv:internal = '1'` in `localStorage` (try/catch) so `register` is re-applied on every load; flag `off` → remove the key and `posthog.unregister('kyvky_internal')`.
     - Do not strip the parameter from the URL.
  3. [verify] whether `posthog.reset()` (called by `resetIdentity`) clears the opt-out flag in 1.396.9. If it does, under (a) also persist `kyv:internal` and re-apply `opt_out_capturing()` after init. Say in a code comment that the duplication is deliberate so the flag survives a reset.
  4. Add `src/lib/internal-traffic.test.ts` covering `1`, `0`, absent, garbage and a repeated parameter.
  5. Update `docs/analytics-internal-traffic.md` "What is not excluded today" to describe the flag, and set E-internal in `docs/metrics.md` to the rule for the chosen option ((a): "opted-out browsers send nothing"; (b): "exclude `kyvky_internal = true`").
  6. Add one row to `/privacy` "What we collect", or hand the line to WS2-09b if it is open: `The site remembers an on-device setting that turns analytics off in browsers used to maintain it.` Follow the voice guide: no em dashes, no semicolons.
- **Don't:** change the PostHog project's filter or cohorts (Owner); add a UI toggle; block bots in app code; change `person_profiles`.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 5 new tests in `src/lib/internal-traffic.test.ts`.
  - [ ] In `instrumentation-client.ts`, the flag handling is between `posthog.init(` and `recordChunkReloadOutcome(` (code review).
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. The network check needs PostHog initialised, which previews skip, so it is the owner's on production after deploy.
- **Owner actions:**
  - [ ] After deploy, open `https://www.kyvky.com/?kyvky_internal=1` on every browser and device you use, including phones. Confirm in the browser's network panel (desktop) that no requests go to the PostHog host on the next page.
  - [ ] Under (b) only: add `kyvky_internal = true` as an OR condition on cohort 339637.
- **Rollback:** revert the PR. Flagged browsers stay opted out, because `posthog-js` keeps its own opt-out flag in `localStorage`. Visit `?kyvky_internal=0` **before** reverting (it calls `opt_in_capturing()`), or clear site data afterwards. Note this in the PR.

---

### WS7-03 · Correct funder-facing figures before the NLnet deadline

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Owner | S | WS7-01 | T9, T3, T1, T2, D1 |

- **Program class:** Core
- **Owner decision:**
  1. **The ask.** One figure ($89k vs $86,873 vs about $88,470). **Decide by 2026-10-20.** There is no default figure, because only the owner knows the budget. Only the ask line is blocked, not the rest of this WP.
     - **If unanswered on 2026-10-20, split the work.** Every other figure correction in step 2 ships as planned. Every ask line (Notion pages and the NLnet draft) stays **unchanged**, and the NLnet draft gets a visible flag next to it: `ASK NOT FINAL: owner sets one figure before submitting`. The owner sets one figure everywhere, removes the flag, and records it in the checklist **before submitting to NLnet** (deadline 2026-11-03). An assisting agent never picks or edits the ask figure.
  2. **The retention narrative rule.** The Notion rule "never lead with retention" conflicts with the Strategy page's top KPI, the 30-day return rate.
     - **Options:**
       - (a) keep the rule and demote the KPI
       - (b) drop the rule and present retention honestly as the hypothesis the 2027 session tests, citing week-1 return (KPI-3) and noting 30-day return (KPI-4) as context
     - **Recommended:** (b). Funders such as NLnet and partners such as Digital Democracy will ask, and a pre-registered test is a strength (O4).
     - **Default:** (b) by **2026-10-20**.
- **Data-limit impact:** none.
- **Ongoing cost:** none after the pass. Future figures are copied from `docs/metrics.md` "Citable figures", never computed ad hoc.
- **Why:** Funder documents disagree with each other and with the data. They show 9 vs 16 accounts and three different asks. "Live since February 2026" conflicts with a Supabase project created 2026-03-09. The LegiScan budget line rests on a superseded "97% of cap" reading (T9). NLnet closes on 2026-11-03 (appendix A, key dates).
- **Current state (verified 2026-10-06):**
  - The Notion pages are not in the repo. `TASKS.md` line ~36 ("Correct the 97% figure everywhere it is load-bearing") names **Budget — 3-Year**, **Strategy**, **Wishlist & Roadmap** and **kyv-strategy**. The **NLnet draft** comes from T9 and the appendix key-dates table, not from `TASKS.md`.
  - `src/app/about/page.tsx` line ~52 says "since February 2026".
  - LegiScan's free Public API cap is now 10,000/month, and the $1,000/yr tier gives 30,000 (D1). Measured usage: Aug 1,165, Sep 947.
- **Do (owner, with an optional agent assist):**
  1. Copy WS7-01's "Citable figures" table into a scratch note.
  2. Walk each Notion page above and the NLnet draft. For each figure, keep it, replace it with the citable figure and its "as of" date, or delete it. Cover at least:
     - **accounts:** KPI-6
     - **visitors:** KPI-1/KPI-2 with the "human" qualifier, never raw PostHog totals
     - **return rate:** KPI-3 (and KPI-4 as context)
     - **digest reach:** recipients per month from KPI-7, not "subscribers"
     - **LegiScan:** the free cap is 10k/month; quote measured monthly use; remove "97%" and "at the ceiling". 30,000 may appear only as the paid tier's cap.
     - **the ask:** one number everywhere, once decision 1 is answered. If it is still open, leave every ask line unchanged and flag it in the NLnet draft as described under Owner decision 1. Do not hold the other corrections for it.
     - **launch date:** check the first production deploy date (Vercel → Deployments, oldest) and the domain's first live date. Record the verified month in the checklist. WS7-03b changes `/about` if it differs from February.
  3. Record the pass as a dated checklist in the issue or PR that closes this WP. List each page, the figures changed, and "verified against docs/metrics.md @ <commit>". Do not paste figures that are not in `docs/metrics.md`.
- **Don't:** put Notion content, budget detail or personal data in the repo.
- **Acceptance criteria:**
  - [ ] The owner records a checklist naming every page above as reviewed, dated on or before **2026-11-01**.
  - [ ] Every reach or retention figure in the NLnet submission appears in `docs/metrics.md` "Citable figures" with the same wording.
  - [ ] No funder page cites "97%" or "at the ceiling" for LegiScan, and none cites 30,000 as the current **free** cap.
  - [ ] The checklist states the verified launch month.
  - [ ] The checklist records the ask decision date. If it was after 2026-10-20, it records the single ask figure set on every page and confirms that the "ASK NOT FINAL" flag was removed from the NLnet draft before submission.
  - [ ] The NLnet submission states one ask figure, and it matches every funder page reviewed.
- **Verify:** manual review by the owner.
- **Owner actions:** the whole WP. Answer decision 1 (the ask) by **2026-10-20**. If it is answered later, set the ask before submitting to NLnet. Checklist deadline **2026-11-01**.
- **Rollback:** Notion page history.

---

### WS7-03b · Correct the launch month on /about

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | WS7-03 | T9 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The month is the one the owner verified in WS7-03. If it is February 2026, close this WP as "no change".
- **Data-limit impact:** none.
- **Ongoing cost:** none.
- **Why:** `/about` is public and funders read it. It should not claim a launch month the owner's own records contradict (T9).
- **Current state (verified 2026-10-06):** `src/app/about/page.tsx` line ~52: `since February 2026, and I keep it running.` `decisions.md` carries the same wording rule and may be frozen by WS5-03a.
- **Do:**
  1. Replace "February 2026" in that sentence with the verified month, for example `since March 2026`. Change nothing else.
  2. If `decisions.md` is not frozen, add a one-line note under the /about rewrite entry. If it is frozen, say so in the PR.
- **Don't:** rewrite the about page or change its voice.
- **Acceptance criteria:**
  - [ ] `grep -n "since .* 2026" src/app/about/page.tsx` shows the verified month.
  - [ ] Merged by **2026-10-30** (election freeze 10-31 → 11-05), otherwise after 11-05.
  - [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- **Verify:** plain container: the commands above.
- **Owner actions:** state the verified month in the WS7-03 checklist.
- **Rollback:** revert the PR.

---

### WS7-05 · Label email links by campaign instead of tracking opens

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | none | T3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** how email engagement is measured.
  - **Options:**
    - (a) **first-party campaign labels:** `utm_*` on content links, counted in aggregate by PostHog on arrival
    - (b) also turn on Resend click tracking and record `email.clicked` per recipient through the webhook
    - (c) also turn on Resend open tracking (a pixel)
  - **Recommended:** (a). `/privacy` says "We do not embed tracking pixels in our emails", so (c) contradicts a published promise. Opens are unreliable because mail privacy features pre-fetch images [verify]. (b) rewrites every link through a vendor redirect and stores per-person click history for a list of 4 people.
  - **Default:** (a) if the owner has not answered by **2026-11-16**.
- **Data-limit impact:** none. No extra sends and no vendor calls.
- **Ongoing cost:** none. A pure function plus tests.
- **Why:** Only `delivery_status = sent` is stored, and opens and clicks are not tracked (T3). The retention bet cannot be judged without knowing whether emails bring people back. This WP labels the **existing** emails. WS7-09b uses the same helper for the weekly email, and does not depend on this WP: whichever merges first creates `src/lib/email/campaign-links.ts` exactly as step 1 specifies.
- **Current state (verified 2026-10-06):**
  - `src/lib/digest/run-bill-digest-cron.tsx` builds hrefs from `origin` (`publicSiteOrigin`): `unsubscribeHref` (~519), `moreHref`, `glossaryHref`, `preferencesHref`, `privacyHref`, `termsHref` (~523–534), and passes `billsBrowseHref={`${origin}/bills`}` and `homeHref={origin}` to `BillDigestEmail` (~570–586). Bill and committee group hrefs are built earlier in the same function.
  - `src/lib/email/bill-digest-email.tsx` line ~260: `const topicBrowseHref = (topic: string) => `${billsBrowseHref}?topic=${encodeURIComponent(topic)}``, used at ~305 and ~332. `billsBrowseHref` is not rendered as a link anywhere else.
  - `src/app/api/me/welcome-email/route.tsx` ~lines 84–97 builds `browseBillsHref`, `profileHref`, `preferencesHref`, `districtMapHref`, `aboutHref`, `homeHref`, `privacyHref` and `termsHref`.
  - `src/app/privacy/page.tsx` ~line 49: "We do not embed tracking pixels in our emails".
- **Do:**
  1. Create `src/lib/email/campaign-links.ts` (if absent). Export `withEmailCampaign(href: string, campaign: 'bill_digest' | 'welcome' | 'my_legislators', origin: string = publicSiteOrigin()): string`.
     - Parse with `new URL(href)`. A link is on-site only when `url.origin === new URL(origin).origin`. Off-site, non-`http(s)` and unparsable hrefs are returned unchanged.
     - Set `utm_source=kyvky_email`, `utm_medium=email`, `utm_campaign=<campaign>` with `url.searchParams.set` (idempotent), preserving other parameters and the hash.
  2. **Digest.** Pass `billsBrowseHref` to the template **undecorated**. In `bill-digest-email.tsx`, add an optional `linkDecorator?: (href: string) => string` prop (default identity). Rebuild `topicBrowseHref` as: `const u = new URL(billsBrowseHref); u.searchParams.set('topic', topic); return linkDecorator(u.toString());`. Rule: a link the template derives from another href is decorated **last**. In the cron, pass `linkDecorator={(h) => withEmailCampaign(h, 'bill_digest', origin)}` and wrap bill, committee, `homeHref`, `moreHref` and `glossaryHref`.
  3. **Welcome email.** Wrap `browseBillsHref`, `profileHref`, `districtMapHref`, `aboutHref` and `homeHref` with campaign `welcome`.
  4. **Never decorate** `unsubscribeHref`, `preferencesHref`, `privacyHref`, `termsHref`, the `List-Unsubscribe` header, logo `src`, or external links (LegiScan, licence).
  5. **Tests:**
     - `src/lib/email/campaign-links.test.ts`: plain path, existing query, hash fragment, off-site href unchanged, same path on another origin unchanged, `mailto:` unchanged, idempotence.
     - A template test (in `campaign-links.test.ts`, using `React.createElement` and `render` from `react-email`): render `BillDigestEmail` with a topic section, `billsBrowseHref: 'https://example.com/bills'`, the decorator, and an undecorated `unsubscribeHref`. Assert every topic href has exactly one `?` and contains `topic=` plus all three `utm_` parameters, and the unsubscribe href contains no `utm_`.
     - A source-level assertion reading `run-bill-digest-cron.tsx` as text: it never contains `withEmailCampaign(unsubscribeHref`, `withEmailCampaign(preferencesHref`, `withEmailCampaign(privacyHref` or `withEmailCampaign(termsHref`.
  6. In `/privacy` "What we collect" (or via WS2-09b if open), add: `Links in our emails include a label naming which email they came from. We count visits from email in total, not per person.` Keep the no-pixels sentence.
  7. In `docs/voice-and-tone.md` §2 "Links", add one sentence: content links carry campaign labels and compliance links never do.
- **Don't:** change Resend settings; add per-recipient identifiers to links; touch the webhook; change email copy other than the privacy line; run `preview:digest` with `--send`, `--inject` or `--inject-committee`.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 9 new tests.
  - [ ] `grep -n "withEmailCampaign" src/lib/digest/run-bill-digest-cron.tsx src/app/api/me/welcome-email/route.tsx` shows uses in both files.
  - [ ] `grep -n "billsBrowseHref}?topic" src/lib/email/bill-digest-email.tsx` prints nothing.
  - [ ] `/privacy` still contains "We do not embed tracking pixels".
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above. Owner, optional: `npm run preview:digest -- --email <own address> --out <path>` (dry run, needs production secrets) and inspect a topic link.
- **Owner actions:**
  - [ ] Confirm in Resend → Domains → kyvky.com that open and click tracking are **off** [verify the setting location], so the privacy page stays true.
- **Rollback:** revert the PR. Links lose labels, and nothing else depends on them.

---

### WS7-06 · Stop the underpowered PMF survey and close the intent survey

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W0 | Owner | S | none | T8, T2, T5 |

- **Program class:** Core
- **Owner decision:** the PMF survey's fate.
  - **Options:**
    - (a) retarget it to returning visitors with an app-side person property and run it through W3 (needs new code in W2)
    - (b) pause until 2027-01-05, then (a)
    - (c) **stop it**, and rely on the behavioral KPIs (KPI-3, KPI-5, KPI-6) plus the "Legislator page intent" answers
  - **Recommended:** (c). Returning visitors are about 1–3% of traffic (T2), so (a) and (b) would stay far below the 40 answers any PMF score needs, and the behavioral KPIs already measure return. (c) adds no code during the election peak and removes survey upkeep.
  - **Default:** (c) if the owner has not answered by **2026-10-13**. Under (a) or (b), the code becomes a new W2 WP built from the spec kept in [Deferred](#deferred).
- **Data-limit impact:** none.
- **Ongoing cost:** removes survey upkeep and one open `TASKS.md` item.
- **Why:** The PMF survey was shown to 456 people and answered by 19 (T8). It triggers only on `search_performed`, which 1.7% of visitors fire (T5), and its "≥ 2 sessions" targeting was never built. The one-question intent survey already answered the useful question (6 of 8: "who my representatives are").
- **Current state (verified 2026-10-06):**
  - **PostHog surveys** [verify: PostHog UI/MCP, read 2026-10-06 by spec author]:
    - "Product-market fit (PMF) (2026-06-29 23:34)": active, recurring every 90 days, iteration 2 started 2026-09-28, triggered by `search_performed`.
    - "Legislator page intent": active since 2026-09-21, on `/members/` excluding `/members/map`, capped at 200 responses, no end date.
  - `TASKS.md` line ~23 ("PMF survey — fix trigger timing") is open.
- **Do (owner):**
  1. Under (c), stop the PMF survey in PostHog now.
  2. Stop "Legislator page intent" at 200 responses or on **2026-11-04**, whichever is first.
  3. Give its final aggregate answer counts to the WS7-14 agent, who adds them to `docs/metrics.md` in the WS7-14 PR.
- **Don't:** report a PMF score anywhere.
- **Acceptance criteria:**
  - [ ] The WS7-14 PR states both surveys' final status and dates, and `docs/metrics.md` contains the intent survey's counts.
- **Verify:** owner check in PostHog → Surveys.
- **Owner actions:** the whole WP.
- **Rollback:** restart the survey in PostHog.

---

### WS7-07a · Fix the account data export

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | S10, T3 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** removes a broken user-rights feature. A test stops the select from drifting from the schema again.
- **Why:** `/privacy` offers an account data export. The route selects columns that do not exist on `ky_notifications_log`, and it returns 500 for the **whole** export when any sub-query errors, so the export likely fails for every user. It also omits committee follows. Partner or funder due diligence may test it (O3).
- **Current state (verified 2026-10-06):**
  - `src/app/api/me/export/route.ts` ~line 20 selects `id, sent_at, digest_frequency, event_count, delivery_status, created_at` from `ky_notifications_log`. Lines ~29–34 return 500 with the first error if any of the five queries errored. It exports `ky_bill_follows` but not `ky_committee_follows`.
  - `supabase/migrations/019_ky_follow_bills_schema.sql` (~118–128) creates `ky_notifications_log` with `id, user_id, digest_window_start, digest_window_end, event_ids, resend_message_id, sent_at, delivery_status`. Migration 041 adds `committee_event_ids`. No migration adds `digest_frequency`, `event_count` or `created_at` to this table.
  - `supabase/migrations/026_ky_committee_follows.sql` line ~8: `ky_committee_follows` with `committee_id` and `created_at` (~11), RLS own-row select.
- **Do:**
  1. Create `src/lib/account-export.ts` exporting `EXPORT_NOTIFICATION_LOG_COLUMNS = ['id', 'sent_at', 'digest_window_start', 'digest_window_end', 'delivery_status'] as const` and `EXPORT_COMMITTEE_FOLLOW_COLUMNS = ['committee_id', 'created_at'] as const`.
  2. In the export route, select those columns, and add a sixth query `ky_committee_follows` (own rows) exported as `committee_follows`.
  3. Add `src/lib/account-export.test.ts`: read every file in `supabase/migrations/` as text and assert each column in both constants appears in a `CREATE TABLE … ky_notifications_log` / `ky_committee_follows` body or an `ALTER TABLE … ADD COLUMN` for that table. Failure message: "Export selects a column no migration creates."
- **Don't:** change other export fields, the response format or filename; add `kind` (WS7-07b adds it after its migration).
- **Acceptance criteria:**
  - [ ] `grep -n "digest_frequency\|event_count" src/app/api/me/export/route.ts` prints nothing.
  - [ ] `grep -n "committee_follows" src/app/api/me/export/route.ts` shows the new query and payload key.
  - [ ] `npm test` passes with the new test, and the test fails if `event_count` is added back to the constant (show once locally, do not commit).
  - [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- **Verify:** plain container: the commands above. Owner, production: before deploy, download the export while signed in and record the status (expected 500 [verify]); after deploy, confirm 200 and that the JSON has `committee_follows`.
- **Owner actions:** the before-and-after export check. Target merge by **2026-10-30** (P0, so it may also deploy during the election freeze).
- **Rollback:** revert the PR.

---

### WS7-07b · Separate email kinds, record complaints, and trim the mail log

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS7-07a | T3, S10 |

- **Program class:** Core
- **Owner decision:** none. The privacy page already promises the one-year retention, and this WP makes it true.
- **Data-limit impact:** none. A few Supabase writes per day.
- **Ongoing cost:** removes a silent privacy-policy gap. It adds no schedule: the trim runs inside the existing daily `/api/cron/notify`. It deliberately does **not** add `delivered`/`delayed` states or a timestamp column (see Deferred).
- **Why:** The weekly email's stop rule needs complaints counted separately from bounces, and the log must tell two email kinds apart so the digest's window logic never reads a weekly-email row as a digest (T3). Today:
  - `email.complained` is stored as `bounced`.
  - `email.delivery_delayed` is stored as `failed`, which makes the digest re-send that window's events if no later event arrives.
  - The webhook writes unconditionally, so a late event can overwrite a more serious state.
  - `/privacy` promises the mail log is "kept for one year … then trimmed", but no code deletes rows.
- **Current state (verified 2026-10-06):**
  - Migration 019 (~126–127): `delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent','failed','bounced'))`, an inline, auto-named constraint.
  - `src/app/api/webhooks/resend/route.ts` `classifyEvent` (~64–95): `email.delivered` → `sent`, `email.bounced` → `bounced`, `email.complained` → `bounced` (bounceState `complained`, suppress), `email.delivery_delayed` → `failed`. The update at ~145 is unconditional.
  - `src/lib/digest/run-bill-digest-cron.tsx`: last-log query with `.neq('delivery_status', 'failed')` (~243–252) and no type filter; inserts at ~619 (`failed`) and ~630 (`sent`); early returns when no prefs are due (~174) and on prefs or history errors.
  - `src/app/api/cron/notify/route.ts` calls `runBillDigestCron({ dryRun })` and returns its result; `dryRun` comes from `DIGEST_DRY_RUN` or `?dryRun=true` (~34–35).
  - `scripts/preview-bill-digest.ts` also calls `runBillDigestCron`, and can run non-dry with `--send`.
  - `src/app/api/me/digest-history/route.ts` ~62 filters `.eq('delivery_status', 'sent')`; the status union is at ~31 and ~76, and in `src/components/profile/ProfileDigestHistorySection.tsx` ~42.
  - `src/app/privacy/page.tsx` "How long we keep it": the mail-event log is kept for one year, then trimmed. `grep -rn "ky_notifications_log" scripts src` shows no delete path.
- **Do:**
  1. **Migration** `supabase/migrations/NNN_ky_notifications_log_kind_and_complaints.sql` (next unused number; `ls supabase/migrations | tail`):
     - In a `DO $$ … $$` block, find the CHECK constraint on `ky_notifications_log.delivery_status` by querying `pg_constraint`, drop it if present, and add `ky_notifications_log_delivery_status_check CHECK (delivery_status IN ('sent','failed','bounced','complained'))`. The file must succeed when run twice.
     - `ALTER TABLE public.ky_notifications_log ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'bill_digest' CHECK (kind IN ('bill_digest','my_legislators'));`
  2. **Pure module** `src/lib/email/resend-delivery.ts`: move `classifyEvent` here and change only the log mapping: `email.delivered` → `logStatus: null` (no write; the row stays `sent`), `email.delivery_delayed` → `null` (no write; the window advances), `email.bounced` → `bounced`, `email.complained` → `complained`. `bounceState`, `suppress` and `reason` are unchanged. Export `allowedPredecessors(next)`: with the order `sent < failed < bounced < complained`, it returns the statuses strictly below `next`.
  3. **Webhook:** replace the read-then-update with one conditional UPDATE: `.update({ delivery_status: next }).eq('id', logRow.id).in('delivery_status', allowedPredecessors(next))`. The precedence check then happens inside the database, so concurrent events cannot downgrade a row.
  4. **Digest window:** no change needed. Confirm `.neq('delivery_status', 'failed')` still holds, and add a comment that `bounced` and `complained` rows advance the window (the email was accepted; suppression stops further sends) while delays no longer write.
  5. **Kind isolation:** add `.eq('kind', 'bill_digest')` to the digest's last-log query and `kind: 'bill_digest'` to both inserts. In `digest-history`, add `.eq('kind', 'bill_digest')` and add `'complained'` to the status unions (the route still lists `sent` rows only). In `src/lib/account-export.ts`, add `'kind'` to `EXPORT_NOTIFICATION_LOG_COLUMNS` (the WS7-07a test then checks it against this migration).
  6. **Retention trim:** create `src/lib/email/notification-log-retention.ts` exporting `NOTIFICATION_LOG_RETENTION_DAYS = 365`, a pure `retentionCutoff(now)`, a pure `shouldTrimLog({ dryRun })`, and `trimNotificationLog(db, now): Promise<{ deleted: number; error: string | null }>`, which deletes rows with `sent_at < retentionCutoff(now)` using `{ count: 'exact' }`. In `/api/cron/notify/route.ts`, after `runBillDigestCron` returns (whatever it returned, but not after a thrown exception), call it when `shouldTrimLog({ dryRun })` is true, in its own try/catch. Report an error with `Sentry.captureMessage(…, { level: 'error', tags: { route: 'cron/notify', kind: 'log_trim' } })`. Add `logRowsTrimmed` to the JSON response. Do **not** call it from `runBillDigestCron` or from `scripts/preview-bill-digest.ts`.
  7. **Tests** in `src/lib/email/resend-delivery.test.ts` and `src/lib/email/notification-log-retention.test.ts`: each event type's mapping; `allowedPredecessors` for all four statuses; unknown types ignored; `retentionCutoff` at a fixed date; `shouldTrimLog` false on dry runs and true otherwise.
- **Don't:**
  - Apply the migration, or create a Supabase branch (a paid vendor feature).
  - Change suppression semantics, digest selection or copy.
  - Backfill existing rows. Old complaint rows stay `bounced`; the ledger notes that `complained` exists only from deploy onward.
  - Add `delivered`, `delayed` or `delivery_updated_at` (Deferred).
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 10 new tests.
  - [ ] `grep -n "trimNotificationLog" src/app/api/cron/notify/route.ts` shows one call behind `shouldTrimLog`, and `grep -rn "trimNotificationLog" src/lib/digest scripts` prints nothing.
  - [ ] `grep -n "kind" src/lib/digest/run-bill-digest-cron.tsx` shows the filter and both inserts. `grep -n "kind" src/app/api/me/digest-history/route.ts` shows the filter.
  - [ ] The webhook has no `.update(` without `.in('delivery_status'` (code review).
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:**
  - Plain container: the commands above.
  - Owner, local Postgres or `supabase start` (Supabase CLI local stack): run the migration twice; both runs succeed.
  - Owner, production, after migration and deploy: on the next digest send to your own account (or `npm run preview:digest -- --email <own address> --send`, one email), check that the new row has `kind = 'bill_digest'` and status `sent`. Call `/api/cron/notify?dryRun=true` with the cron bearer and confirm the response has no `logRowsTrimmed` (dry run skips it); the next scheduled run's response returns `logRowsTrimmed: 0` [the scheduled run's body is not logged, so this is optional].
- **Owner actions:**
  - [ ] Apply the migration **before** merging: `npm run db:apply-sql -- supabase/migrations/NNN_ky_notifications_log_kind_and_complaints.sql`.
  - [ ] In Resend → Webhooks, confirm `email.bounced` and `email.complained` are subscribed [verify].
  - [ ] Optional: `SELECT count(*) FROM ky_notifications_log WHERE sent_at < now() - interval '365 days'` before the first trim (expect 0 until about 2027-05).
- **Rollback:** revert the code. Down SQL: `UPDATE ky_notifications_log SET delivery_status = 'bounced' WHERE delivery_status = 'complained';` then restore the three-value CHECK, then `ALTER TABLE ky_notifications_log DROP COLUMN IF EXISTS kind;` (only after the step 5 code is reverted, and only if WS7-09c has not shipped).

---

### WS7-08 · Map every April decision metric to one KPI and write the measurement protocol

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS7-01 | T7, T2, C5, C7, O4 |

- **Program class:** Core
- **Owner decision:**
  1. **The gating return metric.** Options: (a) week-1 return (KPI-3), as WS8-08 proposes; (b) 30-day return (KPI-4). **Recommended:** (a), with KPI-4 reported but not gating. It matches T2's existing baseline and WS8-08's draft, and it is final one week after each cohort instead of a month. **Default:** (a) by **2026-12-07**.
  2. **Retention-bet status at the cut line.** Not a choice: on **2026-12-07** the owner records "shipped" if WS7-09c and WS7-09d are both merged, otherwise "deferred to W5", and whether WS7-09f shipped.
- **Data-limit impact:** none.
- **Ongoing cost:** none. One docs section used by WS7-11, WS7-12, WS7-13 and WS8-08.
- **Why:** The 2026 session was never measured (T7), so the 2027 session is the first real test of both the product and the retention bet (C5). The program already pre-registers the April decision in one place (WS8-08). Two documents with different thresholds would let the decision be argued from whichever fits, which undercuts O4. This WP makes WS8-08's metrics measurable and fixes how they are measured, and holds no thresholds of its own.
- **Current state (verified 2026-10-06):**
  - No measurement plan exists in the repo.
  - WS8-08 (`08-partner-readiness.md` ~458) creates `docs/evaluation/README.md`, merged by **2026-12-14**, and holds every threshold. Gating inputs: KPI-1 in-session weekly median, KPI-3, KPI-6 weekly-email subscribers, KPI-7, owner hours (WS5-13) and partner counts (WS8-11). Context only: KPI-4, KPI-5, KPI-9, cash cost and data headroom (WS4-16), corrections and the audit result (WS3-14; WS3-11a's sunset test is applied by WS9-14). WS7-08 still merges by 2026-12-07 so WS8-08 can cite it.
  - `TASKS.md` line ~40 ("Measure one real session before revisiting Push") covers LegiScan load only (owned by WS4-15/WS4-16).
- **Do:**
  1. Add a section `2027 session measurement protocol (pre-registered)` to `docs/metrics.md` (≤ 60 lines) containing:
     - **Period:** 2027-01-05 → 2027-03-30. Weekly metrics use the ISO weeks from 2027-01-04 to 2027-03-29.
     - **Metric map** (one row per WS8-08 metric): metric → `docs/metrics.md` KPI ID and query name, or the owning WP. Weekly KY human visitors → KPI-1 (weekly). Week-1 return → KPI-3. Find-my-legislators share → KPI-5. Weekly-email subscribers → KPI-6. Digest recipients and weekly-email sends → KPI-7. Partner-attributed opt-ins → KPI-9. Maintenance hours → WS5-13. Cash cost and data headroom → WS4-16. Corrections and audit faithfulness → WS3-14, WS3-11a (applied by WS9-14). Partner signals → WS8-11 counts.
     - The sentence: `Thresholds and verdict rules live only in docs/evaluation/README.md (WS8-08). This section defines how each number is measured.`
     - **What will not be claimed:** no PMF score; no "users" meaning accounts; no visitor totals without the "human" qualifier; no comparison with the 2026 session (unmeasured).
     - **Readout dates:** 2026-11-10 (WS7-14), on or after 2027-01-02 (December row), 2027-02-02 and 2027-03-02 (WS7-12), 2027-04-01 → 04-15 (WS7-13).
     - **Retention-bet status** line, filled by the owner on 2026-12-07: `Weekly email at the 2026-12-07 cut line: <shipped | shipped, signed-in only | deferred to W5>`. If deferred: `The 2027 session is measured without a retention bet. KPI-6 weekly-email subscribers and KPI-9 are reported as n/a.`
     - **Amendments:** an empty subsection. Changes after 2027-01-05 need an ADR, per WS8-08's rule.
  2. Cross-reference WS4-15/WS4-16 for data-cost measurement, so this section does not duplicate it.
  3. **Proposed inputs for WS8-08** go in the PR body only (not in `docs/metrics.md`), for the WS8-08 author to adopt:
     - the gating return metric from decision 1;
     - an **email consolidation rule** for W5: if weekly-email subscribers on 2027-03-30 are below a floor (proposed: 20), remove the weekly-email code and its columns in W5; if they exceed the unique bill-digest recipients for March 2027 (KPI-7), fold followed-bill events into the weekly email and retire the separate digest in W5; otherwise keep both and revisit after the 2028 session;
     - if the bet was deferred, mark the email metrics "not measured (deferred)" rather than "not met".
- **Don't:** add KPIs that `docs/metrics.md` does not define; put threshold numbers in `docs/metrics.md`; edit `docs/evaluation/README.md` (WS8-08).
- **Acceptance criteria:**
  - [ ] The section exists with every item in step 1, and every WS8-08 metric appears in the metric map.
  - [ ] `grep -ni "threshold" docs/metrics.md` matches only the pointer sentence, and the reviewer confirms the section states no numeric decision threshold.
  - [ ] Merged on or before **2026-12-07**. Evidence after merge: `git log --diff-filter=AM --format='%h %cs' -S '2027 session measurement protocol (pre-registered)' -- docs/metrics.md | tail -1` prints a date ≤ 2026-12-07 (hard limit 2026-12-14).
  - [ ] The PR body contains the proposed inputs for WS8-08.
- **Verify:** plain container: `npm test`, `npm run lint` (docs only).
- **Owner actions:**
  - [ ] Answer decision 1 by 2026-12-07.
  - [ ] Record the retention-bet status line on 2026-12-07 (a one-line commit to this PR, or a follow-up docs PR the same day).
  - [ ] Carry the proposed inputs into the WS8-08 PR, or reject them there.
- **Rollback:** revert the PR. After 2027-01-05, record an amendment instead of reverting.

---

### WS7-09a · Store a subscriber's districts and weekly opt-in

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | none | C5, T5, T3, U10 |

- **Program class:** Core
- **Owner decision:** what a subscription is keyed to.
  - **Options:**
    - (a) **district numbers** on the existing preferences row. The email resolves the current member at send time, so it survives the January 2027 seating of newly elected members.
    - (b) specific legislators through a legislator-follow table (the retired WS6-13). After the election it would point at departing members.
    - (c) an email-only subscription with no account: a new personal-data table, its own double opt-in, bounce and unsubscribe handling.
  - **Recommended:** (a). It reuses verification, suppression, one-click unsubscribe and export, and stores two small integers rather than an address. WS6-12a's email link removes the account-form friction that (c) was meant to avoid.
  - **Default:** (a) if the owner has not answered by **2026-11-11**. Exactly one model ships. Under (b), this WP consumes a revived legislator-follow table and drops the district columns.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. Four columns. It reuses existing routes.
- **Why:** The retention bet needs to know, per subscriber, which districts to report on (C5, T5). Unsubscribe and re-subscribe must not create a consent gap between the two email kinds (T3).
- **Current state (verified 2026-10-06):**
  - `ky_notification_preferences` (migrations 019 ~40–60, 021 `suppressed_at`, 033 `digest_user_disabled`): `user_id` PK, `digest_frequency`, `event_types`, `topic_filters`, `unsubscribe_token`, `unsubscribed_all_at`, `digest_user_disabled`, bounce and suppression columns. RLS lets users select and update their own row.
  - `src/app/api/me/preferences/route.ts`: GET selects `SELECT_FIELDS` (~12). PATCH is rate-limited (~55). Enabling the digest checks `email_verified_at` and returns 403 `Verify your email before turning on email notifications.` (~120–131). Turning the digest to daily or weekly clears `unsubscribed_all_at` and sets `digest_user_disabled = false` (~147–152). The update uses the user-scoped client.
  - `src/app/api/unsubscribe/[token]/route.ts`: both GET and POST ignore the request (`_req`) and call `unsubscribe(token)`, which sets `digest_frequency: 'off'`, `unsubscribed_all_at` and `digest_user_disabled: true` (~44–50). Success copy (~66–70): title `Digest emails stopped`, body `You will not receive further bill digest emails from Know Your Vote Kentucky. You can re-enable digests at any time from your profile.`
  - `docs/voice-and-tone.md` §3 "Unsubscribe page" governs that copy.
  - Kentucky has 100 House districts and 38 Senate districts.
- **Do:**
  1. **Migration** `NNN_ky_my_legislators_subscription.sql`: `ALTER TABLE public.ky_notification_preferences ADD COLUMN IF NOT EXISTS my_legislators_weekly BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS house_district SMALLINT CHECK (house_district BETWEEN 1 AND 100), ADD COLUMN IF NOT EXISTS senate_district SMALLINT CHECK (senate_district BETWEEN 1 AND 38), ADD COLUMN IF NOT EXISTS districts_set_at TIMESTAMPTZ;` plus a partial index on `(user_id) WHERE my_legislators_weekly`. Add a comment that existing RLS policies cover the new columns.
  2. **Preferences API.**
     - GET: add the four fields to `SELECT_FIELDS`.
     - PATCH: validate `my_legislators_weekly` (boolean) and `house_district` / `senate_district` (integer in range, or null) through a new pure `normalizeMyLegislatorsPatch(body)` in `src/lib/ky-notification-preferences.ts`. Setting either district sets `districts_set_at = now()`.
     - Turning `my_legislators_weekly` on without both districts (in the patch or already stored) returns 400 `Choose your House and Senate districts before turning on the weekly email.`
     - Turning it on requires a verified email: return the **same** 403 and message as the digest.
     - Turning it on clears `unsubscribed_all_at` (an explicit re-subscription; comment the reason). It does **not** change `digest_frequency` or `digest_user_disabled`.
     - Turning the digest on does **not** change `my_legislators_weekly` (already true of the existing code; add a comment).
  3. **Unsubscribe route.** Extract a pure `buildUnsubscribeUpdate(list: 'all' | 'my_legislators', nowIso: string)` into `src/lib/unsubscribe-update.ts`:
     - `all` → `{ digest_frequency: 'off', unsubscribed_all_at: nowIso, digest_user_disabled: true, my_legislators_weekly: false }`
     - `my_legislators` → `{ my_legislators_weekly: false }` only. It leaves `digest_frequency`, `unsubscribed_all_at` and `digest_user_disabled` untouched.
     
     Both GET and POST read `list` from `new URL(req.url).searchParams`. A missing or unknown value means `all` (the stronger opt-out).
  4. **Copy** (and the same text in voice guide §3):
     - `list=my_legislators` success: title `Weekly legislator email stopped`, body `You will not get the weekly email about your legislators. Bill digest emails are not affected. You can turn the weekly email back on from your profile.`
     - all-mail success, replacing today's text because it now also stops the weekly email: title `Email updates stopped`, body `You will not receive further digest or weekly legislator emails from Know Your Vote Kentucky. You can turn them back on at any time from your profile.`
     - The 400, 404 and 500 copy is unchanged.
  5. **Export:** preferences are exported with `*`, so the new columns are included. No change.
  6. **Tests:** `src/lib/ky-notification-preferences.test.ts` (validator: range, null, types, on-without-district, on with stored districts) and `src/lib/unsubscribe-update.test.ts` (both lists, unknown list → all, all clears `my_legislators_weekly`, list leaves the digest fields out of the update object).
- **Don't:** store addresses, ZIPs or coordinates; add a legislator-follow table; change digest selection; apply the migration.
- **Acceptance criteria:**
  - [ ] The migration uses `IF NOT EXISTS` on every add.
  - [ ] `npm test` passes with at least 10 new tests.
  - [ ] `buildUnsubscribeUpdate('my_legislators', …)` has exactly one key, and `buildUnsubscribeUpdate('all', …)` sets `my_legislators_weekly: false` (tests).
  - [ ] Enabling `my_legislators_weekly` for an unverified account returns 403 with the digest's message (code review of the shared check).
  - [ ] Voice guide §3 contains both new success texts. The copy has no em dash or semicolon.
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above. Owner, after migration: `PATCH /api/me/preferences` with your own session and `{ "my_legislators_weekly": true, "house_district": <n>, "senate_district": <m> }` returns 200, and GET shows the values.
- **Owner actions:**
  - [ ] Apply the migration **before** merge: `npm run db:apply-sql -- supabase/migrations/NNN_ky_my_legislators_subscription.sql`.
- **Rollback:** revert the code. Down SQL: `ALTER TABLE ky_notification_preferences DROP COLUMN IF EXISTS my_legislators_weekly, DROP COLUMN IF EXISTS house_district, DROP COLUMN IF EXISTS senate_district, DROP COLUMN IF EXISTS districts_set_at;` (the partial index drops with the column).

---

### WS7-09b · Build the My Legislators email from a pure builder and template

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-01, WS3-02 (soft: WS1-12) | C5, T5, T3, U1, U9 |

- **Program class:** Core
- **Owner decision:** whether empty weeks send.
  - **Options:** (a) send only when there is at least one item (a recorded vote, a movement on a bill they sponsor, or an upcoming meeting of a committee they sit on); (b) always send, with "No recorded activity this week".
  - **Recommended:** (a). It matches the digest's "only when there are events to report" rule (voice guide §2). In session, nearly every week has items.
  - **Default:** (a) by **2026-11-16**.
- **Data-limit impact:** zero LegiScan, Open States, LRC or Anthropic calls. This WP is pure code and tests with synthetic fixtures.
- **Ongoing cost:** one template and one pure builder, about 400 lines with tests. It reuses the brand header, dark-mode CSS, footer pattern and compliance test.
- **Why:** This is the retention bet. "Find my legislator" is the one repeated behavior (T5), and a weekly per-legislator email is the habit comparable projects built (C2, C5). Reusing WS3-01's labels keeps it from repeating the member-vote trust bug (U1).
- **Current state (verified 2026-10-06):**
  - `src/lib/legiscan-vote-tally.ts` line 5: `VoteBucket = 'yea' | 'nay' | 'nv' | 'absent' | 'unknown'`.
  - After WS3-01: `src/lib/roll-call-label.ts` exports `deriveRollCallLabel(vote, history)` → `{ label, matched, chamber, rollCallNumber }` (unmatched labels read like `House roll call no. 155`) and `UNMATCHED_ROLL_CALL_CAPTION`. After WS3-02: `buildMemberRollVotes(votes, billsById, historyByBillId, peopleKey)` in `src/lib/member-profile-data.ts` adds `label` and `labelMatched`. Use the exported names as merged.
  - `src/lib/digest/format-digest-event-detail.ts` exports `formatDigestEventLabel` (~11), `formatMeetingDate` (~30) and `formatDigestEventDetail` (~59), the digest's event-line formatters.
  - Email scaffolding: `src/lib/email/brand.tsx` (`EmailBrandHeader`, `emailLogoSrc`, `EMAIL_DARK_MODE_CSS`); `src/lib/email/bill-digest-email.tsx` (footer pattern, LegiScan CC BY credit ~350–352, `joinWithAnd`); `KYVKY_POSTAL_ADDRESS` in `src/lib/kyvky-contact.ts`.
  - The digest's unsubscribe link is `${origin}/api/unsubscribe/${token}` (`run-bill-digest-cron.tsx` ~519). There is no `/unsubscribe` page; the route is under `/api/`.
  - Voice guide §2: "only when there are events to report", "(recorded {Mon D})" means the date our sync observed an event, no AI summaries in digest emails, no em dashes or semicolons.
- **Do:**
  1. **`src/lib/digest/my-legislators.ts`**, pure, with no Supabase, Resend or React imports. Export:
     ```ts
     type MyLegislatorsInput = {
       now: Date; windowStart: Date;
       legislators: Array<{ id: string; name: string; chamber: 'house' | 'senate'; district: number; partyLetter: string | null; profilePath: string }>;
       votes: Array<{ legislatorId: string; voteId: string; billId: string; billNumber: string; billTitle: string; billPath: string;
                      rollCallDate: string | null; ingestedAt: string; label: string; labelMatched: boolean; bucket: VoteBucket; passed: boolean | null }>;
       sponsoredEvents: Array<{ legislatorId: string; billId: string; billNumber: string; billTitle: string; billPath: string;
                                actionText: string; observedAt: string; role: 'primary' | 'cosponsor' }>;
       meetings: Array<{ legislatorIds: string[]; committeeName: string; committeePath: string; meetingDate: string; timeAndLocation: string | null; status: string }>;
     };
     ```
     and `buildMyLegislatorsDigest(input, { origin, decorate })` → `{ isEmpty, subject, previewText, intro, sections: Array<{ header, votesByBill, sponsored, meetings }>, overflowByLegislator }`. `decorate` defaults to `(h) => withEmailCampaign(h, 'my_legislators', origin)`.
  2. **Rules:**
     - **Votes** are included when `ingestedAt` ∈ `[windowStart, now)`, so a roll call stored late is still reported once. Exclude a vote whose `rollCallDate` is more than 30 days before `windowStart` (guards against a historical backfill flooding the email).
     - **Sponsored events** have `observedAt` ∈ `[windowStart, now)`. Primary sponsor before cosponsor.
     - **Meetings** have `status = 'scheduled'` and `meetingDate` ∈ `[today, today + 7 days)` (half-open, UTC dates), deduplicated per committee and date.
     - **Caps:** 10 votes and 5 sponsored lines per legislator. The rest count toward an overflow line linking to the member profile.
     - `isEmpty` is true when every list is empty for every legislator.
  3. **Line formats:**
     - Votes are grouped under a bill link (`{bill number}: {title}`, one anchor, as in the digest). Each line: `{label}, {Mon D}. {vote phrase}.{ outcome}`, for example `House: Third reading, passed, Jan 14. Voted yes. Passed.` Omit the date when `rollCallDate` is null. Outcome `Passed` or `Failed` appears only when `passed` is not null.
     - Vote phrases from `VoteBucket`: `yea` → `Voted yes`, `nay` → `Voted no`, `nv` → `Did not vote`, `absent` → `Absent`, `unknown` → `Vote not recorded`.
     - The `label` is used exactly as WS3-01/WS3-02 produced it, never the raw LegiScan description. When `labelMatched` is false, the label is WS3-01's fallback (for example `House roll call no. 155`). Never guess.
     - Sponsored lines: `{actionText} (recorded {Mon D})`, where the loader builds `actionText` with `formatDigestEventDetail`, falling back to `formatDigestEventLabel` (the digest's rule).
     - Meeting lines: `{committee name}: {formatMeetingDate}, {time and location}`.
  4. **Subject, heading, intro:**
     - Subject: `Your Kentucky legislators, {Mon D}: {counts}`, for example `Your Kentucky legislators, Jan 19: 6 votes, 2 meetings`. Counts list only non-zero kinds (`votes`, `bill updates`, `meetings`).
     - Heading: `Your Kentucky legislators`. Intro: `Activity for House District {h} and Senate District {s}, recorded {Mon D} to {Mon D}.`
     - Per-legislator header: name, `House District {n}` or `Senate District {n}`, and the party letter as text, for example `(R)`, when known (U9). The name links to the profile (decorated).
     - A district with no current member: `No current member is listed for {House|Senate} District {n}.`
  5. **`src/lib/email/my-legislators-email.tsx`** (`export function MyLegislatorsEmail(...)`), using `EmailBrandHeader`, `EMAIL_DARK_MODE_CSS` and the `kv-` classes for every hard-coded colour. Footer:
     - `You're getting this because you asked for a weekly email about the legislators for your districts on Know Your Vote Kentucky.`
     - The sources line: votes and bill actions from LegiScan under CC BY 4.0 (reuse the digest's credit wording and links), and meeting details from the Kentucky Legislative Research Commission (LRC) calendar.
     - `[Change districts]` (`${origin}/members/map`) · `[Stop this weekly email]` (`${origin}/api/unsubscribe/${token}?list=my_legislators`) · `[Unsubscribe from all email]` (`${origin}/api/unsubscribe/${token}`) · `[Privacy]` · `[Terms]`. None of these are decorated.
     - `KYVKY_POSTAL_ADDRESS`. No AI-generated text.
  6. **`src/lib/email/campaign-links.ts`:** if WS7-05 has not created it, create it exactly as WS7-05 step 1 specifies, with its tests.
  7. **Voice guide.** Add `### 4. My Legislators email` to `docs/voice-and-tone.md` (≤ 30 lines): subject, preview, structure, the line formats above, the vacant-district line and the footer. Follow §2's conventions.
  8. **Tests** in `src/lib/digest/my-legislators.test.ts` with synthetic data and `https://example.com` origins, at least: a vote ingested exactly at `windowStart` (included) and at `now` (excluded); a late-ingested vote whose roll-call date is in the previous window (included); a backfilled vote 40 days old (excluded); each of the five buckets; an unmatched label passed through unchanged; caps and overflow; a meeting on day 7 (excluded) and day 0 (included); meeting dedupe; cancelled meetings filtered; `isEmpty`; subject counts (votes only, meetings only, all three); the vacant-district line; party as text; and no em dash (U+2014) and no semicolon outside URLs in the rendered plain text.
  9. **Compliance.** Add `createElement(MyLegislatorsEmail, …)` to WS1-12's `src/lib/email/email-compliance.test.ts`, asserting the postal address, both unsubscribe hrefs, and no `utm_` on any compliance link. If WS1-12 has not merged, put the same assertions in `my-legislators.test.ts` and say so in the PR.
  10. **Review render.** Write the rendered HTML for one synthetic fixture to the scratch directory with a one-off command (for example `npx tsx -e "…"`, not a committed script) and attach it to the PR. Attach 390 px and 1440 px screenshots if a headless browser is available; otherwise write "owner to review the attached HTML".
- **Don't:** send email or construct `Resend`; edit `run-bill-digest-cron.tsx` or the bill digest template; add "voted with party" or any characterization of a legislator; include AI summaries; fetch from LegiScan, Open States or LRC; add a cron or a script.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 18 new builder tests and the compliance test extension.
  - [ ] `grep -niE "^import .*(supabase|resend|react)" src/lib/digest/my-legislators.ts` prints nothing.
  - [ ] `grep -n "description" src/lib/digest/my-legislators.ts` shows no roll-call description field.
  - [ ] The footer hrefs in the compliance test start with `https://example.com/api/unsubscribe/`.
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above.
- **Owner actions:** review the copy in the attached HTML or screenshots.
- **Rollback:** revert the PR. Nothing sends until WS7-09c.

---

### WS7-09e · Load the email's input in one pass per run

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS7-09b, WS3-02 | C5, T5, O2, U1, N2 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** Supabase reads only, and a fixed number per cron run regardless of subscriber count (at most 7 queries). Zero LegiScan, Open States, LRC or Anthropic calls. The email must never be a reason to raise any sync cadence.
- **Ongoing cost:** one I/O module and one pure mapping module. It changes no sync.
- **Why:** The existing member-profile loaders are built for one page view, not for a batch: each creates its own anon client, takes a `KYLegislator`, defaults to the "current" session, and caps the vote list. Calling them per subscriber would multiply queries and silently switch sessions on 2027-01-05. Votes also arrive late (the votes sync runs once a day with `limit=5`, and WS4 may change cadence to stay under the LegiScan cap, D1, O2), so the email must window votes by **ingestion time**, not roll-call date, or late votes are never reported.
- **Current state (verified 2026-10-06):**
  - `src/lib/member-profile-data.ts`:
    - `fetchSponsoredBillsForLegislator(leg, options)` (~250) and `fetchMemberVoteRecord(leg, options)` (~294) each call `createAnonClient()` (~20), take a `KYLegislator`, and default `sessionName` to `getCivicDataSessionName()` (`src/lib/ky-sessions.ts` ~352: the active session, else the most recent started one, so it flips from 2026 RS to 2027 RS on 2027-01-05). `fetchMemberVoteRecord` defaults to `maxRows: 200` and returns `MemberRecentRollVote` rows without `created_at`.
    - `billListsLegislatorAsSponsor` (~60), `resolveLegiscanPeopleIdFromBillSponsors` (~74) and `memberRollVote` (~132) are module-private.
    - `billListsLegislatorAsSponsor` matches on `people_id` first, then falls back to `matchLegislatorBySponsorName([leg], name)` (`src/lib/ky-member-utils.ts` ~737, `nm.endsWith(last)`), so a one-member roster can match another sponsor whose name ends with the same surname (erratum N2, owned by WS5-12a).
  - `src/lib/ky-member-committees.ts`: `fetchCalendarCommitteeMeetingRows()` (~74) loads up to 500 rows with its own anon client on every call. `fetchCommitteeAssignmentsForLegislator(leg, committees)` (~129) calls it each time, then falls back to Open States slugs.
  - `src/lib/ky-legislator-roster-server.ts` exports `fetchKyActiveLegislatorRosterSlim()` (~127).
  - `ky_votes` (migration 001 ~68–80) has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` (line 79), `date`, `roll_call` JSONB and `passed`. Votes are upserted on `(bill_id, roll_call_id)` (`src/lib/ky-legiscan-dataset-import.ts` ~318) [verify that no upsert payload sets `created_at`, so it keeps the first-ingest time].
  - `vercel.json` line ~49: `/api/sync?source=votes&limit=5` at `15 6 * * *`. WS4-13 may fold vote fetching into the bills sync.
  - `ky_bill_status_history` (`bill_id`, `event_type`, `event_payload`, `observed_at`); the digest loads it once per run over an 8-day window with `.limit(8000)` (`run-bill-digest-cron.tsx` ~195–201).
  - `ky_committee_meetings` (migration 024: `committee_id`, `meeting_date`, `time_and_location`, `status`).
- **Do:**
  1. In `src/lib/member-profile-data.ts`, add `export` to `memberRollVote` and `billListsLegislatorAsSponsor`. No behavior change.
  2. In `src/lib/ky-member-committees.ts`, add an optional third parameter `preloadedMeetings?: CachedMeetingRow[]` to `fetchCommitteeAssignmentsForLegislator`. When present, use it instead of calling `fetchCalendarCommitteeMeetingRows()`. Existing callers are unchanged.
  3. Create **`src/lib/digest/my-legislators-map.ts`** (pure, no I/O imports) with the per-subscriber mapping: `inputForSubscriber(ctx, { houseDistrict, senateDistrict, windowStart, now })` → `MyLegislatorsInput`.
     - Legislators: the active roster member for each district, or none (vacant line).
     - Votes: from `ctx.votes`, those whose `roll_call` includes the member's LegiScan people id (`memberRollVote(...) !== null`), labelled through WS3-02's `buildMemberRollVotes` (or WS3-01's `deriveRollCallLabel` with `ctx.historyByBillId`), bucketed with `bucketLegiscanVoteText`, `ingestedAt = created_at`. A member with no `legiscan_id` gets no votes and is counted in `ctx.warnings` (no per-member resolve query).
     - Sponsored events: history rows for bills where `billListsLegislatorAsSponsor(bill.sponsors, leg)`, with `role` from the sponsor entry [verify the field that marks primary sponsors in `ky_bills.sponsors`], and `actionText` from `formatDigestEventDetail`, falling back to `formatDigestEventLabel`. If WS5-12a's N2 fix has merged, use the matcher as fixed. If not, say in the PR that sponsored lines inherit N2's surname-suffix risk, and cite N2 under "Findings re-checked".
     - Meetings: the member's committee slugs (from `fetchCommitteeAssignmentsForLegislator(leg, ctx.committees, ctx.calendarRows)`, computed once per legislator per run and memoised in `ctx`), matched to `ctx.meetings`.
  4. Create **`src/lib/digest/my-legislators-data.ts`** (server-only I/O) with `loadMyLegislatorsRunContext(db, { now })`, using the caller's service-role client and these queries once per run:
     - active roster (`fetchKyActiveLegislatorRosterSlim()` or the equivalent select on `db`);
     - `ky_votes` with `created_at >= now − 8 days` (`id, bill_id, date, chamber, description, passed, roll_call, created_at, roll_call_id, yea_count, nay_count, absent_count, nv_count`), limit 2,000, then `dedupeRollCallRows` (WS3-01);
     - `ky_bills` `id, bill_number, title, legiscan_history` for those votes (history stays server-side);
     - `ky_bill_status_history` with `observed_at >= now − 8 days`, limit 8,000, and `ky_bills` `id, bill_number, title, sponsors` for those rows;
     - `ky_committee_meetings` with `status = 'scheduled'` and `meeting_date` in `[today, today + 7)`, with committee name and slug;
     - `fetchCalendarCommitteeMeetingRows()` once, and the committee list once.
     
     If a limit is reached, add a warning to `ctx.warnings` (counts only, no personal data).
  5. **Tests** in `src/lib/digest/my-legislators-map.test.ts` (synthetic `ctx`): vacant district; a member without `legiscan_id` (no votes, one warning); a vote whose `roll_call` lacks the member (excluded); primary vs cosponsor; fallback action text; meeting matched through a committee slug; memoisation (assignments computed once per legislator across two subscribers in the same district).
- **Don't:** call LegiScan, Open States or LRC; run any query per subscriber; change member-profile behavior or the RPC; raise any sync cadence; pass `legiscan_history` to the template.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 7 new tests.
  - [ ] `grep -c "\.from(" src/lib/digest/my-legislators-data.ts` is ≤ 7, and none is inside a per-subscriber loop (code review).
  - [ ] `grep -niE "^import .*(supabase|resend|react)" src/lib/digest/my-legislators-map.ts` prints nothing.
  - [ ] Existing callers of `fetchCommitteeAssignmentsForLegislator` compile unchanged (`npx tsc --noEmit`).
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above. Production behavior is checked through WS7-09c's dry run (Owner).
- **Owner actions:** none.
- **Rollback:** revert the PR. Nothing sends until WS7-09c.

---

### WS7-09c · Send the weekly email from the notify cron under a daily send budget

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS7-09a, WS7-09e, WS7-07b | C5, T3, D4, E2 |

- **Program class:** Core
- **Owner decision:** what to do when volume nears the Resend free tier.
  - **Options:** (a) spread sends across days under a daily budget, and upgrade Resend only when monthly volume would pass about 2,500; (b) upgrade Resend now [verify current plan and price].
  - **Recommended:** (a). At 4 digest subscribers, (b) is premature spend (D4, O2).
  - **Default:** (a) by **2026-11-16**.
- **Data-limit impact:**
  - **Resend:** `DAILY_SEND_BUDGET = 70` logged sends per UTC day (digest plus weekly email), plus a named `UNLOGGED_SEND_RESERVE = 30` for mail that never reaches `ky_notifications_log`: the welcome email (`src/app/api/me/welcome-email/route.tsx`), Supabase auth email if its SMTP is Resend, and WS6-12a's email links (same pool). The two add up to the free tier's about 100/day [verify the current Resend free limits and whether Supabase auth email goes through Resend SMTP before merging].
  - **Reserve enforcement:** WS6-12a's email-link flag (`NEXT_PUBLIC_EMAIL_LINK_ENABLED`) is turned off when unlogged sends exceed `UNLOGGED_SEND_RESERVE` (30) on a UTC day. Unlogged sends are Resend's daily total minus that UTC day's `ky_notifications_log` rows that are not `failed`. The Supabase auth email limit is set to the lowest setting that keeps the daily maximum near 30 [verify the granularity].
  - **Monthly ceiling:** about 4.3 sends × subscribers. At 600 subscribers that is about 2,600, near the about 3,000/month free cap [verify].
  - **Stop conditions in code:** `budgetExhausted` leaves the rest for the next day; the wall-clock deadline stops new sends 100 s after the route started (`maxDuration` is 120 s); in allowlist mode, at most 3 sends per run.
  - **Throttle:** at least 600 ms between sends [verify Resend's API rate limit].
  - Zero LegiScan, Open States, LRC or Anthropic.
- **Ongoing cost:** no new schedule, because it rides the daily `/api/cron/notify` (11:00 UTC). One env var, `MY_LEGISLATORS_SEND`, which is both the kill switch and the test allowlist. About 0.5 h/month in session (reading WS7-12's numbers).
- **Why:** The email must run without adding a scheduler (E2) or burning a free tier (O2), must be testable on one recipient before launch, and must be stoppable in one step if complaints rise (T3).
- **Current state (verified 2026-10-06):**
  - `vercel.json`: cron `{ "path": "/api/cron/notify", "schedule": "0 11 * * *" }` (~50) and `maxDuration: 120` for the route (~17–18).
  - `src/app/api/cron/notify/route.ts`: authenticates (~19–27), computes `dryRun` (~34–35), calls `runBillDigestCron({ dryRun })`, reports per-user errors to Sentry (~40–52), and returns `NextResponse.json(result)`. It logs only on exception, so scheduled-run response bodies are not visible in Vercel logs.
  - `runBillDigestCron` already has an `onlyUserIds` option for targeted previews (`run-bill-digest-cron.tsx` ~112), the pattern this WP mirrors.
  - The digest sends with `replyTo: 'katie@kyvky.com'` and `List-Unsubscribe` / `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (~605–616), and inserts its log row immediately after a successful send (~630).
  - Vercel applies env var changes to new deployments only [verify], so changing `MY_LEGISLATORS_SEND` takes effect after a redeploy.
- **Do:**
  1. **Pure schedule module** `src/lib/digest/my-legislators-schedule.ts` (no I/O imports), and constants in `src/lib/email/send-budget.ts` (`DAILY_SEND_BUDGET = 70`, `UNLOGGED_SEND_RESERVE = 30`, with a comment listing the unlogged senders):
     - `isoWeekStartUtc(now)`: Monday 00:00 UTC of `now`'s ISO week. Sunday belongs to the week that started the previous Monday.
     - `isDue(lastNonFailedSentAt: Date | null, now)`: true when there is no prior send, or the last non-failed `my_legislators` send is before `isoWeekStartUtc(now)`. One email per ISO week; a subscriber missed on Monday (budget or deadline) is sent on the next day the cron runs that week.
     - `windowStartFor(lastSentAt, now)`: the later of `lastSentAt` and `now − 7 days`.
     - `parseSendMode(raw)`: unset or empty → `{ mode: 'off' }`; `'true'` → `{ mode: 'all' }`; a comma-separated list of UUIDs → `{ mode: 'allowlist', userIds }`; anything else → `off`.
     - `allocateBudget({ dailyBudget, sentToday, dueCount, mode })`: `max(0, dailyBudget − sentToday)`, capped at `min(userIds.length, 3)` in allowlist mode.
     - `shouldStopForTime({ routeStartedAtMs, nowMs, deadlineMs = 100_000 })`.
     - `shouldConstructResend({ mode, dryRun })`: true only when mode is not `off` and `dryRun` is false.
  2. **Runner** `src/lib/digest/run-my-legislators-cron.tsx`: `runMyLegislatorsCron({ db, dryRun, now, routeStartedAtMs, sentToday })` returns `MyLegislatorsCronResult = { mode, usersConsidered, due, wouldSend, sent, skippedEmpty, budgetExhausted, stoppedForTime, warnings: number, errors: string[] }`.
     - Selection: preferences with `my_legislators_weekly = true`, `unsubscribed_all_at IS NULL`, `suppressed_at IS NULL`, both districts not null; profiles with `email_verified_at` not null (the digest's rule); in allowlist mode, only listed user ids.
     - Last send per user: latest `kind = 'my_legislators'` row with `delivery_status <> 'failed'`. Order due subscribers by oldest last send.
     - Load the run context once (WS7-09e). For each due subscriber: stop if `shouldStopForTime`; build (WS7-09e mapping + WS7-09b builder); count `skippedEmpty` when `isEmpty`; count `wouldSend`; when sending, render and send with `replyTo: 'katie@kyvky.com'`, `List-Unsubscribe: <${origin}/api/unsubscribe/${token}?list=my_legislators>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, then insert the log row **in the same try block, immediately after the successful send** (`kind: 'my_legislators'`, window bounds, `event_ids: '{}'`, `resend_message_id`, `delivery_status: 'sent'`). On a send error, insert a `failed` row. Wait 600 ms between sends.
  3. **Kill switch and dry run.** Sending requires `shouldConstructResend({ mode: parseSendMode(process.env.MY_LEGISLATORS_SEND), dryRun })`. The route's `dryRun` (`DIGEST_DRY_RUN=true` or `?dryRun=true`) overrides any mode.
  4. **Route** (`/api/cron/notify/route.ts`), without touching the auth block:
     - Record `routeStartedAtMs = Date.now()` at the top of `GET`.
     - After `runBillDigestCron`, count today's logged sends (`ky_notifications_log` rows with `sent_at >= today 00:00 UTC`, both kinds) and call `runMyLegislatorsCron` inside its own try/catch, so a failure cannot lose the digest result.
     - Then run WS7-07b's trim (unchanged position: after both runs, when not a dry run).
     - Response: the digest result fields as today, plus `myLegislators` and `logRowsTrimmed`.
     - Log one line with no personal data: `console.info('[cron/notify] myLegislators', { mode, usersConsidered, due, wouldSend, sent, skippedEmpty, budgetExhausted, stoppedForTime })`.
     - Report `errors` to Sentry with the existing pattern and `tags: { route: 'cron/notify', kind: 'my_legislators' }`.
  5. Document `MY_LEGISLATORS_SEND` in `env-template.txt` with its three modes, and in WS9-07's env catalog if it exists. In the PR, satisfy WS5-15's "one in, one out" rule (name an env var removed, or link the ADR WS5-15 requires).
  6. If WS4-11's registry exists, note on the `/api/cron/notify` row that it also sends the weekly email.
  7. **Tests** in `src/lib/digest/my-legislators-schedule.test.ts`, at least: due on Monday with no prior send; not due Tuesday–Sunday after a Monday send; Tuesday carry-over after a missed Monday; Sunday carry-over (Sunday is in the same ISO week as the preceding Monday); due again the next Monday; `windowStartFor` both branches; `parseSendMode` for unset, `true`, a two-id list and garbage; budget exhaustion; the allowlist cap of 3 even with a larger list; the deadline; `shouldConstructResend` false when mode is `off` or `dryRun` is true.
- **Don't:** add a cron or workflow; change the digest's behavior or the route's auth block (WS2-02); set the env var; send email; call the runner from any script.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 14 new tests.
  - [ ] `git diff vercel.json .github/workflows` is empty.
  - [ ] `grep -niE "^import .*(supabase|resend|react)" src/lib/digest/my-legislators-schedule.ts` prints nothing.
  - [ ] `new Resend(` appears in `run-my-legislators-cron.tsx` only inside a branch guarded by `shouldConstructResend` (code review).
  - [ ] The route's `console.info` line contains counts only (code review).
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:**
  - Plain container: the commands above.
  - Owner, with production secrets: call `GET /api/cron/notify?dryRun=true` manually with the cron bearer, and read `myLegislators.usersConsidered`, `due` and `wouldSend` in the response body.
- **Owner actions:**
  - [ ] After merge and WS7-09d, subscribe your own account and run the manual dry run above.
  - [ ] If WS6-12a's email link is live, apply the reserve enforcement under Data-limit impact: keep the Supabase auth email limit (Authentication → Rate Limits [verify]) near 30 a day, and unset `NEXT_PUBLIC_EMAIL_LINK_ENABLED` and redeploy on any UTC day when unlogged sends exceed 30.
  - [ ] Enabling is planned in WS7-11 (allowlist test first, then `true` on the chosen date).
  - [ ] **Stop rule during W3:** if there are ≥ 2 complaints in the session, or the complaint rate is above 0.3% once cumulative sends reach 300, or `bounced` rows are above 5% once sends reach 300 (KPI-7), unset `MY_LEGISLATORS_SEND`, redeploy, and open a fix WP. Each complaint already suppresses that recipient automatically (webhook).
- **Rollback:** unset `MY_LEGISLATORS_SEND` and redeploy to stop sends, then revert the PR.

---

### WS7-09d · Offer the weekly email to signed-in visitors after a lookup and in preferences

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | WS7-09a, WS3-05a | T5, C5, U10, U6 |

- **Program class:** Core
- **Owner decision:** none for structure. The owner reviews final copy in the PR, and the agent uses the defaults below.
- **Data-limit impact:** none. No geocoder calls beyond the lookup the visitor already ran.
- **Ongoing cost:** small. One component and edits to two existing components.
- **Why:** The subscription must be offered at the moment of the one behavior people repeat, right after they find their legislators (T5).
- **Current state (verified 2026-10-06):**
  - `src/components/members/DistrictMapExplorer.tsx` (964 lines): `LookupType = 'zip' | 'address' | 'map_click'` (~72); `resolvePoint` (~333–352) sets the selected House and Senate districts and fires `trackDistrictMapLookup`; `SignupCta` renders under the result (~926–933).
  - WS3-05a keeps `lastLookupType: LookupType | null` as state in `DistrictMapExplorer.tsx` (set in `resolvePoint`) and exports the `LookupType` type. Pass `lastLookupType` to `MyLegislatorsOptIn` as a prop.
  - `src/components/civic/SignupCta.tsx` renders nothing when signed in.
  - `src/components/profile/ProfileNotificationsSection.tsx` holds the digest settings UI.
- **Do:**
  1. Create `src/components/civic/MyLegislatorsOptIn.tsx` (client). When signed in, render it only when both districts are resolved and the last lookup type is `address` or `map_click`. For a `zip` lookup, render `Use your full address to pick one district before setting up the weekly email.` instead (WS3-05a: every ZIP result is unresolved). When signed out, render nothing (WS7-09f adds that state).
     - Title: `Weekly email about your legislators`
     - Body: `One email a week, sent only when there is something to report: how your House and Senate members voted, bills they sponsor that moved, and their upcoming committee meetings. We save your district numbers, not your address.`
     - Button: `Email me weekly`. When on: `Weekly email is on for House District {h} and Senate District {s}` and a `Turn off` text button.
     - Unverified account: `Verify your email address to get this email.` with no button.
     - On select, PATCH `/api/me/preferences`. Show the plain error text the API returns for 400, 403, 429 and 500.
     - Export a `focusOptIn()` handle (or accept an `autoFocus` prop) for WS7-09f's intent consumer.
  2. In `DistrictMapExplorer.tsx`, render `MyLegislatorsOptIn` above `SignupCta`. Never auto-subscribe. Consent is the button.
  3. In `ProfileNotificationsSection.tsx`, add a "Weekly email about your legislators" row: districts, on/off, and a `Change districts` link to `/members/map`.
  4. **Analytics.** Add `trackMyLegislatorsOptIn({ action: 'on' | 'off', surface: 'district_map_result' | 'profile' | 'email_link' })` to `src/lib/analytics.ts`, capturing event `my_legislators_opt_in`. No districts and no other properties (WS2-09a).
  5. **Privacy.** Add a line to `/privacy` "What we collect" (or via WS2-09b): `If you turn on the weekly legislator email, your House and Senate district numbers.`
  6. Screenshots at 390 px and 1440 px: signed in (off), signed in (on), unverified, and a ZIP result.
- **Don't:** store the address, ZIP or coordinates; subscribe without a button press; redesign the map page (WS6); change register or login (WS2-03, WS6-12a); touch the U7 form layout (WS6-01).
- **Acceptance criteria:**
  - [ ] The opt-in renders only when signed in with both districts resolved from an address or map click. A ZIP result shows the address prompt (code review of the single condition, plus screenshot).
  - [ ] Copy passes the voice-guide checks: no em dash, no semicolon, "select" not "click".
  - [ ] `grep -n "trackMyLegislatorsOptIn" -A8 src/lib/analytics.ts` shows a payload with only `action` and `surface`.
  - [ ] Screenshots attached for all four states at both widths, or marked "owner to screenshot on preview".
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above. Signed-in states need a session against a dev or preview backend; otherwise they are Owner checks on the preview: run a lookup, turn the email on, and check GET `/api/me/preferences` shows the districts.
- **Owner actions:** review copy; run the preview check.
- **Rollback:** revert the PR. Stored preferences stay, and sends stop only via `MY_LEGISLATORS_SEND`.

---

### WS7-09f · Let signed-out visitors start the weekly email from an email link

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS7-09d, WS6-12a | U10, T3, C5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none beyond WS6-12a's. If WS6-12a's decision is (c) "do not add", this WP is closed as blocked, and WS7-08 records "shipped, signed-in only".
- **Data-limit impact:** one auth email per request, through WS6-12a's flow and its cooldowns and flag. It shares the Resend pool if Supabase SMTP is Resend (counted in WS7-09c's reserve). Agent: 0 emails. Owner test: at most 2 emails.
- **Ongoing cost:** about 0. It reuses WS6-12a's `EmailLinkForm` and intent parser.
- **Why:** With 16 accounts in four months (T3), an account form in front of the opt-in would make the subscriber count measure the account funnel instead of demand for the email (C5, U10). The email link removes the form. KPI-5 (matched lookups) is the denominator for opt-in conversion in W4, so no impression event is needed.
- **Current state (verified 2026-10-06):** WS6-12a (W2) creates `src/lib/auth/email-link.ts` with `parseAuthIntent` accepting `weekly:<house>-<senate>` (House 1–100, Senate 1–38) and `emailLinkEnabled()`, and `src/components/auth/EmailLinkForm.tsx` with `next`, `intent` and `submitLabel` props. `/auth/verify` forwards `intent` and `from=email-link` to `next`. WS6-12a step 5 renders the form on the lookup result itself if WS7-09d merged first. WS6-02 step 4 sets interim `SignupCta` copy on the map result.
- **Do:**
  1. **Signed-out state** of `MyLegislatorsOptIn` (same visibility rule as WS7-09d: both districts from an address or map click, and `emailLinkEnabled()`): the same title and body, then `EmailLinkForm` with `intent: weekly:<h>-<s>`, `next: '/members/map'` and `submitLabel: 'Email me a link to start the weekly email'`. If WS6-12a already rendered this form on the result, reuse its placement and do not render it twice.
  2. **Intent consumer** on `/members/map`: when the URL has an `intent` that `parseAuthIntent` reads as `weekly`, and a session exists, preselect those districts in `MyLegislatorsOptIn`, scroll it into view and focus its `Email me weekly` button. **Do not** auto-subscribe (WS6-12a's contract). Remove `intent` and `from` from the URL with `history.replaceState`. If the visitor then selects the button, call `trackMyLegislatorsOptIn({ action: 'on', surface: 'email_link' })`.
  3. **`SignupCta` body** on the map result (replacing WS6-02's interim text): `With a free account you can get a weekly email about how they vote, the bills they sponsor and their committee meetings.` Keep the register link as the secondary path.
  4. **Tests:** a pure `weeklyIntentToDistricts(search)` helper (in `src/lib/my-legislators-intent.ts`, built on `parseAuthIntent`): valid, out of range, malformed, a bill intent ignored.
- **Don't:** auto-subscribe; add an auth route; change `email-link.ts` or `/auth/verify` (WS6-12a); store intents server-side.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 4 new tests.
  - [ ] With `NEXT_PUBLIC_EMAIL_LINK_ENABLED` unset, the signed-out opt-in shows nothing but the `SignupCta` (screenshot).
  - [ ] The consumer contains no call to PATCH `/api/me/preferences` (code review).
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass. Copy has no em dash or semicolon.
- **Verify:** plain container: the commands above. End to end on the preview (Owner): look up an address signed out, request the link on a laptop, open it on a phone, land on `/members/map` with the button focused, select it, and confirm GET `/api/me/preferences`.
- **Owner actions:** the preview test (at most 2 emails).
- **Rollback:** revert the PR. The signed-out state returns to `SignupCta` only.

---

### WS7-10 · Remember my legislators on this device and show them on the home page

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | M | WS3-05a | T5, T2, C5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** ship it or not.
  - **Options:** (a) ship it: districts stored in the browser only, after an explicit `Remember` button; (b) skip it, and rely on the email as the only retention mechanism.
  - **Recommended:** (a). It costs no server data and gives returning visitors their legislators in one step. WS6-18 also reads this store to show "your" members first on roll calls.
  - **Default:** (a) by **2026-11-16**.
- **Data-limit impact:** none. It reuses the roster endpoint the map already calls.
- **Ongoing cost:** small. One storage helper, one component, no server state.
- **Why:** 79% of visitors view one page and almost none return (T2). The one repeated intent is "who are my legislators" (T5). A device-only save gives a return visitor that answer without an account or new personal data (C5).
- **Current state (verified 2026-10-06):**
  - `DistrictMapExplorer.tsx`: `houseByDistrict` / `senateByDistrict` maps (~275–293) and `resolvePoint` (~333).
  - The home page is composed in `src/app/page.tsx`: `HomePageContent` (~42) receives an `authHero` slot, and `LandingPersonalStrip` (~53) is rendered only inside the signed-in `returningHero`. `src/components/home/HomePageContent.tsx` renders `{authHero}` first (~30).
  - Existing localStorage keys use the `kyv:` prefix with try/catch (`src/lib/use-persisted-page-size.ts` ~9).
  - `/api/roster/members` returns `{ roster }` (`src/app/api/roster/members/route.ts`).
  - WS6-18 (W2) reads `readSavedDistricts()` from `src/lib/saved-districts.ts` (`{ house, senate, savedDay }` under `kyv:myDistricts`) if this WP has merged, and never writes.
- **Do:**
  1. Create `src/lib/saved-districts.ts`, no React. Export `SAVED_DISTRICTS_KEY = 'kyv:myDistricts'` and `readSavedDistricts`, `saveDistricts`, `forgetDistricts`, all SSR-safe with try/catch, storing `{ house: number | null, senate: number | null, savedDay: 'YYYY-MM-DD' }` and validating House 1–100 and Senate 1–38. This is the **only** module that touches the key.
  2. On the map result, when both districts are resolved from an address or map click (never a ZIP, WS3-05a), show a text button `Remember my legislators on this device`. After saving, show `Saved on this device only. We do not store your address.` with a `Forget` button. Never save without the button.
  3. Create `src/components/home/MyLegislatorsCard.tsx` (client). If saved districts exist, it renders the two current members, resolved from `/api/roster/members`, linked to their profiles, with `Change` (to `/members/map`) and `Forget`. For a district with no current member: `No current member is listed for {House|Senate} District {n}.` It renders nothing when nothing is saved. Place it in `HomePageContent.tsx` directly after `{authHero}`, so it shows for signed-in and signed-out visitors (WS6-10 keeps it under the hero).
  4. **Analytics.** Add `trackSavedDistricts({ action: 'save' | 'forget' | 'card_click' })` and `posthog.register({ has_saved_districts: true | false })`. No district numbers.
  5. **Privacy.** Add a line to `/privacy` (or via WS2-09b): `If you choose to remember your legislators, your district numbers are saved in your browser only and are not sent to us.`
  6. **Tests:** `src/lib/saved-districts.test.ts`, importing `SAVED_DISTRICTS_KEY` rather than repeating the literal: round trip, invalid ranges, malformed JSON, missing storage, throwing storage.
- **Don't:** send saved districts to the server or to PostHog; auto-save; store address, ZIP or coordinates; redesign the home page.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 6 new tests.
  - [ ] `grep -rln "kyv:myDistricts" src | grep -v '\.test\.ts$'` prints only `src/lib/saved-districts.ts`.
  - [ ] No request on save carries district numbers (Playwright request log with `npm run start`, or an Owner check).
  - [ ] Screenshots at 390 px and 1440 px: map result (unsaved and saved), and home with and without the card.
  - [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- **Verify:** plain container: the commands above, and `npm run start` for screenshots. The roster fetch needs Supabase anon env; without it, mark the screenshots "owner to confirm".
- **Owner actions:** confirm the decision; check the home card on the preview.
- **Rollback:** revert the PR. Values left in browsers are inert. WS6-18 skips its saved-district rows when the helper is absent.

---

### WS7-14 · Record the October and election-period readout for the partner brief

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS7-01, WS7-06 | T1, T5, T6, C8, O3 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** PostHog read-only aggregate queries (agent with MCP access, or owner). Supabase counts are Owner-run.
- **Ongoing cost:** none. One docs PR.
- **Why:** The election is the only high-demand period before the session (C8), and WS8-10's partner brief and WS8-11's conversations run in W2. Without this readout the brief would cite stale or unfiltered figures, and the election-week "how did my rep vote" demand would go unrecorded until it is too late to use it (O3).
- **Current state (verified 2026-10-06):** `docs/metrics.md` does not exist yet (WS7-01). The latest filtered figures are T1's Sep and Oct 1–6 numbers.
- **Do:** by **2026-11-10**, in one docs-only PR to `docs/metrics.md`:
  1. Add the **October 2026** ledger row with the exact WS7-01 queries.
  2. Add an **election-period** row for 2026-10-20 → 2026-11-04 (UTC days, end exclusive at 2026-11-05 00:00 UTC): KY human visitors per ISO week, lookup rate (KPI-5), and the top 5 landing page types (first `$pageview` path grouped by route pattern, for example `/members/[slug]`, `/bills/[slug]`, `/members/map`; aggregates only). Add the query for page types under Queries as a context query.
  3. Add week-1 return (KPI-3) for the cohorts of the ISO weeks starting 2026-10-19 and 10-26, or "not final until <date>" if run before then.
  4. Add the "Legislator page intent" survey's final aggregate counts and stop date, as the owner supplies them (WS7-06).
  5. Add the October and election-period rows to **Citable figures** with "as of" dates and exact wording, for WS8-10.
- **Don't:** change definitions; create PostHog artifacts; change code; add personal data.
- **Acceptance criteria:**
  - [ ] Both rows exist with query dates, or cells marked "Owner to run".
  - [ ] Citable figures include at least the election-period weekly KY human visitors and lookup rate.
  - [ ] Apart from this WP's TRACKER.md row (manual §8), `git diff --stat` touches only `docs/metrics.md`.
- **Verify:** plain container: `npm test`, `npm run lint`. PostHog read access (agent or owner).
- **Owner actions:** run the Supabase counts; supply the survey counts; tell the WS8-10 author the rows are ready.
- **Rollback:** revert the PR.

---

### WS7-11 · Run the pre-session measurement and email readiness drill

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Sonnet | S | WS7-01, WS7-07b, WS7-08, WS7-14; WS7-09c and WS7-09d if shipped | T3, T7, C5 |

- **Program class:** Core
- **Owner decision:** the date to set `MY_LEGISLATORS_SEND=true` (only if the email shipped at the cut line).
  - **Options:**
    - (a) **the first Monday after the drill passes** (earliest Monday 2026-12-21). This is a launch to real subscribers during FZ. Manual §2 limits FZ to fixes, drills and readiness, so (a) is **not allowed unless** the owner first adds an explicit owner-only exception to manual §2's FZ row: "the owner may turn on an already-merged, already-drilled feature by env flag". The owner records that exception before setting the flag. No agent adds it or relies on it.
    - (b) **Tuesday 2027-01-05**, session day 1 (W3). The owner sets the flag and redeploys on 2027-01-05 before the 11:00 UTC cron run. Under WS7-09c's `isDue` rule, every subscriber with no prior send is due, so the first sends go out at that run (subscribers with empty content are skipped). After that the weekly cadence is Mondays, starting **Monday 2027-01-11**. If the flag is set after 11:00 UTC on 01-05, the first sends go out at the next day's run.
    - (c) **Monday 2027-01-11.** First sends on the first Monday of the session.
  - **Recommended:** (b). It keeps FZ to drills and readiness, as manual §2 requires. The drill's allowlist test send (step 4) already sends a real email to the owner through the production path before session. The first real sends land on session day 1. They will likely list the opening week's committee meetings and few or no votes, and subscribers with nothing to report are skipped (`isEmpty`).
  - **Default:** (b) if the drill passes and the owner has not answered by **2026-12-28**. If the drill fails, the flag stays unset, and the failures go to a fix WP under the manual's W3 small-fix rule.
- **Data-limit impact:** PostHog read queries. Resend: allowlist-mode test sends only, at most 3 per run by code (WS7-09c), and at most 2 runs.
- **Ongoing cost:** none. A one-time checklist.
- **Why:** FZ allows drills and readiness only. Session measurement depends on the queries, the campaign labels, the delivery states and the weekly email working on day one (T7). There is no second chance to measure the first weeks.
- **Current state (verified 2026-10-06):** none of the dependent WPs exist yet. If WS7-01, WS7-07b, WS7-08 or WS7-14 has not merged, stop and report (manual §9). If WS7-08 records "deferred to W5", skip steps 4–5.
- **Do:**
  1. Re-run every decision-KPI query for **November 2026** and add the November ledger row. Note any query that errors.
  2. Confirm that `utm_medium = 'email'` pageviews exist since WS7-05 or WS7-09b (aggregate count). If none, record that; digest sends may be zero.
  3. Confirm pre-registration: run the `git log -S` check from WS7-08's acceptance criteria, and the same check for WS8-08's section title in `docs/evaluation/README.md`. Record both dates in the PR.
  4. Write this checklist in the PR body for the owner:
     - [ ] Manual `GET /api/cron/notify?dryRun=true` with the bearer: record `myLegislators.usersConsidered`, `due`, `wouldSend`.
     - [ ] **Test send:** set `MY_LEGISLATORS_SEND=<your own user id>` (allowlist mode) in Vercel production and redeploy. The next scheduled 11:00 UTC run sends to you only (at most 3 by code). Do not call the route non-dry by hand, because that also runs the bill digest. After the run, set the variable back to empty (or to `true` on the date chosen above) and redeploy.
     - [ ] Render check in two mail clients, light and dark (`docs/email-client-qa.md`).
     - [ ] The log row has `kind = 'my_legislators'` and status `sent`, not `bounced` or `complained`, and Resend's dashboard shows it delivered [verify the dashboard label].
     - [ ] `Stop this weekly email` turns off only `my_legislators_weekly` (GET `/api/me/preferences` shows the digest unchanged), and the page shows the list-specific copy.
     - [ ] `Unsubscribe from all email` turns off both, and re-enabling the digest does not turn the weekly email back on.
     - [ ] One-click unsubscribe (`List-Unsubscribe-Post`) works from a client that offers it.
  5. Add the **December** ledger row on or after 2027-01-02, as a follow-up commit to this PR if it is still open, otherwise in WS7-12's first PR.
- **Don't:** change code (FZ); send to anyone but the owner before the chosen enable date; set `MY_LEGISLATORS_SEND=true` during FZ unless the owner chose (a) and the manual §2 exception is recorded.
- **Acceptance criteria:**
  - [ ] The November ledger row is filled, or each cell is marked with the reason.
  - [ ] Both pre-registration dates are recorded and are before 2027-01-05.
  - [ ] If the email shipped: the owner checklist is complete with results, or failures are listed with a fix WP opened.
- **Verify:** PostHog read access (agent or owner). The send steps need production secrets (Owner).
- **Owner actions:** the checklist in step 4, and the enable date (default (b): set `MY_LEGISLATORS_SEND=true` and redeploy on 2027-01-05 before 11:00 UTC). Choosing (a) also requires the owner to add the owner-only FZ exception to manual §2 first.
- **Rollback:** not applicable (docs). If a send step fails, set `MY_LEGISLATORS_SEND` to empty and redeploy.

---

### WS7-12 · Record the in-session monthly readouts

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W3 | Sonnet | S | WS7-11 | T7, T2, T3, C5 |

- **Program class:** Core
- **Owner decision:** none. Definitions are fixed by WS7-01 and the protocol by WS7-08.
- **Data-limit impact:** PostHog read queries; Supabase aggregate counts (Owner).
- **Ongoing cost:** about 1 h per readout, two readouts. It **replaces** ad-hoc dashboard checking during session.
- **Why:** The session is the only real measurement window (T7). Monthly rows keep the record honest and catch an email problem (complaints, bounces, zero visits) while it can still be fixed.
- **Current state (verified 2026-10-06):** depends on `docs/metrics.md` (WS7-01) and the protocol (WS7-08).
- **Do:** on or after **2027-02-02** and again on or after **2027-03-02**, one docs-only PR each:
  1. Add the previous month's ledger row with the exact queries (plus the December row in the first PR if WS7-11 did not add it). Do not edit definitions.
  2. Open the PR with KPI-6/KPI-7 Supabase cells marked "Owner to run". After the owner pastes the counts, compute the stop-rule numbers (cumulative complaints, complaint rate and bounce rate once sends ≥ 300) in a follow-up commit. If a stop rule trips, say so at the top of the PR and add an Owner action to unset `MY_LEGISLATORS_SEND` and redeploy.
  3. Add three or fewer factual sentences under the row, such as "Week-1 return for the last January cohort is final on 02-08." No verdicts.
- **Don't:** change definitions or the protocol (amendments go through WS8-08's ADR rule); create PostHog artifacts; change code.
- **Acceptance criteria:**
  - [ ] Ledger rows for Jan and Feb 2027 (and Dec 2026) exist with query dates.
  - [ ] Stop-rule numbers are reported, or "email deferred" per WS7-08.
  - [ ] Apart from this WP's TRACKER.md row (manual §8), `git diff --stat` touches only `docs/metrics.md`.
- **Verify:** PostHog read access (agent or owner). Supabase counts are Owner.
- **Owner actions:** paste the Supabase counts; act on any stop rule.
- **Rollback:** revert the PR.

---

### WS7-13 · Fill measured values for the April decision

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 | Sonnet | S | WS7-12, WS8-08 | T7, T2, C5, C7, O3, O4 |

- **Program class:** Core
- **Owner decision:** none in this WP. The go / partner / maintain decision belongs to WS8-16, against WS8-08's thresholds.
- **Data-limit impact:** PostHog read queries; Supabase aggregate counts (Owner).
- **Ongoing cost:** none.
- **Why:** The April decision should rest on numbers measured exactly as pre-registered (O4). WS7 supplies the measurements. Producing a verdict here would create a second answer to WS8-16's question.
- **Current state (verified 2026-10-06):** depends on WS7-08, WS7-12 and WS8-08.
- **Do:**
  1. On or after **2027-04-01**, add the March ledger row, and week-1 return for the cohort of the ISO week starting 2027-03-29 once final (on or after 2027-04-12).
  2. Add a section `2027 session measured values` to `docs/metrics.md` (≤ 50 lines): one row per WS8-08 metric that WS7-08 mapped to a KPI, with the measured value, query name, query date, and "not measured" plus a reason where needed (for example "deferred" under WS7-08's cut-line status). Leave the WS5-13, WS4-16, WS3 and WS8-11 rows to those owners.
  3. Add the email consolidation inputs: weekly-email subscribers on 2027-03-30 (KPI-6) and unique bill-digest recipients in March 2027 (KPI-7).
  4. Add the total net non-test lines WS7 added under `src/` (sum of the figures stated in each WS7 PR) for DoD #8.
  5. Add one paragraph of limitations (identity per browser, geolocation, small n).
  6. Hand the section link to WS8-16 in the PR body by **2027-04-15**.
  7. In `DEFERRED.md`, fill the W4 status (`fired` / `not fired` / `revived`) of the WS7 rows only. Filling a status is not a verdict.
- **Don't:** apply thresholds or state a verdict; redefine KPIs; write partner-facing prose (WS8).
- **Acceptance criteria:**
  - [ ] Every WS8-08 metric mapped to a KPI has a value or "not measured" with a reason.
  - [ ] `sed -n '/2027 session measured values/,/^## /p' docs/metrics.md | grep -niE "verdict|partner track|maintain mode"` prints nothing.
  - [ ] Merged by **2027-04-15**.
  - [ ] Every WS7 row in `DEFERRED.md` has a W4 status, and no other workstream's row was changed.
- **Verify:** PostHog read access (agent or owner). Supabase counts are Owner.
- **Owner actions:** run the Supabase counts.
- **Rollback:** revert the PR.

---

## Deferred

These rows are mirrored in the WS7 section of `DEFERRED.md`, where WS7-13 fills their W4 status.

| Item | Reason | Revisit trigger |
|---|---|---|
| Open tracking (pixels) and Resend click tracking (seed idea for T3) | Contradicts `/privacy` ("We do not embed tracking pixels"). Opens are unreliable. Per-recipient click history is new personal data for a 4-person list. Campaign labels (WS7-05, WS7-09b) answer the real question. | Subscribers > 500 **and** the owner decides to change the privacy promise after the WS2-13 legal review. |
| `delivered` / `delayed` log states, a full precedence table and `delivery_updated_at` (former WS7-07 scope) | 26 lifetime sends (T3). The stop rule needs only complaints and bounces, which WS7-07b records. | Logged sends exceed about 500 a month. |
| App-side returning-visitor marker and a retargeted PMF survey (former WS7-06 code: `markVisitDay`, `first_seen_day`, `kyvky_returning`) | Returning visitors are 1–3% (T2), so the survey would stay below n = 40, and KPI-3 already measures return. | The owner chooses WS7-06 (a) or (b), or WS8-16 continues the project and KPI-3 exceeds 5%. Build in W2 or W5, never in an election or session window. |
| PMF score as a funder metric (T8) | Too few eligible respondents. | A retargeted survey reaches 40 responses. |
| Remove the weekly-email code and columns (W5) | WS8-08's email consolidation rule, adopted from WS7-08 step 3. | WS8-16 records weekly-email subscribers below WS8-08's floor (20). |
| Fold followed-bill events into the weekly email and retire the separate digest (W5) | One email product and one window logic instead of two. | Weekly-email subscribers on 2027-03-30 exceed unique bill-digest recipients in March 2027. |
| Building the weekly email after the cut line | No new email product in FZ or W3. | WS7-08 recorded "deferred to W5" and WS8-16 continues the project. |
| A per-legislator "follow" (retired WS6-13) | Districts survive the January 2027 seating. One subscription model only. | Readers ask to follow a legislator outside their districts (for example a committee chair) and the weekly email is above WS8-08's floor. The builder can then union follows with districts. |
| Email-only subscription with no account (WS7-09a option (c)) | WS6-12a's email link gives a one-field path that reuses account verification, suppression and export. | WS6-12a is not built (decision (c)) **and** W4 shows many matched lookups (KPI-5) with few opt-ins. |
| Legislator social handles (handoff Task 4) | About 138 manual entries and ongoing upkeep (E13) on a trust surface, with little evidence of demand (39 outbound profile clicks in five weeks [verify]). | A partner supplies a maintained, sourced handle dataset. |
| `outbound_link_clicked` event (handoff Task 2) | Autocapture already records these clicks, and a query answers it (WS7-01 step 5). | Autocapture is turned off. |
| Per-user digest timezone and digest send-time review (`TASKS.md` ~401, ~635) | Both wait for open-rate data, which WS7 deliberately never collects. | Reader feedback about send time, or email-attributed visits by hour (KPI-7) show a clear pattern in W4. |
| Welcome-email iconography (`TASKS.md` ~421, routed to WS7 by WS6's Deferred) | Cosmetic, on an email sent a few times a month. WS7-05 touches only the welcome email's link labels. | Welcome emails exceed 50 a month. |
| A second analytics source to cross-check PostHog (T10) | A new vendor (restraint rule). The `docs/metrics.md` ledger is the durable record. | PostHog pricing or terms change, or partner due diligence asks for a second source. |

## TASKS.md reconciliation

| `TASKS.md` item | Disposition |
|---|---|
| ~17 "Tier 1, analytics-driven re-prioritization" | **Closed by WS7-01** (handoff status table). |
| ~23 "PMF survey — fix trigger timing" | **Superseded by WS7-06** (survey stopped by default). |
| ~36 "Correct the 97% figure everywhere it is load-bearing" | **Folded into WS7-03.** |
| ~40 "Measure one real session before revisiting Push" | **Kept**, owned by WS4-15/WS4-16. WS7-08's protocol cross-references it. |
| ~401 "Per-user digest timezone … deferred (Nov 2026 / open-rate data)" | **Superseded**: no open-rate data will exist (WS7-05). See Deferred. |
| ~421 "Welcome-email cards should carry the landing page's iconography" | **Dropped** for now. See Deferred. |
| ~635 "Follow-up — verify digest send time" | **Superseded**, same reason as ~401. |

## Findings re-checked

- **T3 (opens and clicks not tracked):** confirmed, and it is deliberate. `src/app/privacy/page.tsx` ~line 49 promises no tracking pixels. The seed's "digest open/click tracking via the Resend webhook" was re-scoped to first-party campaign labels (WS7-05, WS7-09b).
- **T3 (delivery data):** worse than stated. The webhook stores `delivered` as `sent`, `delivery_delayed` as `failed` and complaints as `bounced`, and writes unconditionally (`src/app/api/webhooks/resend/route.ts` ~64–95, ~145). WS7-07b fixes what the stop rule and the digest window need; the rest is deferred.
- **New, privacy (S10, fixed here because WS7 owns the table):**
  - `/api/me/export` selects `digest_frequency`, `event_count` and `created_at` from `ky_notifications_log`, which no migration creates (019, 041). Because the route returns 500 when any sub-query errors (~29–34), the **whole** export likely fails for every user [verify on production by downloading an export]. It also omits committee follows. WS7-07a fixes both.
  - `/privacy` promises a one-year trim of `ky_notifications_log`, but no code deletes rows. WS7-07b fixes it, from the notify route rather than inside `runBillDigestCron` (which returns early on most days and is also called by `scripts/preview-bill-digest.ts`).
- **T6 (bots):** characterized by an aggregate query on 2026-10-06 [verify: PostHog UI/MCP, read 2026-10-06 by spec author]. `posthog-js` 1.396.9 already drops `navigator.webdriver` and known bot user agents, so app-side bot tagging (a seed idea) would add nothing. Exclusion is query-side (E-auth-bot) plus the KY-geolocated headline.
- **T8 (PMF targeting):** `TASKS.md` line ~23 says person-property targeting "only matches identified persons under the current identified-only profile setting". The code sets `person_profiles: "always"` (`instrumentation-client.ts` ~31), so anonymous persons carry properties. A further cause of low n: the only trigger is `search_performed` (about 1.7% of visitors). WS7-06 stops the survey by default.
- **T10 (internal filter):** `docs/analytics-internal-traffic.md` says to filter by email; the real filter is cohort 339637 plus a `vercel.app` rule [verify]. WS2-09a's removal of email traits breaks nothing; the doc is wrong (WS7-02a).
- **Session recording:** the spec author read the PostHog project setting as on, triggered by `user_registered`, with canvas and console capture [verify: PostHog UI/MCP, read 2026-10-06 by spec author]. This is **not** a verified answer for WS2-09b; its owner action confirms it.
- **WS3-05 candidate lists:** WS3-05a lists no candidate districts for a ZIP, so WS7-09d, WS7-09f and WS7-10 treat every ZIP lookup as unresolved.
- **Member-profile loaders:** they do not accept a caller's client and do not return yes/no buckets. They create their own anon client, default to the current session (which flips on 2027-01-05), cap at 200 rows, and return `yea|nay|nv|absent|unknown`. WS7-09e therefore loads window-scoped data once per run and maps it in pure code.
- **Welcome email logging:** the welcome email never writes `ky_notifications_log` (only `run-bill-digest-cron.tsx` inserts, ~619 and ~630), so it cannot be used to check log states, and its sends are invisible to the send budget. WS7-07b verifies with a digest send, and WS7-09c keeps an explicit reserve.
- **Vote arrival lag:** votes are synced once a day with `limit=5` (`vercel.json` ~49), so the weekly email windows votes by `ky_votes.created_at` (WS7-09b, WS7-09e).
- **Handoff Task 1:** done (PR #268). Only its post-merge validation was open; it is a query in WS7-01.
