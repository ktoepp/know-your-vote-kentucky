/**
 * Kentucky Political Intelligence Scoring
 * Multi-factor relevance scoring adapted from congressional context to state/local.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  KYBill,
  KYOrdinance,
  KYExecutiveOrder,
} from '@/types/kentucky';

export interface RelevanceScore {
  score: number; // 0-100
  factors: {
    impact: number;
    urgency: number;
    publicInterest: number;
    controversy: number;
  };
  reasoning: string[];
  tags: string[];
}

type ScoredItem = KYBill | KYOrdinance | KYExecutiveOrder;

// --- High-interest topic keywords ---
const PUBLIC_INTEREST_KEYWORDS = [
  'education', 'school', 'healthcare', 'medicaid', 'tax', 'taxes',
  'infrastructure', 'road', 'bridge', 'water', 'public safety',
  'police', 'fire', 'housing', 'affordable', 'opioid', 'drug',
  'child', 'veteran', 'disability', 'broadband', 'internet',
];

const CONTROVERSIAL_KEYWORDS = [
  'abortion', 'gun', 'firearm', 'transgender', 'immigration',
  'marijuana', 'cannabis', 'gambling', 'casino', 'redistricting',
  'gerrymandering', 'voting', 'election', 'religion', 'prayer',
];

function textContains(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

/** Multi-factor relevance scoring for KY civic items */
export function scoreRelevance(item: ScoredItem): RelevanceScore {
  const factors = { impact: 0, urgency: 0, publicInterest: 0, controversy: 0 };
  const reasoning: string[] = [];
  const tags: string[] = [];
  const searchText = `${item.title} ${(item as any).description ?? ''} ${(item as any).topics?.join(' ') ?? ''}`;

  // --- Impact ---
  if ('chamber' in item && item.chamber) {
    // State bill = statewide impact
    factors.impact += 25;
    tags.push('statewide');
    reasoning.push('State legislation with statewide impact');
  }
  if ('jurisdiction' in item) {
    // Ordinance = local impact
    factors.impact += 15;
    tags.push('local');
    reasoning.push(`Local ordinance affecting ${(item as KYOrdinance).jurisdiction}`);
  }
  if ('eo_number' in item) {
    // Executive order = statewide, immediate
    factors.impact += 30;
    tags.push('executive-action');
    reasoning.push('Executive order with immediate statewide effect');
  }

  // --- Urgency ---
  const lastAction = (item as KYBill).last_action_date ?? (item as KYOrdinance).adopted_date ?? (item as KYExecutiveOrder).signed_date;
  const days = daysSince(lastAction);
  if (days !== null && days < 7) {
    factors.urgency += 30;
    reasoning.push('Recent activity within the last week');
    tags.push('recent');
  } else if (days !== null && days < 30) {
    factors.urgency += 15;
    reasoning.push('Activity within the last month');
  }

  // Session deadline pressure for bills
  if ('session' in item && (item as KYBill).status?.toLowerCase().includes('committee')) {
    factors.urgency += 10;
    reasoning.push('Bill in committee — may face session deadline');
    tags.push('in-committee');
  }

  // --- Public Interest ---
  const piMatches = textContains(searchText, PUBLIC_INTEREST_KEYWORDS);
  if (piMatches.length > 0) {
    factors.publicInterest += Math.min(piMatches.length * 10, 30);
    reasoning.push(`Addresses public interest topics: ${piMatches.join(', ')}`);
    tags.push('public-interest');
  }

  // --- Controversy ---
  const cMatches = textContains(searchText, CONTROVERSIAL_KEYWORDS);
  if (cMatches.length > 0) {
    factors.controversy += Math.min(cMatches.length * 15, 30);
    reasoning.push(`Touches controversial topics: ${cMatches.join(', ')}`);
    tags.push('controversial');
  }

  const score = Math.round(
    (factors.impact + factors.urgency + factors.publicInterest + factors.controversy) / 4
  );

  return { score: Math.min(score, 100), factors, reasoning, tags };
}

/** Classify intelligence level from numeric score */
export function classifyIntelligence(score: number): 'breaking' | 'significant' | 'notable' | 'routine' {
  if (score >= 75) return 'breaking';
  if (score >= 50) return 'significant';
  if (score >= 25) return 'notable';
  return 'routine';
}

/** AI-generated "why this matters" blurb */
export async function generateWhyItMatters(item: any): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return 'Impact analysis not available — API key not configured.';
  }
  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: 'You are a non-partisan civic education assistant for Kentucky. In 1-2 sentences, explain why this item matters to everyday Kentuckians. Be specific and practical.',
      messages: [{
        role: 'user',
        content: `Title: ${item.title}\n${item.description ? `Description: ${item.description}` : ''}`,
      }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : 'Impact analysis unavailable.';
  } catch (err: any) {
    if (err?.status === 429) return 'Impact analysis temporarily unavailable.';
    console.error('[KY-Intelligence] Error:', err?.message ?? err);
    return 'Impact analysis could not be generated.';
  }
}

