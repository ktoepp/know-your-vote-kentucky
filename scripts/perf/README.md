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

## What the driver asserts / records

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

## Member-profile fixtures (beyond perf)

The stub also serves a small `ky_bills` fixture and answers every `/rest/v1/rpc/*` with
`[]`, so `/members/[slug]` renders end-to-end: **Mary Hale** (`mary-hale-hd-1` post-042,
LegiScan `people_id` 20003) has primary + co-sponsored bills in **2025 RS** and **2024 RS**
and none in the current session — her session selector shows an empty current session plus
two historical ones, exercising both selector render paths and the Sponsored bills filter
bar. `sponsors=cs.[…]` containment filtering is honoured.

## UI verification recipe (no credentials, sandbox-safe)

Used to runtime-verify members/bills UI changes by driving real pages (2026-07-19 pass:
governor-section removal, session-selector placement, card hover, district locator map).

```bash
PROFILE_SLUG=1 npm run perf:members:stub &
printf 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=stub-key\n' > .env.local
npm run build -- --experimental-build-mode compile   # skip prerender: full builds die on
                                                     # pages whose browse-query shapes the
                                                     # stub doesn't emulate (topic pages)
npx next start -p 3100 &
# then drive pages with Playwright (npm i --no-save playwright; in Claude sandboxes launch
# with executablePath /opt/pw-browsers/chromium)
```

Pitfalls, each learned the slow way:

- **`.env.local` must point at the stub.** Sandboxes usually block egress to
  `*.supabase.co`; a leftover real URL fails **silently** — empty rosters, zero stub
  traffic, no errors anywhere.
- **Poisoned data cache.** A build/run against a broken env caches empty `unstable_cache`
  results (1h revalidate) and the cache survives rebuilds:
  `rm -rf .next/cache/fetch-cache` after fixing env, then restart `next start`.
- **`NEXT_PUBLIC_*` is baked into client bundles at build time.** Fixing env + restart
  heals server fetches; the browser bundle keeps the old URL until rebuilt (symptom:
  console `ERR_TUNNEL_CONNECTION_FAILED` from auth calls — harmless on anonymous reads).
- **`/members#slug` deep links only act on a fresh page load** (hash is read once on
  mount, by design) — in a driver, `page.goto('about:blank')` first.
- **MemberCard is pointer-events:none over a stretch link** — `locator.hover()` fails its
  actionability check on card text; use raw `page.mouse.move(x, y)` to test card hover.
- **No Mapbox token** → `/members/map` shows the token banner and no tiles, but
  `?chamber=&district=` preselection and the legislator panel still work (they only need
  the committed GeoJSON + `/api/roster/members`).
