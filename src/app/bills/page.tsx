import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Explore Bills | Know Your Vote Kentucky',
  description: 'Browse bills from the Kentucky General Assembly.',
};

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default function BillsPage({ searchParams }: PageProps) {
  return (
    <BillsBrowsePage
      title="Explore Bills"
      subtitle="Browse bills from the current and recent sessions of the Kentucky General Assembly."
      chamberMode="all"
      searchParams={searchParams}
    />
  );
}
