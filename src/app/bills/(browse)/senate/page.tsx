import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { buildPageMetadata } from '@/lib/seo';

export function generateMetadata(): Metadata {
  const session = getCivicDataSessionName();
  return buildPageMetadata({
    title: `Kentucky Senate bills: ${session}`,
    description: `Bills introduced in the Kentucky Senate during the ${session}, with status, sponsors, and votes.`,
    path: '/bills/senate',
  });
}

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default function SenateBillsPage({ searchParams }: PageProps) {
  return (
    <BillsBrowsePage
      title="Senate bills"
      subtitle="Senate bills and resolutions (SB, SR, SJR, SCR, etc.) from the Kentucky General Assembly."
      chamberMode="senate"
      searchParams={searchParams}
    />
  );
}
