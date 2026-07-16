import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BillDetailView } from '@/components/bills/BillDetailView';
import { getKyBillDetailPageData } from '@/lib/ky-bill-detail-server';
import { kyBillSlug } from '@/lib/ky-bill-slug';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBillJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';

export const revalidate = 300;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const routeId = decodeURIComponent(id);
  const data = await getKyBillDetailPageData(routeId);
  if (!data) {
    return { title: 'Bill not found | Know Your Vote Kentucky' };
  }
  const { bill } = data;
  // Canonical always points at the slug (F4): UUID and bare-number variants 308 to it
  // in the page, so search engines consolidate on one URL per bill.
  const path = `/bills/${kyBillSlug(bill) ?? routeId}`;
  const description =
    bill.description?.trim() ||
    bill.ai_summary?.trim() ||
    `Kentucky ${bill.bill_number} — ${bill.title}`;
  return {
    title: `${bill.bill_number} | Know Your Vote Kentucky`,
    description: description.slice(0, 160),
    alternates: { canonical: path },
    openGraph: {
      title: bill.bill_number,
      description: bill.title,
      url: path,
      type: 'article',
    },
  };
}

export default async function BillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const routeId = decodeURIComponent(id);
  const [data, legislatorRoster] = await Promise.all([
    getKyBillDetailPageData(routeId),
    fetchKyActiveLegislatorRosterSlim(),
  ]);
  if (!data) notFound();

  // Non-canonical variants (UUID from old sitemap/digest links, bare "HB208") 308 to the
  // slug. Bills whose slug can't be derived (missing session) keep serving their UUID URL.
  const slug = kyBillSlug(data.bill);
  if (slug && routeId !== slug) permanentRedirect(`/bills/${slug}`);

  const path = `/bills/${slug ?? routeId}`;
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
        routeId={slug ?? routeId}
        legislatorRoster={legislatorRoster}
      />
    </>
  );
}
