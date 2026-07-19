'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Skeleton, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';
import { LegislatorDistrictThumbnail } from '@/components/members/LegislatorDistrictThumbnail';

type Ring = [number, number][];

interface LocatorGeometry {
  /** SVG path data for every district in the chamber. */
  allPath: string;
  /** SVG path data for the highlighted district only. */
  targetPath: string;
  viewBox: string;
  /** height / width of the projected extent — drives the reserved aspect-ratio box. */
  aspect: number;
}

/**
 * Module-level cache: both chambers' GeoJSON files are shared with the district map
 * explorer (`/geo/ky-sldl.geojson`, `/geo/ky-sldu.geojson`) and are immutable per deploy,
 * so profile navigations after the first fetch render instantly.
 */
const geojsonCache = new Map<string, Promise<GeoJSON.FeatureCollection>>();

function fetchChamberGeojson(chamber: 'house' | 'senate'): Promise<GeoJSON.FeatureCollection> {
  const url = chamber === 'house' ? '/geo/ky-sldl.geojson' : '/geo/ky-sldu.geojson';
  let p = geojsonCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`district boundaries unavailable (${r.status})`);
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    });
    p.catch(() => geojsonCache.delete(url));
    geojsonCache.set(url, p);
  }
  return p;
}

function featureRings(geometry: GeoJSON.Geometry | null | undefined): Ring[] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates as Ring[];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as Ring[][]).flat();
  return [];
}

/** Normalized district number string ("19") — same format `parseKyDistrictNumber` yields. */
function districtNumberOfFeature(f: GeoJSON.Feature): string | null {
  const name = (f.properties as Record<string, unknown> | null)?.NAME;
  return typeof name === 'string' ? parseKyDistrictNumber(name) : null;
}

/**
 * Equirectangular projection with mid-latitude x-correction — Kentucky spans ~3.3° of
 * latitude, so the flat projection error is well under a pixel at thumbnail sizes.
 */
function buildLocatorGeometry(fc: GeoJSON.FeatureCollection, districtNumber: string): LocatorGeometry | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const f of fc.features) {
    for (const ring of featureRings(f.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;

  const xScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const WIDTH = 1000;
  const scale = WIDTH / ((maxLon - minLon) * xScale);
  const height = (maxLat - minLat) * scale;
  const px = (lon: number) => (lon - minLon) * xScale * scale;
  const py = (lat: number) => (maxLat - lat) * scale;

  const ringToPath = (ring: Ring) => {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      d += `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`;
    }
    return `${d}Z`;
  };

  let allPath = '';
  let targetPath = '';
  for (const f of fc.features) {
    const path = featureRings(f.geometry).map(ringToPath).join('');
    allPath += path;
    if (districtNumberOfFeature(f) === districtNumber) targetPath += path;
  }
  if (!targetPath) return null;
  return { allPath, targetPath, viewBox: `0 0 ${WIDTH} ${Math.ceil(height)}`, aspect: height / WIDTH };
}

export interface KentuckyDistrictLocatorMapProps {
  leg: Pick<KYLegislator, 'chamber' | 'district' | 'name'>;
}

/**
 * Statewide Kentucky map with this member's district highlighted, linking to the
 * interactive district map with the chamber + district preselected. Built from the
 * same committed district GeoJSON the explorer uses — no Mapbox request. Falls back
 * to the static district-zoom thumbnail if the boundaries fail to load.
 */
export function KentuckyDistrictLocatorMap({ leg }: KentuckyDistrictLocatorMapProps) {
  const chamber = leg.chamber === 'house' || leg.chamber === 'senate' ? leg.chamber : null;
  const districtNumber = chamber ? parseKyDistrictNumber(leg.district) : null;
  const [geometry, setGeometry] = React.useState<LocatorGeometry | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!chamber || !districtNumber) return;
    let cancelled = false;
    fetchChamberGeojson(chamber)
      .then((fc) => {
        if (cancelled) return;
        const g = buildLocatorGeometry(fc, districtNumber);
        if (g) setGeometry(g);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chamber, districtNumber]);

  if (!chamber || !districtNumber) return null;
  if (failed) {
    // Same degraded experience the profile had before: static district-zoom image.
    return (
      <Box sx={{ pointerEvents: 'none' }}>
        <LegislatorDistrictThumbnail leg={leg} size="profile" />
      </Box>
    );
  }

  const districtLabel = formatKyLegislatorDistrict(leg) || `District ${districtNumber}`;

  return (
    <Box
      component={Link}
      href={`/members/map?chamber=${chamber}&district=${districtNumber}`}
      aria-label={`Map of Kentucky highlighting ${districtLabel} — open the interactive district map`}
      sx={{
        display: 'block',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      {geometry ? (
        <Box
          component="svg"
          viewBox={geometry.viewBox}
          role="img"
          aria-hidden
          sx={{ display: 'block', width: '100%', height: 'auto', p: 1 }}
        >
          <Box
            component="path"
            d={geometry.allPath}
            sx={{ fill: (t) => t.palette.action.hover, stroke: (t) => t.palette.divider }}
            strokeWidth={1.5}
          />
          <Box
            component="path"
            d={geometry.targetPath}
            sx={{ fill: 'primary.main', stroke: (t) => t.palette.primary.dark }}
            strokeWidth={2}
            fillOpacity={0.85}
          />
        </Box>
      ) : (
        <Skeleton variant="rectangular" sx={{ width: '100%', aspectRatio: '1000 / 460', height: 'auto' }} />
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, pb: 1 }}>
        {districtLabel} — select to explore the district map
      </Typography>
    </Box>
  );
}
