import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Senate Bills | Know Your Vote Kentucky',
  description: 'Senate bills and resolutions from the Kentucky General Assembly.',
};

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default function SenateBillsPage({ searchParams }: PageProps) {
  return (
    <BillsBrowsePage
      title="Senate Bills"
      subtitle="Senate bills and resolutions (SB, SR, SJR, SCR, etc.) from the Kentucky General Assembly."
      chamberMode="senate"
      searchParams={searchParams}
    />
  );
}
