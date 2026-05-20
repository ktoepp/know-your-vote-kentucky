-- 024_ky_committee_calendar.sql
-- LRC legislative calendar: committees, meetings, agenda items (Phase 1).
-- See docs/specs/committee-calendar.md

-- ============================================================
-- ky_committees — LRC committee directory (CommitteeRSN + type)
-- ============================================================
CREATE TABLE public.ky_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lrc_rsn INTEGER NOT NULL,
  committee_type TEXT NOT NULL,
  name TEXT NOT NULL,
  chamber TEXT NOT NULL DEFAULT 'unknown'
    CHECK (chamber IN ('house', 'senate', 'joint', 'unknown')),
  slug TEXT NOT NULL,
  profile_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ky_committees_lrc UNIQUE (lrc_rsn, committee_type)
);

CREATE INDEX idx_ky_committees_slug ON public.ky_committees (slug);
CREATE INDEX idx_ky_committees_name_lower ON public.ky_committees (lower(name));

COMMENT ON TABLE public.ky_committees IS
  'Kentucky General Assembly committees from LRC legislative calendar / committee detail pages.';

-- ============================================================
-- ky_committee_meetings — scheduled occurrences
-- ============================================================
CREATE TABLE public.ky_committee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.ky_committees(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  time_and_location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled')),
  member_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  agenda_content_hash TEXT,
  source_url TEXT NOT NULL DEFAULT 'https://apps.legislature.ky.gov/legislativecalendar',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ky_committee_meetings_slot UNIQUE (committee_id, meeting_date, time_and_location)
);

CREATE INDEX idx_ky_committee_meetings_date ON public.ky_committee_meetings (meeting_date DESC);
CREATE INDEX idx_ky_committee_meetings_committee ON public.ky_committee_meetings (committee_id);

-- ============================================================
-- ky_committee_agenda_items — parsed agenda lines
-- ============================================================
CREATE TABLE public.ky_committee_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.ky_committee_meetings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  item_kind TEXT NOT NULL DEFAULT 'other'
    CHECK (item_kind IN ('bill', 'resolution', 'minutes', 'report', 'action_item', 'other')),
  bill_number TEXT,
  bill_session_label TEXT,
  ky_bill_id UUID REFERENCES public.ky_bills(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ky_committee_agenda_item_order UNIQUE (meeting_id, sort_order)
);

CREATE INDEX idx_ky_committee_agenda_bill ON public.ky_committee_agenda_items (ky_bill_id)
  WHERE ky_bill_id IS NOT NULL;
CREATE INDEX idx_ky_committee_agenda_bill_number ON public.ky_committee_agenda_items (bill_number)
  WHERE bill_number IS NOT NULL;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER set_ky_committees_updated_at
  BEFORE UPDATE ON public.ky_committees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_ky_committee_meetings_updated_at
  BEFORE UPDATE ON public.ky_committee_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS — public read (sync uses service role)
-- ============================================================
ALTER TABLE public.ky_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ky_committee_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ky_committee_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ky_committees"
  ON public.ky_committees FOR SELECT USING (true);

CREATE POLICY "Public read ky_committee_meetings"
  ON public.ky_committee_meetings FOR SELECT USING (true);

CREATE POLICY "Public read ky_committee_agenda_items"
  ON public.ky_committee_agenda_items FOR SELECT USING (true);
