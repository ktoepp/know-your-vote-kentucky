import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

/**
 * Numeric district key aligned with Census `NAME` on state leg district features (e.g. "19").
 */
export function parseKyDistrictNumber(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/\d+/);
  if (!m) return null;
  return String(parseInt(m[0], 10));
}

export function findDistrictFeatureAtPoint(
  fc: FeatureCollection,
  lng: number,
  lat: number,
): GeoJSON.Feature | null {
  const pt = point([lng, lat]);
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    if (booleanPointInPolygon(pt, g as Polygon | MultiPolygon)) {
      return f;
    }
  }
  return null;
}

export function districtNameFromCensusFeature(f: GeoJSON.Feature | null): string | null {
  const p = f?.properties as Record<string, unknown> | null | undefined;
  const name = p?.NAME;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}
