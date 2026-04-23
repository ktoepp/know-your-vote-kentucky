import { NextRequest, NextResponse } from 'next/server';

const ZIP_RE = /^\d{5}$/;

/**
 * Geocode a U.S. ZIP code to latitude/longitude (centroid of the postal area).
 * Uses Nominatim; set NOMINATIM_USER_AGENT to identify your deployment per their usage policy.
 */
export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get('zip')?.trim() ?? '';
  if (!ZIP_RE.test(zip)) {
    return NextResponse.json({ error: 'Enter a valid 5-digit ZIP code.' }, { status: 400 });
  }

  const userAgent =
    process.env.NOMINATIM_USER_AGENT ||
    'KnowYourVoteKentucky/1.0 (Kentucky civic engagement; contact via site maintainer)';

  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable. Try again later.' }, { status: 502 });
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = data[0];
    if (!hit) {
      return NextResponse.json({ error: 'No location found for that ZIP code.' }, { status: 404 });
    }
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Unexpected geocoding response.' }, { status: 502 });
    }
    return NextResponse.json({
      zip,
      lat,
      lng,
      displayName: hit.display_name ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Geocoding request failed.' }, { status: 502 });
  }
}
