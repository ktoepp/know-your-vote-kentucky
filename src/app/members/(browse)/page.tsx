import type { Metadata } from 'next';
import { MembersBrowse } from '@/components/members/MembersBrowse';
import { fetchKyMembersBrowseRoster } from '@/lib/ky-legislator-roster-server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Kentucky state legislators: House and Senate members',
  description:
    'Roster of current Kentucky General Assembly members, both state representatives and senators, with party, district, contact information, committees, and sponsored bills.',
  path: '/members',
});

export const revalidate = 300;

export default async function MembersPage() {
  const initialRoster = await fetchKyMembersBrowseRoster();
  return <MembersBrowse initialRoster={initialRoster} />;
}
