-- 029_ky_committee_materials.sql
-- Wave 3 Phase 5: committee meeting materials (metadata only — no PDF hosting).
-- Source: https://apps.legislature.ky.gov/CommitteeDocuments/{lrc_rsn}
-- See docs/specs/committee-calendar.md § Phase 5+.
--
-- NOTE: Migration 028 lives on PR #56 (feat/follow-committees-v1.5).
-- This migration assumes #56 has merged. If applied first, 028 can land
-- after without conflict (different tables).

-- ============================================================
-- ky_committee_materials — links to LRC-hosted documents
-- ============================================================
CREATE TABLE public.ky_committee_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.ky_committees(id) ON DELETE CASCADE,
  /** Best-effort link to the scheduled meeting row when dates match. */
  meeting_id UUID REFERENCES public.ky_committee_meetings(id) ON DELETE SET NULL,
  /** Date pulled from the materials page heading (may not match a meeting row). */
  meeting_date DATE,
  /** Date label as printed on LRC (e.g. "Thursday, May 21, 2026") for display fidelity. */
  date_label TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  /** Lowercase extension without leading dot (`pdf`, `docx`); NULL for non-file links. */
  file_type TEXT,
  /** The CommitteeDocuments page we scraped this from. */
  source_url TEXT NOT NULL,
  /** Sort order within a meeting group (matches the source <ul> order). */
  sort_order INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ky_committee_materials_url UNIQUE (committee_id, url)
);

CREATE INDEX idx_ky_committee_materials_committee
  ON public.ky_committee_materials (committee_id);

CREATE INDEX idx_ky_committee_materials_meeting_date
  ON public.ky_committee_materials (committee_id, meeting_date DESC);

CREATE INDEX idx_ky_committee_materials_meeting
  ON public.ky_committee_materials (meeting_id)
  WHERE meeting_id IS NOT NULL;

COMMENT ON TABLE public.ky_committee_materials IS
  'Metadata for documents posted on LRC CommitteeDocuments/{rsn} pages (agendas, minutes, presentations, exhibits). We link out — no file hosting.';

CREATE TRIGGER set_ky_committee_materials_updated_at
  BEFORE UPDATE ON public.ky_committee_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS — public read; sync writes via service role
-- ============================================================
ALTER TABLE public.ky_committee_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ky_committee_materials"
  ON public.ky_committee_materials FOR SELECT USING (true);
