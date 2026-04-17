import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { getKyLegiScanClient } from '../../../../lib/ky-legiscan-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Normalise id: "HB1" and "hb1" and "HB 1" all resolve to the same bill
  const normalised = id.toUpperCase().replace(/\s+/g, '');

  // 1. Look up in Supabase — try bill_number first, then UUID
  let billData: any = null;
  const { data: byNumber } = await supabase
    .from('ky_bills')
    .select('*')
    .ilike('bill_number', normalised)
    .limit(1)
    .single();

  if (byNumber) {
    billData = byNumber;
  } else {
    const { data: byId } = await supabase
      .from('ky_bills')
      .select('*')
      .eq('id', id)
      .limit(1)
      .single();
    billData = byId ?? null;
  }

  if (!billData) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  // 2. Fetch full detail from LegiScan for subjects, history, texts, sponsors
  let legiscanDetail: any = null;
  if (billData.legiscan_id) {
    try {
      const client = getKyLegiScanClient();
      legiscanDetail = await client.fetchBillDetail(billData.legiscan_id);
    } catch (err: any) {
      console.error('[BillDetail] LegiScan fetch failed:', err?.message);
    }
  }

  // 3. Merge: Supabase is ground truth for status/topics; LegiScan enriches with
  //    history, subjects, texts, and sponsor detail (including ballotpedia slugs).
  return NextResponse.json({
    bill: billData,
    detail: legiscanDetail
      ? {
          subjects: legiscanDetail.subjects ?? [],
          history: legiscanDetail.history ?? [],
          texts: legiscanDetail.texts ?? [],
          sponsors: legiscanDetail.sponsors ?? [],
          votes: legiscanDetail.votes ?? [],
          committee: legiscanDetail.committee ?? null,
        }
      : null,
  });
}
