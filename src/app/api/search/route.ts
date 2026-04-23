import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import { fetchKyBillsMatchingSearch } from '@/lib/ky-search-bills';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

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
    const bills = await fetchKyBillsMatchingSearch(supabase, q, limit);

    const results = bills.map((b) => ({
      id: b.id,
      bill_number: b.bill_number,
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
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
