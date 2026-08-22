# Bill popular / colloquial names

Status: **Feature-complete on branch.** Steps 1–5 built, typecheck + lint clean, and the
DB layer (migrations 043/044, both RPCs, the 2025 RS data) is applied and verified in the
production Supabase project. Remaining before "done": a live `lrc-popular-names` sync run
against the LRC site (couldn't run from the build env — egress-blocked; 2025 RS was
bootstrapped directly from the fixture instead), a visual pass on the rendered app, and the
flagged digest follow-up. Owner: Katie. Branch: `claude/bill-colloquial-names-yrxmb7`.

## Context

Users recognize bills by their common names ("Safer Kentucky Act," "Marsy's Law,"
"the bathroom bill") far more than by `HB 5`. Today `ky_bills` only stores the formal
`title`, so search, digests, and bill pages can't match or show the names people
actually use. This feature captures popular names and threads them through
sync → search → display.

The governing constraint is `docs/voice-and-tone.md`: **non-partisan, always** and
**honest sourcing**. The rule for names is therefore **attribute, never adopt** — we
show a name and (for official ones) where it comes from; we never let a loaded media
nickname read as KYvKY's own characterization of a bill.

### Two classes of name

Different provenance, different neutrality risk, so we store and display them
separately:

- **Official short titles** — from the Kentucky LRC "Short Titles and Popular Names"
  list. Neutral, official, sourceable (e.g. *Safer Kentucky Act*, *Marsy's Law*).
- **Editorial / media names** — what news coverage or advocates call a bill, in no
  official list (e.g. *the bathroom bill*). Human-curated by Katie; the editorial gate
  **is** the neutrality control. No automated harvesting.

LegiScan has no popular-name field (verified), so official names come from an LRC
scrape, which costs **zero LegiScan quota**.

## Decisions (locked)

- Include **both** official and media names.
- **Search** matches on both classes. **Bill page** displays both. **Digest email**
  uses **official short titles only** for now.
- Media names on the bill page use the label **"Also called"** — no disclaimer text.
- Search matching must be **normalization-tolerant** (punctuation, apostrophes, casing,
  spacing, leading "the") with light **spelling** tolerance.
- ~~⚑ Follow-up: revisit media names in the digest.~~ **Resolved (Katie, 2026-07-24):
  include them.** The digest now shows an attributed "Also called:" line from
  `editorial_popular_names`, alongside the official short title next to the number.

## Data model

New migration `0XX_ky_bills_popular_names.sql` on `ky_bills`:

- `official_short_titles TEXT[]` — from the LRC list.
- `editorial_popular_names TEXT[]` — Katie-curated media/advocacy names.
- Extend the `search_vector` generated column (introduced in
  `040_ky_bills_search_vector.sql`) to include **both** arrays at **weight B** (same tier
  as `topics` / `ai_summary`).
- Consider a normalized shadow column (lowercased, punctuation-stripped) to back a
  `pg_trgm` index for spelling-tolerant matching.

Mirror in `KYBill` (`src/types/kentucky.ts`); add both columns to
`KY_BILL_SEARCH_SELECT` (`src/lib/ky-bill-search-select.ts`) and the browse selects.

## Sync — official names (reuse the LRC scraper pattern) — DONE

Modeled on `src/lib/ky-lrc-enrollment-actions-sync.ts`:

- `src/lib/lrc-popular-names-parser.ts` — parses the page into
  `{ popularName, bills[] }`, plus `popularNamesByBillNumber()` which inverts to a
  per-bill title list (deduped). **Real structure** (see fixture): an
  `<h3>Short Titles and Popular Names</h3>` followed by repeating
  `<h4>{name}</h4><ul><li><a href="HB120.html">…</a></li></ul>`. One name can map to
  several bills; several `<li>` can point at one bill via amendment anchors (`#HCS1`),
  deduped on the href filename (the canonical bill token).
- `src/lib/ky-lrc-popular-names-sync.ts` — axios fetch with the existing
  `KnowYourVoteKentucky/1.0` User-Agent → parse → resolve bill numbers to `ky_bills.id`
  by session (`lrc-session-label` helpers) → write `official_short_titles`, replacing
  each listed bill's list wholesale (LRC is source of truth) and only writing changed
  rows. A 404 (no list published yet) is a normal skip, not an error.
- **Page URL is stable:** `record/{slug}/7765.html` for the current record system
  (confirmed: 22RS and 25RS both live there); the legacy `6650.htm`-style numeric ids
  were only the old system. No index-discovery needed — `lrcPopularNamesUrl(slug)`.
- Registered as the **`lrc-popular-names`** source in the `SYNC_SOURCES` registry
  (`src/lib/ky-sync-pipeline.ts`) — runs via `/api/sync?source=lrc-popular-names`.
  (Named `lrc-*` for consistency with its sibling scrapers, not `bill-popular-names`.)
- CLI `scripts/sync-lrc-popular-names.ts`: `npm run sync:ky:lrc-popular-names[:dry]`,
  and `npm run spike:lrc:popular-names` (parses the committed fixture, no DB/network).
- **Weekly** cron in `vercel.json` (`30 15 * * 0`) — these change rarely.
- Fixture: `fixtures/lrc/lrc-popular-names-25rs-live.html`.

### Session coverage & backfill

The sync is **not** incremental — each run iterates all `KY_SESSIONS`, fetches
`record/{slug}/7765.html` per session, and replaces `official_short_titles`. So the weekly
cron *is* the backfill: one run covers 2026 RS (`26rs`), 2025, 2024, … automatically.
- **2026 RS** populates as soon as LRC publishes its `26rs/7765.html` page; until then a 404
  is a silent skip.
- **Legacy sessions** on the old record system (`6650.htm`-style URLs) 404 on `7765.html`
  and skip — a known, logged coverage gap, not an error.
- The cron lives in `vercel.json` **on this branch**, so it first fires after PR #200 merges
  and deploys. To backfill sooner, run `npm run sync:ky:lrc-popular-names` (or hit
  `/api/sync?source=lrc-popular-names`) from an env that can reach LRC.

## Editorial path — media names — DONE

- `scripts/set-bill-popular-name.ts` — twin of `scripts/set-bill-editor-note.ts`.
  `--add` / `--remove` / `--list` / `--clear`, one name per run (never split on commas),
  case-insensitive dedupe, order preserved. Writes `editorial_popular_names` only; never
  touches the LRC-owned `official_short_titles`. Run via `npx tsx` (no npm alias, matching
  the editor-note sibling).

## Search — `src/lib/ky-search-bills.ts` — DONE

- Both arrays are in `search_vector` (weight B) → free full-text hits for well-tokenized
  names. **But** FTS can't retrieve punctuation-heavy names — verified against prod:
  "crown act", "je jones" return nothing via `to_tsvector`. So:
- **Migration `044`** adds `popular_names_search` — a generated column that strips **all**
  non-alphanumerics (punctuation *and* spaces) and lowercases, so "C.R.O.W.N. Act" →
  `crownact` and "Phone-Down Kentucky Act" → `phonedownkentuckyact` both match a query
  normalized the same way. A `gin_trgm_ops` index (pg_trgm) adds spelling tolerance.
- RPC **`ky_bills_popular_name_search(query, max_rows)`** matches by normalized substring
  OR trigram similarity, scoped to the name column only. Verified in prod: crown act→HB125,
  je jones→HB293, phone down kentucky→HB496, mold act→HB452, and the misspelling
  **crwn act→HB125**.
- `ky-search-bills.ts` calls the RPC as a supplemental retrieval leg (graceful-degrade flag
  `omitKyBillsPopularNameRpc`), merges it, and `relevanceScoreForKyBillSearch` now scores
  name matches on the same normalized form (`scorePopularNames`, exact 5200 / substring 2600)
  so a name-matched bill ranks near the top.
- Both columns are in `KY_BILL_SEARCH_SELECT` (search) and `official_short_titles` is in
  `KY_BILL_BROWSE_SELECT` (browse cards).

## Display — DONE

- **Bill detail page** (`BillDetailView.tsx`): a **"Short title:"** row (official) and an
  **"Also called:"** row (editorial, no disclaimer) under the H1, names joined with " · ".
- **Result / browse cards** (`KYBillCard.tsx`): `official_short_titles` shown inline under
  the formal title ("Short title: …"); editorial names stay **matching-only**.
  `official_short_titles` added to `KY_BILL_BROWSE_SELECT` so browse cards carry it too.
- **Email digest** (`bill-digest-email.tsx` + `run-bill-digest-cron.tsx`):
  `HB 5 — Safer Kentucky Act` next to the number (official short title, first when several),
  **plus** an attributed **"Also called:"** line from `editorial_popular_names` when present.

## Verification

- Unit-test both parsers against saved LRC HTML fixtures (as the enrollment-actions
  parser is tested), including the index-discovery step and a no-page-yet session.
- `--dryRun` the sync against a recent session with a published list (e.g. 2024 RS);
  confirm bill-number → id resolution counts.
- Search checks: `"Safer Kentucky Act"` ranks HB 5 first; a punctuation/spelling variant
  (`"marsys law"`) still hits *Marsy's Law*; no regression in ordinary keyword search.
- Visual: bill page ("Short title" + "Also called" rows) and a digest dry-run
  (`?dryRun=true`) confirming official-only names.

## Rollout order

1. ✅ Migration + types / selects (migration `043`, applied to prod).
2. ✅ LRC parser + sync + CLI + weekly cron. Spike verified. **2025 RS populated in prod**
   (67/67 names resolved, 100%) by generating the SQL from the parser — a live LRC fetch
   is still pending (egress-blocked from the build env; the weekly cron does it on Vercel).
3. ✅ Search: migration `044` + `ky_bills_popular_name_search` RPC + scoring. Verified in prod.
4. ✅ Editorial script (`set-bill-popular-name.ts`).
5. ✅ Display (bill page, cards, digest). typecheck + lint clean.

## Applied to production (Supabase `pmpadtydauuqysnxekno`)

- Migrations 043 + 044 executed (raw SQL, matching the repo's file-based flow — not recorded
  in `schema_migrations`, consistent with 001–042).
- `official_short_titles` populated for 2025 RS (67 bills). All other sessions populate on
  the next weekly `lrc-popular-names` cron. Nothing written to `editorial_popular_names` yet.

## Still to do

- One live `npm run sync:ky:lrc-popular-names -- --dry-run` from an env that can reach LRC,
  to confirm the fetch/parse/resolve path against the site (the parser is fixture-verified;
  only the HTTP fetch is unexercised).
- Visual QA of the three display surfaces in the running app.
- ⚑ Digest follow-up: revisit media names in the email once there's real editorial data.

---

## Follow-up prompt (paste to start implementation)

> Implement the "Bill popular / colloquial names" feature per
> `docs/specs/bill-popular-names.md`. Work on branch
> `claude/bill-colloquial-names-yrxmb7`. Go in the documented rollout order, starting
> with the migration, types, and search-select updates (step 1). Follow the existing LRC
> scraper pattern (`src/lib/ky-lrc-enrollment-actions-sync.ts`) for the sync, and respect
> `docs/voice-and-tone.md` for all copy. Add unit tests for the new parser. Pause after
> step 2 (official-name sync live end-to-end) so I can review before we wire up search
> and display.
