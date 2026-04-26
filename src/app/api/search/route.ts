import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import { buildKyBillSearchFiltersFromUrlSearch, fetchKyBillsMatchingSearch } from '@/lib/ky-search-bills';
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
    const filters = buildKyBillSearchFiltersFromUrlSearch(searchParams);
    const bills = await fetchKyBillsMatchingSearch(supabase, q, limit, filters);

    const results = bills.map((b) => ({
      id: b.id,
      bill_number: b.bill_number,
      session: b.session,
      title: b.title,
      status: b.status,
      chamber: b.chamber,
      type: 'bill' as const,
    }));

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
