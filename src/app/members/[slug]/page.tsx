import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegislatorByProfileSlug } from '@/lib/member-profile';
import { MemberProfileView } from '@/components/members/MemberProfileView';
import { kyMemberTitleShort } from '@/lib/ky-member-utils';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const leg = await getLegislatorByProfileSlug(slug);
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
  const leg = await getLegislatorByProfileSlug(slug);
  if (!leg) notFound();
  return <MemberProfileView leg={leg} />;
}
