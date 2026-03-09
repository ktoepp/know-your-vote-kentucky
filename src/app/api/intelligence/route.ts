import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';
import { scoreRelevance, classifyIntelligence, generateWhyItMatters } from '@/lib/ky-intelligence';
import { classifyTopics } from '@/lib/ky-topic-classifier';
import type { KYBill, KYOrdinance, KYExecutiveOrder } from '@/types/kentucky';

interface ScoredItem {
  type: 'bill' | 'ordinance' | 'executive_order';
  item: KYBill | KYOrdinance | KYExecutiveOrder;
  score: number;
  classification: string;
  topics: string[];
  tags: string[];
  reasoning: string[];
}

async function fetchAndScoreItems(limit: number): Promise<ScoredItem[]> {
  const scored: ScoredItem[] = [];

  if (!supabase) {
    return scored; // No DB configured
  }

  // Fetch bills
  const { data: bills } = await supabase
    .from('ky_bills')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  for (const bill of (bills ?? []) as KYBill[]) {
    const rel = scoreRelevance(bill);
    scored.push({
      type: 'bill',
      item: bill,
      score: rel.score,
      classification: classifyIntelligence(rel.score),
      topics: classifyTopics(bill.title, bill.description ?? ''),
      tags: rel.tags,
      reasoning: rel.reasoning,
    });
  }

  // Fetch ordinances
  const { data: ordinances } = await supabase
    .from('ky_ordinances')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  for (const ord of (ordinances ?? []) as KYOrdinance[]) {
    const rel = scoreRelevance(ord);
    scored.push({
      type: 'ordinance',
      item: ord,
      score: rel.score,
      classification: classifyIntelligence(rel.score),
      topics: classifyTopics(ord.title, ord.description ?? ''),
      tags: rel.tags,
      reasoning: rel.reasoning,
    });
  }

  // Fetch executive orders
  const { data: eos } = await supabase
    .from('ky_executive_orders')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  for (const eo of (eos ?? []) as KYExecutiveOrder[]) {
    const rel = scoreRelevance(eo);
    scored.push({
      type: 'executive_order',
      item: eo,
      score: rel.score,
      classification: classifyIntelligence(rel.score),
      topics: classifyTopics(eo.title, eo.description ?? ''),
      tags: rel.tags,
      reasoning: rel.reasoning,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'top'; // 'top' | 'briefing'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { items: [], briefing: 'Supabase not configured — no data available.' },
        source: 'ky-intelligence',
        timestamp: new Date().toISOString(),
      });
    }

    const items = await fetchAndScoreItems(limit);

    if (mode === 'briefing') {
      const topItems = items.slice(0, 5);
      let briefing = '## Kentucky Daily Briefing\n\n';

      if (topItems.length === 0) {
        briefing += 'No recent civic activity to report.\n';
      } else {
        for (const si of topItems) {
          const whyItMatters = await generateWhyItMatters(si.item);
          briefing += `### ${si.item.title}\n`;
          briefing += `**${si.classification.toUpperCase()}** — Score: ${si.score}/100\n`;
          briefing += `Topics: ${si.topics.join(', ') || 'Uncategorized'}\n`;
          briefing += `${whyItMatters}\n\n`;
        }
      }

      return NextResponse.json({
        success: true,
        data: { briefing, items: topItems },
        type: 'briefing',
        source: 'ky-intelligence',
        timestamp: new Date().toISOString(),
      });
    }

    // Default: return top scored items
    return NextResponse.json({
      success: true,
      data: { items: items.slice(0, limit) },
      type: 'top',
      source: 'ky-intelligence',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Intelligence API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate intelligence', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

