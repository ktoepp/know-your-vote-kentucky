import { Suspense } from 'react';
import { MeetingsBrowse } from '@/components/committees/MeetingsBrowse';
import { fetchKyMeetingsBrowseWindow } from '@/lib/ky-ga-browse-server';
import { searchParamsToUrlSearchParams, type SearchParamsInput } from '@/lib/search-params';

export const metadata = {
  title: 'Committee meetings | Know Your Vote Kentucky',
  description:
    'Upcoming Kentucky General Assembly committee meetings from the LRC legislative calendar.',
};

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default async function MeetingsPage({ searchParams }: PageProps) {
  const sp = searchParamsToUrlSearchParams(await searchParams);
  const agendaQuery = sp.get('q')?.trim() ?? '';
  const initialMeetings = agendaQuery ? undefined : await fetchKyMeetingsBrowseWindow();

  return (
    <Suspense fallback={null}>
      <MeetingsBrowse initialMeetings={initialMeetings} />
    </Suspense>
  );
}
