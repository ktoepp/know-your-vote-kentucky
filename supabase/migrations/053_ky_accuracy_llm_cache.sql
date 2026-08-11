-- 053_ky_accuracy_llm_cache.sql
-- Cache LLM verdicts for stable inputs so the audit stops re-paying for the
-- same answer every run.
--
-- The glossary review sends the same ~24 civic-glossary entries every week.
-- Their content only changes when we edit tooltipContent.ts. Caching the
-- model's per-entry verdict on (content_hash, model) skips the Anthropic call
-- entirely when nothing has changed — the common case. The summary and topics
-- passes are NOT cached: their inputs (title, description, ai_summary,
-- editor_notes, topics, legiscan_subjects) change frequently and per-bill,
-- so a cache would rarely hit and would delay picking up drift.
--
-- Cache misses (or a table absence) degrade to calling Anthropic as before, so
-- this migration is safe to apply out of band with the code that reads it.

CREATE TABLE public.ky_accuracy_llm_cache (
  -- SHA-256 over the normalized input passed to the model (see the reader in
  -- llm-review.ts). Not tied to a specific glossary entry — the same content
  -- keyed under two different keys should share one cache row.
  content_hash TEXT NOT NULL,
  -- Model identifier the verdict was produced under. Changing the model
  -- invalidates cached verdicts by design.
  model TEXT NOT NULL,
  -- Full verdict object as returned by the reviewer (ok/severity/issue).
  verdict JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_hash, model)
);

ALTER TABLE public.ky_accuracy_llm_cache ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only, matching the other
-- ky_accuracy_* tables.

COMMENT ON TABLE public.ky_accuracy_llm_cache IS
  'Cached LLM verdicts keyed on (content_hash, model). Populated by the glossary review pass in scripts/accuracy-audit.ts.';
