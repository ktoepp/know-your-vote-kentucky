-- 026_ky_committee_follows.sql
-- Follow Committees — per-user committee subscriptions and committee event log for digests.
-- Mirrors the bill-follow pattern from 019_ky_follow_bills_schema.sql.

-- ============================================================
-- ky_committee_follows — per-user committee subscriptions
-- ============================================================
CREATE TABLE public.ky_committee_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.ky_committees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, committee_id)
);

CREATE INDEX idx_ky_committee_follows_committee ON public.ky_committee_follows(committee_id);

ALTER TABLE public.ky_committee_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own committee follows"
  ON public.ky_committee_follows
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own committee follows"
  ON public.ky_committee_follows
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own committee follows"
  ON public.ky_committee_follows
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- ky_committee_events — append-only log for committee alerts
-- Service-role write/read only; users never query this directly.
-- Event types: 'meeting_scheduled', 'meeting_cancelled', 'agenda_updated'
-- ============================================================
CREATE TABLE public.ky_committee_events (
  id BIGSERIAL PRIMARY KEY,
  committee_id UUID NOT NULL REFERENCES public.ky_committees(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.ky_committee_meetings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_committee_events_committee_observed
  ON public.ky_committee_events(committee_id, observed_at DESC);

CREATE INDEX idx_ky_committee_events_observed
  ON public.ky_committee_events(observed_at DESC);

-- Dedupe: one event per committee + type + meeting to prevent duplicate digest rows.
CREATE UNIQUE INDEX uq_ky_committee_events_dedupe
  ON public.ky_committee_events(committee_id, event_type, meeting_id)
  WHERE meeting_id IS NOT NULL;

ALTER TABLE public.ky_committee_events ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only.
