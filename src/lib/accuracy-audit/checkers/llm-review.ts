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
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { governmentTooltips, voteCountTooltips } from '../../tooltipContent';
import { makeRng, sampleTable, seededShuffle } from '../sampling';
import {
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
  type Severity,
} from '../types';

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

async function callClaude(client: Anthropic, model: string, prompt: string): Promise<unknown[]> {
  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
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

  const verdicts = (await callClaude(client, cfg.llmModel, prompt)) as ReviewVerdict[];
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

  const verdicts = (await callClaude(client, cfg.llmModel, prompt)) as ReviewVerdict[];
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

async function reviewGlossary(
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
): Promise<number> {
  const entries = [...Object.entries(governmentTooltips), ...Object.entries(voteCountTooltips)].map(
    ([key, t]) => ({ key, title: t.title, content: clip(t.content, 600) }),
  );
  // Seed-shuffle so the sampled glossary terms vary per run (reproducible by seed).
  const items = seededShuffle(entries, makeRng(cfg.seed ^ 0xc2b2ae35)).slice(0, cfg.llmSample);
  if (items.length === 0) return 0;

  const prompt = `You are auditing civic glossary definitions for a Kentucky General Assembly transparency website. Kentucky has 100 House members and 38 Senators; a gubernatorial veto is overridden by a majority of the members elected to each chamber (51 House, 20 Senate) per Ky. Constitution § 88; there is no filibuster or cloture. Flag any definition that is factually incorrect or misleading for the Kentucky General Assembly (not the U.S. Congress).

Return ONLY a JSON array, one object per entry:
{ "key": "<key>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

Use severity "fail" for outright factual errors; "warn" for misleading or ambiguous wording; "info"/ok=true when accurate.

Entries:
${JSON.stringify(items, null, 2)}`;

  const verdicts = (await callClaude(client, cfg.llmModel, prompt)) as ReviewVerdict[];
  const byKey = new Map(verdicts.map((v) => [String(v.key), v]));
  for (const item of items) {
    const v = byKey.get(item.key);
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

  for (const pass of [reviewSummaries, reviewTopics] as const) {
    try {
      checked += await pass(db, cfg, client, findings);
    } catch (e) {
      findings.push({
        severity: 'warn',
        domain: 'llm',
        message: `LLM review pass failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  try {
    checked += await reviewGlossary(cfg, client, findings);
  } catch (e) {
    findings.push({
      severity: 'warn',
      domain: 'llm',
      message: `glossary review failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  if (checked === 0 && findings.length === 0) {
    return summarizeResult('llm', 0, findings, started, {
      skipped: true,
      skipReason: 'no fuzzy content available to review',
    });
  }

  return summarizeResult('llm', checked, findings, started);
}
