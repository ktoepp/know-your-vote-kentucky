-- 021_ky_email_bounce_state.sql
-- Follow Bills M8 — bounce / complaint tracking driven by Resend webhooks.
-- Hard bounces and spam complaints set suppressed_at; the digest cron skips
-- suppressed users so we stop sending to addresses that damage deliverability.

ALTER TABLE public.ky_notification_preferences
  ADD COLUMN IF NOT EXISTS bounce_state TEXT NOT NULL DEFAULT 'none'
    CHECK (bounce_state IN ('none', 'soft', 'hard', 'complained')),
  ADD COLUMN IF NOT EXISTS bounce_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppressed_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ky_notification_preferences_suppressed
  ON public.ky_notification_preferences(suppressed_at)
  WHERE suppressed_at IS NOT NULL;
