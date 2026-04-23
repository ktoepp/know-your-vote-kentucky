/**
 * Builds a polygon covering "everywhere except Kentucky" (world extent with KY as a hole)
 * for dimming/hiding adjacent states on the district map.
 *
 * Run: npx tsx scripts/build-ky-outside-mask.ts
 * Requires: scripts that produced Census data (uses same shpjs fetch pattern as districts).
 */
import * as fs from 'fs';
import * as path from 'path';
import mask from '@turf/mask';

const OUT_DIR = path.join(process.cwd(), 'public', 'geo');
const STATE_ZIP = 'https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_us_state_500k.zip';
const OUT_FILE = path.join(OUT_DIR, 'ky-outside-mask.geojson');

async function main() {
  (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
  const shp = (await import('shpjs')).default;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  process.stdout.write(`Fetching U.S. states shapefile...\n`);
  const buf = await fetch(STATE_ZIP).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} ${STATE_ZIP}`);
    return r.arrayBuffer();
  });
  const geo = await shp(buf);
  if (!geo || (geo as GeoJSON.FeatureCollection).type !== 'FeatureCollection') {
    throw new Error('Unexpected GeoJSON from state shapefile');
  }
  const fc = geo as GeoJSON.FeatureCollection;
  const ky = fc.features.find((f) => {
    const p = f.properties as Record<string, unknown> | undefined;
    return p?.STUSPS === 'KY' || p?.NAME === 'Kentucky';
  });
  if (!ky || !ky.geometry) {
    throw new Error('Kentucky feature not found in cb_2022_us_state_500k');
  }

  const masked = mask(ky as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
  const out: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [masked],
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out), 'utf8');
  process.stdout.write(
    `Wrote ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
