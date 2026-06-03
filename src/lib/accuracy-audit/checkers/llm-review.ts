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
import { governmentTooltips } from '../../tooltipContent';
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

function normalizeSeverity(raw: string | undefined): Severity {
  const s = (raw || '').toLowerCase();
  if (s === 'fail') return 'fail';
  if (s === 'warn') return 'warn';
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

async function reviewSummaries(
  db: SupabaseClient,
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
): Promise<number> {
  const { data } = await db
    .from('ky_bills')
    .select('bill_number, title, description, ai_summary, updated_from_legiscan_at')
    .not('ai_summary', 'is', null)
    .neq('ai_summary', '')
    .order('updated_from_legiscan_at', { ascending: false, nullsFirst: false })
    .limit(cfg.llmSample);

  const items = (data ?? []).map((b) => ({
    key: b.bill_number as string,
    title: clip(b.title as string, 300),
    description: clip(b.description as string),
    summary: clip(b.ai_summary as string),
  }));
  if (items.length === 0) return 0;

  const prompt = `You are auditing AI-generated plain-language summaries on a Kentucky General Assembly transparency website. For each bill, judge whether the "summary" is faithful to the bill's "title" and "description" and contains no fabricated or contradicting claims.

Return ONLY a JSON array, one object per bill:
{ "key": "<bill_number>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

Use severity "fail" for hallucinated facts or claims that contradict the bill; "warn" for misleading emphasis or notable omissions; "info"/ok=true when faithful.

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
  const { data } = await db
    .from('ky_bills')
    .select('bill_number, title, description, topics, legiscan_subjects, updated_from_legiscan_at')
    .not('topics', 'is', null)
    .order('updated_from_legiscan_at', { ascending: false, nullsFirst: false })
    .limit(cfg.llmSample);

  const items = (data ?? [])
    .map((b) => {
      const subjects = Array.isArray(b.legiscan_subjects)
        ? (b.legiscan_subjects as Array<{ subject_name?: string }>)
            .map((s) => s?.subject_name)
            .filter(Boolean)
        : [];
      return {
        key: b.bill_number as string,
        title: clip(b.title as string, 300),
        description: clip(b.description as string, 500),
        topics: Array.isArray(b.topics) ? (b.topics as string[]) : [],
        legiscanSubjects: subjects,
      };
    })
    .filter((i) => i.topics.length > 0);
  if (items.length === 0) return 0;

  const prompt = `You are auditing topic classifications on a Kentucky General Assembly transparency website. Each bill has site-assigned "topics" (derived by a keyword classifier) plus official "legiscanSubjects". Judge whether the assigned topics reasonably describe the bill given its title/description and official subjects.

Return ONLY a JSON array, one object per bill:
{ "key": "<bill_number>", "ok": true|false, "severity": "fail"|"warn"|"info", "issue": "<short reason, empty if ok>" }

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

/** Rotate the glossary slice weekly so coverage spreads across runs. */
function rotatingSlice<T>(arr: T[], size: number): T[] {
  if (arr.length <= size) return arr;
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  const offset = (week * size) % arr.length;
  const out: T[] = [];
  for (let i = 0; i < size; i++) out.push(arr[(offset + i) % arr.length]!);
  return out;
}

async function reviewGlossary(
  cfg: AuditConfig,
  client: Anthropic,
  findings: Finding[],
): Promise<number> {
  const entries = Object.entries(governmentTooltips).map(([key, t]) => ({
    key,
    title: t.title,
    content: clip(t.content, 600),
  }));
  const items = rotatingSlice(entries, cfg.llmSample);
  if (items.length === 0) return 0;

  const prompt = `You are auditing civic glossary definitions for a Kentucky General Assembly transparency website. Kentucky has 100 House members and 38 Senators; a gubernatorial veto can be overridden by a 3/5 majority; there is no filibuster or cloture. Flag any definition that is factually incorrect or misleading for the Kentucky General Assembly (not the U.S. Congress).

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
