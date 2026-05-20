import { Suspense } from 'react';
import { BillsBrowse, type BillsBrowseChamberMode } from '@/components/bills/BillsBrowse';
import { fetchKyBillsBrowsePage } from '@/lib/ky-bills-browse-server';
import { kyBillsBrowseQueryKey, parseKyBillsBrowseQuery } from '@/lib/ky-bills-browse-query';
import { searchParamsToUrlSearchParams, type SearchParamsInput } from '@/lib/search-params';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';

export type BillsBrowsePageProps = {
  title: string;
  subtitle: string;
  chamberMode: BillsBrowseChamberMode;
  searchParams: SearchParamsInput | Promise<SearchParamsInput>;
  initialTopic?: string;
};

export async function BillsBrowsePage({
  title,
  subtitle,
  chamberMode,
  searchParams,
  initialTopic,
}: BillsBrowsePageProps) {
  const sp = searchParamsToUrlSearchParams(await searchParams);
  if (initialTopic && !sp.has('topic')) sp.set('topic', initialTopic);

  const followsMe = sp.get('follows') === 'me';
  const query = parseKyBillsBrowseQuery(sp, chamberMode);
  const queryKey = kyBillsBrowseQueryKey(query);

  const [legislatorRoster, browseResult] = await Promise.all([
    fetchKyActiveLegislatorRosterSlim(),
    followsMe || query.page !== 1
      ? Promise.resolve(null)
      : fetchKyBillsBrowsePage(query),
  ]);

  const initialBrowse =
    browseResult != null
      ? {
          queryKey,
          bills: browseResult.bills,
          total: browseResult.total,
          capped: browseResult.capped,
        }
      : undefined;

  return (
    <Suspense fallback={null}>
      <BillsBrowse
        title={title}
        subtitle={subtitle}
        chamberMode={chamberMode}
        initialTopic={initialTopic}
        legislatorRoster={legislatorRoster}
        initialBrowse={initialBrowse}
      />
    </Suspense>
  );
}
