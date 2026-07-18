import { Suspense } from 'react';
import { CommitteesBrowse } from '@/components/committees/CommitteesBrowse';
import { fetchKyCommitteesBrowseEnriched } from '@/lib/ky-committees-browse-enriched';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Kentucky General Assembly committees',
  description:
    'Kentucky General Assembly committees with meetings and agendas from the LRC legislative calendar.',
  path: '/committees',
});

export const revalidate = 300;

export default async function CommitteesPage() {
  const initialCommittees = await fetchKyCommitteesBrowseEnriched();
  return (
    <Suspense fallback={null}>
      <CommitteesBrowse initialCommittees={initialCommittees} />
    </Suspense>
  );
}
