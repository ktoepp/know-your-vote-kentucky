#!/usr/bin/env npx tsx
/**
 * Pre-generate static district map thumbnails for all KY House (1–100) and Senate (1–38) seats.
 *
 * Writes WebP files to public/geo/district-thumbs/{house|senate}/{district}-{card|profile}.webp
 * using the same Mapbox Static Images URLs as /api/geo/district-thumbnail.
 *
 *   npm run generate:district-thumbnails
 *
 * Re-run after redistricting or when public/geo/*.geojson changes.
 */
import * as fs from 'fs';
import * as path from 'path';
import './load-env';
import { buildDistrictThumbnailUrl } from '../src/lib/ky-district-thumbnail';

const ORIGIN = process.env.DISTRICT_THUMB_ORIGIN ?? 'http://127.0.0.1:3000';
const OUT_ROOT = path.join(process.cwd(), 'public', 'geo', 'district-thumbs');

const SIZES = {
  card: { width: 600, height: 280 },
  profile: { width: 720, height: 420 },
} as const;

const CHAMBERS = [
  { chamber: 'house' as const, max: 100 },
  { chamber: 'senate' as const, max: 38 },
];

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buf);
}

async function main() {
  if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    console.error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required.');
    process.exit(1);
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const { chamber, max } of CHAMBERS) {
    for (let n = 1; n <= max; n++) {
      const district = String(n);
      const districtLabel = chamber === 'house' ? `House District ${n}` : `Senate District ${n}`;

      for (const [sizeKey, size] of Object.entries(SIZES) as [keyof typeof SIZES, (typeof SIZES)[keyof typeof SIZES]][]) {
        const dest = path.join(OUT_ROOT, chamber, `${district}-${sizeKey}.webp`);
        if (fs.existsSync(dest)) {
          skipped++;
          continue;
        }

        const url = await buildDistrictThumbnailUrl(ORIGIN, chamber, districtLabel, size);
        if (!url) {
          console.warn(`No URL for ${chamber} ${district} (${sizeKey})`);
          failed++;
          continue;
        }

        try {
          await downloadToFile(url, dest);
          ok++;
          process.stdout.write(`Wrote ${path.relative(process.cwd(), dest)}\n`);
        } catch (e) {
          failed++;
          console.warn(`Failed ${chamber} ${district} (${sizeKey}):`, e);
        }
      }
    }
  }

  console.log(`Done — wrote ${ok}, skipped ${skipped} existing, failed ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
