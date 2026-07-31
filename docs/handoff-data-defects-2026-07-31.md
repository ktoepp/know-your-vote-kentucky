# Handoff — data defects found by the 2026-07-31 accuracy/health-check hardening pass

Four defects were **found and verified** during PRs #214–#218 but deliberately **not fixed**, because each either mutates production data destructively or changes something users see. (Defects 1–3 were subsequently fixed on 2026-07-31 — see the status note below and the per-defect banners.) Full evidence: `decisions.md` §§ 2026-07-31 (three entries); tracker items in `TASKS.md` → "Accuracy + health-check hardening — follow-ups".

Every number below was measured against production on 2026-07-31. **Re-verify before acting** — some will have changed.

> **Status update, 2026-07-31 (later same day).** Defects 1–3 are resolved; defect 4 is still open. Two claims
> originally recorded here turned out to be wrong and are corrected in place below — flagged because both
> would have led the next person astray:
>
> - **`nv_count` does not resolve on its own.** The votes cron only ever re-fetches the 5 most-recently-actioned
>   bills, so closed-session rows are never revisited. A deliberate backfill is required. See Defect 2.
> - **The backfill cost was understated 3x** (11.6% → 34.8% via the obvious code path). Fetching roll calls
>   directly rather than through `fetchVotes` brings it to 23.1%. See Defect 2.
>
> Also: the "legacy URLs 404" premise under Defect 1 has now been **live-probed** (802/802 dead), rather than
> resting on a code comment. One twin was dead too — see Defect 1.

---

## Ground rules

1. **Re-verify every count before you change anything.** The queries are given so you can. If a number differs materially from what is recorded here, stop and work out why before proceeding — a changed count may mean the underlying cause moved.
2. **Do not delete production rows without explicit sign-off from the repo owner**, even where this document recommends deletion. Prepare the migration, show the counts, ask.
3. **Postgres regex is not JavaScript regex.** `\b` is a word boundary in JS and a *backspace* in Postgres — use `\y` or a plain `LIKE` prefix test. This bit an ad-hoc query during the original investigation and briefly produced wrong counts.
4. **Measure more than once.** During the browse profiling, first-run timings were 20–400× slower than steady state. Query *plan shape* is the reliable signal; a single `EXPLAIN ANALYZE` will support almost any conclusion.
5. The repo has **no test framework**. Verification means real-data queries, fixture runs, or a dispatched GitHub Actions workflow — not unit tests.

---

## Defect 1 — 802 duplicate committee-material rows with a dead URL (highest user impact)

> **RESOLVED 2026-07-31.** Probed live from Actions (`probe:legacy-material-urls`, all=true): **802/802 legacy
> URLs dead (404)**, confirming the premise — which until then rested on a code comment, not a measurement.
> **801/802 twins alive.** The one exception was `Thumbs.db` (meeting 12802, 2020-07-14), a Windows thumbnail
> cache file LRC published by accident and has since removed; it 404s on *both* paths because the file is gone,
> not because our URL shape is wrong. Migration 048 applied: 1,773 → 970 rows, `legacy_flat` now 0, all nested
> rows intact, deleted rows preserved in `ky_committee_materials_legacy_dupes_048` (803 rows, including the
> dead `Thumbs.db` twin, which was removed separately so it would not keep rendering a dead link).
>
> Note the sample nearly misled us: a 40-row probe returned a clean "supports the cleanup" verdict and missed
> the dead twin entirely. The full pass found it. **Probe all of it before deleting any of it.**
>
> Still open, unrelated to this cleanup: 4 materials remain `link_status = 'dead'`. They have no twin and are
> not duplicates — genuinely dead documents, needing their own decision.

**What.** 802 of 1,773 `ky_committee_materials` rows (45%) carry the superseded flat
`/CommitteeDocuments/{meeting_id}/file` URL shape. **All 802 have an exact nested twin** — same
`committee_id`, `title`, `meeting_date` — under the current `/CommitteeDocuments/{rsn}/{meeting_id}/file`
shape. Each document therefore renders **twice** in the committee page's materials section, and the
superseded copy 404s (see the comment on `lrcCommitteeDocumentsUrl`). **263 are dated 2026** — documents
users would actually click. All 802 have `link_status IS NULL` (never probed).

**Verify:**

```sql
select
  count(*) filter (where url ~ '/CommitteeDocuments/[0-9]+/[^/]+$')          as legacy_flat,
  count(*) filter (where url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$')   as nested,
  count(*)                                                                    as total
from ky_committee_materials;

-- every legacy row must have an exact nested twin before you delete anything
with legacy as (
  select id, committee_id, title, meeting_date from ky_committee_materials
  where url ~ '/CommitteeDocuments/[0-9]+/[^/]+$'
)
select count(*) as legacy_total,
       count(*) filter (where exists (
         select 1 from ky_committee_materials n
         where n.committee_id = l.committee_id and n.title = l.title
           and n.meeting_date = l.meeting_date and n.id <> l.id
           and n.url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$')) as has_nested_twin
from legacy l;
```

Both counts must be equal (802/802 as of 2026-07-31). **If they are not, do not proceed with a blanket
delete** — a legacy row without a twin is the only copy of that document and deleting it loses data.

**Fix.** A cleanup migration deleting the superseded rows. Before writing it:

- Confirm the twin invariant above still holds.
- Check `ky_committee_materials.id` is not referenced elsewhere (`grep -rn "committee_materials" src/ scripts/`) — the accuracy audit writes `link_status`/`link_checked_at`, nothing else should hold an FK.
- Consider probing a sample of the legacy URLs first (`npm run probe:committee-links`) to confirm they 404 rather than assuming it. The 404 claim comes from a code comment, not from a live probe — **this is the one part of the diagnosis that was never empirically confirmed**, because the sandbox could not reach `apps.legislature.ky.gov`. A dispatched GitHub Actions run can.
- After deleting, run `npm run probe:committee-links` and confirm no live link was lost.

**Detection already shipped.** `checkLegacyDuplicateUrls` in `src/lib/accuracy-audit/checkers/materials.ts`
reports this once per run as a systemic `materials` finding, and excludes those URLs from the reverse
diff. Once the rows are gone the finding disappears on its own — **do not "fix" it by loosening the check.**

---

## Defect 2 — `ky_votes.nv_count` NULL on every row

**What.** NULL on **all 6,944** rows, while `absent_count` is 100% populated. Migration 035 added the
column and the sync writes it (`ky-sync-pipeline.ts:1739`, `nv_count: vote.nv || 0`), but no vote has
synced since — the votes sync short-circuits during interim (`interimSkipReason`, `ky-sync-pipeline.ts:274`).
The bill-detail NV chip therefore renders 0 for every vote (`ky-bill-detail-server.ts:72`, `nv: v.nv_count ?? 0`).

**Verify:**

```sql
select count(*) as total, count(nv_count) as nv_populated,
       count(absent_count) as absent_populated, max(date) as latest_vote
from ky_votes;
```

**~~This may fix itself.~~ It will not — corrected 2026-07-31.** The upsert reasoning is right as far as it
goes (`ignoreDuplicates: false` does update existing rows), but it never reaches these rows. The votes cron
runs `?source=votes&limit=5` (`vercel.json`), and the sync selects bills `order by last_action_date desc
limit 5` (`ky-sync-pipeline.ts:1712`) — five bills per day, always the most recently actioned. Bills from
closed sessions are never revisited, so the historical corpus stays NULL indefinitely. The 2026 session
ended mid-April; the next regular session convenes January 2027, and even then only newly-active bills
would be touched.

**A deliberate backfill is required.** Use `npm run backfill:vote-nv-counts` (or the `Backfill vote nv_count`
workflow — it needs Actions secrets, so it cannot run from a dev sandbox). Estimate-only by default; pass
`--live` to spend quota. Resumable: targets are selected by `nv_count IS NULL`, so an interrupted run costs
nothing to restart.

**Cost — the earlier figure here was wrong by 3x.** It is *not* one call per bill. `client.fetchVotes(billId)`
issues a `getBill` **plus** one `getRollCall` per vote: 3,487 + 6,944 = **10,431 calls (34.8%)**. The
`getBill` half is pure waste, since `ky_votes` already stores every `roll_call_id`, so the backfill script
calls `fetchRollCall` directly: **6,944 calls ≈ 23.1%** of the 30,000/month quota. Check
`/admin/sync-status` for current usage first, and scope with `--session` to spend less.

**Budget wall-clock, not just quota.** The client enforces a 500ms floor between requests
(`RATE_DELAY`, `ky-legiscan-client.ts:85`); with real latency the observed rate is ~15 rows/min, so a
full-corpus pass runs for hours and will exceed a single job's timeout. That is expected — re-dispatch to
resume. Do not "fix" this by removing the throttle.

**Do not** change the accuracy checker's NULL-skip in `checkers/votes.ts` — skipping NULL as
"not yet backfilled" is correct, and comparing NULL as 0 would flag the entire corpus.

---

## Defect 3 — 12 agenda bill references that never resolved

> **RESOLVED 2026-07-31.** Root cause was in `lrc-bill-reference-parser.ts`: a reference carrying a
> parenthetical session suffix parsed to a NULL session. Fixed there, verified by re-parsing all 209 stored
> agenda strings, and the 12 rows repaired in production — each now carries both a session label and a
> `ky_bill_id`. `bill_session_label IS NULL` is now **0** across all 214 bill-bearing agenda rows.
>
> `deriveAgendaBillRef` was extracted from `ky-lrc-calendar-sync.ts` so the repair script
> (`repair:agenda-bill-links`) resolves stored rows exactly the way the sync does, rather than
> reimplementing the logic and drifting from it.
>
> 5 rows remain unlinked and that is **correct, not residual breakage**: all 5 are `BR ###` — bill *requests*,
> pre-filed drafts with no bill number yet, which have no `ky_bills` row by design. Do not "fix" these.

**What.** 12 agenda lines name a bill that **does exist** in `ky_bills` but stored
`bill_session_label = NULL`, so the lookup key missed and the line renders as plain text instead of a
link. Stale rows written before session inference landed. Spread over **6 meetings**:

| committee | meeting date | unresolved refs |
|---|---|---|
| interim-joint-committee-on-transportation | 2026-06-02 | 7 |
| interim-joint-committee-on-education | 2026-06-02 | 1 |
| interim-joint-committee-on-local-government | 2026-06-23 | 1 |
| education-assessment-and-accountability-review-subcommittee | 2026-07-01 | 1 |
| interim-joint-committee-on-natural-resources-and-energy | 2026-07-02 | 1 |
| interim-joint-committee-on-judiciary | 2026-07-02 | 1 |

A further **5** unresolved refs are `BR nn` **bill-request numbers** — pre-filed drafts discussed before a
bill gets an HB/SB number. These correctly have no `ky_bills` row. **They are excluded by design**
(`BILL_REQUEST_PREFIX` in `checkers/committees.ts`) and must stay excluded.

**Verify** (note the `LIKE`, not `\b`):

```sql
select c.slug, m.meeting_date, m.id as meeting_id, count(*) as unresolved_refs
from ky_committee_agenda_items a
join ky_committee_meetings m on m.id = a.meeting_id
join ky_committees c on c.id = m.committee_id
where a.bill_number is not null and a.ky_bill_id is null
  and upper(btrim(a.bill_number)) not like 'BR %'
group by c.slug, m.meeting_date, m.id order by m.meeting_date;
```

**Fix.** Re-sync those meetings so `deriveAgendaItems` re-runs with session inference. Note the live LRC
calendar only covers the current week, so a plain `sync:ky:lrc-calendar` will not reach June/July dates —
you likely need the Wayback path (`scripts/backfill-lrc-calendar-wayback.ts`, dispatchable via
`sync-lrc-calendar.yml` with `run_backfill: true` and a date range) or a targeted repair script.
**Confirm the approach actually re-derives these rows before running it broadly** — the sync deletes a
meeting's agenda rows before re-inserting, so a partial or wrong-window run can make things worse.

---

## Defect 4 — `/bills` browse timeouts: fix the `count`, not the sort

> **STILL OPEN as of 2026-07-31.** Diagnosis below re-confirmed (ANALYZE run), but deliberately not changed:
> the fix trades an exact count for a planner estimate, and on a civic-data site a visibly drifting count is a
> product call, not a cleanup. Three options were put to the repo owner and none chosen yet: leave it exact;
> switch to `count: 'planned'`; or keep it exact but bounded (count to N, then render "N+"). **Pick one before
> touching this** — the third option is worth a look, since it removes the unbounded cost without introducing
> a number that can be wrong.

**What.** The `ky_bills browse query failed` error (~11/day, 38 distinct users, escalating since 07-28).

**The previously-recorded hypothesis is refuted.** A composite index on `(session, last_action_date)` was
proposed; profiling shows the ORDER BY is **already** served by the existing single-column index via an
incremental sort:

```
Limit  (actual time=3.602..3.607 rows=24)
  -> Incremental Sort   Sort Key: session DESC, last_action_date DESC NULLS LAST
       Presorted Key: session
       -> Index Scan Backward using idx_bills_session  (actual rows=1738)
```

**Do not ship `ky_bills_session_last_action_idx`** — it would remove a top-N heapsort over 1,738 rows and
add write cost on every sync.

**The real cost is the exact `count()`** in `fetchKyBillsBrowsePageUncached`
(`src/lib/ky-bills-browse-server.ts:228`, `select('id', { count: 'exact', head: true })`) — a `Seq Scan`
over the full 84 MB heap. Warm ~11 ms; a cold/contended run measured **4,254 ms**, past the 3 s anon
`statement_timeout`. The variance is why failures are intermittent rather than constant.

**Fix (needs a product call — it changes a number users see).** Use PostgREST `count: 'planned'` for the
**unfiltered** path only; the planner estimate was 23,426 vs an actual 22,547 (3.9% off), fine for
pagination. Or cache the unfiltered total. **Keep exact counts on filtered paths** — they are selective
and cheap. Ask before shipping.

**Free win, unrelated:** `pg_stat_user_tables.last_analyze` is `null` for `ky_bills` (autovacuum only,
1,525 dead tuples). Run `ANALYZE ky_bills;` regardless.

---

## Also worth a look

- **`lrc-enrollment-actions` should now be green.** Its 404-vs-failure classification was fixed in #216;
  the first cron to exercise it runs `45 14 * * *` UTC. **If it is still `error`, the diagnosis was wrong**
  and the 11 fetch failures are real — check endpoint reachability from a dispatched workflow (the sandbox
  cannot reach `apps.legislature.ky.gov`).
- **`/api/cron/notify` still has no active alerting** — Sentry tags are emitted with no rules listening.
  Manual Sentry UI work, open since launch (`TASKS.md`, `docs/launch-checklist.md`).

## Useful context

- Health of every sync source: `npm run health:sources` (or `--json`).
- Latest audit findings: `ky_accuracy_runs` / `ky_accuracy_findings` (migration 046).
- Both check workflows run an advisory triage agent (`scripts/triage-findings.ts`) that posts to
  #status-reports. It is deliberately advisory — it never changes a severity or fails a workflow. If its
  output is wrong, fix the prompt or the payload, not the checkers.
