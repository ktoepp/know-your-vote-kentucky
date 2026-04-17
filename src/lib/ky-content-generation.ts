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
Generate plain-language summaries that are:
- 2-3 sentences maximum
- Non-partisan and factual
- Written for a general audience (no jargon)
- Include why this matters to Kentuckians
Do NOT include opinions or political bias. Focus on practical impact.`;

async function generateSummary(prompt: string): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    return 'AI summary not available — API key not configured.';
  }
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : 'Summary unavailable.';
  } catch (err: any) {
    if (err?.status === 429) {
      console.warn('[KY-Content] Rate limited — returning placeholder');
      return 'Summary temporarily unavailable due to high demand. Please try again shortly.';
    }
    console.error('[KY-Content] Error generating summary:', err?.message ?? err);
    return 'Summary could not be generated at this time.';
  }
}

/** AI-generated plain-language summary of a KY state bill */
export async function generateBillSummary(bill: KYBill): Promise<string> {
  const prompt = `Summarize this Kentucky state bill in 2-3 plain-language sentences for voters.
Include why it matters to Kentuckians.

Bill Number: ${bill.bill_number}
Title: ${bill.title}
${bill.description ? `Description: ${bill.description}` : ''}
${bill.status ? `Status: ${bill.status}` : ''}
${bill.chamber ? `Chamber: Kentucky ${bill.chamber === 'house' ? 'House' : 'Senate'}` : ''}
${bill.topics?.length ? `Topics: ${bill.topics.join(', ')}` : ''}`;
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

