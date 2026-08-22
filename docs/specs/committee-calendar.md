# Committee calendar & Frankfort activity

Status: Active (2026-05-18)  
Owner: Product / data pipeline  
Related: [follow-bills.md](./follow-bills.md), [TASKS.md](../../TASKS.md), [decisions.md](../../decisions.md) § 2026-05-18

## Problem

Kentucky lawmaking continues outside the regular session: interim joint committees, statutory committees, capital oversight, and agendas that reference bills from prior sessions. KYvKY today covers bills (LegiScan), legislators (Open States), and per-bill `committee_name`, but not **scheduled meetings**, **agendas**, or a **committee directory** tied to LRC.

## Product scope

### In scope (General Assembly)

- Bills, legislators, votes (existing LegiScan + Open States)
- LRC [Legislative Calendar](https://apps.legislature.ky.gov/legislativecalendar) — meetings, times, rooms, agenda text, member lists
- Committee detail pages — profile URL, **Meeting Materials** tab (link metadata only in v1)
- Session milestones (concurrence, veto recess) in copy and banners
- `/legislature/resources` — neutral civic index (LRC, KET, Bill Watch, phone lines)
- Bill Watch–informed UX: unified activity feed, follow + digest (see § UX benchmarks)

### Out of scope (paused)

Local government pipelines remain in the codebase for manual operator use but are **not** on Vercel Cron and **not** in default `syncAll()`:

| Source | Tables | Re-enable |
|--------|--------|-----------|
| `ordinances` | `ky_ordinances` | Louisville/Lexington Legistar |
| `school-boards` | `ky_school_board_items` | JCPS/FCPS scraper |
| `county-actions` | `ky_county_actions` | Jefferson/Fayette Legistar calendars |

Also deferred: executive orders sync (see README), `/events` as a mixed-jurisdiction hub until repurposed for GA meetings.

## Data model (planned migrations)

1. **`ky_committees`** — `lrc_rsn`, `committee_type`, `name`, `chamber`, `slug`, `profile_url`
2. **`ky_committee_meetings`** — date, time, location, status, `content_hash`, `source_url`
3. **`ky_committee_agenda_items`** — `raw_text`, parsed `bill_number` + `bill_session_label`, optional `ky_bill_id`
4. **`ky_committee_materials`** (optional v1b) — title, url, meeting link

Bill resolution: regex on agenda text → match `ky_bills` by number + session label (not LegiScan `getBill` per line).

## Ingestion

- **`sync:ky:lrc-calendar`** — cheerio parse of **live** weekly calendar HTML (~5 days visible); idempotent upsert by committee + date + time
- **`backfill:lrc:calendar`** — historical meetings from [Internet Archive](https://web.archive.org) snapshots of the same URL (session start → today); does not spam `hearing_scheduled` digest events unless `--record-hearing-events`
- **Schedule:** 2× daily cron during session/interim (calendar can change the day before per [KRC hub](https://kyrc.org/2026-kentucky-general-assembly/))
- **No API keys** for LRC scrape; Wayback backfill needs network only

## UX phases

| Phase | Deliverable |
|-------|-------------|
| **0** | **Done** — [phase0 report](./committee-calendar-phase0-report.md), `fixtures/lrc/`, parsers, `npm run spike:lrc:calendar` |
| **1** | **Done** — `024_ky_committee_calendar.sql`, `npm run sync:ky:lrc-calendar`, cron 12:00/18:00 UTC |
| **2** | **Done** — `/committees`, `/meetings`, bill detail “Hearings & agendas”, `/legislature/resources` |
| **3** | **Done** — agenda search (`/meetings?q=`), URL filters (`?chamber=`, `?when=`), profile activity (`/api/me/activity`) |
| **4** | **Done** — `hearing_scheduled` digest events from LRC calendar sync (`ky-calendar-hearing-history.ts`) |

## Phase 5+ (deferred)

Scheduled after Bill Watch parity (Wave 1) and launch polish (Wave 2). See [TASKS.md](../../TASKS.md) Wave 3.

| Item | Deliverable |
|------|-------------|
| **Meeting materials** | Migration `ky_committee_materials`; `sync:lrc:committee-materials` crawls committee **Meeting Materials** tab (title, URL, date; no PDF hosting) |
| **Session record** | Spike `apps.legislature.ky.gov/record/{session}/record.html` for floor events not in LegiScan |
| **Session milestones** | `getInterimPeriod()` / concurrence & veto recess copy in `ky-sessions.ts` + home banner |
| **LRC bulk roster** | Revisit if Kentucky publishes machine-readable legislator bulk data |

## UX benchmarks — Kentucky Bill Watch

Reference pack: [`docs/reference/bill-watch/`](../reference/bill-watch/README.md)

- Help: [Premium Bill Watch — Bill Tracking](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm#billtrack)
- Alert types to respect: **Agenda**, Introduction, **Committee**, Enrolled, Floor, **Pre-Filed**, **Interim** (see mapping in `bill-tracking.md`)

KYvKY should exceed Bill Watch with:

- Modern browse/search, district map, vote history
- **One** activity surface (followed bills + hearings), not three legacy columns
- Committee meetings and agendas as first-class data (Bill Watch only filters by committee)
- `hearing_scheduled` digest events fed by LRC calendar (Bill Watch “Agenda Alerts” without a calendar UI)
- Supabase auth (no separate Kentucky.gov account)

Do **not** copy: legacy layout, premium paywall split, session-reset banner pattern, rules wizard UX.

## Costs (GA-focused)

| Service | Committee work | Notes |
|---------|----------------|-------|
| LegiScan | **0** extra for calendar | Existing daily hash-gated bills cron |
| Open States | **0** extra | Weekly legislators |
| LRC HTML | **$0** | Scrape only |
| Resend | Optional phase 4 | Free tier 100 emails/day cap |
| Anthropic | **$0** v1 | No agenda summarization in v1 |
| Mapbox | Unchanged | Map geocodes only |

Track LegiScan usage: `ky_sync_state` → `legiscan_query_counter` (default limit 30,000/month).

## Paused Vercel crons (re-enable template)

Restore in `vercel.json` if local gov returns to product scope:

```json
{ "path": "/api/sync?source=ordinances", "schedule": "0 7 * * *" },
{ "path": "/api/sync?source=school-boards", "schedule": "0 10 * * 1" },
{ "path": "/api/sync?source=county-actions", "schedule": "0 11 * * 1" }
```

## References

- LRC calendar: https://apps.legislature.ky.gov/legislativecalendar
- KRC resource index: https://kyrc.org/2026-kentucky-general-assembly/
- Committees: https://legislature.ky.gov/Committees/Pages/default.aspx
