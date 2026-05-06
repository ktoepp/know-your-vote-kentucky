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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Look up: UUID path is exact row (used by list cards). Bill-number path = newest session when duplicated.
  let billData: any = null;
  if (isUuid) {
    const { data } = await supabase.from('ky_bills').select('*').eq('id', id).maybeSingle();
    billData = data ?? null;
  } else {
    const { data: byNumber } = await supabase
      .from('ky_bills')
      .select('*')
      .ilike('bill_number', normalised)
      .order('session', { ascending: false })
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (byNumber) {
      billData = byNumber;
    } else {
      const { data: byId } = await supabase.from('ky_bills').select('*').eq('id', id).maybeSingle();
      billData = byId ?? null;
    }
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

  // Vote rows on getBill sometimes omit or zero out nay/yea; merge official counts from getRollCall.
  let votesOut: any[] = legiscanDetail?.votes ?? [];
  if (votesOut.length > 0 && billData.legiscan_id) {
    try {
      const client = getKyLegiScanClient();
      votesOut = await Promise.all(
        votesOut.map(async (v: { roll_call_id?: number; [k: string]: unknown }) => {
          const rid = v?.roll_call_id;
          if (rid == null) return v;
          const full = await client.fetchRollCall(Number(rid));
          if (!full) return v;
          return {
            ...v,
            yea: full.yea,
            nay: full.nay,
            nv: full.nv,
            absent: full.absent,
            passed: full.passed,
          };
        }),
      );
    } catch (err: any) {
      console.error('[BillDetail] Vote enrichment failed:', err?.message);
    }
  }

  const fallbackSubjects = Array.isArray(billData?.legiscan_subjects) ? billData.legiscan_subjects : [];

  // 3. Merge: Supabase is ground truth for status/topics; LegiScan enriches with
  //    history, subjects, texts, and sponsor detail (including ballotpedia slugs).
  //    When getBill fails or omits subjects, use synced `legiscan_subjects` so chips match search.
  return NextResponse.json({
    bill: billData,
    detail: legiscanDetail
      ? {
          subjects:
            Array.isArray(legiscanDetail.subjects) && legiscanDetail.subjects.length > 0
              ? legiscanDetail.subjects
              : fallbackSubjects,
          history: legiscanDetail.history ?? [],
          texts: legiscanDetail.texts ?? [],
          sponsors: legiscanDetail.sponsors ?? [],
          votes: votesOut,
          committee: legiscanDetail.committee ?? null,
        }
      : fallbackSubjects.length > 0
        ? {
            subjects: fallbackSubjects,
            history: [],
            texts: [],
            sponsors: [],
            votes: [],
            committee: null,
          }
        : null,
  });
}
