-- 033_ky_digest_defaults_off.sql
-- New accounts: digest off until first bill follow (app enables weekly).
-- digest_user_disabled tracks explicit user opt-out vs default-off.

ALTER TABLE public.ky_notification_preferences
  ALTER COLUMN digest_frequency SET DEFAULT 'off';

ALTER TABLE public.ky_notification_preferences
  ADD COLUMN IF NOT EXISTS digest_user_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ky_notification_preferences.digest_user_disabled IS
  'True when the user explicitly turned digests off or unsubscribed; blocks auto-enable on bill follow.';
