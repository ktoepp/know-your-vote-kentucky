# /members perf rig — stub + throttled A/B measurement

Measures `/members` interaction responsiveness (typing, Load more, chamber toggle) and
behavior (LRC seat-conflict links, `#hash` deep links) on a **production build** with **no
Supabase credentials** — a local PostgREST stub serves a realistic roster (140 active
members, historical seat-turnover rows, name collisions). Origin story + first results:
TASKS.md § 2026-07-18.

## One-time setup

```bash
npm i --no-save playwright   # driver dep; Chromium comes from your Playwright install
                             # (or set CHROMIUM_PATH=/path/to/chrome)
printf 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=stub-key\n' > .env.local
```

## Run

```bash
npm run perf:members:stub &        # pre-migration-042 DB (no profile_slug column)
# PROFILE_SLUG=1 npm run perf:members:stub &   # post-042 DB (slug column backfilled)

npm run build && npx next start -p 3100 &
npm run perf:members:measure -- 3100 changed   # writes metrics-changed.json + screenshot
```

For an A/B, build the baseline in a worktree and measure it on another port with a
different label:

```bash
git worktree add /tmp/kyvky-baseline <baseline-ref>
ln -s "$PWD/node_modules" /tmp/kyvky-baseline/node_modules
cp .env.local /tmp/kyvky-baseline/
(cd /tmp/kyvky-baseline && npm run build && npx next start -p 3101 &)
npm run perf:members:measure -- 3101 baseline
```

## Member profile driver

`npm run perf:members:profile -- <port> <label>` measures `/members/[slug]`: **stub query
counts cold vs warm** (the honest server metric — each count is one Supabase round trip in
production; the cached data layer should show `{}` for warm views), response times, HTML
payload bytes, and client long tasks at 4× throttle. The stub serves fixture bills,
roll-call votes (RPC `get_votes_for_legislator`), committees, and calendar meeting rows so
the full profile renders. `GET :54321/__stats` (`?reset=1`) exposes the counters.

## What the browse driver asserts / records

- **API payload** (`/api/roster/members`): bytes, row count, inactive rows (should be 0),
  `lrc_district_link_unsafe` + `profile_slug` presence.
- **Typing**: max input-event duration, events >100 ms, long-task total (4x CPU throttle).
- **Load more / Senate toggle**: max event duration per click.
- **LRC links**: HD-8 (no conflict → direct profile URL), HD-5 + HD-42 (seat turnover →
  chamber roster URL). Must be identical across builds/modes.
- **Deep link past page 1**: 30th House member by name — card auto-mounts + page scrolls;
  typing afterwards must not hijack scroll back.
- **Legacy alias hash**: `#jessica-abbott` (a colliding name) still scrolls to the
  district-suffixed card in post-042 mode.

Numbers are for A/B deltas on the same machine, not absolute budgets.
