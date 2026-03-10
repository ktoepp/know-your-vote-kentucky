import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const chamber = searchParams.get('chamber');
    const status = searchParams.get('status');

    if (!supabase) {
      return NextResponse.json({
        updated: new Date().toISOString(),
        bills: [],
        source: 'none',
        message: 'Supabase is not configured',
        count: 0,
      });
    }

    let query = supabase
      .from('ky_bills')
      .select('*')
      .order('last_action_date', { ascending: false })
      .limit(limit);

    if (chamber) query = query.eq('chamber', chamber);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching KY bills:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      updated: new Date().toISOString(),
      bills: data || [],
      source: 'supabase',
      count: (data || []).length,
    });
  } catch (error) {
    console.error('Error in KY bills API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
