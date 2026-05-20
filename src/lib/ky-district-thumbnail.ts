/**
 * Server helper: build a Mapbox Static Images API URL for a single legislative district.
 *
 * Why: rendering a live WebGL minimap per roster card (~140 maps) exhausts the browser's
 * WebGL context limit. A static image per card scales to any count with no WebGL.
 *
 * The district outline is simplified (Douglas–Peucker) and sent as a GeoJSON overlay so the
 * Static API renders the highlighted shape on a light basemap, fit automatically.
 */
import type { FeatureCollection, Geometry } from 'geojson';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const STYLE = 'mapbox/light-v11';
const HOUSE_GEOJSON_PATH = '/geo/ky-sldl.geojson';
const SENATE_GEOJSON_PATH = '/geo/ky-sldu.geojson';
const MAX_URL_LENGTH = 7500; // Mapbox Static API rejects URLs over ~8192 bytes.

const FILL = '#1d4ed8';

type Ring = [number, number][];

const fcCache = new Map<string, Promise<FeatureCollection>>();
const urlCache = new Map<string, string | null>();

function loadDistrictFeatureCollection(origin: string, chamber: 'house' | 'senate'): Promise<FeatureCollection> {
  const path = chamber === 'house' ? HOUSE_GEOJSON_PATH : SENATE_GEOJSON_PATH;
  const key = `${origin}|${chamber}`;
  let cached = fcCache.get(key);
  if (!cached) {
    cached = fetch(`${origin}${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`geojson ${res.status}`);
        return res.json() as Promise<FeatureCollection>;
      })
      .catch((err) => {
        fcCache.delete(key); // allow retry on next request
        throw err;
      });
    fcCache.set(key, cached);
  }
  return cached;
}

function perpendicularDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Douglas–Peucker simplification (iterative, avoids deep recursion on large rings). */
function simplifyRing(points: Ring, tolerance: number): Ring {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i]!, points[start]!, points[end]!);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function round(ring: Ring): Ring {
  return ring.map(([lng, lat]) => [Math.round(lng * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4]);
}

/** Outer rings only (drop holes) — fine for a thumbnail and keeps the URL small. */
function outerRings(geometry: Geometry): Ring[] {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0] as Ring];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((poly) => poly[0] as Ring);
  return [];
}

function closeRing(ring: Ring): Ring {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) return [...ring, first];
  return ring;
}

function buildOverlayGeometry(rings: Ring[], tolerance: number): Geometry {
  const simplified = rings
    .map((r) => closeRing(round(simplifyRing(r, tolerance))))
    .filter((r) => r.length >= 4);
  if (simplified.length === 1) {
    return { type: 'Polygon', coordinates: [simplified[0]!] };
  }
  return { type: 'MultiPolygon', coordinates: simplified.map((r) => [r]) };
}

function staticUrlForGeometry(geometry: Geometry, width: number, height: number): string {
  const feature = {
    type: 'Feature' as const,
    properties: { fill: FILL, 'fill-opacity': 0.35, stroke: FILL, 'stroke-width': 2, 'stroke-opacity': 0.9 },
    geometry,
  };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(feature))})`;
  return `https://api.mapbox.com/styles/v1/${STYLE}/static/${overlay}/auto/${width}x${height}@2x?padding=24&access_token=${MAPBOX_TOKEN}`;
}

export async function buildDistrictThumbnailUrl(
  origin: string,
  chamber: 'house' | 'senate',
  district: string,
  size: { width: number; height: number },
): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  const districtName = parseKyDistrictNumber(district);
  if (!districtName) return null;

  const cacheKey = `${chamber}:${districtName}:${size.width}x${size.height}`;
  if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;

  let url: string | null = null;
  try {
    const fc = await loadDistrictFeatureCollection(origin, chamber);
    const feat = fc.features.find((f) => String((f.properties as Record<string, unknown> | null)?.NAME ?? '') === districtName);
    if (feat?.geometry) {
      const rings = outerRings(feat.geometry);
      if (rings.length) {
        // Coarsen until the URL fits Mapbox's length cap.
        for (const tolerance of [0.005, 0.01, 0.02, 0.04, 0.08]) {
          const candidate = staticUrlForGeometry(buildOverlayGeometry(rings, tolerance), size.width, size.height);
          url = candidate;
          if (candidate.length <= MAX_URL_LENGTH) break;
        }
      }
    }
  } catch {
    url = null;
  }

  urlCache.set(cacheKey, url);
  return url;
}
