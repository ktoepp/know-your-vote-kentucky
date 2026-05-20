import { NextResponse } from 'next/server';
import {
  fetchKyMembersBrowseRoster,
  KY_ROSTER_REVALIDATE_SECONDS,
} from '@/lib/ky-legislator-roster-server';

export const revalidate = 3600;

export async function GET() {
  const roster = await fetchKyMembersBrowseRoster();
  return NextResponse.json(
    { roster },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${KY_ROSTER_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      },
    },
  );
}
