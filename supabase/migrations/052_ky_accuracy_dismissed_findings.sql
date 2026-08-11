-- 052_ky_accuracy_dismissed_findings.sql
-- Accepted-noise fingerprints the accuracy audit should stop re-reporting.
--
-- The audit fingerprints each finding and flags a repeat as "recurring for N
-- days" in the digest. That works when recurrence is signal — the finding is
-- open and unfixed — and stops working the moment we decide a finding is
-- correct-as-tuned or a known upstream quirk that will never be actioned.
-- With no way to say "we accept this drift", the same finding fires every week
-- forever, teaches operators to skim past the domain, and buries a real
-- regression when it eventually appears.
--
-- This table records fingerprints an operator has explicitly accepted as
-- noise. The audit filters them out of the recurrence lookup, the finding
-- write, and the LLM triage payload. `decisions.md` § 2026-06-03 already
-- tracks accepted advisory noise by hand; this table makes those decisions
-- enforceable in code rather than tribal.

CREATE TABLE public.ky_accuracy_dismissed_findings (
  fingerprint TEXT PRIMARY KEY,
  -- Short label for the class of noise ("advisory-llm-subjective",
  -- "upstream-convention-photo", ...) so the dismissal list stays readable.
  reason TEXT NOT NULL,
  -- Free-form context — link a decisions.md entry, a run id, a bill number.
  note TEXT,
  -- Who added it. Optional; audit runs never write here.
  added_by TEXT,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Optional expiry. Nulls never expire; set a date to auto-un-dismiss (the
  -- audit reads WHERE expires_at IS NULL OR expires_at > now()).
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ky_accuracy_dismissed_findings_active
  ON public.ky_accuracy_dismissed_findings (fingerprint)
  WHERE expires_at IS NULL OR expires_at > now();

ALTER TABLE public.ky_accuracy_dismissed_findings ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only, same as
-- ky_accuracy_runs / ky_accuracy_findings.

COMMENT ON TABLE public.ky_accuracy_dismissed_findings IS
  'Fingerprints of accuracy-audit findings accepted as noise; filtered out of recurrence + triage.';
