import type { Metadata } from 'next';
import { BillsBrowsePage } from '@/components/bills/BillsBrowsePage';
import type { SearchParamsInput } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'House Bills | Know Your Vote Kentucky',
  description: 'House bills and resolutions from the Kentucky General Assembly.',
};

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
