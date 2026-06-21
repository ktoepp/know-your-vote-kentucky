import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillDetailView } from '@/components/bills/BillDetailView';
import { getKyBillDetailPageData } from '@/lib/ky-bill-detail-server';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBillJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';

export const revalidate = 300;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getKyBillDetailPageData(id);
  if (!data) {
    return { title: 'Bill not found | Know Your Vote Kentucky' };
  }
  const { bill } = data;
  const description =
    bill.description?.trim() ||
    bill.ai_summary?.trim() ||
    `Kentucky ${bill.bill_number} — ${bill.title}`;
  return {
    title: `${bill.bill_number} | Know Your Vote Kentucky`,
    description: description.slice(0, 160),
    alternates: { canonical: `/bills/${id}` },
    openGraph: {
      title: bill.bill_number,
      description: bill.title,
      url: `/bills/${id}`,
      type: 'article',
    },
  };
}

export default async function BillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [data, legislatorRoster] = await Promise.all([
    getKyBillDetailPageData(id),
    fetchKyActiveLegislatorRosterSlim(),
  ]);
  if (!data) notFound();

  const path = `/bills/${id}`;
  return (
    <>
      <JsonLd
        data={[
          buildBillJsonLd(data.bill, path),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Bills', path: '/bills' },
            { name: data.bill.bill_number, path },
          ]),
        ]}
      />
      <BillDetailView
        bill={data.bill}
        detail={data.detail}
        routeId={id}
        legislatorRoster={legislatorRoster}
      />
    </>
  );
}
