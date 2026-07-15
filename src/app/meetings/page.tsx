import { Suspense } from 'react';
import { MeetingsBrowse } from '@/components/committees/MeetingsBrowse';
import { fetchKyMeetingsBrowseWindow } from '@/lib/ky-ga-browse-server';
import { searchParamsToUrlSearchParams, type SearchParamsInput } from '@/lib/search-params';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMeetingEventJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';
import { kyTodayIso } from '@/lib/ky-committee-display';

export const metadata = {
  title: 'Committee meetings | Know Your Vote Kentucky',
  description:
    'Upcoming Kentucky General Assembly committee meetings from the LRC legislative calendar.',
};

export const revalidate = 300;

const EVENT_JSONLD_LIMIT = 40;

type PageProps = {
  searchParams: Promise<SearchParamsInput>;
};

export default async function MeetingsPage({ searchParams }: PageProps) {
  const sp = searchParamsToUrlSearchParams(await searchParams);
  const agendaQuery = sp.get('q')?.trim() ?? '';
  const initialMeetings = agendaQuery ? undefined : await fetchKyMeetingsBrowseWindow();

  const today = kyTodayIso();
  const eventNodes =
    (initialMeetings ?? [])
      .filter((m) => m.status !== 'cancelled' && m.meeting_date >= today)
      .slice(0, EVENT_JSONLD_LIMIT)
      .map(buildMeetingEventJsonLd)
      .filter((n): n is NonNullable<typeof n> => n !== null);
  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Committee meetings', path: '/meetings' },
    ]),
    ...eventNodes,
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Suspense fallback={null}>
        <MeetingsBrowse initialMeetings={initialMeetings} />
      </Suspense>
    </>
  );
}
