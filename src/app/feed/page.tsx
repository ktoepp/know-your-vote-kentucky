import type { Metadata } from 'next';
import { FeedView } from '@/components/feed/FeedView';
import { fetchKyFeedRecentHouseBills, fetchKyFeedRecentSenateBills } from '@/lib/ky-feed-server';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';

export const metadata: Metadata = {
  title: 'Your feed | Know Your Vote Kentucky',
  description: 'Bills you follow and recent Kentucky General Assembly activity.',
};

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
