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
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  makeCacheKey,
  getCached,
  setCached,
  INTELLIGENCE_PROMPT_VERSION,
} from '@/lib/anthropic-cache';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limiter = await rateLimit(ip);
    if (!limiter.allowed) {
      console.log(`[Intelligence API] rate-limited ip=${ip} retryAfter=${limiter.retryAfterSec}s`);
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSec) } },
      );
    }

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

    // Global daily ceiling for Anthropic LLM calls across all IPs.
    // Capacity 200 ≈ 200 individual generateWhyItMatters calls per rolling 24h
    // window (~$0.30 worst-case at Sonnet pricing). When the ceiling is hit,
    // items are returned without LLM analysis rather than returning 429.
    const LLM_DAILY_CAPACITY = 200;
    const llmCeiling = await rateLimit('anthropic:llm:daily', {
      capacity: LLM_DAILY_CAPACITY,
      refillPerSec: LLM_DAILY_CAPACITY / 86400,
      route: 'intelligence:llm-global',
    });
    if (!llmCeiling.allowed) {
      console.warn('[Intelligence API] daily LLM ceiling reached, serving without analysis');
    }

    // Generate "why it matters" for the top 3, with a short-TTL cache.
    let cacheHits = 0;
    let cacheMisses = 0;
    const withAnalysis = await Promise.all(
      topItems.map(async (item: any, i: number) => {
        if (i >= 3) return item;
        const updatedAt =
          item.updated_at ?? item.last_action_date ?? item.adopted_date ?? item.introduced_date ?? null;
        const cacheKey = makeCacheKey({
          type: item._type,
          id: item.id,
          updated_at: updatedAt,
          promptVersion: INTELLIGENCE_PROMPT_VERSION,
        });
        const cached = getCached(cacheKey);
        if (cached !== null) {
          cacheHits += 1;
          return { ...item, whyItMatters: cached };
        }
        if (!llmCeiling.allowed) return item;
        cacheMisses += 1;
        const whyItMatters = await generateWhyItMatters(item);
        setCached(cacheKey, whyItMatters);
        return { ...item, whyItMatters };
      })
    );
    console.log(
      `[Intelligence API] ip=${ip} cache hits=${cacheHits} misses=${cacheMisses} remaining=${limiter.remaining}`,
    );

    return NextResponse.json(
      {
        items: withAnalysis,
        count: withAnalysis.length,
        generated: new Date().toISOString(),
      },
      { headers: { 'x-kyvk-cache': `hits=${cacheHits};misses=${cacheMisses}` } },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Intelligence API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

