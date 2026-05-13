-- 022_ky_welcome_email_stamp.sql
-- Follow Bills M8 — track whether the one-time welcome email has been sent.
-- Sent on first email verification (not at signup) so we never email an
-- unverified address. Idempotency guard for the welcome send path.

ALTER TABLE public.ky_user_profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
