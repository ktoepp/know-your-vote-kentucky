# KYvKY metrics: definitions, exclusions, queries and ledger

One written definition per KPI, one exclusion rule set, one runnable query per KPI and the dated ledger. Owner: WS7 (WS7-01; monthly rows by WS7-12). **No decision thresholds or verdict rules live here**; they are only in `docs/evaluation/README.md` (WS8-08). PostHog project 450281, timezone UTC. All queries are read-only aggregates: never paste person-level rows into this file.

## Definitions

Decision KPIs get ledger columns. Context KPIs have a query and are run on demand. "After exclusions" means E-test, E-auth-bot and E-internal below.

| ID | KPI | Tag | Definition (unit, period) | Query |
|---|---|---|---|---|
| KPI-1 | KY human visitors | decision | Unique persons with ≥ 1 `$pageview` where `$geoip_country_code = 'US'` and `$geoip_subdivision_1_code = 'KY'`, after exclusions. Per calendar month (UTC) and per ISO week (Monday–Sunday UTC). The month's **weekly median** is the median over ISO weeks whose Monday falls in that month. The in-session weekly median is WS8-08's reach metric. | `kpi-1` |
| KPI-2 | Human visitors | context | KPI-1 without the Kentucky condition. | `kpi-2` |
| KPI-3 | Week-1 return | decision | Among KPI-1 persons whose first `$pageview` since 2026-06-01 falls in ISO week W, the share with ≥ 1 `$pageview` in week W+1, after exclusions. A ledger row pools the cohort weeks whose Monday falls in that month (returned ÷ new). Gating return metric for WS8-08. Each row also records "PostHog retention (no E-auth-bot)" for continuity with T2. | `kpi-3`, `kpi-3-posthog` |
| KPI-4 | 30-day return | context | Among KPI-1 persons whose first `$pageview` falls in month M, the share with a `$pageview` on a different UTC day within 30 days of the first day. Never gating. The Strategy page's KPI (T9). | `kpi-4` |
| KPI-5 | Lookup rate | decision | Share of KPI-1 persons in the period with ≥ 1 `district_map_lookup` where `matched = true`. | `kpi-5` |
| KPI-6 | Accounts and subscribers | decision | Supabase, Owner-run, aggregate counts on the query date: accounts; verified accounts; accounts with ≥ 1 bill or committee follow; accounts with the digest on (`digest_frequency <> 'off'`, not unsubscribed, not suppressed); after WS7-09a, My Legislators subscribers (`my_legislators_weekly`, not unsubscribed, not suppressed, verified). | `kpi-6` (SQL) |
| KPI-7 | Email | decision | Sends per month by `delivery_status` (and by `kind` after WS7-07b), unique recipients per month, `bounced` and `complained` counts (Supabase, Owner-run); plus **email-attributed visitors**: unique persons with a `$pageview` where `utm_medium = 'email'`, by `utm_campaign` (after WS7-05 or WS7-09b). | `kpi-7` (SQL), `kpi-7-visits` |
| KPI-8 | Acquisition mix | context | Share of KPI-1 persons by the referring domain of their first `$pageview` in the period: **search** (Bing, Google, DuckDuckGo, Yahoo, Ecosia, Brave, Kagi, Qwant and any other search domain seen), **direct**, **social**, **partner** (`utm_medium = 'partner'`), **email** (`utm_medium = 'email'`), **other**. | `kpi-8` |
| KPI-9 | Weekly-email opt-in source | decision input (WS8-08 partner signals) | Count of `my_legislators_opt_in` events with `action = 'on'`, by the person's first-touch medium: `partner`, `search`, `direct`, `email`, `other`, from `$initial_utm_medium` and `$initial_referring_domain` (both confirmed in the project's person properties on 2026-11-05). Needs only WS7-09d's event. | `kpi-9` |

**Partner-link convention (T4).** Partner placements link with `?utm_source=<partner-slug>&utm_medium=partner&utm_campaign=<placement>`. `posthog-js` keeps `utm_*` (`save_campaign_params` defaults to true), so KPI-8 and KPI-9 pick these up with no code. **Partner slugs:** _none yet._ List each one (slug, partner, first link date) here before its link goes live.

## Exclusions

Every PostHog query applies all three. In the queries below, `{FROM}` / `{TO}` mark the period literals to edit together.

- **E-test (project test-account filter).** Cohort 339637 "Internal / Test users" (`not_in`) plus `$current_url` not containing `vercel.app`, as set in project settings with `test_account_filters_default_checked: true` (read 2026-11-05). The cohort is: person property `$internal_or_test_user = true`, OR viewed a page whose URL contains `vercel.app` in the last 30 days. HogQL: `person_id NOT IN COHORT 339637` (syntax confirmed by running it, 2026-11-05) and `NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%')`. Typed PostHog queries use `filterTestAccounts: true`.
- **E-auth-bot.** Exclude any person whose `$pageview`s **in the query's period** are all on paths starting `/auth/`, number at most 2, and all have `$referring_domain = '$direct'`. Evidence (T6): about 205 such persons on 2026-09-01 → 10-06, each with one pageview on `/auth/login`, almost all Chrome, mostly Linux from cloud regions. On 2026-11-05 this rule removed 223 persons in Jun–Sep (211 of them in September). `posthog-js` already drops `navigator.webdriver` and known bot user agents client-side.
- **E-internal.** n/a (pre-WS7-02b). Once WS7-02b merges, exclude persons or events carrying its internal marker here and in every query.

## Queries

Shared E-auth-bot block (paste into each query where marked; keep its dates equal to the period):
```sql
  AND person_id NOT IN (SELECT person_id FROM events        -- E-auth-bot
      WHERE event = '$pageview' AND timestamp >= {FROM} AND timestamp < {TO}
      GROUP BY person_id HAVING countIf(NOT (properties.$pathname LIKE '/auth/%')) = 0
         AND count() <= 2 AND countIf(coalesce(properties.$referring_domain, '') != '$direct') = 0)
```

### KPI-1

```sql
-- kpi-1: KY human visitors for one period. Month: edit both dates. Week: Monday to next Monday.
SELECT uniq(person_id) AS kpi1 FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime('2026-09-01') AND timestamp < toDateTime('2026-10-01')
  AND properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY'
  AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%')   -- E-test
  AND person_id NOT IN COHORT 339637                                     -- E-test
  -- E-auth-bot block here, {FROM}/{TO} = the same two dates
  -- E-internal: n/a (pre-WS7-02b)
```

Weekly median: run `kpi-1` once per ISO week whose Monday falls in the month and take the median.

### KPI-2
`kpi-2`: the `kpi-1` query with the line `AND properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY'` removed. Same exclusions.

### KPI-3

```sql
-- kpi-3: KY week-1 return by first-visit ISO week. Window = 2026-06-01 → one week after the last cohort.
WITH pv AS (SELECT person_id, toStartOfWeek(timestamp, 1) AS w,
    (properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY') AS ky
  FROM events WHERE event = '$pageview'
    AND timestamp >= toDateTime('2026-06-01') AND timestamp < toDateTime('2026-10-12')
    AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
    -- E-auth-bot block here, {FROM}/{TO} = the window; E-internal: n/a (pre-WS7-02b)
  ),
pw AS (SELECT person_id, w, max(ky) AS kyw FROM pv GROUP BY person_id, w),
pp AS (SELECT person_id, min(w) AS fw, argMin(kyw, w) AS ky1, groupArray(w) AS ws FROM pw GROUP BY person_id)
SELECT fw AS cohort_week, countIf(ky1 = 1) AS ky_new,
       countIf(ky1 = 1 AND has(ws, addWeeks(fw, 1))) AS ky_returned
FROM pp GROUP BY fw ORDER BY fw
```

`kpi-3-posthog` (continuity only, no E-auth-bot): PostHog → Retention, `$pageview` first time → `$pageview`, period Week, `filterTestAccounts: true`, same window. The project's weeks start on **Sunday** (`week_start_day: 0`), so a row pools cohorts whose Sunday falls in the month.

### KPI-4

```sql
-- kpi-4: KY 30-day return by first-visit month. Window end = last month end + 30 days.
WITH pv AS (SELECT person_id, timestamp AS t,
    (properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY') AS ky
  FROM events WHERE event = '$pageview'
    AND timestamp >= toDateTime('2026-06-01') AND timestamp < toDateTime('2026-10-31')
    AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
    -- E-auth-bot block here, {FROM}/{TO} = the window; E-internal: n/a (pre-WS7-02b)
  ),
pp AS (SELECT person_id, toDate(min(t)) AS d0, argMin(ky, t) AS ky0, groupUniqArray(toDate(t)) AS days
  FROM pv GROUP BY person_id)
SELECT toStartOfMonth(d0) AS first_month, countIf(ky0 = 1) AS ky_new,
       countIf(ky0 = 1 AND arrayExists(x -> x > d0 AND x <= d0 + 30, days)) AS ky_returned_30d
FROM pp WHERE d0 < toDate('2026-10-01') GROUP BY first_month ORDER BY first_month
```

### KPI-5

```sql
-- kpi-5: share of KY human visitors with a matched lookup, one period (edit all dates).
WITH ev AS (SELECT person_id, event, toString(properties.matched) AS matched,
    (properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY') AS ky
  FROM events WHERE event IN ('$pageview', 'district_map_lookup')
    AND timestamp >= toDateTime('2026-09-16') AND timestamp < toDateTime('2026-10-01')
    AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
    -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
  ),
pm AS (SELECT person_id, max(event = '$pageview' AND ky) AS is_ky,
    max(event = 'district_map_lookup' AND matched = 'true') AS looked FROM ev GROUP BY person_id)
SELECT countIf(is_ky = 1) AS kpi1, countIf(is_ky = 1 AND looked = 1) AS kpi1_matched_lookup FROM pm
```

### KPI-6

```sql
-- kpi-6 (Supabase SQL editor, Owner-run, SELECT only). Counts as of the moment it runs.
SELECT
  (SELECT count(*) FROM ky_user_profiles) AS accounts,
  (SELECT count(*) FROM ky_user_profiles WHERE email_verified_at IS NOT NULL) AS verified,
  (SELECT count(*) FROM (SELECT user_id FROM ky_bill_follows
                         UNION SELECT user_id FROM ky_committee_follows) f) AS with_follow,
  (SELECT count(*) FROM ky_notification_preferences
     WHERE digest_frequency <> 'off' AND unsubscribed_all_at IS NULL AND suppressed_at IS NULL) AS digest_on;
  -- After WS7-09a, add verified, not unsubscribed, not suppressed my_legislators_weekly subscribers.
```

### KPI-7

```sql
-- kpi-7 (Supabase SQL editor, Owner-run, SELECT only). Add `kind` to SELECT/GROUP BY after WS7-07b.
SELECT date_trunc('month', sent_at) AS month, delivery_status,
       count(*) AS sends, count(DISTINCT user_id) AS recipients
FROM ky_notifications_log
WHERE sent_at >= '2026-06-01' AND sent_at < '2026-10-01'
GROUP BY 1, 2 ORDER BY 1, 2;
```

```sql
-- kpi-7-visits: email-attributed visitors by campaign (PostHog). Empty until WS7-05 or WS7-09b.
SELECT coalesce(toString(properties.utm_campaign), '(none)') AS campaign, uniq(person_id) AS persons
FROM events WHERE event = '$pageview' AND properties.utm_medium = 'email'
  AND timestamp >= toDateTime('2026-09-01') AND timestamp < toDateTime('2026-10-01')
  AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
  -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
GROUP BY campaign ORDER BY persons DESC
```

### KPI-8

```sql
-- kpi-8: first-touch group of KY human visitors, one period (edit all dates).
WITH pv AS (SELECT person_id, timestamp AS t, coalesce(properties.$referring_domain, '') AS rd,
    coalesce(properties.utm_medium, '') AS um,
    (properties.$geoip_country_code = 'US' AND properties.$geoip_subdivision_1_code = 'KY') AS ky
  FROM events WHERE event = '$pageview'
    AND timestamp >= toDateTime('2026-06-01') AND timestamp < toDateTime('2026-10-01')
    AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
    -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
  ),
f AS (SELECT person_id, argMin(rd, t) AS frd, argMin(um, t) AS fum, max(ky) AS is_ky FROM pv GROUP BY person_id)
SELECT multiIf(fum = 'partner', 'partner', fum = 'email', 'email',
    match(frd, '(^|\\.)(google|bing|duckduckgo|yahoo|ecosia|brave|kagi|qwant|baidu|yandex|startpage)\\.'), 'search',
    frd IN ('$direct', ''), 'direct',
    match(frd, '(^|\\.)(facebook|instagram|linkedin|reddit|threads|bsky|nextdoor|twitter|x)\\.') OR frd IN ('t.co', 'lnkd.in'), 'social',
    'other') AS grp, count() AS persons
FROM f WHERE is_ky = 1 GROUP BY grp ORDER BY persons DESC
```

### KPI-9

```sql
-- kpi-9: weekly-email opt-ins by first-touch medium. Returns nothing until WS7-09d ships the event.
SELECT multiIf(person.properties.$initial_utm_medium = 'partner', 'partner',
    match(coalesce(person.properties.$initial_referring_domain, ''),
          '(^|\\.)(google|bing|duckduckgo|yahoo|ecosia|brave|kagi|qwant|baidu|yandex|startpage)\\.'), 'search',
    person.properties.$initial_referring_domain = '$direct', 'direct',
    person.properties.$initial_utm_medium = 'email', 'email', 'other') AS first_touch, count() AS opt_ins
FROM events WHERE event = 'my_legislators_opt_in' AND properties.action = 'on'
  AND timestamp >= toDateTime('2027-01-01') AND timestamp < toDateTime('2027-02-01')
  AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
  -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
GROUP BY first_touch ORDER BY opt_ins DESC
```

### Tier-1 handoff queries (no new events)

```sql
-- handoff-search-source: Task 1 validation, searches by source for any two-week window.
SELECT coalesce(toString(properties.source), '(none)') AS source, count() AS searches, uniq(person_id) AS persons
FROM events WHERE event = 'search_performed'
  AND timestamp >= toDateTime('2026-10-20') AND timestamp < toDateTime('2026-11-03')
  AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
  -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
GROUP BY source ORDER BY searches DESC
```

```sql
-- handoff-outbound-links: Task 2, outbound clicks on member profiles by destination host (autocapture).
SELECT domain(elements_chain_href) AS host, count() AS clicks, uniq(person_id) AS persons
FROM events WHERE event = '$autocapture' AND properties.$pathname LIKE '/members/%'
  AND elements_chain_href LIKE 'http%' AND NOT (domain(elements_chain_href) ILIKE '%kyvky.com')
  AND timestamp >= toDateTime('2026-09-01') AND timestamp < toDateTime('2026-10-07')
  AND NOT (coalesce(properties.$current_url, '') ILIKE '%vercel.app%') AND person_id NOT IN COHORT 339637
  -- E-auth-bot block here, same dates; E-internal: n/a (pre-WS7-02b)
GROUP BY host ORDER BY clicks DESC
```

## Caveats

- **Identity is per browser.** A return on another device or after cleared storage counts as a new person (KPI-1 to KPI-5).
- **Safari** caps script-set storage for sites not visited in 7 days (WebKit ITP, 2020; not re-checked here), so KPI-3 and KPI-4 undercount iPhone returns.
- **Geolocation is approximate.** Mobile carriers and VPNs can place Kentuckians elsewhere, so KPI-1 undercounts. It also removes most automation and foreign spikes (for example July's overseas spike), which is why it is the headline.
- **The headline is both numbers, Kentucky first** (owner decision 2026-10-06, option (c)): cite KPI-1 and KPI-2 side by side.
- **E-test drifts.** Cohort 339637's `vercel.app` rule looks back 30 days, so re-running an old period can count internal browsers it used to exclude (the cohort held 2 persons on 2026-10-06 and 0 on 2026-11-05). A few Kentucky persons arrive with a Vercel preview or dashboard referrer and are not excluded until E-internal exists. Record the query date with every number.
- **No session baseline.** PostHog starts on 2026-06-01, so the 2026 session (Jan–Apr) was never measured (T7).
- **One analytics source.** PostHog is the only source (T10). This file's ledger is the durable record if the vendor changes.
- **KPI-5 history.** `district_map_lookup` starts 2026-07-13 and its `matched` property on 2026-09-16, so KPI-5 is n/a before 2026-09-16.
- **KPI-6 is a point-in-time snapshot.** Digest and suppression state cannot be rebuilt for past dates.
- **KPI-7.** Until WS7-07b, the webhook stores complaints as `bounced` and delayed mail as `failed`, and welcome emails are not logged.
- **KPI-8.** AI assistants on search domains (for example `gemini.google.com`) count as search.
- **No PMF score** is reported (WS7-06).

## Ledger

Query date 2026-11-05 for every PostHog cell. KPI-3 and PostHog retention show percent (returned/new). KPI-6 and KPI-7 are Owner-run Supabase counts.

| Period | KPI-1 (month) | KPI-1 (weekly median) | KPI-3 | PostHog retention (no E-auth-bot) | KPI-5 | KPI-6 | KPI-7 | KPI-9 | Query date |
|---|---|---|---|---|---|---|---|---|---|
| Jun 2026 | 34 | 8 | 7.7% (3/39) | 2.2% (4/180) | n/a (`kpi-5`: no `matched` before 09-16) | Owner to run (`kpi-6`) | Owner to run (`kpi-7`) | n/a (pre-WS7-09d, `kpi-9`) | 2026-11-05 |
| Jul 2026 | 115 | 32.5 | 2.7% (3/112) | 0.3% (2/684) | n/a (`kpi-5`: no `matched` before 09-16) | Owner to run (`kpi-6`) | Owner to run (`kpi-7`) | n/a (pre-WS7-09d, `kpi-9`) | 2026-11-05 |
| Aug 2026 | 250 | 61 | 2.4% (7/292) | 2.0% (14/702) | n/a (`kpi-5`: no `matched` before 09-16) | Owner to run (`kpi-6`) | Owner to run (`kpi-7`) | n/a (pre-WS7-09d, `kpi-9`) | 2026-11-05 |
| Sep 2026 | 371 | 92.5 | 2.5% (9/353) | 1.5% (13/884) | 12.9% (25/194; Sep 16–30 only) | Owner to run (`kpi-6`) | Owner to run (`kpi-7`) | n/a (pre-WS7-09d, `kpi-9`) | 2026-11-05 |
| Oct 1–6 2026 | 76 | n/a (`kpi-1`: no complete ISO week inside Oct 1–6) | n/a (`kpi-3`: no complete cohort week inside Oct 1–6) | n/a (`kpi-3-posthog`, same reason) | 21.1% (16/76) | Owner to run (`kpi-6`) | Owner to run (`kpi-7`) | n/a (pre-WS7-09d, `kpi-9`) | 2026-11-05 |
| **Jun–Sep 2026 (baseline)** | 757 unique (KPI-2: 2,157) | — | 2.8% (22/796) | 1.3% (33/2,450) | — | — | — | — | 2026-11-05 |

Each month's KPI-1 applies E-auth-bot within that month, so the monthly figures do not sum to the Jun–Sep unique count. Later rows (Oct 2026 → Mar 2027 and the 2026-10-20 → 11-04 election period) are added by WS7-14 and WS7-12.

## Citable figures

Funder and partner copy uses only these rows, with the "as of" date (WS7-03). Kentucky figure first, all-visitor figure beside it.

| As of | Figure | Wording allowed | KPI and query |
|---|---|---|---|
| 2026-11-05 | 757 | "About 760 people in Kentucky visited KYvKY from June to September 2026 (counted by browser, after removing bots and test accounts)." | KPI-1, `kpi-1` (Jun 1 → Oct 1) |
| 2026-11-05 | 2,157 | "About 2,160 people in all visited KYvKY from June to September 2026 (counted by browser, after removing bots and test accounts)." | KPI-2, `kpi-2` (Jun 1 → Oct 1) |
| Owner to fill | Owner to run | "N people have created a KYvKY account." (replace N) | KPI-6, `kpi-6` |
| 2026-11-05 | 12.9% | "About 1 in 8 Kentucky visitors in late September 2026 looked up their own legislators." | KPI-5, `kpi-5` (Sep 16 → Oct 1) |
| 2026-11-05 | 2.8% | "About 3 in 100 first-time Kentucky visitors came back the next week (June–September 2026)." | KPI-3, `kpi-3` |
| 2026-11-05 | 86.5% (655/757) | "Most Kentucky visitors (about 87%) found KYvKY through a search engine (June–September 2026)." | KPI-8, `kpi-8` (Jun 1 → Oct 1) |
