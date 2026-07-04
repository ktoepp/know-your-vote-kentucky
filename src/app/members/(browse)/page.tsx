import type { Metadata } from 'next';
import { MembersBrowse } from '@/components/members/MembersBrowse';
import { fetchKyMembersBrowseRoster } from '@/lib/ky-legislator-roster-server';

export const metadata: Metadata = {
  title: 'Members | Know Your Vote Kentucky',
  description: 'Browse Kentucky General Assembly members — House, Senate, and statewide officials.',
};

export const revalidate = 300;

export default async function MembersPage() {
  const initialRoster = await fetchKyMembersBrowseRoster();
  return <MembersBrowse initialRoster={initialRoster} />;
}
