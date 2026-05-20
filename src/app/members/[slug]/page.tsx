import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMemberProfilePageContext } from '@/lib/member-profile';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { fetchSponsoredBillsForLegislator, fetchMemberVoteRecord } from '@/lib/member-profile-data';
import { fetchCommitteeAssignmentsForLegislator } from '@/lib/ky-member-committees';
import { fetchKyCommittees } from '@/lib/ky-committee-data';
import { MemberProfileView } from '@/components/members/MemberProfileView';
import { kyMemberTitleShort } from '@/lib/ky-member-utils';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

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
  return {
    title: `${leg.name} | Know Your Vote Kentucky`,
    description: desc,
    openGraph: {
      title: `${leg.name}`,
      description: desc,
    },
  };
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const ctx = await getMemberProfilePageContext(slug);
  if (!ctx) notFound();
  const { leg, roster } = ctx;
  const sessionName = getCivicDataSessionName();
  const committees = await fetchKyCommittees();
  const [sponsoredBills, voteRecord, committeeAssignments] = await Promise.all([
    fetchSponsoredBillsForLegislator(leg, { sessionName, limit: 30 }),
    fetchMemberVoteRecord(leg, { sessionName, maxRows: 200, recentLimit: 8 }),
    fetchCommitteeAssignmentsForLegislator(leg, committees),
  ]);
  return (
    <MemberProfileView
      leg={leg}
      legislatorRoster={roster}
      sessionName={sessionName}
      sponsoredBills={sponsoredBills}
      voteRecord={voteRecord}
      committeeAssignments={committeeAssignments}
    />
  );
}
