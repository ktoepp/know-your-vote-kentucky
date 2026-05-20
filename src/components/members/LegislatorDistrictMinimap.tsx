'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import MapGL, { Layer, Source, type MapRef } from 'react-map-gl/mapbox';
import bbox from '@turf/bbox';
import type { FeatureCollection } from 'geojson';
import { Box, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';
import {
  DISTRICT_LABEL,
  HOUSE_FILL,
  HOUSE_OUTLINE,
  OUTSIDE_KY_MASK_FILL,
  SENATE_FILL,
  SENATE_OUTLINE,
} from '@/components/members/district-map-tokens';
import { KY_DISTRICT_MAPBOX_STYLE } from '@/lib/ky-district-mapbox-style';

import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const HOUSE_GEOJSON_URL = '/geo/ky-sldl.geojson';
const SENATE_GEOJSON_URL = '/geo/ky-sldu.geojson';
const OUTSIDE_KY_MASK_URL = '/geo/ky-outside-mask.geojson';

const KY_BOUNDS: [[number, number], [number, number]] = [
  [-89.9, 36.4],
  [-81.45, 39.35],
];

export type LegislatorDistrictMinimapSize = 'card' | 'profile';

const HEIGHT: Record<LegislatorDistrictMinimapSize, number> = {
  card: 120,
  profile: 200,
};

export interface LegislatorDistrictMinimapProps {
  leg: Pick<KYLegislator, 'chamber' | 'district' | 'name'>;
  size?: LegislatorDistrictMinimapSize;
}

function districtCensusName(leg: Pick<KYLegislator, 'chamber' | 'district'>): string | null {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return null;
  return parseKyDistrictNumber(leg.district);
}

export function LegislatorDistrictMinimap({ leg, size = 'card' }: LegislatorDistrictMinimapProps) {
  const mapRef = useRef<MapRef>(null);
  const districtName = districtCensusName(leg);
  const chamber = leg.chamber === 'house' || leg.chamber === 'senate' ? leg.chamber : null;

  const [houseFc, setHouseFc] = React.useState<FeatureCollection | null>(null);
  const [senateFc, setSenateFc] = React.useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = React.useState(false);

  useEffect(() => {
    if (!chamber || !districtName || !MAPBOX_TOKEN) return;
    let cancelled = false;
    (async () => {
      try {
        const url = chamber === 'house' ? HOUSE_GEOJSON_URL : SENATE_GEOJSON_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error('geo');
        const fc = (await res.json()) as FeatureCollection;
        if (!cancelled) {
          if (chamber === 'house') setHouseFc(fc);
          else setSenateFc(fc);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chamber, districtName]);

  const activeFc = chamber === 'house' ? houseFc : senateFc;
  const highlightFill = chamber === 'senate' ? SENATE_FILL : HOUSE_FILL;
  const highlightOutline = chamber === 'senate' ? SENATE_OUTLINE : HOUSE_OUTLINE;
  const dimFill = chamber === 'senate' ? HOUSE_FILL : SENATE_FILL;
  const sourceId = chamber === 'house' ? 'minimap-sldl' : 'minimap-sldu';

  const districtLabel = formatKyLegislatorDistrict(leg) || 'district';
  const ariaLabel = `Map highlighting ${districtLabel} in Kentucky`;

  const fitDistrict = useMemo(() => {
    if (!activeFc || !districtName) return null;
    const feat = activeFc.features.find((f) => {
      const name = (f.properties as Record<string, unknown> | null)?.NAME;
      return String(name ?? '') === districtName;
    });
    if (!feat) return null;
    try {
      const b = bbox(feat);
      return b as [number, number, number, number];
    } catch {
      return null;
    }
  }, [activeFc, districtName]);

  useEffect(() => {
    if (!fitDistrict || !mapRef.current) return;
    const map = mapRef.current.getMap();
    map.fitBounds(
      [
        [fitDistrict[0], fitDistrict[1]],
        [fitDistrict[2], fitDistrict[3]],
      ],
      { padding: 28, duration: 0, maxZoom: 11 },
    );
  }, [fitDistrict]);

  if (!chamber || !districtName) return null;

  if (!MAPBOX_TOKEN || loadError) {
    return (
      <Box
        role="img"
        aria-label={ariaLabel}
        sx={{
          height: HEIGHT[size],
          borderRadius: 2,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary" textAlign="center">
          District map unavailable
        </Typography>
      </Box>
    );
  }

  const geoUrl = chamber === 'house' ? HOUSE_GEOJSON_URL : SENATE_GEOJSON_URL;

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      sx={{
        height: HEIGHT[size],
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        pointerEvents: 'none',
        '& .mapboxgl-ctrl-bottom-left, & .mapboxgl-ctrl-bottom-right, & .mapboxgl-ctrl-top-right': {
          display: 'none',
        },
      }}
    >
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ bounds: KY_BOUNDS, fitBoundsOptions: { padding: 12 } }}
        mapStyle={KY_DISTRICT_MAPBOX_STYLE}
        maxBounds={KY_BOUNDS}
        style={{ width: '100%', height: '100%' }}
        interactive={false}
        attributionControl={false}
      >
        <Source id="minimap-mask" type="geojson" data={OUTSIDE_KY_MASK_URL}>
          <Layer
            id="minimap-mask-fill"
            type="fill"
            paint={{ 'fill-color': OUTSIDE_KY_MASK_FILL, 'fill-opacity': 1 }}
          />
        </Source>
        <Source id={sourceId} type="geojson" data={geoUrl}>
          <Layer
            id={`${sourceId}-dim`}
            type="fill"
            paint={{
              'fill-color': dimFill,
              'fill-opacity': 0.35,
            }}
          />
          <Layer
            id={`${sourceId}-highlight`}
            type="fill"
            paint={{
              'fill-color': highlightFill,
              'fill-opacity': [
                'case',
                ['==', ['to-string', ['get', 'NAME']], districtName],
                0.95,
                0,
              ],
            }}
          />
          <Layer
            id={`${sourceId}-outline-dim`}
            type="line"
            paint={{
              'line-color': highlightOutline,
              'line-width': 0.75,
              'line-opacity': 0.35,
            }}
          />
          <Layer
            id={`${sourceId}-outline-hi`}
            type="line"
            paint={{
              'line-color': highlightOutline,
              'line-width': [
                'case',
                ['==', ['to-string', ['get', 'NAME']], districtName],
                2.5,
                0,
              ],
            }}
          />
        </Source>
      </MapGL>
    </Box>
  );
}
