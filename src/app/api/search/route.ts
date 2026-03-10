import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

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
    const [billsRes, ordRes, eoRes, sbRes] = await Promise.all([
      supabase.from('ky_bills').select('id, bill_number, title, status, chamber').or(`title.ilike.%${q}%,bill_number.ilike.%${q}%,description.ilike.%${q}%`).limit(limit),
      supabase.from('ky_ordinances').select('id, ordinance_number, title, status, jurisdiction').or(`title.ilike.%${q}%,ordinance_number.ilike.%${q}%,description.ilike.%${q}%`).limit(limit),
      supabase.from('ky_executive_orders').select('id, eo_number, title, governor').or(`title.ilike.%${q}%,eo_number.ilike.%${q}%,description.ilike.%${q}%`).limit(limit),
      supabase.from('ky_school_board_items').select('id, title, district, category').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(limit),
    ]);

    const results = [
      ...(billsRes.data || []).map((b: any) => ({ ...b, type: 'bill' })),
      ...(ordRes.data || []).map((o: any) => ({ ...o, type: 'ordinance' })),
      ...(eoRes.data || []).map((e: any) => ({ ...e, type: 'executive_order' })),
      ...(sbRes.data || []).map((s: any) => ({ ...s, type: 'school_board_item' })),
    ];

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
