/**
 * Mapbox forward geocoding (browser). Uses the same public token as Mapbox GL.
 * Biases to a bbox so out-of-state queries rank Kentucky / nearby results lower.
 */
export type MapboxGeocodeResult = { lng: number; lat: number; placeName: string };

export async function mapboxGeocodeAddress(
  query: string,
  accessToken: string,
  options?: { bbox?: [number, number, number, number] },
): Promise<MapboxGeocodeResult | null> {
  const q = query.trim();
  if (!q || !accessToken) return null;
  const bbox = options?.bbox ?? [-89.9, 36.4, -81.45, 39.35];
  const u = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  u.searchParams.set('access_token', accessToken);
  u.searchParams.set('limit', '1');
  u.searchParams.set('country', 'us');
  u.searchParams.set('bbox', bbox.join(','));
  u.searchParams.set('proximity', '-84.87,37.35');
  u.searchParams.set('types', 'address');
  const r = await fetch(u.toString());
  if (!r.ok) return null;
  const data = (await r.json()) as {
    features?: { center: [number, number]; place_name?: string }[];
  };
  const f = data.features?.[0];
  if (!f?.center) return null;
  return { lng: f.center[0], lat: f.center[1], placeName: f.place_name || q };
}
