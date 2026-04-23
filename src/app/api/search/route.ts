import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchKyBillsMatchingSearch,
  fetchKyOrdinancesMatchingSearch,
  fetchKySchoolBoardMatchingSearch,
} from '@/lib/ky-search-bills';
import { parseLimit, ValidationError } from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseLimit(searchParams.get('limit'), { default: 20, max: 100 });

    if (!query.trim()) {
      return NextResponse.json({ results: [], query: '', count: 0 });
    }

    if (!supabase) {
      return NextResponse.json({
        results: [],
        query,
        count: 0,
        message: 'Supabase is not configured',
      });
    }

    const q = query.trim();
    const [bills, ordinances, schoolItems] = await Promise.all([
      fetchKyBillsMatchingSearch(supabase, q, limit),
      fetchKyOrdinancesMatchingSearch(supabase, q, limit, 'id, ordinance_number, title, status, jurisdiction'),
      fetchKySchoolBoardMatchingSearch(supabase, q, limit, 'id, title, district, category'),
    ]);

    const results = [
      ...bills.map((b) => ({
        id: b.id,
        bill_number: b.bill_number,
        title: b.title,
        status: b.status,
        chamber: b.chamber,
        type: 'bill' as const,
      })),
      ...ordinances.map((o) => ({ ...o, type: 'ordinance' as const })),
      ...schoolItems.map((s) => ({ ...s, type: 'school_board_item' as const })),
    ];

    return NextResponse.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
