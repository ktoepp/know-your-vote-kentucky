# Legislative Record spike — what gap-fills LegiScan

**Spike date:** 2026-06-02
**Source:** `https://apps.legislature.ky.gov/record/{session}/record.html`
(currently `26rs` for the 2026 Regular Session)
**Fixture:** [`fixtures/lrc/legislative-record-26rs-live.html`](../../fixtures/lrc/legislative-record-26rs-live.html)
(landing page only — child pages fetched ad-hoc for the spike)

> **TL;DR:** Two of the record's pages — `enrollment_actions.html` and the
> per-status bill-list pages (`vetoed.html`, `passed_both_houses.html`,
> `enrolled.html`, etc.) — are easily HTML-parseable and give us **date-stamped
> executive actions with line-item-veto distinction**, plus an authoritative
> running list of bills by passage status. The roll-call and committee-vote
> pages are PDF-only and **not** worth pursuing in v1. Recommend a small
> follow-up parser + sync for `enrollment_actions.html` to fill a real
> LegiScan gap, deferring the per-status pages until they prove necessary.

---

## Page inventory

The `record.html` landing page is a three-column directory:

| Column | Surfaces |
|--------|----------|
| **Senate** | Two Readings, Orders For Concurrence, Proceedings, Convening/Quorum & Roll Calls, Vote Modifications, Committee Votes, Bills & Amendments, per-committee vote pages |
| **House**  | Two Readings, Proceedings, Convening/Quorum & Roll Calls, Vote Modifications, Committee Votes, Bills & Amendments, per-committee vote pages |
| **Passed Process** | Passed One House, For Concurrence, Conference, Passed Both Houses, Enrolled, Law, Vetoed, Enrollment/Executive Actions by Date |

Each child page is reachable via a relative link from the landing page. All
URLs are stable within a session (no query strings, no auth).

---

## Page-by-page assessment

| Page | Format | LegiScan gap-fill? | Recommended action |
|------|--------|-------------------|-------------------|
| `enrollment_actions.html` | **HTML** — `<h4>{date}</h4>` → `<h5>{action}</h5>` → `<span>{bill_type}</span><a>{number}</a>` | **🟢 Yes — high value.** Day-precise governor actions; line-item-veto distinction not in LegiScan. | **Ship in Phase 5b.** Parser + sync writes `ky_bill_status_history` rows (`signed_or_vetoed`, `line_item_vetoed`, `delivered_to_sos`). |
| `vetoed.html` | **HTML** — `<h4>{Line Items Vetoed \| Vetoed \| Veto Overridden}</h4>` → `<span>{type}</span><a>{number}</a>` | 🟡 Partial — same data as `enrollment_actions.html` but rolled up; loses date precision. | **Skip.** Use `enrollment_actions.html` instead. |
| `passed_both_houses.html`, `enrolled.html`, `law.html`, `passed_one_house.html`, `for_concurrence.html`, `conference.html` | **HTML** — `<h4>{bill type}</h4>` → comma-separated `<a>` links per bill | 🟡 Status-bucket listing; LegiScan already reports these states per bill. | **Skip in v1.** Useful if we want an authoritative "all bills currently in {status}" page, but redundant with `/bills?status={status}`. Revisit only if LegiScan drift becomes a recurring complaint. |
| `convening_{Chamber}.html` | **HTML table → PDF links** (`senate_votes/60_misc_vote.pdf` per legislative day) | 🟢 Yes — roll-call detail for procedural votes (convening, motions) is not in LegiScan. | **Skip in v1** unless we add PDF text extraction. Big effort, low product value compared to bill roll calls (which LegiScan does cover). |
| `committee_votes_{Chamber}.html` | **HTML table → PDF links** (`senate_votes/60_comm_votes.pdf` per day) | 🟢 Per-committee vote tallies for every meeting day. | **Skip in v1**, same reason as convening. Committee votes are visible on the committee meeting agenda + LRC's per-committee vote PDFs are linked from the LRC profile. |
| `proceedings_{Chamber}.html`, `two_readings_{Chamber}.html`, `orders_concurrence_Senate.html` | HTML, mixed structure | 🟡 Procedural — narrative or sequence-of-actions per chamber. | **Skip.** Status changes already covered by LegiScan bill history. |
| Per-committee pages (`Ag(S).html`, `A&R(H).html`, etc.) | HTML, mixed | 🟡 Per-committee bill activity. | **Skip.** Already covered by `ky_committee_agenda_items` + LegiScan committee_action events. |
| Vote modification PDFs | PDF | 🟡 Corrections to recorded vote rolls. | **Skip.** Rare; auditors only. |

---

## Recommended Phase 5b — `sync:lrc:enrollment-actions`

### Why this page specifically

`enrollment_actions.html` is the **only** page in the record that materially
beats what LegiScan gives us today:

- **Date-stamped** executive actions on every bill that crosses the governor's
  desk. LegiScan usually reports `signed` / `vetoed` but with substantial lag
  and without the exact date the bill was acted on.
- **Line-item-veto distinction.** Budget bills can be partially vetoed —
  LegiScan rolls this up as a generic veto; LRC distinguishes "Line Items
  Vetoed" from "Vetoed" (full veto). This matters for the Kentucky biennial
  budget cycle.
- **"Delivered To Secretary Of State"** event. Kentucky's constitutional
  10-day window starts here. If we want to surface a "Becomes law without
  signature in N days" countdown on bill detail pages (future feature),
  this is the only source.

### Proposed structure

```
sync:lrc:enrollment-actions
  → parses apps.legislature.ky.gov/record/{session}/enrollment_actions.html
  → resolves each <a> to a ky_bills.id via (chamber + bill_number + session)
  → writes ky_bill_status_history rows:
      event_type: 'signed_or_vetoed' | 'line_item_vetoed' | 'delivered_to_sos'
      event_payload: { action_label, action_date, lrc_url }
      observed_at: action_date (not today!)
  → dedupes via legiscan_change_hash:
      sha256(`lrc-record|{action}|{bill_id}|{action_date}`)
```

Two important departures from existing syncs:

1. **`observed_at = action_date`, not `now()`.** Most syncs stamp events with
   "when we observed them." For executive actions we want the actual action
   date so the digest groups by what really happened, not when our scrape ran.
2. **No new event types in `KY_DIGEST_EVENT_TYPES` yet.** `signed_or_vetoed`
   already exists and the existing UI/digest copy works fine for full
   vetoes. `line_item_vetoed` and `delivered_to_sos` would be new slugs
   — defer adding them until we ship the parser and confirm the data is
   right.

### Cron + scope

- **Cadence:** Daily during session + first week of veto recess. Weekly
  outside session. The page is small (~100 KB) and changes only when the
  governor acts.
- **Backfill:** Page already lists the full session (~50 dates back to
  Jan 6, 2026). One initial sync run picks everything up.
- **Quota:** Zero LegiScan calls; pure HTML scrape, same pattern as
  `sync:ky:lrc-calendar`.

### Effort estimate

- Parser: ~150 LOC (`<h4>` → `<h5>` → `<a>` walk, similar to the
  committee-materials parser).
- Sync: ~200 LOC (resolve bills, dedupe via hash, upsert history).
- Tests: parser fixture; resolve-bill helper.
- Total: ~1 day, similar shape to PR #59.

---

## Out of scope (deferred)

- **Roll-call PDF extraction.** `convening_*.html` and `committee_votes_*.html`
  link to per-day PDFs. Parsing PDFs is a separate project; the data inside
  is largely procedural and not a v1 product priority.
- **Per-status bill listings (`enrolled.html`, `law.html`, etc.).** Same
  information already in `ky_bills.status`; ingest only if LegiScan drift
  becomes a recurring complaint.
- **Per-committee record pages.** Already covered by
  `ky_committee_agenda_items` + LegiScan committee_action events.

## Open questions

1. **`line_item_vetoed` digest copy.** Most users probably don't care about
   the distinction between a full veto and a line-item veto on an
   appropriations bill. Recommend: same `signed_or_vetoed` event slug, but
   payload carries the action label so digest copy can read "Line items
   vetoed by Governor" when applicable.
2. **`delivered_to_sos` event slug.** Skip in v1. Bill detail page can read
   from `ky_bill_status_history` when surfacing the 10-day countdown later.
3. **Historical sessions.** The `enrollment_actions.html` URL takes a
   session slug (`26rs`, `25rs`, `25ss`). One-time backfill across all
   `KY_SESSIONS` after parser ships gives us a clean historical record of
   governor actions back to whenever LRC started this format.

---

## Verification

- Spike script: ad-hoc curl into `/tmp/record-spike/`. No committed
  parser / fixture for the child pages yet — those land with Phase 5b.
- Sanity check on 04/27/26 sample: 1 SB delivered to SoS, 1 SB line-item
  vetoed, 1 HB + 3 SBs signed. Numbers consistent with bill-detail page
  spot-checks.

## Cross-references

- [`docs/specs/committee-calendar.md`](committee-calendar.md) § Phase 5 — original
  Wave 3 tracker entry: *"Session record spike for floor events not in
  LegiScan."*
- [`TASKS.md`](../../TASKS.md) § Wave 3 — Committee / data (deferred).
- [`decisions.md`](../../decisions.md) — recommended Phase 5b decisions: when
  the parser lands, document `observed_at = action_date` and the
  `line_item_vetoed` payload-not-slug call here.
