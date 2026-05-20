-- 025_ky_saved_searches_snooze.sql
-- Wave 1 saved bill searches; Wave 2 snooze on follows.

CREATE TABLE public.ky_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(trim(label)) >= 1 AND char_length(label) <= 120),
  href TEXT NOT NULL CHECK (char_length(href) >= 1 AND char_length(href) <= 2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_saved_searches_user ON public.ky_saved_searches(user_id, created_at DESC);

ALTER TABLE public.ky_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own saved searches"
  ON public.ky_saved_searches FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own saved searches"
  ON public.ky_saved_searches FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON public.ky_saved_searches FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.ky_bill_follows
  ADD COLUMN IF NOT EXISTS snoozed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_ky_bill_follows_snoozed ON public.ky_bill_follows(user_id) WHERE snoozed = true;
