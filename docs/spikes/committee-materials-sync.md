# Spike: LRC committee meeting materials sync

Status: **Deferred** (Wave 3). Phases 0–4 of [committee-calendar.md](../specs/committee-calendar.md) are shipped.

## Goal

Ingest **Meeting Materials** tab metadata from `legislature.ky.gov` committee detail pages (title, date, file URL). Do not host PDFs — link out only.

## Proposed schema

`ky_committee_materials` — `committee_id`, `meeting_id` (nullable), `title`, `url`, `material_date`, `scraped_at`.

## Spike steps (when scheduled)

1. Sample 3 committee types (standing, interim joint, statutory) from calendar `CommitteeRSN` links.
2. Document HTML selectors for materials list rows.
3. Estimate cron cost (N committee pages × 2×/week during interim).
4. Decide dedupe key (url vs title+date).

## Session record (related)

Fixture: `fixtures/lrc/legislative-record-26rs-live.html`. Spike whether `apps.legislature.ky.gov/record/{session}/record.html` adds floor events not already in LegiScan before building ingest.

## Non-goals

- PDF text extraction or OCR
- Replacing LegiScan bill status
