# LRC Record-Vote Scrape — Plan for Pre-2018 KY Roll Calls

**Status:** conditional plan, not queued work. Execute only if pre-2018 member accountability rises to a real product priority.
**Date:** 2026-08-01
**Author:** Claude (drafting; approval pending)

## 0. Context and framing

The 2026-08-01 finding in `TASKS.md` § "Pre-2018 roll-call votes" settled that LegiScan has no roll-call record for KY sessions before **2018 Regular** — not just no dataset ZIP files, but no `votes[]` summaries in bill payloads either. Both paths were verified end-to-end (workflow runs 30676976863 and 30719943098). The UX consequence — the member profile Voting-record section for pre-2018 sessions now says "LegiScan does not carry roll-call votes for this session" with a link to the LRC Record Vote Search, rather than the older misleading "not yet" copy — shipped in PR #225-ish (`src/lib/ky-legiscan-coverage.ts` + `src/components/members/MemberProfileView.tsx`).

The **only** remaining source of pre-2018 KY roll calls is LRC's own site: `https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx` and per-session record-vote pages beneath it. Scraping them is a real project, and it is worth doing only if pre-2018 member accountability moves from "acknowledged gap" to "product priority" — for example, if we start comparing incumbents' pre-2018 records to their current votes, or if a partner asks for it.

This document is the plan we would follow **if** that priority shift happens. It intentionally does not schedule the work.

**Working assumption throughout:** the accepted-limitation empty state (`legiscanHasNoRollCallsForKySession` → LRC link in `MemberProfileView`) stays in place until at least one session ships successfully via this new path. We do not change the empty-state copy in anticipation of scraping — only after a session is live.

## 1. Goal and non-goals

**Goal (done state).** For every in-scope pre-2018 KY session (2010 Regular through 2017 Regular, plus every pre-2018 Special, plus the 2018 Special) we can render a member's Voting-record card with the same shape it renders for 2018 RS onward: a total roll-call count, per-bill yea/nay chips, tally sums, and the underlying per-member breakdown in `ky_votes.roll_call`. "Done" for a session means the scrape reproduces LRC's own tally within a defined tolerance (§ 9), member-name reconciliation matches above the § 5 threshold, and one hand-picked bill (§ 5) has been spot-checked against the LRC page it came from.

**Explicit non-goals.**
- Voice votes, procedural motions, or committee votes without a per-member roll — LRC labels these differently and they were never in `ky_votes`. Skip.
- Bills themselves. Every pre-2018 bill LegiScan carries is already in `ky_bills` via the dataset importer. This plan only writes to `ky_votes`.
- Changing the empty-state copy for sessions LegiScan **does** cover (2018 RS onward). Those stay on the current "No recorded votes found for this session yet" wording; the LRC empty state is scoped exactly to `legiscanHasNoRollCallsForKySession(sessionName) === true`.
- Any change to the current LegiScan sync paths (`sync:ky:dataset`, `backfill:session-votes`). LRC output writes alongside them, distinguished by source (§ 6).
- Live re-scraping. A one-shot session-by-session backfill is the goal, not a recurring cron.

## 2. Source inventory

The single entry point is `https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx` — a WebForms search UI that filters by session, chamber, date, bill number, and RCS/RSN number, and links to per-vote result pages.

**In-scope sessions**, in expected priority order (each corresponds to a `KY_SESSIONS` entry in `src/lib/ky-sessions.ts`):

| Session               | Type    | Priority hint                                          |
|-----------------------|---------|--------------------------------------------------------|
| 2018 Special Session  | special | small; ideal smoke-test                                |
| 2017 Regular Session  | regular | most-recent gap; largest incumbent overlap             |
| 2016 Regular Session  | regular | budget session; high vote volume                       |
| 2015 Regular Session  | regular | mid-decade cutoff for URL scheme (§ below)             |
| 2014 Regular Session  | regular | pre-2015                                               |
| 2013 Regular Session  | regular | pre-2015                                               |
| 2013 Special Session  | special | pre-2015 special; redistricting                        |
| 2012 Regular Session  | regular | pre-2015                                               |
| 2010 Regular Session  | regular | pre-2015                                               |
| 2010 Special Session  | special | pre-2015 special; state budget                         |

The 2011 Regular, 2011 Special, and 2012 Special sessions have partial `KY_SESSIONS` metadata (`TASKS.md` line 61 notes them as omitted for date verification); if they exist in LRC's Record Vote Search, add them here — otherwise treat as "no source, out of scope."

**URL scheme per era — unknown from this environment.** Egress to `legislature.ky.gov` returned HTTP 000 (403 CONNECT tunnel) both during this planning session and per the standing `TASKS.md` note. LRC restructured its site more than once since 2010 — the calendar/enrollment scrapes (`sync:ky:lrc-calendar`, `sync:lrc:enrollment-actions`, `apps.legislature.ky.gov/CommitteeDocuments/…`) show today's shape uses `apps.legislature.ky.gov/…/{session_code}/…`, but pre-2015 pages are widely reported to live under a different path (`www.lrc.ky.gov/record/{NNRS}/…` historically). Concrete URL patterns for each era must be captured by a discovery pass from a network that isn't proxy-blocked.

**Needs one throttled probe of** `https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx` **and one result-page URL per era** — 2017 RS, 2015 RS, and 2013 RS at minimum — to record: (a) the search form's `<form action>` and POST parameters (WebForms typically uses `__VIEWSTATE` and `__EVENTVALIDATION` — capture these so the scraper can mimic a form POST rather than screen-scrape); (b) the actual pattern of the result-page URL; (c) whether pre-2015 results are per-member HTML tables, tally-only pages, or PDFs.

**Worst-case flag.** If any session's per-vote page publishes only a chamber tally and no per-member Yea/Nay/NV/Absent list (early years are the risk), that session is per-member-unrecoverable via this route and should be dropped from scope, with a note back to the accepted-limitation UX for that session only. Do not attempt PDF OCR unless a specific business need justifies it — the effort is off-scale compared to writing `ky_votes` rows.

## 3. Data shape per roll call

Target the same fields `buildVoteRow` writes today (`src/lib/ky-legiscan-dataset-import.ts:194`):

- `bill_id` (FK to `ky_bills`) — from bill linkage (§ 4)
- `roll_call_id` — synthesized (§ 6)
- `date` — LRC page's vote date, ISO
- `description` — LRC's own vote label, verbatim, prefixed to preserve source distinction (§ 6)
- `yea_count`, `nay_count`, `nv_count`, `absent_count`
- `passed` — derived (yea ≥ constitutional-majority threshold on final-passage votes; on procedural votes, from LRC's own "adopted/failed" label if present)
- `roll_call` (JSONB) — `[{ legislator_id, vote }]` after reconciliation (§ 5); `vote_text` is one of `Yea`, `Nay`, `NV`, `Absent` to match how the dataset importer writes it

What we need per LRC page:
- date, chamber, RCS/RSN number, vote description
- yea/nay/nv/absent tallies
- per-member Yea list, Nay list, NV list, Absent list
- associated bill number (e.g., "HB 3", "SB 12")

**Raw example blocks — unknown; needs one throttled probe.** Two raw examples must be captured before the parser is written: one 2017 RS result page (post-restructure format) and one 2013 RS result page (pre-2015 format). Store both as fixtures (`fixtures/lrc/record-vote-{session-code}-{rcs}.html`), mirroring how the existing LRC calendar scrapes maintain fixtures for tests.

## 4. Bill linkage

The dataset importer looks up `ky_bills` by `legiscan_id`; we do not have a LegiScan id for LRC-only votes. The join is instead **(session, bill_number)**:

- Session: pass the normalized `KY_SESSIONS.name` (e.g., `'2017 Regular Session'`).
- Bill number: LRC prints canonical short-form (`HB 3`, `SB 12`, `HR 44`, `HCR 1`); strip whitespace to match `ky_bills.bill_number` shape. Confirm normalization against how `ky_bills.bill_number` is stored for pre-2018 rows before the parser writes anything.

**Expectation from what's in the DB today.** The 2026-08-01 dataset re-import ran clean against all 25 sessions, and TASKS.md § 353 confirms per-session bill counts including 2015 RS (1,244), 2016 RS (1,560), 2017 RS (1,295), and 2018 Special (7). That is the coverage the LRC scrape can rely on. Bills LegiScan didn't ship for a given session (mostly resolutions and bill requests) will not be in `ky_bills` — those roll calls should be logged and **skipped**, not written with a stub bill row. Creating placeholder `ky_bills` rows from LRC is out of scope; it would collide with the LegiScan writer.

**"Bill not found" is expected and non-fatal.** Track a per-session skip count; if more than ~2% of LRC roll calls have no matching `ky_bills` row, escalate before the session ships (may indicate a bill-number normalization miss rather than genuine coverage gaps).

## 5. Member reconciliation strategy

This is the highest-risk part of the project. Misattributing a vote to the wrong legislator is worse than not showing the vote at all — the whole product depends on member records being defensible.

**State of `ky_legislators` today.** The active roster is 140 rows plus 15 historical duplicates from earlier syncs (per the 2026-07-18 perf notes in TASKS.md). There is no clean "seat as of session X" table — the LegiScan sync overwrites district/chamber onto the current record when it changes. Pre-2018 members who left before the current sync started may not exist in `ky_legislators` at all.

**Primary match key:** `(session, chamber, district, name-normalized)`. Name normalization must use the same lowercase-strip-punctuation approach as `hasKyDistrictSeatDifferentPersonConflict` in `src/lib/ky-member-utils.ts` (the seat-conflict guard). LRC prints "Last, First" — split before normalizing.

**Fallbacks, in order:**
1. **Mid-session vacancy / appointment** — LRC may list a member on late-session votes who was appointed after opening day. Widen match by (chamber, district, name-normalized) if the session-scoped match misses.
2. **Hyphenated names / apostrophes** — strip both when normalizing (`O'Neal`, `Van-Winkle`).
3. **Suffixes** — `Sr.`, `Jr.`, `II`, `III`. Retain suffix as distinct match evidence when two members share (last, first, chamber).
4. **Name changes** — cross-session marriage/name changes; when a name doesn't match anyone active in that session's roster, check historical rows with same district and chamber.
5. **Nickname → legal name** — `Bob`/`Robert`, `Bill`/`William`. Manual mapping table populated only as reconciliation gaps surface; do not fuzz-match blindly.
6. **New-member insert** — if a genuinely pre-2018-only legislator has no `ky_legislators` row at all, insert one with `active = false`, `chamber` and `district` from the roll-call context, and a source flag (`origin = 'lrc_record_vote'`) so the sync doesn't overwrite them.

**Verification plan before shipping any session.**
- Named check: pick a long-serving legislator with pre-2018 tenure — e.g., **Rep. Rocky Adkins** (House District 99, Sandy Hook, served through 2018) — and a specific 2015 or 2016 bill known to have been recorded (e.g., a 2016 HB 80 vote if the pattern holds). Hand-diff the scraped `roll_call` entry for Adkins against what the LRC page renders. Do the same for at least one Senate example.
- Roster sanity: for each session, count reconciled members per chamber; a 2015 RS scrape should reconcile ~95 House members and ~35 Senate members. Flag if either count is off by >5%.

**Skip and log.** For any single roll call where the per-member reconciliation match rate is below **97%** (2 of ~100 House members unmatched is acceptable; 5+ is not), skip writing that roll call and log the raw names. If **more than 1% of a session's roll calls** fail this bar, the session is not considered shipped and gets a manual review before the workflow moves on.

## 6. Storage

Reuse everything that already exists — `ky_votes` table, `ky_votes.roll_call` JSONB, `buildVoteRow`, `upsertVoteRows` in `src/lib/ky-legiscan-dataset-import.ts`, and the shared `dropDuplicateRollCallRows` in `src/lib/ky-vote-dedupe.ts`.

**Synthesized `roll_call_id`.** LegiScan roll-call ids are positive integers. To guarantee no collision with any future LegiScan id, LRC-sourced rows use the **negative-integer namespace**: `roll_call_id = -1 * (session_code * 100000 + lrc_rcs_number)`, where `session_code` is the 3-digit LRC session code (e.g., `171` for 17RS, `162` for 16RS, `18S` → numeric equivalent). This is deterministic, human-legible (a negative id → LRC-sourced), and stable across re-runs so `(bill_id, roll_call_id)` upserts hit the same key every time.

If a session's LRC page uses `RSN` instead of `RCS`, treat the two as one number space per session (LRC has always used exactly one per session, in our understanding) — but confirm this during § 2 discovery. If both appear, extend the id scheme with a chamber flag in the encoding rather than relying on the number alone.

**Upsert key stability.** `(bill_id, roll_call_id)` remains the conflict target. Because both fields are derived deterministically from the LRC page, re-runs are idempotent — the same page always yields the same row.

**`ky-vote-dedupe.ts` interplay.** The existing dedupe key parses `RCS|RSN` from the description; LRC descriptions naturally carry those numbers, so cross-source collisions could in theory arise. In practice they can't — a LegiScan roll call has a positive id and an LRC one has a negative id, and the dedupe compares `physicalKey` (bill+date+tally+RCS#) against `roll_call_id` for tie-breaking. The design is safe **as long as we prefix LRC descriptions distinctively** (see next). Do not remove the description prefix without redesigning this.

**Source distinguishability.** Two options; recommend the second:
- (a) Add a `source` column to `ky_votes` (`'legiscan' | 'lrc'`), default `'legiscan'`. Requires a migration.
- (b) **Prefix `description` with `[LRC] ` for LRC-sourced rows.** No migration; instantly greppable in the admin sync-status view; keeps the parseable `RCS#nnn` tail intact for `ky-vote-dedupe.ts`.

Recommend (b) for the first session, with (a) queued for the second — a real column is worth the migration once we're confident the scrape works, but not before.

## 7. Fetch discipline

Model on `src/lib/ky-committee-material-link-probe.ts` (same host, same politeness):

- **Per-host concurrency = 1** against `legislature.ky.gov`. Never parallelize. The Committee link probe found LRC throttles hard under load; the weekly link-verifier hit HTTP 503s at concurrency 6 (TASKS.md 2026-07-20).
- **Delay = 1–2 s** between requests, jittered.
- **User-Agent** = `KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-record-vote-scrape)`.
- **Timeout** = 15 s (matches `PROBE_TIMEOUT_MS`).
- **Backoff** = exponential on 429/5xx (base 5 s, doubling, cap 5 min); status 0 (proxy/timeout) counts as transient.
- **HTML cache during discovery.** Save every fetched HTML page to a local cache directory keyed by URL hash, so the parser can iterate against saved fixtures without re-scraping LRC. Do not commit the cache; commit a small deterministic sample as fixtures.

**Estimated fetch count and wall-clock.** Per session in the LegiScan era, roll-call counts run 600–950 (see TASKS.md § 353 for the shipped-session curve). Pre-2018 sessions likely fall in the same range; call it **~800 pages per Regular session, ~50 per Special**. For all 10 in-scope sessions: order of **~6,500 result pages** plus ~10 search-form POSTs to enumerate them. At 1.5 s/request that's **~2.7 hours** of live fetching total, easily fits inside one workflow run per session with margin. Discovery-only (enumerate RCS numbers per session, no result pages) is order of **~150 search POSTs**, under 5 minutes.

## 8. Workflow shape

Mirror `.github/workflows/backfill-session-votes.yml` exactly for structural discipline:

- `on: workflow_dispatch` only. No cron.
- Inputs: `sessions` (comma-separated `KY_SESSIONS.name` values or LRC session codes), `since_year`, `limit`, `live` (default **false** = discovery only).
- Env-var passing (`INPUT_SESSIONS`, `INPUT_LIVE`, …). Never `${{ inputs.* }}` interpolated into a run block — the standing lesson from that workflow's comments.
- `concurrency.group: lrc-record-vote-scrape` with `cancel-in-progress: false`. A second run would double-fetch LRC and could trip 429s.
- `timeout-minutes: 350` matches the existing session-votes workflow — enough for the biggest single session with margin.
- Resumable: keyed on synthesized `roll_call_id` (§ 6), so a re-run skips rows already stored, same pattern as `fetchStoredRollCallIds` in `scripts/backfill-session-votes.ts`.
- Secrets: `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. No LegiScan key needed; this path does not spend LegiScan quota at all.

Script path: `scripts/scrape-lrc-record-votes.ts`, mirroring `scripts/backfill-session-votes.ts` (discovery-first, `--live`, `--sessions=`, `--since-year=`, `--limit=`, per-session summary lines).

## 9. Validation and verification

Three layers, each blocking on the run's overall pass:

1. **Tally reconciliation vs. chamber roster.** For each roll call: `yea + nay + nv + absent` should equal the session's active chamber roster (100 House, 38 Senate), with allowance for vacancies. Rough check — flag any roll call whose sum is off by more than 3 from the roster. An exceptions list per session is expected (recess absences, mid-session vacancies); a run whose exception list exceeds ~10% of that session's roll calls fails the shipping bar.
2. **Sample bill spot-check.** Per session, three roll calls chosen at random (seeded, printable so a reviewer can reproduce) are hand-diffed against the live LRC page: tally, per-member Yea/Nay lists, associated bill number. All three must match exactly before that session is considered shipped.
3. **Regression check.** After each live run, `SELECT session, COUNT(*) FROM ky_votes JOIN ky_bills USING (id) GROUP BY session` against 2018 RS → 2026 RS should be identical to the pre-run snapshot. LRC rows only add negative-id rows in pre-2018 sessions — anything else means a bill-linkage bug wrote into the wrong session.

The 2026-08-01 counts from TASKS.md § 353 are the baseline for regression 3: **2018 RS 749, 2019 RS 675 / Special 11, 2020 RS 604, 2021 RS 816 / Special 33, 2022 RS 943 / Special 4, 2023 RS 678, 2024 RS 844, 2025 RS 701, 2026 RS 886**. Snapshot before every live run; diff after.

## 10. Sizing and risk

**Engineer-days by phase** (rough — assumes one engineer familiar with the repo):

| Phase                                             | Days |
|---------------------------------------------------|-----:|
| Discovery pass (§ 2 URL scheme, per-era shape)    |    2 |
| HTML parser (both era formats, with fixtures)     |    4 |
| Member reconciliation (§ 5, incl. new-member seed)|    5 |
| Scraper + workflow + resumability                 |    3 |
| Verification pass, spot-checks, smoke session     |    3 |
| Session-by-session live runs + review             |    3 |
| **Total**                                         | **~20 days** |

Reconciliation and parser are the underestimation traps; the estimate above already leans generous on both.

**Top three risks and mitigations.**

1. **Parser drift across LRC's two (or more) eras.** LRC restructured its site more than once since 2010 and there is no guarantee the pre-2015 pages share any DOM shape with 2015–2017. Mitigation: fixture-driven testing per era, with the parser branching on era at the top rather than trying to be format-agnostic. If a third era surfaces during discovery, budget +2 days.
2. **Member misattribution.** Named in § 5. Mitigation: the 97%-per-vote and 99%-per-session gates block shipping; the negative-id namespace makes it trivial to `DELETE FROM ky_votes WHERE roll_call_id < 0` and re-run without collateral damage to the LegiScan corpus.
3. **LRC blocks or rate-limits the scraper.** The link-probe experience (§ 7) shows this is real. Mitigation: single-host serialization, honest User-Agent, and a documented kill switch (§ 12). If LRC returns a `robots.txt` disallow or a Terms-of-Service issue surfaces, we stop, full stop.

## 11. Rollout plan

No batching. One session at a time, operator-reviewed between each.

1. **Discovery pass (all sessions).** Dry run of the workflow with `live: false` prints per-session URL scheme, RCS number enumeration, projected fetch count. Operator eyeballs the discovery report; no fetches beyond search-form POSTs.
2. **Smoke session: 2018 Special (2 days, ~7 bills).** Smallest in-scope session by an order of magnitude. Live-run it end-to-end. Hand-verify per § 9 layers 2 and 3.
3. **Second session: 2017 Regular.** Biggest recency benefit (living incumbents). Runs standalone; operator reviews the discovery report and the smoke session's verification before dispatching live.
4. **Then 2016 RS, 2015 RS, 2014 RS, 2013 RS, 2012 RS, 2010 RS, 2013 Special, 2010 Special.** Each dispatched one at a time. If any two consecutive sessions fail verification on the same class of issue, halt and re-plan.

Only after **one session** ships (verified and merged into `ky_votes`) does the empty-state UX (§ 0) change to reflect available data — and even then, only for the sessions that shipped, keyed on `sessionName`, not a blanket flag flip.

## 12. Kill criteria

We permanently accept the limitation (and keep the current empty-state UX indefinitely) if any of the following fire:

- **LRC blocks the scrape.** `robots.txt` disallow on the record-vote paths, sustained 4xx/5xx that survives backoff, or an operator-communicated cease request. We do not work around any of these.
- **Parser drift is irreducible.** After the discovery pass, if the pre-2015 pages publish tally-only data (no per-member lists) or the DOM shape varies per-session so much that per-era parsers still don't cover the corpus, we take the honest loss and document which sessions are per-member-recoverable and which are not.
- **Reconciliation match rate below threshold on the smoke session.** If the 2018 Special smoke run cannot reconcile ≥97% of members across its handful of roll calls, the general population of pre-2018 sessions will be worse, and we stop before spending on 2017 RS.
- **Effort blows past ~30 engineer-days** (1.5× the estimate) without a shipped session. That indicates the plan itself is wrong, not that we're almost there.

If any of these fires, the change is a documentation update: TASKS.md gets a follow-up entry naming the specific failure mode; `MemberProfileView`'s empty state stays exactly as it is today; this plan file is marked `Status: shelved`.

---

_Generated by [Claude Code](https://claude.ai/code)_
