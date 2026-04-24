# Know Your Vote Kentucky (KYVK)

A civic transparency platform for Kentucky citizens. Track state bills, local ordinances, school board actions, and county government — all in one place with AI-powered plain-language summaries.

**Deferred — executive orders:** Not part of the MVP while governor.ky.gov listings are unreliable for automated sync (404s, client-only rendering). Revisit when there is a stable index URL, an official feed/API, or a maintainable headless fetch path. The scraper (`src/lib/ky-executive-orders.ts`), DB table, `syncExecutiveOrders()`, and `generateEOSummary()` remain in the codebase for a future re-enable; they are omitted from the product surface, search, intelligence API, automated sync map, and Vercel cron until then.

## 🚀 Quick Start

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

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude (summaries & intelligence scoring)
- **Data Sources**: LegiScan, OpenStates, KY LRC
- **Deployment**: Vercel with cron-based data sync

## MVP scope (public story)

Primary navigation highlights **bills, ordinances, meetings, members, search, and about**. Legacy or experimental tools (explore, live content, table/activity dashboards, etc.) remain reachable by URL for development but use **`noindex`** metadata so they are not promoted in search results.

## Key Features

- **Bill Tracking** — Kentucky General Assembly bills with status, sponsors, and AI summaries
- **Local Ordinances** — City/county ordinance monitoring
- **School Boards** — District-level education policy tracking
- **Intelligence Scoring** — Multi-factor relevance scoring for civic items
- **Plain-Language Summaries** — AI-generated "why this matters" explanations

## Data Sync

Sync sources and status (as of last verification):

| Source | Status | Notes |
|--------|--------|-------|
| bills | Working | LegiScan |
| legislators | Working | OpenStates |
| votes | Working | Requires bills synced first |
| ordinances | Working | Louisville + Lexington via Legistar |
| school-boards | Working | JCPS + FCPS via KSBA portal |
| county-actions | Working | Jefferson & Fayette **Legistar** public calendars (`louisville.legistar.com`, `lexington.legistar.com`); meeting rows sync to `ky_county_actions` |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/bills` | Kentucky bills with filtering |
| `GET /api/search` | Full-text search across all content types |
| `GET /api/intelligence` | Top-scored items with AI analysis |
| `POST /api/sync` | Trigger data sync (Bearer `SYNC_API_KEY` or `CRON_SECRET`) |
| `GET /api/sync` | Without `?source=`: sync status. With `?source=bills` etc.: run that source (used by Vercel Cron; same auth) |

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

| Counter key | Bucket | What it tracks |
|---|---|---|
| `legiscan_query_counter` | `YYYY-MM` | LegiScan API calls this month (30k/month cap) |
| `rate_limit_denies` | `YYYY-MM-DD` | `/api/intelligence` 429s per day |
| `anthropic_cache_hits` | `YYYY-MM-DD` | Anthropic response cache hits |
| `anthropic_cache_misses` | `YYYY-MM-DD` | Anthropic response cache misses |

These counters feed the `/admin/sync-status` dashboard (see 3a.2).

Operator dashboard: `/admin/sync-status` (requires `ADMIN_TOKEN` header)

## Deployment

Set `CRON_SECRET` in Vercel (16+ random characters). Vercel Cron invokes `/api/sync?source=…` with `Authorization: Bearer <CRON_SECRET>`. The sync route also accepts `SYNC_API_KEY` for manual runs. Configure at least one of `CRON_SECRET` or `SYNC_API_KEY`.

Configured for Vercel with automatic cron jobs for data sync (see `vercel.json` for exact schedules):
- Bills, legislators, votes, ordinances, school boards, county actions

Executive-order sync is not scheduled (deferred); see the note at the top of this file.

## Environment Variables

See `env-template.txt` for the full list of required and optional environment variables.

To show **data freshness** on the home, search, bills, and ordinances pages, the anonymous Supabase client must be allowed to **`SELECT` on `ky_sources`** (or the note is omitted silently). Civic tables used for browsing typically already allow read; add a read policy for `ky_sources` if needed.

## License

MIT