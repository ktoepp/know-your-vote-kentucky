# Bill popular / colloquial names

Status: **In progress.** Steps 1–2 (schema + official-names sync) built & verified; steps
3–5 (search, editorial script, display) pending. Owner: Katie. Branch:
`claude/bill-colloquial-names-yrxmb7`.

## Context

Users recognize bills by their common names ("Safer Kentucky Act," "Marsy's Law,"
"the bathroom bill") far more than by `HB 5`. Today `ky_bills` only stores the formal
`title`, so search, digests, and bill pages can't match or show the names people
actually use. This feature captures popular names and threads them through
sync → search → display.

The governing constraint is `docs/voice-and-tone.md`: **non-partisan, always** and
**honest sourcing**. The rule for names is therefore **attribute, never adopt** — we
show a name and (for official ones) where it comes from; we never let a loaded media
nickname read as KYVKY's own characterization of a bill.

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
- ⚑ **Follow-up:** revisit whether media names should appear in the **digest email**
  once we have real coverage data. Left out of v1 deliberately.

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

## Editorial path — media names

- `scripts/set-bill-popular-name.ts` — twin of `scripts/set-bill-editor-note.ts`;
  add/remove/dedupe entries in `editorial_popular_names` for a given bill.

## Search — `src/lib/ky-search-bills.ts`

- Both arrays already in `search_vector` → free full-text hits.
- Add both to the parallel `ilike` legs and to `relevanceScoreForKyBillSearch` weighting
  so a name query ranks the right bill highly.
- **Normalization-tolerant matching:** normalize both query and stored names — lowercase,
  strip punctuation / apostrophes / hyphens, collapse whitespace, strip a leading "the."
  Add a `pg_trgm` similarity leg **scoped to the popular-name columns only** (not the
  whole corpus, to avoid noise), gated behind a similarity threshold.
- Add both columns to the select list so results can render the official short title.

## Display

- **Bill detail page** (`src/app/bills/…`): official short title as **"Short title: …"**;
  media names in an **"Also called"** row (no disclaimer). Chips / labels.
- **Search results list**: show `official_short_titles` inline under the formal title;
  media names stay **matching-only** (not printed in the compact list).
- **Email digest** (`src/lib/email/bill-digest-email.tsx`): `HB 5 — Safer Kentucky Act`,
  **official short titles only**. Media names excluded (see follow-up flag above).

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

1. ✅ Migration + types / selects (migration `043`).
2. ✅ LRC parser + sync + CLI + weekly cron (official names). Spike verified; typecheck +
   lint clean. Still needs a live DB run to confirm bill-id resolution counts.
3. ☐ Search normalization + ranking (+ trigram leg).
4. ☐ Editorial script.
5. ☐ Display (bill page, search list, digest).

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
