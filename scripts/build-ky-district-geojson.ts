/**
 * Downloads Census 2022 cartographic boundary shapefiles for KY state legislative
 * districts and writes simplified GeoJSON to public/geo/ for the district map.
 *
 * Run: npx tsx scripts/build-ky-district-geojson.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(process.cwd(), 'public', 'geo');

const SOURCES = [
  {
    id: 'ky-sldl',
    url: 'https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_21_sldl_500k.zip',
  },
  {
    id: 'ky-sldu',
    url: 'https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_21_sldu_500k.zip',
  },
] as const;

async function fetchZipWithRetry(url: string, label: string, maxAttempts = 5): Promise<ArrayBuffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
      return await r.arrayBuffer();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        const ms = 2000 * attempt;
        process.stdout.write(`${label}: attempt ${attempt} failed (${e}), retry in ${ms}ms...\n`);
        await new Promise((res) => setTimeout(res, ms));
      }
    }
  }
  throw lastErr;
}

async function main() {
  (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
  const shp = (await import('shpjs')).default;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const src of SOURCES) {
    process.stdout.write(`Fetching ${src.id}...\n`);
    const buf = await fetchZipWithRetry(src.url, src.id);
    const geo = await shp(buf);
    if (!geo || (geo as GeoJSON.FeatureCollection).type !== 'FeatureCollection') {
      throw new Error(`Unexpected GeoJSON for ${src.id}`);
    }
    const fc = geo as GeoJSON.FeatureCollection;
    const out = path.join(OUT_DIR, `${src.id}.geojson`);
    fs.writeFileSync(out, JSON.stringify(fc), 'utf8');
    process.stdout.write(`Wrote ${out} (${fc.features?.length ?? 0} features, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
