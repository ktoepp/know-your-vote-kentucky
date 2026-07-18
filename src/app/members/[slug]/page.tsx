import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMemberProfilePageContext } from '@/lib/member-profile';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import {
  fetchSponsoredBillsForLegislator,
  fetchMemberVoteRecord,
  fetchMemberSessionsForLegislator,
} from '@/lib/member-profile-data';
import { fetchCommitteeAssignmentsForLegislator } from '@/lib/ky-member-committees';
import { fetchKyCommittees } from '@/lib/ky-committee-data';
import { MemberProfileView } from '@/components/members/MemberProfileView';
import { kyMemberTitleShort, memberProfilePath } from '@/lib/ky-member-utils';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildLegislatorJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getMemberProfilePageContext(slug);
  const leg = ctx?.leg;
  if (!leg) {
    return { title: 'Member not found | Know Your Vote Kentucky' };
  }
  const district = formatKyLegislatorDistrict(leg);
  const role = kyMemberTitleShort(leg);
  const desc = [role, district, 'Kentucky General Assembly'].filter(Boolean).join(' — ');
  // Canonicalize alias slugs (legacy name variants, pre-042 URLs) to the member's stored slug.
  const canonicalPath = memberProfilePath(leg);
  return {
    title: `${leg.name} | Know Your Vote Kentucky`,
    description: desc,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${leg.name}`,
      description: desc,
      url: canonicalPath,
      type: 'profile',
    },
  };
}

export default async function MemberProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { session: requestedSession } = await searchParams;
  const ctx = await getMemberProfilePageContext(slug);
  if (!ctx) notFound();
  const { leg, roster } = ctx;
  const sessionOptions = await fetchMemberSessionsForLegislator(leg);
  // Honour ?session= only when it's one the member actually has activity in; otherwise default to the newest.
  const sessionName =
    requestedSession && sessionOptions.includes(requestedSession)
      ? requestedSession
      : sessionOptions[0] ?? getCivicDataSessionName();
  const committees = await fetchKyCommittees();
  const [sponsoredBills, voteRecord, committeeAssignments] = await Promise.all([
    fetchSponsoredBillsForLegislator(leg, { sessionName, limit: 30 }),
    fetchMemberVoteRecord(leg, { sessionName, maxRows: 200, recentLimit: 8 }),
    fetchCommitteeAssignmentsForLegislator(leg, committees),
  ]);
  const path = memberProfilePath(leg);
  return (
    <>
      <JsonLd
        data={[
          buildLegislatorJsonLd(leg, path),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Members', path: '/members' },
            { name: leg.name, path },
          ]),
        ]}
      />
      <MemberProfileView
        leg={leg}
        legislatorRoster={roster}
        sessionName={sessionName}
        sessionOptions={sessionOptions}
        sponsoredBills={sponsoredBills}
        voteRecord={voteRecord}
        committeeAssignments={committeeAssignments}
      />
    </>
  );
}
