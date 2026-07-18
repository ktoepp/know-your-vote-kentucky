import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DistrictDetailView } from '@/components/districts/DistrictDetailView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildDistrictJsonLd } from '@/lib/structured-data';
import {
  allKyDistrictRefs,
  findLegislatorForKyDistrict,
  kyDistrictDisplayName,
  kyDistrictPath,
  kyDistrictSlug,
  kyDistrictThumbPath,
  parseKyDistrictSlug,
} from '@/lib/ky-district-pages';
import { fetchKyLegislatorRosterForCommittees } from '@/lib/ky-legislator-roster-server';
import {
  fetchMemberSessionsForLegislator,
  fetchSponsoredBillsForLegislator,
} from '@/lib/member-profile-data';
import { fetchCommitteeAssignmentsForLegislator } from '@/lib/ky-member-committees';
import { fetchKyCommittees } from '@/lib/ky-committee-data';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

// All 138 districts are a fixed set — pre-render every page at build.
export function generateStaticParams(): { slug: string }[] {
  return allKyDistrictRefs().map((ref) => ({ slug: kyDistrictSlug(ref) }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const districtRef = parseKyDistrictSlug(slug);
  if (!districtRef) {
    return { title: 'District not found' };
  }
  const displayName = kyDistrictDisplayName(districtRef);
  const roleNoun = districtRef.chamber === 'house' ? 'representative' : 'senator';
  const chamberName =
    districtRef.chamber === 'house' ? 'state House of Representatives' : 'state Senate';
  const roster = await fetchKyLegislatorRosterForCommittees().catch(() => []);
  const leg = findLegislatorForKyDistrict(roster, districtRef);
  const description = `${displayName} in the Kentucky ${chamberName}${
    leg ? `, currently represented by ${leg.name}` : ''
  }. District map, contact information, and recently sponsored bills.`;
  return buildPageMetadata({
    title: `${displayName} — ${roleNoun}, map, and bills`,
    description,
    path: kyDistrictPath(districtRef),
    // The committed district thumbnail doubles as a per-district OG card.
    ogImage: kyDistrictThumbPath(districtRef, 'profile'),
  });
}

export default async function DistrictDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const districtRef = parseKyDistrictSlug(slug);
  if (!districtRef) notFound();

  const roster = await fetchKyLegislatorRosterForCommittees();
  const leg = findLegislatorForKyDistrict(roster, districtRef);

  let sessionName = getCivicDataSessionName();
  let sponsoredBills: Awaited<ReturnType<typeof fetchSponsoredBillsForLegislator>> = [];
  let committeeAssignments: Awaited<ReturnType<typeof fetchCommitteeAssignmentsForLegislator>> = [];
  if (leg) {
    // Newest session the member actually has activity in (mirrors the profile page),
    // so new members during the interim still show their most recent bills.
    const sessionOptions = await fetchMemberSessionsForLegislator(leg);
    sessionName = sessionOptions[0] ?? sessionName;
    const committees = await fetchKyCommittees();
    [sponsoredBills, committeeAssignments] = await Promise.all([
      fetchSponsoredBillsForLegislator(leg, { sessionName, limit: 10 }),
      fetchCommitteeAssignmentsForLegislator(leg, committees),
    ]);
  }

  const displayName = kyDistrictDisplayName(districtRef);
  const path = kyDistrictPath(districtRef);
  return (
    <>
      <JsonLd
        data={[
          buildDistrictJsonLd(displayName, path),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Districts', path: '/districts' },
            { name: displayName, path },
          ]),
        ]}
      />
      <DistrictDetailView
        districtRef={districtRef}
        leg={leg}
        sponsoredBills={sponsoredBills}
        committeeAssignments={committeeAssignments}
        sessionName={sessionName}
      />
    </>
  );
}
