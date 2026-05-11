-- 019_ky_follow_bills_schema.sql
-- Follow Bills M2 — data model for follows, preferences, change history, send log.
-- No UI / API in this migration. See docs/specs/follow-bills.md.

-- ============================================================
-- ky_bill_follows — per-user bill subscriptions
-- ============================================================
CREATE TABLE public.ky_bill_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.ky_bills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bill_id)
);

CREATE INDEX idx_ky_bill_follows_bill ON public.ky_bill_follows(bill_id);

ALTER TABLE public.ky_bill_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own bill follows"
  ON public.ky_bill_follows
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own bill follows"
  ON public.ky_bill_follows
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own bill follows"
  ON public.ky_bill_follows
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- ky_notification_preferences — per-user digest config
-- ============================================================
CREATE TABLE public.ky_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (digest_frequency IN ('daily', 'weekly', 'off')),
  event_types TEXT[] NOT NULL DEFAULT ARRAY[
    'introduced',
    'committee_action',
    'floor_vote',
    'passed_chamber',
    'sent_to_governor',
    'signed_or_vetoed',
    'dead'
  ],
  topic_filters TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed_all_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_ky_notification_preferences_token
  ON public.ky_notification_preferences(unsubscribe_token);

ALTER TABLE public.ky_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own preferences"
  ON public.ky_notification_preferences
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.ky_notification_preferences
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.ky_notification_preferences_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ky_notification_preferences_set_updated_at
  BEFORE UPDATE ON public.ky_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.ky_notification_preferences_touch_updated_at();

-- ============================================================
-- ky_bill_status_history — append-only event log driving digests
-- Service-role write/read only; users never query this directly.
-- ============================================================
CREATE TABLE public.ky_bill_status_history (
  id BIGSERIAL PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.ky_bills(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  legiscan_change_hash TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_bill_status_history_bill_observed
  ON public.ky_bill_status_history(bill_id, observed_at DESC);

CREATE UNIQUE INDEX uq_ky_bill_status_history_dedupe
  ON public.ky_bill_status_history(bill_id, event_type, legiscan_change_hash);

ALTER TABLE public.ky_bill_status_history ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only.

-- ============================================================
-- ky_notifications_log — per-send audit + idempotency
-- ============================================================
CREATE TABLE public.ky_notifications_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_window_start TIMESTAMPTZ NOT NULL,
  digest_window_end TIMESTAMPTZ NOT NULL,
  event_ids BIGINT[] NOT NULL,
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'failed', 'bounced'))
);

CREATE INDEX idx_ky_notifications_log_user
  ON public.ky_notifications_log(user_id, sent_at DESC);

ALTER TABLE public.ky_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notification log"
  ON public.ky_notifications_log
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- Extend the auth → profile sync trigger to also seed default
-- notification preferences for each new user.
-- ============================================================
CREATE OR REPLACE FUNCTION public.ky_sync_profile_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_name TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
BEGIN
  INSERT INTO public.ky_user_profiles (user_id, display_name, email, email_verified_at)
  VALUES (
    NEW.id,
    meta_name,
    COALESCE(NEW.email, ''),
    NEW.email_confirmed_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified_at = EXCLUDED.email_verified_at,
    display_name = CASE
      WHEN EXCLUDED.display_name IS NOT NULL AND btrim(EXCLUDED.display_name) <> ''
        THEN EXCLUDED.display_name
      ELSE ky_user_profiles.display_name
    END,
    updated_at = now();

  -- Seed notification preferences with column defaults.
  -- ON CONFLICT keeps the row write idempotent across insert + update triggers.
  INSERT INTO public.ky_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: any existing auth user without a preferences row gets one with defaults.
INSERT INTO public.ky_notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
