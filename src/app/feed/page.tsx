import type { Metadata } from 'next';
import { FeedView } from '@/components/feed/FeedView';
import { fetchKyFeedRecentHouseBills, fetchKyFeedRecentSenateBills } from '@/lib/ky-feed-server';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Your feed',
  description: 'Bills you follow and recent Kentucky General Assembly activity.',
  path: '/feed',
});

export const revalidate = 120;

export default async function FeedPage() {
  const [initialRecentHouse, initialRecentSenate, legislatorRoster] = await Promise.all([
    fetchKyFeedRecentHouseBills(),
    fetchKyFeedRecentSenateBills(),
    fetchKyActiveLegislatorRosterSlim(),
  ]);

  return (
    <FeedView
      initialRecentHouse={initialRecentHouse}
      initialRecentSenate={initialRecentSenate}
      legislatorRoster={legislatorRoster}
    />
  );
}
