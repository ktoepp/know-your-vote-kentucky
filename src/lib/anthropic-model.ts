/**
 * Canonical default Anthropic model for all KYvKY LLM calls.
 *
 * Previously the model id was duplicated across `ky-content-generation`,
 * `ky-intelligence`, `ky-topic-classifier`, and the accuracy audit — and had
 * drifted (the topic classifier ran an older `claude-sonnet-4-20250514`
 * snapshot while everything else was on `claude-sonnet-4-6`). Centralize it
 * here so a model migration is a one-line change.
 *
 * Override globally with `ANTHROPIC_MODEL`. Surfaces that keep their own knob
 * (e.g. the accuracy audit's `ACCURACY_LLM_MODEL`) layer on top of this default.
 */
export const KY_DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';
