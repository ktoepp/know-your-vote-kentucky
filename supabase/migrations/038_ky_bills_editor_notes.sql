-- 038_ky_bills_editor_notes.sql
-- Editor-verified facts channel for AI bill summaries.
--
-- Reader feedback (FEEDBACK.md #4, HB904) surfaced a provision the summary pipeline
-- can't see: generation is grounded ONLY in title/description/topics/subjects, never
-- full bill text, so real provisions verified by a human editor had no way into the
-- summary. A manual ai_summary edit doesn't work: the 6h sync cron regenerates on
-- input change (silently reverting it), ai_summary_model provenance would lie, and
-- the weekly accuracy audit would flag the unsourced claim as a hallucination.
--
-- editor_notes feeds BOTH the generation prompt (as verified facts — see
-- src/lib/ky-content-generation.ts) AND ai_summary_input_hash (conditionally, only
-- when non-empty — see scripts/backfill-bill-summaries.ts), so adding/editing a note
-- triggers regeneration and the enrichment survives all future regens.
--
-- RULES for note content: verified facts ONLY, checked against the official bill/act
-- text, with the section cited. Never analysis, speculation, or advocacy — the note
-- is grounding, not license to editorialize. Provenance narrative lives in
-- FEEDBACK.md + decisions.md.
--
-- To set a note:  npx tsx scripts/set-bill-editor-note.ts --bill=HB904 \
--   --session="2026 Regular Session" --note="Verified against ... : ..."
-- then regenerate: npm run backfill:bill-summaries -- --bill=HB904 --session="2026 Regular Session"

ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS editor_notes TEXT,
  ADD COLUMN IF NOT EXISTS editor_notes_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ky_bills.editor_notes IS
  'Editor-verified facts (checked against official bill/act text; cite the section) fed into the AI summary prompt AND ai_summary_input_hash. Verified facts only — never analysis or speculation. See migration 038 header + FEEDBACK.md.';
COMMENT ON COLUMN public.ky_bills.editor_notes_updated_at IS
  'When editor_notes was last set via scripts/set-bill-editor-note.ts. NULL = no note.';
