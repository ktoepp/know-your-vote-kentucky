'use client';

import { useUser } from '@/app/lib/UserContext';

/**
 * Small client island that swaps the marketing hero for the returning-user hero
 * once auth resolves. Both variants arrive as pre-rendered React nodes so the
 * SSR pass can inline whichever the server component tree hands us — this file
 * ships zero JSX of its own, just the auth branch.
 *
 * Isolating the branch here keeps `HomePageContent` a server component, which
 * means `LandingTopics` / `LandingHeroReturning` (server components themselves)
 * no longer get pulled into the client bundle, and `LandingFeatures` /
 * `LandingMapSection` hydrate as independent islands instead of one big tree.
 */
export function HomeAuthHero({
  marketingHero,
  returningHero,
}: {
  marketingHero: React.ReactNode;
  returningHero: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const showReturning = !loading && Boolean(user);
  return <>{showReturning ? returningHero : marketingHero}</>;
}
