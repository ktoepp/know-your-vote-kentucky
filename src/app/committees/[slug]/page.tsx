import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CommitteeDetailView } from '@/components/committees/CommitteeDetailView';
import {
  fetchKyCommitteeAgendaForMeetings,
  fetchKyCommitteeMaterials,
  fetchKyCommitteeMeetingsForCommittee,
  fetchKyLegislatorRoster,
  getKyCommitteeBySlug,
  getKyCommitteeSlugByAlias,
} from '@/lib/ky-committee-data';
import { fetchKyCommitteesBrowseList } from '@/lib/ky-ga-browse-server';
import { buildCommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildCommitteeJsonLd, buildBreadcrumbJsonLd } from '@/lib/structured-data';

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const committee = await getKyCommitteeBySlug(slug);
  if (!committee) {
    return { title: 'Committee not found | Know Your Vote Kentucky' };
  }
  const name = normalizeKyGaDisplayName(committee.name);
  return {
    title: `${name} | Know Your Vote Kentucky`,
    description: `Scheduled meetings and agendas for ${name} from the Kentucky LRC legislative calendar.`,
    alternates: { canonical: `/committees/${slug}` },
    openGraph: {
      title: name,
      description: `Scheduled meetings and agendas for ${name} from the Kentucky LRC legislative calendar.`,
      url: `/committees/${slug}`,
      type: 'article',
    },
  };
}

export default async function CommitteeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const committee = await getKyCommitteeBySlug(slug);
  if (!committee) {
    // Merged-away duplicate slugs (see scripts/merge-duplicate-committees.ts)
    // resolve via aliases so bookmarked URLs keep working.
    const canonicalSlug = await getKyCommitteeSlugByAlias(slug);
    if (canonicalSlug) permanentRedirect(`/committees/${encodeURIComponent(canonicalSlug)}`);
    notFound();
  }

  const [meetings, legislatorRoster, committeeRoster, materials] = await Promise.all([
    fetchKyCommitteeMeetingsForCommittee(committee.id),
    fetchKyLegislatorRoster(),
    fetchKyCommitteesBrowseList(),
    fetchKyCommitteeMaterials(committee.id),
  ]);
  const members = buildCommitteeMemberDisplay(committee, meetings, legislatorRoster);
  const agendaByMeetingId = await fetchKyCommitteeAgendaForMeetings(meetings.map((m) => m.id));

  const path = `/committees/${slug}`;
  return (
    <>
      <JsonLd
        data={[
          buildCommitteeJsonLd(committee, path),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Committees', path: '/committees' },
            { name: normalizeKyGaDisplayName(committee.name), path },
          ]),
        ]}
      />
      <CommitteeDetailView
        committee={committee}
        meetings={meetings}
        agendaByMeetingId={agendaByMeetingId}
        members={members}
        materials={materials}
        committeeRoster={committeeRoster.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </>
  );
}
