/**
 * Mapbox forward geocoding (browser). Uses the same public token as Mapbox GL.
 * Biases to a bbox so out-of-state queries rank Kentucky / nearby results lower.
 */
export type MapboxGeocodeResult = { lng: number; lat: number; placeName: string };

export type MapboxGeocodeSuggestion = { lng: number; lat: number; placeName: string; id: string };

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

/** Forward geocode with multiple suggestions for autocomplete. */
export async function mapboxGeocodeSuggest(
  query: string,
  accessToken: string,
  options?: { bbox?: [number, number, number, number]; limit?: number },
): Promise<MapboxGeocodeSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 3 || !accessToken) return [];
  const bbox = options?.bbox ?? [-89.9, 36.4, -81.45, 39.35];
  const limit = Math.min(Math.max(options?.limit ?? 5, 1), 5);
  const u = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  u.searchParams.set('access_token', accessToken);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('country', 'us');
  u.searchParams.set('bbox', bbox.join(','));
  u.searchParams.set('proximity', '-84.87,37.35');
  u.searchParams.set('types', 'address,postcode,place');
  const r = await fetch(u.toString());
  if (!r.ok) return [];
  const data = (await r.json()) as {
    features?: { id: string; center: [number, number]; place_name?: string }[];
  };
  return (data.features ?? [])
    .filter((f) => f?.center && f.id)
    .map((f) => ({
      id: f.id,
      lng: f.center[0],
      lat: f.center[1],
      placeName: f.place_name || q,
    }));
}
