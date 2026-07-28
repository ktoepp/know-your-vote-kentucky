-- 045_ky_signup_notified.sql
-- Server-authoritative "new verified user" Slack alerts.
--
-- Problem: the alert fired only from /api/me/ack-email-verification, which depends
-- on the browser completing a fire-and-forget POST on /auth/verify. When that POST
-- never lands (tab closed, JS error, mail-app link preview), Supabase still marks
-- auth.users.email_confirmed_at but the app never learns it, so no alert fires. In
-- production this left the majority of confirmed signups un-announced.
--
-- Fix: decouple the alert from email_verified_at (which stays app-controlled per
-- migration 032) and key it off auth.users.email_confirmed_at via a reconciliation
-- cron. This column is the idempotency stamp: set once, when the signup has been
-- announced to Slack.

ALTER TABLE public.ky_user_profiles
  ADD COLUMN IF NOT EXISTS signup_notified_at TIMESTAMPTZ;

-- Pending = confirmed in auth but not yet announced. SECURITY DEFINER so the
-- service-role caller can read auth.users through the join; search_path pinned
-- (advisor hygiene, see migration 037). Not public API — EXECUTE limited to
-- service_role (the reconciliation cron / server routes).
CREATE OR REPLACE FUNCTION public.ky_pending_signup_notifications(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  confirmed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.user_id, p.email, p.display_name, u.email_confirmed_at
  FROM public.ky_user_profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email_confirmed_at IS NOT NULL
    AND p.signup_notified_at IS NULL
  ORDER BY u.email_confirmed_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
$$;

REVOKE EXECUTE ON FUNCTION public.ky_pending_signup_notifications(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ky_pending_signup_notifications(integer)
  TO service_role;

-- Backfill: mark every already-confirmed user as already-announced so the cron
-- does NOT dump a burst of historical signups into #user-signups on first run.
-- Only genuinely new confirmations are announced going forward. (To replay history,
-- clear signup_notified_at for the rows you want re-announced.)
UPDATE public.ky_user_profiles p
SET signup_notified_at = COALESCE(p.email_verified_at, now())
FROM auth.users u
WHERE u.id = p.user_id
  AND u.email_confirmed_at IS NOT NULL
  AND p.signup_notified_at IS NULL;
