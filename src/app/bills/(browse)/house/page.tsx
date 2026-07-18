import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { buildPageMetadata } from '@/lib/seo';

export function generateMetadata(): Metadata {
  const session = getCivicDataSessionName();
  return buildPageMetadata({
    title: `Kentucky House bills — ${session}`,
    description: `Bills introduced in the Kentucky House of Representatives during the ${session}, with status, sponsors, and votes.`,
    path: '/bills/house',
  });
}

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default function HouseBillsPage({ searchParams }: PageProps) {
  return (
    <BillsBrowsePage
      title="House Bills"
      subtitle="House bills and resolutions (HB, HR, HJR, HCR, etc.) from the Kentucky General Assembly."
      chamberMode="house"
      searchParams={searchParams}
    />
  );
}
