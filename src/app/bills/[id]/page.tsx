import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BillDetailView } from '@/components/bills/BillDetailView';
import { getKyBillDetailPageData } from '@/lib/ky-bill-detail-server';
import { kyBillSlug } from '@/lib/ky-bill-slug';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBillJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';
import { formatKyBillNumberSpaced, kyBillSeoCatchline, kyBillSessionYear } from '@/lib/bill-display';
import { buildPageMetadata } from '@/lib/seo';
import { fetchTopBillSlugsForPrerender } from '@/lib/sitemap-data';

export const revalidate = 300;

// Pre-render only the most-viewed current-session bills (the long tail stays
// on-demand ISR — build time is the constraint, and cold pages still render).
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const slugs = await fetchTopBillSlugsForPrerender().catch(() => []);
  return slugs.map((slug) => ({ id: slug }));
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const routeId = decodeURIComponent(id);
  const data = await getKyBillDetailPageData(routeId);
  if (!data) {
    return { title: 'Bill not found' };
  }
  const { bill } = data;
  // Canonical always points at the slug (F4): UUID and bare-number variants 308 to it
  // in the page, so search engines consolidate on one URL per bill.
  const path = `/bills/${kyBillSlug(bill) ?? routeId}`;
  // Title/description lead with the phrasing people actually search ("kentucky hb 208");
  // on-page copy and JSON-LD keep the official designation and catchline as recorded.
  const spacedNumber = formatKyBillNumberSpaced(bill.bill_number) || bill.bill_number;
  const year = kyBillSessionYear(bill.session);
  const catchline = kyBillSeoCatchline(bill.title);
  const title = `Kentucky ${spacedNumber}${year ? ` (${year})` : ''}${catchline ? `: ${catchline}` : ''}`;
  const body =
    bill.description?.trim() ||
    bill.ai_summary?.trim() ||
    bill.title?.trim() ||
    '';
  const sessionLabel = (bill.session || '').trim();
  const description = `Kentucky ${spacedNumber}${sessionLabel ? `, ${sessionLabel}` : ''}. ${body}`
    .trim()
    .slice(0, 160);
  return buildPageMetadata({ title, description, path, ogType: 'article' });
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
