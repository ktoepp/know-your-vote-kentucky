/**
 * LLM review checker — Anthropic pass over "fuzzy" content that deterministic
 * source diffs can't judge:
 *   (a) ai_summary faithfulness vs the bill title/description,
 *   (b) topics[] plausibility vs official legiscan_subjects + title/description,
 *   (c) glossary definitions (tooltipContent) for factual/civic accuracy.
 *
 * Gated by ACCURACY_SKIP_LLM and the presence of ANTHROPIC_API_KEY. Each pass is
 * a single batched call to keep token cost bounded by ACCURACY_LLM_SAMPLE.
 */
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { governmentTooltips, voteCountTooltips } from '../../tooltipContent';
import { makeRng, sampleTable, seededShuffle } from '../sampling';
import {
  classifyCheckerError,
  errorMessage,
  outageResult,
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
  type Severity,
} from '../types';

/**
 * Per-run token accumulator. Passed by reference to each pass so budget
 * enforcement and cost logging see the whole checker's spend.
 */
interface TokenLedger {
  input: number;
  output: number;
  cacheHits: number;
}

/**
 * Hard cap on Anthropic tokens across the entire llm checker. Above this the
 * remaining passes short-circuit and a warn finding is emitted. Default sized
 * against the current 3-pass × 8-sample layout: ~50k in / ~10k out per run has
 * plenty of headroom, and a runaway (widened `activeDays`, larger `llmSample`,
 * cache-cold glossary) trips the cap before it silently multiplies the bill.
 * Overridable via `ACCURACY_LLM_MAX_TOTAL_TOKENS`; `0` disables the cap.
 */
const DEFAULT_LLM_TOKEN_BUDGET = 200_000;

function llmTokenBudget(): number {
  const raw = process.env.ACCURACY_LLM_MAX_TOTAL_TOKENS?.trim();
  if (!raw) return DEFAULT_LLM_TOKEN_BUDGET;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LLM_TOKEN_BUDGET;
}

function tokenSum(ledger: TokenLedger): number {
  return ledger.input + ledger.output;
}

/** SHA-256 over normalized input; used as the cache key. */
function contentHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

interface ReviewVerdict {
  key: string;
  severity?: string;
  issue?: string;
  ok?: boolean;
}

/**
 * LLM verdicts are advisory (semantic judgment, out of scope for the
 * deterministic agent — see decisions.md § 2026-06-03), so they are capped at
 * `warn` and never hard-fail the run. The model's "fail" is recorded as a warn
 * for triage; only deterministic source diffs produce `fail`.
 */
function normalizeSeverity(raw: string | undefined): Severity {
  const s = (raw || '').toLowerCase();
  if (s === 'fail' || s === 'warn') return 'warn';
  return 'info';
}

/** Pull the first JSON array out of a model response, tolerating prose/markdown fences. */
function extractJsonArray(text: string): unknown[] {
  const fenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = fenced.indexOf('[');
  const end = fenced.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function callClaude(
  client: Anthropic,
  model: string,
  prompt: string,
  ledger: TokenLedger,
): Promise<unknown[]> {
  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  // Accumulate the actual usage before parsing so a mid-parse throw still
  // records what the call cost.
  ledger.input += message.usage?.input_tokens ?? 0;
  ledger.output += message.usage?.output_tokens ?? 0;
  const part = message.content[0];
  if (!part || part.type !== 'text') return [];
  return extractJsonArray(part.text);
}

function clip(s: string | null | undefined, max = 800): string {
  const t = (s ?? '').toString();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * Bill numbers repeat every session — there are 17 different "HB142" rows across
 * 2010-2026 — so a bare bill_number is neither a unique verdict key (two
 * same-numbered bills sampled together collide in the response Map, silently
 * dropping one verdict) nor an actionable finding label (an operator can't tell
 * which session was flagged). Pair the number with its session for both.
 */
function billKey(billNumber: string, session: string | null | undefined): string {
  return session ? `${billNumber} · ${session}` : billNumber;
}

async function reviewSummaries(
  db: SupabaseClient,
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
  ledger: TokenLedger,
): Promise<number> {
  const data = await sampleTable<{
    bill_number: string;
    session: string | null;
    title: string;
    description: string | null;
    ai_summary: string | null;
    legiscan_subjects: { subject_name?: string }[] | null;
    editor_notes: string | null;
  }>(db, {
    table: 'ky_bills',
    select: 'bill_number, session, title, description, ai_summary, legiscan_subjects, editor_notes',
    // Distinct stream from the bills checker, which samples ky_bills with the
    // bare cfg.seed. Sharing it made this pass re-review the bills that checker
    // had just verified deterministically: bottom-k over the ~4.9k rows with an
    // ai_summary picks nearly the same hash quantile as bottom-k over the full
    // ~22.5k corpus, so the two samples overlapped almost entirely.
    seed: cfg.seed ^ 0x27d4eb2f,
    limit: cfg.llmSample,
    filter: (q) => q.not('ai_summary', 'is', null).neq('ai_summary', ''),
  });

  const items = data.map((b) => ({
    key: billKey(b.bill_number, b.session),
    title: clip(b.title as string, 300),
    // The summary generator sees the full description; the auditor must too, or claims grounded
    // past the clip read as fabricated (2026-07-05: HB257 "school climate" at char ~1050 of 1275).
    description: clip(b.description as string, 2000),
    subjects: ((b.legiscan_subjects ?? []) as { subject_name?: string }[])
      .map((s) => s?.subject_name?.trim())
      .filter((s): s is string => !!s),
    summary: clip(b.ai_summary as string),
    // Same lesson as the description clip: the generator sees editor_notes, so the auditor
    // must too, or note-grounded claims read as fabricated (migration 038, FEEDBACK.md #4).
    ...(b.editor_notes?.trim() ? { editorNotes: clip(b.editor_notes, 600) } : {}),
  }));
  if (items.length === 0) return 0;

  const prompt = `You are auditing AI-generated plain-language summaries on a Kentucky General Assembly transparency website. Each "summary" is 2-3 sentences and MAY end with a "Who it may affect:" clause naming impacted Kentuckians. For each bill, judge it against the bill's "title", "description", and official "subjects". Some bills include "editorNotes": facts a human editor verified against the official bill text. Treat editorNotes as valid grounding — do NOT flag summary claims or audiences they support.

Flag a summary when:
- it states a fabricated fact or a claim that contradicts the title/description; OR
- its "Who it may affect:" clause names audiences that are NOT supported by the title/description/subjects, or are overbroad/overclaimed (impact is inferential, so this is the highest-risk part).

Return ONLY a JSON array, one object per bill, echoing each bill's "key" verbatim:
{ "key": "<key>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

Use severity "fail" for hallucinated facts, contradictions, or fabricated audiences; "warn" for misleading emphasis, notable omissions, or overbroad audience claims; "info"/ok=true when faithful and grounded. An omitted "Who it may affect:" clause is fine — do NOT penalize a missing clause.

Bills:
${JSON.stringify(items, null, 2)}`;

  const verdicts = (await callClaude(client, cfg.llmModel, prompt, ledger)) as ReviewVerdict[];
  const byKey = new Map(verdicts.map((v) => [String(v.key), v]));
  for (const item of items) {
    const v = byKey.get(item.key);
    if (!v || v.ok === true) continue;
    const sev = normalizeSeverity(v.severity);
    if (sev === 'info') continue;
    findings.push({
      severity: sev,
      domain: 'llm',
      entity: item.key,
      field: 'ai_summary',
      message: v.issue?.trim() || 'summary may not be faithful to the bill',
    });
  }
  return items.length;
}

async function reviewTopics(
  db: SupabaseClient,
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
  ledger: TokenLedger,
): Promise<number> {
  const data = await sampleTable<{
    bill_number: string;
    session: string | null;
    title: string;
    description: string | null;
    topics: string[] | null;
    legiscan_subjects: unknown;
  }>(db, {
    table: 'ky_bills',
    select: 'bill_number, session, title, description, topics, legiscan_subjects',
    seed: cfg.seed ^ 0x85ebca6b, // distinct stream from the summary sample
    limit: cfg.llmSample,
    filter: (q) => q.not('topics', 'is', null),
  });

  const items = data
    .map((b) => {
      const subjects = Array.isArray(b.legiscan_subjects)
        ? (b.legiscan_subjects as Array<{ subject_name?: string }>)
            .map((s) => s?.subject_name)
            .filter(Boolean)
        : [];
      return {
        key: billKey(b.bill_number, b.session),
        title: clip(b.title as string, 300),
        // Keyword classifier runs on the full description — clipping shorter than the classifier's
        // input makes keyword-matched topics look unsupported.
        description: clip(b.description as string, 2000),
        topics: Array.isArray(b.topics) ? (b.topics as string[]) : [],
        legiscanSubjects: subjects,
      };
    })
    .filter((i) => i.topics.length > 0);
  if (items.length === 0) return 0;

  const prompt = `You are auditing topic classifications on a Kentucky General Assembly transparency website. Each bill has site-assigned "topics" (derived by a keyword classifier) plus official "legiscanSubjects". Judge whether the assigned topics reasonably describe the bill given its title/description and official subjects.

Return ONLY a JSON array, one object per bill, echoing each bill's "key" verbatim:
{ "key": "<key>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

Use severity "fail" for clearly wrong/irrelevant topics; "warn" for an obviously-missing major topic; "info"/ok=true when reasonable.

Bills:
${JSON.stringify(items, null, 2)}`;

  const verdicts = (await callClaude(client, cfg.llmModel, prompt, ledger)) as ReviewVerdict[];
  const byKey = new Map(verdicts.map((v) => [String(v.key), v]));
  for (const item of items) {
    const v = byKey.get(item.key);
    if (!v || v.ok === true) continue;
    const sev = normalizeSeverity(v.severity);
    if (sev === 'info') continue;
    findings.push({
      severity: sev,
      domain: 'llm',
      entity: item.key,
      field: 'topics',
      message: v.issue?.trim() || 'assigned topics may not fit the bill',
    });
  }
  return items.length;
}

interface GlossaryItem {
  key: string;
  title: string;
  content: string;
}

/**
 * Look up cached verdicts by (contentHash, model). Missing rows and a missing
 * table both fall through to "no cache hit" so the caller can still call the
 * model. Returns a map keyed by contentHash.
 */
async function loadGlossaryCache(
  db: SupabaseClient,
  model: string,
  hashes: string[],
): Promise<Map<string, ReviewVerdict>> {
  const out = new Map<string, ReviewVerdict>();
  if (hashes.length === 0) return out;
  try {
    const { data, error } = await db
      .from('ky_accuracy_llm_cache')
      .select('content_hash, verdict')
      .eq('model', model)
      .in('content_hash', hashes);
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      // Table absent (migration 053 not yet applied) → degrade to no cache.
      if (msg.includes('ky_accuracy_llm_cache') || msg.includes('does not exist')) return out;
      throw new Error(error.message);
    }
    for (const row of (data ?? []) as Array<{ content_hash: string; verdict: ReviewVerdict }>) {
      out.set(row.content_hash, row.verdict);
    }
  } catch (e) {
    console.error(
      '[accuracy-audit] llm cache read failed:',
      e instanceof Error ? e.message : e,
    );
  }
  return out;
}

async function saveGlossaryCache(
  db: SupabaseClient,
  model: string,
  entries: Array<{ contentHash: string; verdict: ReviewVerdict }>,
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const { error } = await db.from('ky_accuracy_llm_cache').upsert(
      entries.map((e) => ({
        content_hash: e.contentHash,
        model,
        verdict: e.verdict,
        cached_at: new Date().toISOString(),
      })),
      { onConflict: 'content_hash,model' },
    );
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('ky_accuracy_llm_cache') || msg.includes('does not exist')) return;
      throw new Error(error.message);
    }
  } catch (e) {
    console.error(
      '[accuracy-audit] llm cache write failed:',
      e instanceof Error ? e.message : e,
    );
  }
}

async function reviewGlossary(
  db: SupabaseClient,
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
  ledger: TokenLedger,
): Promise<number> {
  const entries = [...Object.entries(governmentTooltips), ...Object.entries(voteCountTooltips)].map(
    ([key, t]) => ({ key, title: t.title, content: clip(t.content, 600) }),
  );
  // Seed-shuffle so the sampled glossary terms vary per run (reproducible by seed).
  const items: GlossaryItem[] = seededShuffle(entries, makeRng(cfg.seed ^ 0xc2b2ae35)).slice(
    0,
    cfg.llmSample,
  );
  if (items.length === 0) return 0;

  // Cache key is per-entry (title + content), NOT per-batch: the batch differs
  // every run because of the seed-shuffle, but a single glossary entry's text
  // only changes when tooltipContent.ts is edited. Cached verdicts are keyed on
  // (contentHash, model) so a model change invalidates them by design.
  const itemHashes = items.map((item) => ({
    item,
    contentHash: contentHash({ title: item.title, content: item.content }),
  }));
  const cached = await loadGlossaryCache(
    db,
    cfg.llmModel,
    itemHashes.map((i) => i.contentHash),
  );

  const verdictByKey = new Map<string, ReviewVerdict>();
  const misses: Array<{ item: GlossaryItem; contentHash: string }> = [];
  for (const entry of itemHashes) {
    const hit = cached.get(entry.contentHash);
    if (hit) {
      verdictByKey.set(entry.item.key, hit);
      ledger.cacheHits += 1;
    } else {
      misses.push(entry);
    }
  }

  // Call Anthropic only for the entries whose text we've never scored under
  // this model. Skipping the call entirely when everything hit avoids the
  // 3-4kB glossary preamble being sent every week.
  if (misses.length > 0) {
    const prompt = `You are auditing civic glossary definitions for a Kentucky General Assembly transparency website. Kentucky has 100 House members and 38 Senators; a gubernatorial veto is overridden by a majority of the members elected to each chamber (51 House, 20 Senate) per Ky. Constitution § 88; there is no filibuster or cloture. Flag any definition that is factually incorrect or misleading for the Kentucky General Assembly (not the U.S. Congress).

Return ONLY a JSON array, one object per entry:
{ "key": "<key>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

Use severity "fail" for outright factual errors; "warn" for misleading or ambiguous wording; "info"/ok=true when accurate.

Entries:
${JSON.stringify(misses.map((m) => m.item), null, 2)}`;

    const verdicts = (await callClaude(client, cfg.llmModel, prompt, ledger)) as ReviewVerdict[];
    const freshByKey = new Map(verdicts.map((v) => [String(v.key), v]));

    // Upsert every miss for which we got a verdict, so next run hits the cache.
    const toCache: Array<{ contentHash: string; verdict: ReviewVerdict }> = [];
    for (const miss of misses) {
      const v = freshByKey.get(miss.item.key);
      if (!v) continue;
      verdictByKey.set(miss.item.key, v);
      toCache.push({ contentHash: miss.contentHash, verdict: v });
    }
    await saveGlossaryCache(db, cfg.llmModel, toCache);
  }

  for (const item of items) {
    const v = verdictByKey.get(item.key);
    if (!v || v.ok === true) continue;
    const sev = normalizeSeverity(v.severity);
    if (sev === 'info') continue;
    findings.push({
      severity: sev,
      domain: 'llm',
      entity: `glossary: ${item.title}`,
      field: 'definition',
      message: v.issue?.trim() || 'definition may be inaccurate',
    });
  }
  return items.length;
}

export async function checkLlm(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  if (cfg.skipLlm) {
    return summarizeResult('llm', 0, findings, started, { skipped: true, skipReason: 'ACCURACY_SKIP_LLM=true' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return summarizeResult('llm', 0, findings, started, { skipped: true, skipReason: 'ANTHROPIC_API_KEY not set' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let checked = 0;
  let upstreamFailures = 0;
  let firstAnthropicError: unknown = null;
  const ledger: TokenLedger = { input: 0, output: 0, cacheHits: 0 };
  const budget = llmTokenBudget();

  // Each pass wrapped in the same catch shape so an Anthropic outage on any one
  // of them counts uniformly and the fully-out case escalates to `outage`
  // instead of leaving three "review pass failed" warns that read as drift.
  // The budget short-circuit runs BEFORE each pass — if a prior pass already
  // blew through the token cap, we don't spend more before reporting.
  let budgetTripped = false;
  const runPass = async (name: string, invoke: () => Promise<number>): Promise<void> => {
    if (budget > 0 && tokenSum(ledger) >= budget) {
      if (!budgetTripped) {
        budgetTripped = true;
        findings.push({
          severity: 'warn',
          domain: 'llm',
          field: 'token_budget',
          message:
            `LLM token budget of ${budget} exhausted after prior passes ` +
            `(input ${ledger.input}, output ${ledger.output}). ` +
            'Remaining passes skipped for this run; raise `ACCURACY_LLM_MAX_TOTAL_TOKENS` or lower `ACCURACY_LLM_SAMPLE`.',
        });
      }
      return;
    }
    try {
      checked += await invoke();
    } catch (e) {
      const transient = classifyCheckerError(e) === 'upstream_outage';
      if (transient) {
        upstreamFailures += 1;
        if (!firstAnthropicError) firstAnthropicError = e;
      }
      findings.push({
        severity: transient ? 'warn' : 'fail',
        domain: 'llm',
        message: `${name} failed: ${errorMessage(e)}`,
      });
    }
  };

  const PASS_COUNT = 3;
  await runPass('summary review', () => reviewSummaries(db, cfg, client, findings, ledger));
  await runPass('topics review', () => reviewTopics(db, cfg, client, findings, ledger));
  await runPass('glossary review', () => reviewGlossary(db, cfg, client, findings, ledger));

  // Cost visibility. Logged even on outage / crash paths so a runaway is
  // observable in the run log without having to enable a debug flag.
  console.log(
    `[accuracy-audit] llm tokens: input=${ledger.input} output=${ledger.output} ` +
      `total=${tokenSum(ledger)}${budget > 0 ? ` (budget ${budget})` : ''} ` +
      `glossaryCacheHits=${ledger.cacheHits}`,
  );

  // Full Anthropic outage: every pass hit an upstream error and nothing was
  // reviewed. Escalate as an outage rather than surface three identical warn
  // findings that read like content drift.
  if (checked === 0 && upstreamFailures >= PASS_COUNT) {
    return outageResult('llm', 'Anthropic', firstAnthropicError ?? new Error('Anthropic unavailable'), started, {
      findings,
    });
  }

  if (checked === 0 && findings.length === 0) {
    return summarizeResult('llm', 0, findings, started, {
      skipped: true,
      skipReason: 'no fuzzy content available to review',
    });
  }

  return summarizeResult('llm', checked, findings, started, { upstreamFailures });
}
