import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { buildPageMetadata } from '@/lib/seo';

export function generateMetadata(): Metadata {
  const session = getCivicDataSessionName();
  return buildPageMetadata({
    title: `Kentucky bills: ${session}`,
    description: `Browse bills and resolutions from the Kentucky General Assembly's ${session}. Filter by chamber, status, and topic, and follow bills to receive email updates.`,
    path: '/bills',
  });
}

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default function BillsPage({ searchParams }: PageProps) {
  return (
    <BillsBrowsePage
      title="Bills"
      subtitle="Browse bills from the current and recent sessions of the Kentucky General Assembly."
      chamberMode="all"
      searchParams={searchParams}
    />
  );
}
