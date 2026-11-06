-- 058_ky_my_legislators_subscription.sql
-- WS7-09a: store a subscriber's districts and the weekly "My Legislators" opt-in
-- on the existing preferences row. The subscription is keyed to district numbers,
-- not to specific legislators: the weekly email resolves the current member for
-- each district at send time, so it survives the seating of newly elected members.
-- No address, ZIP or coordinates are stored, only two small integers.
--
-- RLS: no policy change is needed. The existing ky_notification_preferences
-- policies (users select and update their own row, keyed on user_id) are
-- row-level and cover these new columns.
--
-- Idempotent: every add uses IF NOT EXISTS.

ALTER TABLE public.ky_notification_preferences
  ADD COLUMN IF NOT EXISTS my_legislators_weekly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS house_district SMALLINT CHECK (house_district BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS senate_district SMALLINT CHECK (senate_district BETWEEN 1 AND 38),
  ADD COLUMN IF NOT EXISTS districts_set_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ky_notification_preferences_my_legislators_weekly_idx
  ON public.ky_notification_preferences (user_id)
  WHERE my_legislators_weekly;

COMMENT ON COLUMN public.ky_notification_preferences.my_legislators_weekly IS
  'Weekly My Legislators email opt-in. Independent of digest_frequency. Cleared by any unsubscribe link.';
COMMENT ON COLUMN public.ky_notification_preferences.house_district IS
  'Kentucky House district number (1-100) the weekly email reports on.';
COMMENT ON COLUMN public.ky_notification_preferences.senate_district IS
  'Kentucky Senate district number (1-38) the weekly email reports on.';
COMMENT ON COLUMN public.ky_notification_preferences.districts_set_at IS
  'When house_district or senate_district was last set through the preferences API.';
