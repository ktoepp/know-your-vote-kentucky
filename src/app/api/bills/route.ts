import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import { parseLimit, parseEnum, ValidationError } from '@/lib/api-validation';
import { billMatchesBrowseStatusFilter, BROWSE_STATUS_BUCKETS } from '@/lib/bill-display';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'), { default: 20, max: 100 });
    const chamber = parseEnum(searchParams.get('chamber'), ['house', 'senate'] as const, { allowNull: true });
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

    const needBucketFilter = status && BROWSE_STATUS_BUCKETS.has(status);
    const fetchLimit = needBucketFilter ? Math.min(1000, Math.max(limit, 200)) : limit;

    let query = supabase
      .from('ky_bills')
      .select('*')
      .order('last_action_date', { ascending: false })
      .limit(fetchLimit);

    if (chamber) query = query.eq('chamber', chamber);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching KY bills:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = data || [];
    if (status) {
      rows = rows.filter((b) => billMatchesBrowseStatusFilter(b, status));
    }
    if (rows.length > limit) {
      rows = rows.slice(0, limit);
    }

    return NextResponse.json({
      updated: new Date().toISOString(),
      bills: rows,
      source: 'supabase',
      count: rows.length,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in KY bills API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
