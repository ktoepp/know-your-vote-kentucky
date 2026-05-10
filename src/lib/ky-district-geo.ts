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

/**
 * Canonical `ky_legislators.district` string after Open States sync (stable joins / fewer duplicate-looking seats).
 * House → HD-001…HD-100; Senate → SD-01…SD-38. Leaves unrecognized formats unchanged.
 */
export function normalizeKyLegislatorDistrictForDb(
  chamber: 'house' | 'senate' | null,
  districtRaw: string | null | undefined,
): string | null {
  const raw = (districtRaw ?? '').trim();
  if (!raw) return null;
  if (chamber !== 'house' && chamber !== 'senate') return raw;
  const numStr = parseKyDistrictNumber(raw);
  if (!numStr) return raw;
  const n = parseInt(numStr, 10);
  if (!Number.isFinite(n)) return raw;
  if (chamber === 'house') {
    if (n < 1 || n > 100) return raw;
    return `HD-${String(n).padStart(3, '0')}`;
  }
  if (n < 1 || n > 38) return raw;
  return `SD-${String(n).padStart(2, '0')}`;
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
