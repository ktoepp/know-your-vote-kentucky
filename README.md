# Know Your Vote Kentucky (KYVK)

A civic transparency platform focused on the **Kentucky General Assembly**: browse and search bills, read plain-language AI summaries where enabled, and explore the legislative roster with profiles and an interactive district map. Vercel cron and manual sync also load **local civic datasets** (ordinances, school boards, county meeting calendars) into the database for pipelines and future product surfaces; those sources do **not** yet have first-class browse pages in the public navigation.

**Deferred — executive orders:** Not part of the MVP while governor.ky.gov listings are unreliable for automated sync (404s, client-only rendering). Revisit when there is a stable index URL, an official feed/API, or a maintainable headless fetch path. The scraper (`src/lib/ky-executive-orders.ts`), DB table, `syncExecutiveOrders()`, and `generateEOSummary()` remain in the codebase for a future re-enable; they are omitted from the product surface, search, intelligence API, automated sync map, and Vercel cron until then.

## For AI Agents

**Start here if you're an AI picking up this project.**

- **Current tasks and roadmap:** `[TASKS.md](./TASKS.md)` — always check this first
- **CLI scripts:** see **Local maintenance scripts** under [Quick Start](#local-maintenance-scripts) (`npm run sync:ky`, verify scripts, geo build, etc.)
- **Optional dormant npm deps:** [`docs/legacy-npm-deps/`](./docs/legacy-npm-deps/README.md) — install into gitignored `optional/legacy-npm-deps/`, not the root app
- **This is a Kentucky state legislature app**, not a federal Congress app. All terminology, chamber sizes, and process descriptions must refer to the Kentucky General Assembly (100 House members, 38 Senators, Governor not President, 3/5 veto override threshold)
- **Primary language:** TypeScript / Next.js 15 App Router. No pages router.
- **Styling:** MUI (Material UI) is the primary component library. Tailwind is present but used minimally for the custom tooltip layer.
- **Database:** Supabase (PostgreSQL). Schema in `supabase/migrations/`. Bills and votes flow from LegiScan (`src/lib/ky-legiscan-client.ts`); legislators from Open States (`src/lib/ky-openstates-client.ts`). Orchestration: `src/lib/ky-sync-pipeline.ts`.

### Key files for common tasks


| Task                              | Files                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Tooltip content / definitions     | `src/lib/tooltipContent.ts`                                                        |
| Tooltip on/off toggle             | `src/lib/TooltipContext.tsx`, `src/app/components/Navigation.tsx`                  |
| Tooltip components                | `src/components/ui/Tooltip.tsx`, `src/components/ui/LegislativeStageTooltip.tsx`   |
| Bill status → tooltip key mapping | `src/lib/bill-display.ts` → `billStatusToTooltipKey()`, `billPrefixToTooltipKey()` |
| Bill card (list/browse)           | `src/components/bills/KYBillCard.tsx`                                              |
| Bill detail page                  | `src/app/bills/[id]/page.tsx`                                                      |
| District map                      | `src/components/members/DistrictMapExplorer.tsx`                                   |
| Map member popup                  | `src/components/members/DistrictMapMemberTooltip.tsx`                              |
| Member card (list + map sidebar)  | `src/components/members/MemberCard.tsx`                                            |
| Member profile page               | `src/app/members/[slug]/page.tsx`                                                  |
| Bill stage definitions            | `src/lib/billStages.ts`                                                            |
| Data sync pipeline                | `src/lib/ky-sync-pipeline.ts`                                                      |
| App layout / providers            | `src/app/layout.tsx`                                                               |


### What's hidden / not in nav

- **Events page** (`/events`) — built but hidden from nav. Has known technical debt (some federal terminology in inline term detection). Do not surface until cleaned up.
- **Explore, table, activity, live-content, dashboard, link-dashboard** — legacy/experimental. Reachable by URL but `noindex`. Do not add to primary navigation.
- **Admin** (`/admin/sync-status`) — requires `ADMIN_TOKEN` header. Operator-only.

### Tooltip system architecture

The tooltip layer has two parts:

1. **Custom `Tooltip` component** (`src/components/ui/Tooltip.tsx`) — respects the global `tooltipsEnabled` toggle from `TooltipContext`. Use this for educational jargon tooltips on text/inline elements.
2. **MUI `Tooltip`** — used throughout for UI affordances (card hovers, button hints). Does **not** automatically respect `tooltipsEnabled` — must be gated manually if needed.

Content lives in `src/lib/tooltipContent.ts` (`governmentTooltips` record). Add new terms there; use `getTooltipContent(key)` to retrieve.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase project (for database)
- Anthropic API key (for AI summaries)
- LegiScan / OpenStates API keys (for KY legislative data)

### Installation

```bash
git clone <repository-url>
cd know-your-vote-kentucky

npm install
cp env-template.txt .env.local   # fill in your keys
npm run dev
```

Visit `http://localhost:3000` to see the application.

If `next dev` returns 500s or missing webpack chunks, stop every process on port 3000, then run `npm run dev:clean` (deletes `.next` and starts the dev server).

### Local maintenance scripts

All runnable tooling lives in `scripts/` and is exposed via `package.json`. There is no Jest/Vitest suite; `npm run test:env` only validates that `.env.local` has non-placeholder values for core keys.

| Script | Purpose |
| ------ | ------- |
| `npm run test:env` | Sanity-check `.env.local` (Supabase, LegiScan, OpenStates, sync secret, Anthropic, Mapbox). |
| `npm run sync:ky` | Manual Kentucky sync (see script help / `manual-sync.ts`). |
| `npm run sync:ky:legislators` | Legislator-only sync pass. |
| `npm run sync:ky:sessions` | List LegiScan sessions (helper). |
| `npm run sync:ky:quota` | Bill sync with quota backfill flag. |
| `npm run sync:ky:dry` | Dry-run sync (no writes). |
| `npm run bulk-seed:ky` | LegiScan bulk seed (operator). |
| `npm run check:legiscan-quota` | Print current month LegiScan API usage vs 30k cap. |
| `npm run clear-dataset-hashes` | Clear dataset sync hashes (see script). |
| `npm run db:apply-sql` | Apply SQL from repo when `DATABASE_URL` or password is set. |
| `npm run geo:ky-districts` / `geo:ky-mask` | Rebuild district GeoJSON / outside mask assets. |
| `npm run verify:votes` | Verify LegiScan vote counts vs DB. |
| `npm run verify:legislator-links` | HTTP checks on stored legislator URLs. |
| `npm run slack:smoke-test` | Post a test message to configured Slack webhooks. |

### Optional legacy npm packages

Heavy dependencies removed from the root app (puppeteer, pdf tooling, GCS client, `three`, etc.) are listed in [`docs/legacy-npm-deps/`](./docs/legacy-npm-deps/README.md). Copy that manifest into **`optional/legacy-npm-deps/`** (gitignored), run `npm install` there, and use `npx` or small scripts from that directory when needed. The Next.js app does not depend on that folder.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude (summaries & intelligence scoring)
- **Data Sources**: LegiScan, OpenStates, KY LRC
- **Deployment**: Vercel with cron-based data sync

## MVP scope (public story)

**In the app bar:** **Bills** (with House/Senate shortcuts), **Members**, **District map**, plus a global **Search** field (bill designation or keywords; results on `/search`).

**Footer:** **About** (placeholder `ComingSoonPage` today), **Licenses**.

`/about` is not yet substantive editorial content; treat it as a stub until real copy ships.

Legacy or experimental areas (**`/events`**, explore, live content, table/activity dashboards, etc.) stay reachable by direct URL for development; many use **`noindex`** so they are not promoted in search results. **`/events`** is explicitly deprioritized (hidden from nav, known federal-terminology debt) until cleaned up.

## Key Features (what the public UI emphasizes today)

- **Bill tracking** — Session bills with status, sponsors, committee context, and AI-assisted summaries on bill detail where configured
- **Member roster and profiles** — Active legislators, portraits, sponsored bills, vote summaries, outbound links (LRC, LegiScan, Ballotpedia where available)
- **District map** — Mapbox-backed House/Senate layers and address lookup (Kentucky-biased geocoding)
- **Bill search** — Filtered search UI on `/search`; `GET /api/search` serves bill results for programmatic use

**Backend and APIs (not primary nav):** The **`GET /api/intelligence`** endpoint exposes multi-factor relevance scoring and related helpers from `src/lib/ky-intelligence.ts`. Ordinance, school-board, and county-action sync populate Postgres for operators and future UI; there is no dedicated ordinances/meetings browse route in the App Router today.

## Data Sync

Scheduled jobs are listed in `vercel.json`. The table below is **pipeline** status (data landing in Supabase), not a map of every public page.


| Source         | Status  | Notes                                                                                                                                             |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| bills          | Working | LegiScan                                                                                                                                          |
| legislators    | Working | OpenStates                                                                                                                                        |
| votes          | Working | Requires bills synced first                                                                                                                       |
| ordinances     | Working | Louisville + Lexington via Legistar                                                                                                               |
| school-boards  | Working | JCPS + FCPS via KSBA portal                                                                                                                       |
| county-actions | Working | Jefferson & Fayette **Legistar** public calendars (`louisville.legistar.com`, `lexington.legistar.com`); meeting rows sync to `ky_county_actions` |

Only **bills**, **legislators** (roster/profiles), and **district geometry** are wired into the main navigation experience today; other rows are consumed by sync, reporting, or future features.


## API Endpoints


| Endpoint                | Description                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/bills`        | Kentucky bills with filtering                                                                                |
| `GET /api/search`       | Kentucky bill search (`q`, optional filters); returns bill-shaped results JSON                                 |
| `GET /api/intelligence` | Top-scored items with AI analysis                                                                            |
| `POST /api/sync`        | Trigger data sync (Bearer `SYNC_API_KEY` or `CRON_SECRET`)                                                   |
| `GET /api/sync`         | Without `?source=`: sync status. With `?source=bills` etc.: run that source (used by Vercel Cron; same auth) |


## Operations

### Rate Limiting

`/api/intelligence` is rate-limited to **30 requests/min per IP** using a shared Postgres token bucket so the limit holds across all Vercel serverless instances.

- **Table:** `ky_rate_limit_buckets` (migration `008_ky_rate_limit.sql`)
- **RPC:** `ky_rate_limit_consume(p_key, p_capacity, p_refill_per_sec)`
- **Fail-open:** if Supabase is unreachable the request is allowed through and a warning is logged — the route never hard-fails due to the limiter
- **No new env vars** — backed by the existing `SUPABASE_SERVICE_ROLE_KEY`
- **Deny log format:** `[rate-limit] denied route=<route> ip_hash=<sha256[:8]> remaining=0 retry_after=<n>`

### Observability counters

All counters land in `ky_sync_state` (JSONB payload, bucketed by date) via the `ky_increment_counter` RPC (migration `009_ky_atomic_counters.sql`):


| Counter key              | Bucket       | What it tracks                                |
| ------------------------ | ------------ | --------------------------------------------- |
| `legiscan_query_counter` | `YYYY-MM`    | LegiScan API calls this month (30k/month cap) |
| `rate_limit_denies`      | `YYYY-MM-DD` | `/api/intelligence` 429s per day              |
| `anthropic_cache_hits`   | `YYYY-MM-DD` | Anthropic response cache hits                 |
| `anthropic_cache_misses` | `YYYY-MM-DD` | Anthropic response cache misses               |


These counters feed the **`/admin/sync-status`** operator dashboard (requires `ADMIN_TOKEN` header).

## Deployment

Set `CRON_SECRET` in Vercel (16+ random characters). Vercel Cron invokes `/api/sync?source=…` with `Authorization: Bearer <CRON_SECRET>`. The sync route also accepts `SYNC_API_KEY` for manual runs. Configure at least one of `CRON_SECRET` or `SYNC_API_KEY`.

Configured for Vercel with automatic cron jobs for data sync (see `vercel.json` for exact schedules):

- Bills, legislators, votes, ordinances, school boards, county actions

Executive-order sync is not scheduled (deferred); see the note at the top of this file.

## Environment Variables

See `env-template.txt` for the full list of required and optional environment variables.

To show **`DataFreshnessNote`** (home, search, bills, and any other page that mounts it), the anonymous Supabase client must be allowed to **`SELECT` on `ky_sources`** (or the note is omitted silently). Civic tables used for browsing typically already allow read; add a read policy for `ky_sources` if needed.

## License

MIT