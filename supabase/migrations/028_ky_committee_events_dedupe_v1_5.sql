-- 028_ky_committee_events_dedupe_v1_5.sql
-- Follow Committees v1.5: relax the dedupe index so multiple `agenda_updated`
-- rows can exist per (committee, meeting), one per distinct agenda content hash.
--
-- v1 index `uq_ky_committee_events_dedupe` on (committee_id, event_type, meeting_id)
-- correctly dedupes `meeting_scheduled` and `meeting_cancelled` (which fire at most
-- once per meeting), but blocks subsequent `agenda_updated` rows for the same
-- meeting — agendas can change several times during the session, and each distinct
-- version should produce a digest-eligible event.
--
-- Solution: include `event_payload->>'agenda_content_hash'` (empty string when
-- absent) in the unique index. For `meeting_scheduled` / `meeting_cancelled` the
-- payload omits the hash → behaves the same as v1. For `agenda_updated`, the
-- payload carries the new hash → one row per distinct version.

DROP INDEX IF EXISTS uq_ky_committee_events_dedupe;

CREATE UNIQUE INDEX uq_ky_committee_events_dedupe_v1_5
  ON public.ky_committee_events(
    committee_id,
    event_type,
    meeting_id,
    COALESCE((event_payload->>'agenda_content_hash')::text, '')
  )
  WHERE meeting_id IS NOT NULL;
