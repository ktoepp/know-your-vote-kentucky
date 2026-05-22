import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CommitteeDetailView } from '@/components/committees/CommitteeDetailView';
import {
  fetchKyCommitteeAgendaForMeetings,
  fetchKyCommitteeMeetingsForCommittee,
  fetchKyLegislatorRoster,
  getKyCommitteeBySlug,
} from '@/lib/ky-committee-data';
import { fetchKyCommitteesBrowseList } from '@/lib/ky-ga-browse-server';
import { buildCommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

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
  };
}

export default async function CommitteeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const committee = await getKyCommitteeBySlug(slug);
  if (!committee) notFound();

  const [meetings, legislatorRoster, committeeRoster] = await Promise.all([
    fetchKyCommitteeMeetingsForCommittee(committee.id),
    fetchKyLegislatorRoster(),
    fetchKyCommitteesBrowseList(),
  ]);
  const members = buildCommitteeMemberDisplay(committee, meetings, legislatorRoster);
  const agendaByMeetingId = await fetchKyCommitteeAgendaForMeetings(meetings.map((m) => m.id));

  return (
    <CommitteeDetailView
      committee={committee}
      meetings={meetings}
      agendaByMeetingId={agendaByMeetingId}
      members={members}
      committeeRoster={committeeRoster.map((c) => ({ slug: c.slug, name: c.name }))}
    />
  );
}
