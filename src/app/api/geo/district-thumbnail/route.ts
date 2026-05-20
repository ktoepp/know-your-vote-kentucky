import { NextResponse, type NextRequest } from 'next/server';
import { buildDistrictThumbnailUrl } from '@/lib/ky-district-thumbnail';

export const revalidate = 86400;

const SIZES = {
  card: { width: 600, height: 280 },
  profile: { width: 720, height: 420 },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const chamber = searchParams.get('chamber');
  const district = searchParams.get('district');
  const size = searchParams.get('size') === 'profile' ? SIZES.profile : SIZES.card;

  if ((chamber !== 'house' && chamber !== 'senate') || !district) {
    return NextResponse.json({ error: 'chamber (house|senate) and district are required' }, { status: 400 });
  }

  const url = await buildDistrictThumbnailUrl(origin, chamber, district, size);
  if (!url) {
    return NextResponse.json({ error: 'District map unavailable' }, { status: 404 });
  }

  return NextResponse.redirect(url, {
    status: 307,
    headers: {
      // District shapes are static; let the browser/CDN cache the redirect.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}
