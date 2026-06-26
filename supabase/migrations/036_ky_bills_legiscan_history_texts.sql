-- 036_ky_bills_legiscan_history_texts.sql
-- Persist LegiScan action history + bill-text versions on ky_bills (JSONB),
-- mirroring how ky_bills.sponsors is already stored.
--
-- The bill-detail page previously fetched these live from getBill on every cache
-- miss, which scaled LegiScan quota with page traffic. Persisting them during sync
-- lets the page render the full timeline + official-text links entirely from the
-- DB, removing the last LegiScan call from the read path.
--
-- Written by syncKyBills via legiscanHistoryTextColumnsFromDetail() whenever a bill's
-- getBill detail is fetched (same cadence as sponsors). Existing rows stay NULL until
-- their next detail sync; the bill page falls back to a synthesized step timeline and
-- the stored bill_text_url in the meantime, so nothing regresses.
--
-- See decisions.md § 2026-06-26 — bill-detail DB render and src/lib/ky-bill-detail-server.ts.

ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS legiscan_history JSONB,
  ADD COLUMN IF NOT EXISTS legiscan_texts JSONB;

COMMENT ON COLUMN public.ky_bills.legiscan_history IS
  'LegiScan getBill history[] (date/action/chamber/importance). NULL until first detail sync. Rendered on the bill page.';
COMMENT ON COLUMN public.ky_bills.legiscan_texts IS
  'LegiScan getBill texts[] (doc_id/type/mime/date/url/state_link). NULL until first detail sync. Powers official bill-text links.';
