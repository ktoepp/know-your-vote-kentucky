-- 046_ky_accuracy_audit_history.sql
-- Persist accuracy-audit results so findings can be triaged over time.
--
-- Every run was previously ephemeral: printed to the console, posted to Slack,
-- discarded. That made three things impossible — telling a new finding from one
-- that has recurred for months, seeing whether accuracy is improving, and
-- knowing which rows have already been audited. The digest reported the same
-- drift identically every week with no indication it was the same drift.

-- ============================================================
-- ky_accuracy_runs — one row per audit run
-- ============================================================
CREATE TABLE public.ky_accuracy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  -- Reproduce a run's exact sample with `--seed=<seed>`.
  seed BIGINT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  errored_domains TEXT[] NOT NULL DEFAULT '{}',
  has_operational_error BOOLEAN NOT NULL DEFAULT false,
  -- Per-domain CheckerResult totals (minus findings), for trend queries.
  domain_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_accuracy_runs_started ON public.ky_accuracy_runs(started_at DESC);

ALTER TABLE public.ky_accuracy_runs ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only.

COMMENT ON TABLE public.ky_accuracy_runs IS
  'One row per accuracy-audit run; written by scripts/accuracy-audit.ts.';

-- ============================================================
-- ky_accuracy_findings — individual findings, keyed for recurrence
-- ============================================================
CREATE TABLE public.ky_accuracy_findings (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.ky_accuracy_runs(id) ON DELETE CASCADE,
  -- Stable identity of "the same finding" across runs: sha256 over
  -- (domain, entity, field, message). Excludes expected/actual so a drifting
  -- value still reads as the same open issue.
  fingerprint TEXT NOT NULL,
  domain TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('fail', 'warn', 'info')),
  entity TEXT,
  field TEXT,
  message TEXT NOT NULL,
  expected TEXT,
  actual TEXT,
  url TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_accuracy_findings_run ON public.ky_accuracy_findings(run_id);
-- Drives the new-vs-recurring lookup: most recent prior sighting per fingerprint.
CREATE INDEX idx_ky_accuracy_findings_fingerprint
  ON public.ky_accuracy_findings(fingerprint, observed_at DESC);
CREATE INDEX idx_ky_accuracy_findings_domain
  ON public.ky_accuracy_findings(domain, observed_at DESC);

ALTER TABLE public.ky_accuracy_findings ENABLE ROW LEVEL SECURITY;
-- No authenticated policies — service role only.

COMMENT ON TABLE public.ky_accuracy_findings IS
  'Accuracy-audit findings, fingerprinted so recurrence can be distinguished from new drift.';
