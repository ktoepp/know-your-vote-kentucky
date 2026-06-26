/**
 * Kentucky-specific AI Content Generation
 * Uses Anthropic Claude to generate plain-language summaries of KY civic items.
 * All summaries are non-partisan, educational, and include "why it matters" framing.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  KYBill,
  KYOrdinance,
  KYExecutiveOrder,
  KYSchoolBoardItem,
} from '@/types/kentucky';

/** Model used for all KY plain-language content generation. Exported so backfills can record provenance. */
export const KY_CONTENT_MODEL = 'claude-sonnet-4-6';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[KY-Content] ANTHROPIC_API_KEY not set — returning placeholder summaries');
    return null;
  }
  client = new Anthropic();
  return client;
}

const SYSTEM_PROMPT = `You are a non-partisan civic education assistant for Know Your Vote Kentucky.
Generate plain-language summaries with this shape:
- First, 2-3 sentences maximum: what the bill does, in plain language, why it matters to Kentuckians.
- Then, on a new line, a short "Who it may affect:" clause naming the Kentuckians most directly impacted (e.g. parents and students, renters, small employers, veterans).

Hard rules:
- Use ONLY the bill fields provided (number, title, description, topics, subjects). Do not use outside knowledge or assume provisions that are not stated.
- Name affected groups ONLY when clearly inferable from those fields. Hedge with "may affect." If the impact is unclear or the description is too thin to tell, OMIT the "Who it may affect:" clause entirely rather than guessing.
- Non-partisan and factual. No opinions, no political framing, no predictions about passage.
- Written for a general audience, no jargon.
- Plain text only — NO markdown, asterisks, bold, or headers. Do not restate the bill number; the page already shows it. Separate the summary and the "Who it may affect:" clause with a single blank line.`;

/**
 * Sentinel strings returned by generateSummary when no genuine summary was produced
 * (missing key, empty/blocked response, rate limit, API error). Callers that PERSIST
 * summaries (the backfill) must treat these as "skip", never write them as real content.
 */
export const SUMMARY_UNAVAILABLE_SENTINELS = [
  'AI summary not available — API key not configured.',
  'Summary unavailable.',
  'Summary temporarily unavailable due to high demand. Please try again shortly.',
  'Summary could not be generated at this time.',
] as const;

/** True when `text` is a genuine generated summary (non-empty and not a failure sentinel). */
export function isUsableSummary(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  return !(SUMMARY_UNAVAILABLE_SENTINELS as readonly string[]).includes(t);
}

async function generateSummary(prompt: string): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    return SUMMARY_UNAVAILABLE_SENTINELS[0];
  }
  try {
    const message = await anthropic.messages.create({
      model: KY_CONTENT_MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : SUMMARY_UNAVAILABLE_SENTINELS[1];
  } catch (err: any) {
    if (err?.status === 429) {
      console.warn('[KY-Content] Rate limited — returning placeholder');
      return SUMMARY_UNAVAILABLE_SENTINELS[2];
    }
    console.error('[KY-Content] Error generating summary:', err?.message ?? err);
    return SUMMARY_UNAVAILABLE_SENTINELS[3];
  }
}

/** AI-generated plain-language summary of a KY state bill */
export async function generateBillSummary(bill: KYBill): Promise<string> {
  const subjectNames = (bill.legiscan_subjects ?? [])
    .map((s) => s?.subject_name?.trim())
    .filter((s): s is string => !!s);
  const prompt = `Summarize this Kentucky state bill for voters, following the system rules
(2-3 plain-language sentences, then an optional "Who it may affect:" clause grounded only in the fields below).

Bill Number: ${bill.bill_number}
Title: ${bill.title}
${bill.description ? `Description: ${bill.description}` : ''}
${bill.status ? `Status: ${bill.status}` : ''}
${bill.chamber ? `Chamber: Kentucky ${bill.chamber === 'house' ? 'House' : 'Senate'}` : ''}
${bill.topics?.length ? `Topics: ${bill.topics.join(', ')}` : ''}
${subjectNames.length ? `Official LegiScan subjects: ${subjectNames.join(', ')}` : ''}`;
  return generateSummary(prompt);
}

/** AI-generated plain-language summary of a local ordinance */
export async function generateOrdinanceSummary(ordinance: KYOrdinance): Promise<string> {
  const jurisdiction = ordinance.jurisdiction === 'louisville' ? 'Louisville' : 'Lexington';
  const prompt = `Summarize this ${jurisdiction}, Kentucky local ordinance in 2-3 plain-language sentences.
Include why it matters to residents.

${ordinance.ordinance_number ? `Ordinance Number: ${ordinance.ordinance_number}` : ''}
Title: ${ordinance.title}
${ordinance.description ? `Description: ${ordinance.description}` : ''}
${ordinance.status ? `Status: ${ordinance.status}` : ''}
${ordinance.topics?.length ? `Topics: ${ordinance.topics.join(', ')}` : ''}`;
  return generateSummary(prompt);
}

/** AI-generated plain-language summary of an executive order */
export async function generateEOSummary(eo: KYExecutiveOrder): Promise<string> {
  const prompt = `Summarize this Kentucky Governor's Executive Order in 2-3 plain-language sentences.
Include why it matters to Kentuckians.

EO Number: ${eo.eo_number}
Title: ${eo.title}
${eo.description ? `Description: ${eo.description}` : ''}
${eo.governor ? `Governor: ${eo.governor}` : ''}
${eo.signed_date ? `Signed: ${eo.signed_date}` : ''}
${eo.topics?.length ? `Topics: ${eo.topics.join(', ')}` : ''}`;
  return generateSummary(prompt);
}

/** AI-generated plain-language summary of a school board action */
export async function generateSchoolBoardSummary(item: KYSchoolBoardItem): Promise<string> {
  const district = item.district === 'jcps'
    ? 'Jefferson County Public Schools (JCPS)'
    : 'Fayette County Public Schools (FCPS)';
  const prompt = `Summarize this ${district} school board action in 2-3 plain-language sentences.
Include why it matters to Kentucky families and students.

Title: ${item.title}
${item.description ? `Description: ${item.description}` : ''}
${item.category ? `Category: ${item.category}` : ''}
${item.vote_result ? `Vote Result: ${item.vote_result}` : ''}
${item.meeting_date ? `Meeting Date: ${item.meeting_date}` : ''}`;
  return generateSummary(prompt);
}

