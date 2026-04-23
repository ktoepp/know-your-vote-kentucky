/**
 * /api/intelligence — Kentucky Political Intelligence endpoint
 *
 * GET  — Returns top-scored items and daily briefing
 *   Query params: ?limit=10&type=bills|ordinances
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import { scoreRelevance, classifyIntelligence, generateWhyItMatters } from '../../../lib/ky-intelligence';
import { parseLimit, parseEnum, ValidationError } from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'), { default: 10, max: 100 });
    const type = parseEnum(searchParams.get('type'), ['bills', 'ordinances'] as const, { allowNull: true });

    if (!supabase) {
      return NextResponse.json({
        items: [],
        message: 'Supabase is not configured',
      });
    }

    // Fetch recent items from each source
    const allItems: any[] = [];

    if (!type || type === 'bills') {
      const { data } = await supabase.from('ky_bills').select('*').order('last_action_date', { ascending: false }).limit(limit);
      allItems.push(...(data || []).map((b: any) => ({ ...b, _type: 'bill' })));
    }
    if (!type || type === 'ordinances') {
      const { data } = await supabase.from('ky_ordinances').select('*').order('introduced_date', { ascending: false }).limit(limit);
      allItems.push(...(data || []).map((o: any) => ({ ...o, _type: 'ordinance' })));
    }

    // Score and classify each item
    const scored = allItems.map((item: any) => {
      const relevance = scoreRelevance(item);
      return {
        ...item,
        relevance,
        classification: classifyIntelligence(relevance.score),
      };
    });

    // Sort by score descending
    scored.sort((a: any, b: any) => b.relevance.score - a.relevance.score);
    const topItems = scored.slice(0, limit);

    // Generate "why it matters" for the top 3
    const withAnalysis = await Promise.all(
      topItems.map(async (item: any, i: number) => {
        if (i < 3) {
          const whyItMatters = await generateWhyItMatters(item);
          return { ...item, whyItMatters };
        }
        return item;
      })
    );

    return NextResponse.json({
      items: withAnalysis,
      count: withAnalysis.length,
      generated: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Intelligence API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

