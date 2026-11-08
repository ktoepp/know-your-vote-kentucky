#!/usr/bin/env npx tsx
/**
 * Project the Kentucky House and Senate district GeoJSON into compact SVG path strings
 * for server-rendered maps (no Mapbox, no client JS).
 *
 *   npm run build:district-map-svg
 *
 * Writes src/lib/generated/ky-district-map-svg.ts: one statewide frame plus a Louisville
 * (Jefferson County) inset, where most urban districts are too small to read at state
 * scale. Re-run after public/geo/ky-sldl.geojson or ky-sldu.geojson changes.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src', 'lib', 'generated', 'ky-district-map-svg.ts');

const STATE_WIDTH = 1000;
const PAD = 8;
/** Douglas–Peucker tolerance in output units. ~1 unit ≈ 0.6 km at state scale. */
const STATE_TOLERANCE = 1.2;
const INSET_TOLERANCE = 0.8;
/** Jefferson County, KY, approximately; the inset frame is padded around it. */
const LOUISVILLE_BOUNDS = { minLon: -85.95, maxLon: -85.4, minLat: 37.99, maxLat: 38.39 };
const INSET_WIDTH = 230;

type Chamber = 'house' | 'senate';
type Ring = Position[];
type Projector = (p: Position) => [number, number];

function readChamber(file: string): Map<number, Ring[][]> {
  const fc = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'geo', file), 'utf8')) as FeatureCollection<
    Polygon | MultiPolygon
  >;
  const out = new Map<number, Ring[][]>();
  for (const f of fc.features as Feature<Polygon | MultiPolygon>[]) {
    const district = Number(String(f.properties?.NAME ?? '').trim());
    if (!Number.isInteger(district) || district < 1) throw new Error(`bad district NAME in ${file}`);
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    out.set(district, polys as Ring[][]);
  }
  return out;
}

function bounds(chambers: Map<number, Ring[][]>[]) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const m of chambers)
    for (const polys of m.values())
      for (const poly of polys)
        for (const [lon, lat] of poly[0]) {
          minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        }
  return { minLon, maxLon, minLat, maxLat };
}

/** Equirectangular with cos(mid-latitude) x-scaling: indistinguishable from a conic at this size. */
function makeProjector(b: { minLon: number; maxLon: number; minLat: number; maxLat: number }, width: number, pad: number) {
  const k = Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180);
  const scale = (width - 2 * pad) / ((b.maxLon - b.minLon) * k);
  const height = Math.round((b.maxLat - b.minLat) * scale + 2 * pad);
  const project: Projector = ([lon, lat]) => [pad + (lon - b.minLon) * k * scale, pad + (b.maxLat - lat) * scale];
  return { project, height };
}

function perpDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(pts: [number, number][], tol: number): [number, number][] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Absolute first point, then relative `l` steps at 0.1-unit precision. */
function ringToPath(ring: Ring, project: Projector, tol: number): string {
  const pts = simplify(ring.map(project), tol).map(([x, y]) => [r1(x), r1(y)] as [number, number]);
  if (pts.length < 4) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}l`;
  for (let i = 1; i < pts.length - 1; i++) {
    const dx = r1(pts[i][0] - pts[i - 1][0]);
    const dy = r1(pts[i][1] - pts[i - 1][1]);
    if (dx === 0 && dy === 0) continue;
    d += `${dx}${dy < 0 ? '' : ' '}${dy} `;
  }
  return d.trimEnd() + 'z';
}

function polygonsToPath(polys: Ring[][], project: Projector, tol: number): string {
  return polys.flatMap((poly) => poly.map((ring) => ringToPath(ring, project, tol))).join('');
}

/** Area-weighted centroid of the largest outer ring — good enough for a label anchor. */
function labelPoint(polys: Ring[][], project: Projector): [number, number] {
  let best: [number, number] = [0, 0], bestArea = -1;
  for (const poly of polys) {
    const pts = poly[0].map(project);
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const cross = pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
      a += cross; cx += (pts[i][0] + pts[i + 1][0]) * cross; cy += (pts[i][1] + pts[i + 1][1]) * cross;
    }
    if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = [r1(cx / (3 * a)), r1(cy / (3 * a))]; }
  }
  return best;
}

function bbox(polys: Ring[][], project: Projector): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of polys)
    for (const p of poly[0]) {
      const [x, y] = project(p);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  return [r1(x0), r1(y0), r1(x1), r1(y1)];
}

function intersects(polys: Ring[][], b: typeof LOUISVILLE_BOUNDS): boolean {
  return polys.some((poly) => poly[0].some(([lon, lat]) => lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat));
}

function main() {
  const chambers: Record<Chamber, Map<number, Ring[][]>> = {
    house: readChamber('ky-sldl.geojson'),
    senate: readChamber('ky-sldu.geojson'),
  };
  const state = makeProjector(bounds([chambers.house, chambers.senate]), STATE_WIDTH, PAD);
  const insetProj = makeProjector(LOUISVILLE_BOUNDS, INSET_WIDTH, 0);
  const [fx0, fy0] = state.project([LOUISVILLE_BOUNDS.minLon, LOUISVILLE_BOUNDS.maxLat]);
  const [fx1, fy1] = state.project([LOUISVILLE_BOUNDS.maxLon, LOUISVILLE_BOUNDS.minLat]);

  const out: Record<string, unknown> = {
    width: STATE_WIDTH,
    height: state.height,
    louisvilleFrame: { x: r1(fx0), y: r1(fy0), width: r1(fx1 - fx0), height: r1(fy1 - fy0) },
    insetSize: { width: INSET_WIDTH, height: insetProj.height },
  };
  for (const chamber of ['house', 'senate'] as Chamber[]) {
    type Shape = { d: string; label: [number, number]; bbox: [number, number, number, number] };
    const districts: Record<number, Shape> = {};
    const inset: Record<number, Shape> = {};
    for (const [n, polys] of [...chambers[chamber].entries()].sort((a, b) => a[0] - b[0])) {
      districts[n] = {
        d: polygonsToPath(polys, state.project, STATE_TOLERANCE),
        label: labelPoint(polys, state.project),
        bbox: bbox(polys, state.project),
      };
      if (intersects(polys, LOUISVILLE_BOUNDS)) {
        inset[n] = {
          d: polygonsToPath(polys, insetProj.project, INSET_TOLERANCE),
          label: labelPoint(polys, insetProj.project),
          bbox: bbox(polys, insetProj.project),
        };
      }
    }
    out[chamber] = { districts, inset };
  }

  const body =
    `// GENERATED by scripts/build-district-map-svg.ts from public/geo/ky-sld{l,u}.geojson — do not edit.\n` +
    `// Re-run \`npm run build:district-map-svg\` after the district GeoJSON changes.\n\n` +
    `export interface KyDistrictShape {\n  d: string;\n  /** Label anchor: centroid of the largest polygon. */\n  label: [number, number];\n  /** [minX, minY, maxX, maxY] in the same frame. */\n  bbox: [number, number, number, number];\n}\n` +
    `export interface KyChamberMapShapes { districts: Record<number, KyDistrictShape>; inset: Record<number, KyDistrictShape> }\n\n` +
    `export const KY_DISTRICT_MAP_SVG: {\n  width: number;\n  height: number;\n` +
    `  louisvilleFrame: { x: number; y: number; width: number; height: number };\n` +
    `  insetSize: { width: number; height: number };\n  house: KyChamberMapShapes;\n  senate: KyChamberMapShapes;\n} = ` +
    JSON.stringify(out) +
    ';\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body);
  const counts = (['house', 'senate'] as Chamber[]).map(
    (c) => `${c}: ${Object.keys((out[c] as { districts: object }).districts).length} districts, ${Object.keys((out[c] as { inset: object }).inset).length} in inset`,
  );
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${(body.length / 1024).toFixed(1)} KB) — ${counts.join('; ')}`);
}

main();
