# Know Your Vote Kentucky (KYVK)

A civic transparency platform for Kentucky citizens. Track state bills, local ordinances, executive orders, school board actions, and county government — all in one place with AI-powered plain-language summaries.

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
cd know-your-vote-ky

npm install
cp env-template.txt .env.local   # fill in your keys
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude (summaries & intelligence scoring)
- **Data Sources**: LegiScan, OpenStates, KY LRC
- **Deployment**: Vercel with cron-based data sync

## Key Features

- **Bill Tracking** — Kentucky General Assembly bills with status, sponsors, and AI summaries
- **Local Ordinances** — City/county ordinance monitoring
- **Executive Orders** — Governor's executive actions
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
| executive-orders | Not working | 404 on governor.ky.gov/executive-orders — path may have changed |
| county-actions | Not working | Louisville 403, Lexington 404 — URLs may have changed |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/bills` | Kentucky bills with filtering |
| `GET /api/search` | Full-text search across all content types |
| `GET /api/intelligence` | Top-scored items with AI analysis |
| `POST /api/sync` | Trigger data sync (protected by SYNC_API_KEY) |
| `GET /api/sync` | Check sync status |

## Deployment

Configured for Vercel with automatic cron jobs for data sync:
- Bills: every 2 hours
- Legislators: daily at 6 AM
- Ordinances: daily at 8 AM
- Executive orders: daily at 9 AM
- School boards: weekly on Mondays
- County actions: weekly on Mondays

## Environment Variables

See `env-template.txt` for the full list of required and optional environment variables.

## License

MIT