# Committee calendar — Phase 0 report

Date: 2026-05-18  
Spec: [committee-calendar.md](./committee-calendar.md)

## Deliverables

| Item | Location |
|------|----------|
| Calendar HTML fixture | `fixtures/lrc/legislative-calendar-live.html` |
| Session record fixture | `fixtures/lrc/legislative-record-26rs-live.html` |
| Calendar parser | `src/lib/lrc-legislative-calendar-parser.ts` |
| Bill reference extractor | `src/lib/lrc-bill-reference-parser.ts` |
| Spike CLI | `npm run spike:lrc:calendar` |
| Bill ref audit | `npm run audit:lrc:bill-refs` → `reports/lrc-agenda-bill-refs-audit.json` |
| Bill Watch UI drop folder | `docs/reference/bill-watch/screenshots/` |

## Parser findings (LRC calendar HTML v2.3)

**Structure:** `.panel.style1` contains repeating blocks:

1. `.DateHeading` — e.g. `Monday, May 18, 2026`
2. Per meeting (may be multiple per day):
   - `.TimeAndLocation` — time + room
   - `.CommitteeName` — link to `Committee-Details.aspx?CommitteeRSN=&CommitteeType=`
   - `.Members` — legislator profile links (`DistrictNumber` query param)
   - `.Agenda` — free text (often multi-line; not nested in child divs)
3. `No Meetings Scheduled` — single `.CommitteeName` without `.TimeAndLocation`

**Segmentation:** Meetings on the same day are split on each new `.TimeAndLocation` node.

**Agenda lines:** Split on newlines; bill references extracted per line via regex (see audit report).

**Stable IDs:** Prefer `CommitteeRSN` + `CommitteeType` over display name for DB keys.

## Bill reference patterns (fixture capture)

Confirmed in Capital Projects agenda sample:

| Reference | Session in text |
|-----------|-----------------|
| House Bill 6 | 2024 Regular Session |
| Senate Bill 36 | 2021 Regular Session |
| House Bill 1 | 2022 Regular Session |
| House Joint Resolution 81 | 2026 Regular Session |

Also supported: abbreviated `HB 1`, `SB 36`, `HJR`, `SCR`, `BR`, etc.

**Gap:** Lines like `Round One (Senate Bill 36 - 2021 Regular Session)` use hyphen before session — parser uses parenthesis form; extend regex in Phase 1 if audit flags misses.

## 26RS legislative record (`record/26rs/record.html`)

**Not** a day-by-day calendar. It is a **session index** of links:

- Senate/House proceedings, committee votes, bill lists
- Per-committee HTML files (e.g. `Jud(S).html`)

**Phase 1+:** Optional secondary scrape for committee vote pages; **not** required for meeting schedule MVP.

## Failure modes to handle in Phase 1 sync

1. HTML class renames (monitor `<!-- Version 2.3 -->` comment)
2. Empty week (all “No Meetings Scheduled”)
3. Agenda prose without bill numbers (agency reports, KRS citations) — store `raw_text` always
4. Multi-session bill references — resolve with `sessionLabel` + `bill_number`, not current session default
5. Same committee name, different `CommitteeRSN` across types — always key on RSN + type

## Phase 1 entry criteria (met)

- [x] Fixture saved in repo
- [x] Parser returns days, meetings, agenda lines, committee URLs
- [x] Bill reference extractor with audit script
- [x] Spike assertions pass locally
- [x] Bill Watch help + UX notes in `docs/reference/bill-watch/` (screenshots: add PNGs to `screenshots/` per INDEX.md)

## Next steps

1. Migration `024_*` tables per spec
2. `syncKyLrcCalendar()` using parser + content hash
3. Vercel cron 2–4× daily (interim/session)
4. Bill Watch screenshots → update UX notes in `docs/reference/bill-watch/README.md`
