import { NextRequest, NextResponse } from 'next/server';
import { fetchKyBillDetailPageData } from '@/lib/ky-bill-detail-server';

const BILL_DETAIL_CACHE_SECONDS = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await fetchKyBillDetailPageData(id);

  if (!data) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  return NextResponse.json(
    { bill: data.bill, detail: data.detail },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${BILL_DETAIL_CACHE_SECONDS}, stale-while-revalidate=600`,
      },
    },
  );
}
