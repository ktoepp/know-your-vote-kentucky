-- Committee events shown in a digest, logged alongside bill event_ids so
-- digest history can display committee updates (previously a committee-only
-- digest appeared in history as an empty entry).
ALTER TABLE public.ky_notifications_log
  ADD COLUMN committee_event_ids BIGINT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.ky_notifications_log.committee_event_ids IS
  'ky_committee_events.id values rendered in this digest email.';
