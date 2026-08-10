-- 049_ky_accuracy_audit_marks.sql
-- Stateful sampling rotation for the accuracy audit.
--
-- Sampling was memoryless: a fresh seed each run gave ~0.18% coverage per run
-- of `ky_bills`, and nothing prevented the same row from being picked five
-- runs in a row while another row waited months. Migration 046 gave us
-- per-finding history; this migration gives us per-row-audited history, so
-- the sampler can prefer rows that have gone longest without a check.
--
-- Scope is a per-checker namespace (e.g. "bills", "materials",
-- "committees.materials-listing") so one row's mark in one checker doesn't
-- steal its rotation slot in another.

CREATE TABLE public.ky_accuracy_audit_marks (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  last_audited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

-- Sampler-side lookup: given a scope and a list of candidate keys, fetch the
-- (key, last_audited_at) subset that already has a mark. The PK covers this.
-- Additionally the "oldest-first" scans by scope benefit from a per-scope
-- timestamp index — cheap on a small table, keeps the sort off the primary key.
CREATE INDEX idx_ky_accuracy_audit_marks_scope_ts
  ON public.ky_accuracy_audit_marks(scope, last_audited_at ASC);

ALTER TABLE public.ky_accuracy_audit_marks ENABLE ROW LEVEL SECURITY;
-- Service role only — no authenticated policies.

COMMENT ON TABLE public.ky_accuracy_audit_marks IS
  'Per-scope timestamp of when a row was last covered by the accuracy audit; drives the sampler''s oldest-first rotation.';
COMMENT ON COLUMN public.ky_accuracy_audit_marks.scope IS
  'Sampling namespace, typically the checker + table. Two checkers over the same row keep independent rotation state.';
