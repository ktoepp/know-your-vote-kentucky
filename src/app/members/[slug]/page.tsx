import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
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
import { kyMemberTitleShort, memberCanonicalSlug, memberProfilePath } from '@/lib/ky-member-utils';
import { formatKyLegislatorDistrict, formatPartyLabel } from '@/lib/bill-display';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildLegislatorJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';
import { fetchMemberSitemapEntries } from '@/lib/sitemap-data';

export const revalidate = 300;

// Pre-render the ~140 canonical member pages at build so first crawls are warm.
// `dynamicParams` stays true: aliases and historical members resolve on demand.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const entries = await fetchMemberSitemapEntries().catch(() => []);
  return entries.map((e) => ({ slug: e.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getMemberProfilePageContext(slug);
  const leg = ctx?.leg;
  if (!leg) {
    return { title: 'Member not found' };
  }
  // Titles carry the role + district phrasing people search ("{name} kentucky senator");
  // chamber nouns come from the chamber (role_title can hold leadership titles).
  const isChamberMember = leg.chamber === 'house' || leg.chamber === 'senate';
  const districtNum = parseKyDistrictNumber(leg.district);
  const districtLabel = formatKyLegislatorDistrict(leg);
  const role = kyMemberTitleShort(leg);
  let title: string;
  let description: string;
  if (isChamberMember) {
    const roleNoun = leg.chamber === 'house' ? 'Representative' : 'Senator';
    title = `${leg.name} — Kentucky State ${roleNoun}${districtNum ? `, District ${districtNum}` : ''}`;
    const party = formatPartyLabel(leg.party);
    description = `${leg.name}${party ? ` (${party})` : ''}${districtLabel ? `, ${districtLabel}` : ''}, Kentucky General Assembly. Committee assignments, sponsored bills, contact information, and voting record.`;
  } else {
    title = `${leg.name} — ${role}, Kentucky`;
    description = `${leg.name}, ${role}, Commonwealth of Kentucky. Contact information and official links.`;
  }
  // Canonicalize alias slugs (legacy name variants, pre-042 URLs) to the member's stored slug.
  const canonicalPath = memberProfilePath(leg);
  return buildPageMetadata({ title, description, path: canonicalPath, ogType: 'profile' });
}

export default async function MemberProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { session: requestedSession } = await searchParams;
  const ctx = await getMemberProfilePageContext(slug);
  if (!ctx) notFound();
  const { leg, roster } = ctx;

  // Alias slugs (legacy name variants, UUIDs, pre-042 URLs) 308 to the stored
  // canonical slug so search engines consolidate on one URL per member — mirrors
  // the bill page's slug redirect. Alias resolution above stays intact.
  if (decodeURIComponent(slug) !== memberCanonicalSlug(leg)) {
    permanentRedirect(memberProfilePath(leg));
  }

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
