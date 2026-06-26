-- 034_ky_bill_ai_summary_metadata.sql
-- Staleness/provenance tracking for AI-generated plain-language bill summaries.
--
-- ky_bills.ai_summary has existed (unpopulated) since migration 001. We now
-- populate it from title + description + topics + LegiScan subjects via
-- src/lib/ky-content-generation.ts (generateBillSummary) and a backfill script
-- (scripts/backfill-bill-summaries.ts, `npm run backfill:bill-summaries`).
--
-- Bills get amended, so a summary can go stale. These columns let the backfill
-- regenerate ONLY when the inputs that feed the summary actually changed
-- (input_hash mismatch) and record which model produced it / when — the summary
-- analog of the topics reclassify change-detection.
--
-- See decisions.md § 2026-06-26 — AI plain-language descriptions and
-- src/lib/accuracy-audit/checkers/llm-review.ts (reviewSummaries faithfulness check).

ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_input_hash TEXT;

COMMENT ON COLUMN public.ky_bills.ai_summary_generated_at IS
  'When ai_summary was last generated. NULL = never generated.';
COMMENT ON COLUMN public.ky_bills.ai_summary_model IS
  'Model id that produced the current ai_summary (e.g. claude-sonnet-4-6).';
COMMENT ON COLUMN public.ky_bills.ai_summary_input_hash IS
  'Stable hash of the summary inputs (title + description + sorted topics + sorted subject names). Backfill regenerates only when this changes.';
