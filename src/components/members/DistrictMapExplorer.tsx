'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from 'react-map-gl/mapbox';
import mapboxgl, { type MapMouseEvent } from 'mapbox-gl';
import bbox from '@turf/bbox';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { MapPin } from 'lucide-react';
import type { Feature, FeatureCollection } from 'geojson';
import type { KYLegislator } from '@/types/kentucky';
import { supabase } from '@/app/lib/supabaseClient';
import { withTimeout } from '@/lib/async-utils';
import {
  districtNameFromCensusFeature,
  findDistrictFeatureAtPoint,
  parseKyDistrictNumber,
} from '@/lib/ky-district-geo';
import { MemberCard } from '@/components/members/MemberCard';
import { dedupeKyLegislators, memberProfilePath } from '@/lib/ky-member-utils';
import {
  DistrictMapMemberTooltip,
  type DistrictMapTooltipModel,
} from '@/components/members/DistrictMapMemberTooltip';
import {
  DISTRICT_LABEL,
  HOUSE_FILL,
  HOUSE_HOVER_OVERLAY,
  HOUSE_OUTLINE,
  MAP_MARKER_PIN,
  OUTSIDE_KY_MASK_FILL,
  SENATE_FILL,
  SENATE_HOVER_OVERLAY,
  SENATE_OUTLINE,
} from '@/components/members/district-map-tokens';
import { KY_DISTRICT_MAPBOX_STYLE } from '@/lib/ky-district-mapbox-style';
import { mapboxGeocodeAddress } from '@/lib/mapbox-geocode';

import 'mapbox-gl/dist/mapbox-gl.css';

const SL_SOURCE_HOUSE = 'ky-sldl';
const SL_SOURCE_SENATE = 'ky-sldu';

/** Served from `public/geo/`; same paths are fetched below for point-in-polygon lookups. */
const HOUSE_GEOJSON_URL = '/geo/ky-sldl.geojson';
const SENATE_GEOJSON_URL = '/geo/ky-sldu.geojson';
/** World-with-hole polygon from Census state outline + @turf/mask (see scripts/build-ky-outside-mask.ts). */
const OUTSIDE_KY_MASK_URL = '/geo/ky-outside-mask.geojson';

const SL_MASK = 'ky-outside-mask';

/** House/Senate colors, mask, marker pin — edit `district-map-tokens.ts`. */

/** Panning limits (Kentucky + small margin). */
const KY_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-89.9, 36.4],
  [-81.45, 39.35],
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

function districtSummaryLine(chamber: 'house' | 'senate', nameFromCensus: string | null): string {
  if (!nameFromCensus) return chamber === 'house' ? 'State House district' : 'State Senate district';
  return chamber === 'house' ? `House District ${nameFromCensus}` : `Senate District ${nameFromCensus}`;
}

function tooltipModelFromFeatures(
  houseFeat: Feature | undefined,
  senateFeat: Feature | undefined,
  houseByDistrict: Map<string, KYLegislator>,
  senateByDistrict: Map<string, KYLegislator>,
): DistrictMapTooltipModel | null {
  const sections: DistrictMapTooltipModel['sections'] = [];

  const hName = houseFeat ? districtNameFromCensusFeature(houseFeat) : null;
  const sName = senateFeat ? districtNameFromCensusFeature(senateFeat) : null;

  if (houseFeat) {
    const k = parseKyDistrictNumber(hName);
    const leg = k ? houseByDistrict.get(k) ?? null : null;
    sections.push({
      chamberLabel: 'House',
      districtSummary: districtSummaryLine('house', hName),
      leg,
    });
  }
  if (senateFeat) {
    const k = parseKyDistrictNumber(sName);
    const leg = k ? senateByDistrict.get(k) ?? null : null;
    sections.push({
      chamberLabel: 'Senate',
      districtSummary: districtSummaryLine('senate', sName),
      leg,
    });
  }

  if (sections.length === 0) return null;
  return { sections };
}

function featureGeoid(f: Feature | undefined): string | undefined {
  if (!f?.properties) return undefined;
  const g = (f.properties as Record<string, unknown>).GEOID;
  if (g == null) return undefined;
  return String(g);
}

export default function DistrictMapExplorer() {
  const mapRef = useRef<MapRef>(null);
  const hoverHouseGeoidRef = useRef<string | null>(null);
  const hoverSenateGeoidRef = useRef<string | null>(null);
  const [legislators, setLegislators] = useState<KYLegislator[]>([]);
  const [legLoading, setLegLoading] = useState(true);
  const [legError, setLegError] = useState<string | null>(null);

  const [houseFc, setHouseFc] = useState<FeatureCollection | null>(null);
  const [senateFc, setSenateFc] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  /**
   * Exactly one chamber’s district fill is shown at a time (House or Senate), so the map
   * always has one active boundary layer.
   */
  const [visibleChamber, setVisibleChamber] = useState<'house' | 'senate'>('house');
  const showHouseLayer = visibleChamber === 'house';
  const showSenateLayer = visibleChamber === 'senate';

  const [selectedHouseName, setSelectedHouseName] = useState<string | null>(null);
  const [selectedSenateName, setSelectedSenateName] = useState<string | null>(null);

  const [marker, setMarker] = useState<{ lng: number; lat: number } | null>(null);
  const [zipInput, setZipInput] = useState('');
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  /** Last ZIP used for search (centroid geocode); cleared when picking a point on the map instead. */
  const [zipResolvedLabel, setZipResolvedLabel] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressResolvedLabel, setAddressResolvedLabel] = useState<string | null>(null);

  const [hoverPopup, setHoverPopup] = useState<{
    lng: number;
    lat: number;
    model: DistrictMapTooltipModel;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setLegLoading(false);
        return;
      }
      setLegError(null);
      try {
        const { data, error } = await withTimeout(
          supabase.from('ky_legislators').select('*').eq('active', true),
          30_000,
          'Loading legislators timed out.',
        );
        if (error) throw error;
        if (!cancelled) setLegislators(dedupeKyLegislators(data || []));
      } catch (e) {
        if (!cancelled) setLegError(e instanceof Error ? e.message : 'Failed to load legislators');
      } finally {
        if (!cancelled) setLegLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGeoError(null);
      setGeoLoading(true);
      try {
        const [h, s] = await Promise.all([
          fetch('/geo/ky-sldl.geojson').then((r) => {
            if (!r.ok) throw new Error('Could not load House district boundaries.');
            return r.json() as Promise<FeatureCollection>;
          }),
          fetch('/geo/ky-sldu.geojson').then((r) => {
            if (!r.ok) throw new Error('Could not load Senate district boundaries.');
            return r.json() as Promise<FeatureCollection>;
          }),
        ]);
        if (!cancelled) {
          setHouseFc(h);
          setSenateFc(s);
        }
      } catch (e) {
        if (!cancelled) setGeoError(e instanceof Error ? e.message : 'Failed to load map data');
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const houseByDistrict = useMemo(() => {
    const m = new Map<string, KYLegislator>();
    for (const leg of legislators) {
      if (leg.chamber !== 'house') continue;
      const k = parseKyDistrictNumber(leg.district);
      if (k) m.set(k, leg);
    }
    return m;
  }, [legislators]);

  const senateByDistrict = useMemo(() => {
    const m = new Map<string, KYLegislator>();
    for (const leg of legislators) {
      if (leg.chamber !== 'senate') continue;
      const k = parseKyDistrictNumber(leg.district);
      if (k) m.set(k, leg);
    }
    return m;
  }, [legislators]);

  /** Aligns Census NAME (e.g. "19") with roster `district` (e.g. "House District 19"). */
  const selectedHouseDistrictKey = useMemo(
    () => parseKyDistrictNumber(selectedHouseName),
    [selectedHouseName],
  );
  const selectedSenateDistrictKey = useMemo(
    () => parseKyDistrictNumber(selectedSenateName),
    [selectedSenateName],
  );

  const selectedHouseLeg = selectedHouseDistrictKey
    ? houseByDistrict.get(selectedHouseDistrictKey)
    : undefined;
  const selectedSenateLeg = selectedSenateDistrictKey
    ? senateByDistrict.get(selectedSenateDistrictKey)
    : undefined;

  const fitToKy = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !houseFc) return;
    try {
      const b = bbox(houseFc);
      map.fitBounds(
        [
          [b[0], b[1]],
          [b[2], b[3]],
        ],
        { padding: 56, duration: 600, maxZoom: 10 },
      );
    } catch {
      /* ignore */
    }
  }, [houseFc]);

  useEffect(() => {
    if (!houseFc || geoLoading) return;
    const t = window.setTimeout(fitToKy, 100);
    return () => window.clearTimeout(t);
  }, [houseFc, geoLoading, fitToKy]);

  const resolvePoint = useCallback(
    (lng: number, lat: number) => {
      if (!houseFc || !senateFc) return;
      const hf = findDistrictFeatureAtPoint(houseFc, lng, lat);
      const sf = findDistrictFeatureAtPoint(senateFc, lng, lat);
      setSelectedHouseName(districtNameFromCensusFeature(hf));
      setSelectedSenateName(districtNameFromCensusFeature(sf));
    },
    [houseFc, senateFc],
  );

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      const { lngLat } = e;
      if (!lngLat) return;
      setZipResolvedLabel(null);
      setAddressResolvedLabel(null);
      setAddressError(null);
      resolvePoint(lngLat.lng, lngLat.lat);
      setMarker({ lng: lngLat.lng, lat: lngLat.lat });
    },
    [resolvePoint],
  );

  const onZipSearch = useCallback(async () => {
    const z = zipInput.replace(/\D/g, '').slice(0, 5);
    setZipInput(z);
    setZipError(null);
    if (z.length !== 5) {
      setZipError('Enter a 5-digit ZIP code.');
      return;
    }
    setZipLoading(true);
    setAddressResolvedLabel(null);
    setAddressError(null);
    try {
      const res = await fetch(`/api/geo/zip?zip=${encodeURIComponent(z)}`);
      const data = (await res.json()) as { error?: string; lat?: number; lng?: number };
      if (!res.ok) {
        setZipError(data.error || 'Search failed.');
        return;
      }
      if (data.lat == null || data.lng == null) {
        setZipError('Unexpected response.');
        return;
      }
      setZipResolvedLabel(z);
      setAddressInput('');
      setMarker({ lng: data.lng, lat: data.lat });
      resolvePoint(data.lng, data.lat);
      const map = mapRef.current?.getMap();
      if (map) {
        map.easeTo({ center: [data.lng, data.lat], zoom: 10.5, duration: 900 });
      }
    } catch {
      setZipError('Search failed.');
    } finally {
      setZipLoading(false);
    }
  }, [zipInput, resolvePoint]);

  const onAddressSearch = useCallback(async () => {
    const q = addressInput.trim();
    setAddressError(null);
    if (q.length < 8) {
      setAddressError('Enter a fuller street address (for example, number, street, city, and state).');
      return;
    }
    if (!MAPBOX_TOKEN) {
      setAddressError('Add a Mapbox access token in .env.local to use address search.');
      return;
    }
    setAddressLoading(true);
    setZipError(null);
    setZipResolvedLabel(null);
    try {
      const g = await mapboxGeocodeAddress(q, MAPBOX_TOKEN);
      if (!g) {
        setAddressError('No location found. Try including city and state (e.g. … Frankfort, KY 40601).');
        return;
      }
      setAddressResolvedLabel(g.placeName);
      setMarker({ lng: g.lng, lat: g.lat });
      resolvePoint(g.lng, g.lat);
      const map = mapRef.current?.getMap();
      if (map) {
        map.easeTo({ center: [g.lng, g.lat], zoom: 11, duration: 900 });
      }
    } catch {
      setAddressError('Address search failed. Try again or use ZIP search.');
    } finally {
      setAddressLoading(false);
    }
  }, [addressInput, resolvePoint]);

  const clearHoverFeatureState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (hoverHouseGeoidRef.current) {
      try {
        map.setFeatureState({ source: SL_SOURCE_HOUSE, id: hoverHouseGeoidRef.current }, { hover: false });
      } catch {
        /* ignore */
      }
      hoverHouseGeoidRef.current = null;
    }
    if (hoverSenateGeoidRef.current) {
      try {
        map.setFeatureState({ source: SL_SOURCE_SENATE, id: hoverSenateGeoidRef.current }, { hover: false });
      } catch {
        /* ignore */
      }
      hoverSenateGeoidRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearHoverFeatureState();
  }, [visibleChamber, clearHoverFeatureState]);

  const onMouseMove = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const layers: string[] = [];
      if (showHouseLayer) layers.push(`${SL_SOURCE_HOUSE}-fill`);
      if (showSenateLayer) layers.push(`${SL_SOURCE_SENATE}-fill`);
      if (layers.length === 0) {
        clearHoverFeatureState();
        map.getCanvas().style.cursor = '';
        setHoverPopup(null);
        return;
      }
      const feats = map.queryRenderedFeatures(e.point, { layers });
      const hasHit = feats.length > 0;
      map.getCanvas().style.cursor = hasHit ? 'pointer' : '';

      if (!hasHit) {
        clearHoverFeatureState();
        setHoverPopup(null);
        return;
      }

      const houseFeat = feats.find((f) => f.layer?.id === `${SL_SOURCE_HOUSE}-fill`) as Feature | undefined;
      const senateFeat = feats.find((f) => f.layer?.id === `${SL_SOURCE_SENATE}-fill`) as Feature | undefined;
      if (!houseFeat && !senateFeat) {
        clearHoverFeatureState();
        setHoverPopup(null);
        return;
      }

      const newHouseId = showHouseLayer ? featureGeoid(houseFeat) : undefined;
      const newSenateId = showSenateLayer ? featureGeoid(senateFeat) : undefined;

      if (hoverHouseGeoidRef.current !== newHouseId) {
        if (hoverHouseGeoidRef.current) {
          try {
            map.setFeatureState({ source: SL_SOURCE_HOUSE, id: hoverHouseGeoidRef.current }, { hover: false });
          } catch {
            /* ignore */
          }
        }
        hoverHouseGeoidRef.current = null;
        if (newHouseId) {
          try {
            map.setFeatureState({ source: SL_SOURCE_HOUSE, id: newHouseId }, { hover: true });
            hoverHouseGeoidRef.current = newHouseId;
          } catch {
            /* ignore */
          }
        }
      }

      if (hoverSenateGeoidRef.current !== newSenateId) {
        if (hoverSenateGeoidRef.current) {
          try {
            map.setFeatureState({ source: SL_SOURCE_SENATE, id: hoverSenateGeoidRef.current }, { hover: false });
          } catch {
            /* ignore */
          }
        }
        hoverSenateGeoidRef.current = null;
        if (newSenateId) {
          try {
            map.setFeatureState({ source: SL_SOURCE_SENATE, id: newSenateId }, { hover: true });
            hoverSenateGeoidRef.current = newSenateId;
          } catch {
            /* ignore */
          }
        }
      }

      const model = tooltipModelFromFeatures(houseFeat, senateFeat, houseByDistrict, senateByDistrict);
      if (!model) {
        setHoverPopup(null);
        return;
      }
      const { lng, lat } = e.lngLat;
      setHoverPopup({ lng, lat, model });
    },
    [showHouseLayer, showSenateLayer, houseByDistrict, senateByDistrict, clearHoverFeatureState],
  );

  const busy = legLoading || geoLoading;
  const mapReady = Boolean(houseFc && senateFc && !geoError && MAPBOX_TOKEN);

  return (
    <Stack spacing={2}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            District boundaries are from U.S. Census 2022 cartographic files (state House and Senate districts). ZIP
            search uses the center of the postal area; districts can cross county lines. Click the map to pick a
            location. Basemap is Mapbox Light (Mapbox, OpenStreetMap, and other sources).
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              size="small"
              label="ZIP code"
              placeholder="40202"
              value={zipInput}
              onChange={(e) => {
                setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5));
                setZipError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onZipSearch();
              }}
              sx={{ minWidth: 140, maxWidth: 200 }}
              disabled={zipLoading || !mapReady}
            />
            <Button variant="contained" onClick={() => void onZipSearch()} disabled={zipLoading || !mapReady}>
              {zipLoading ? <CircularProgress size={20} color="inherit" /> : 'Find on map'}
            </Button>
            <Button variant="outlined" onClick={fitToKy} disabled={!mapReady}>
              Fit Kentucky
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap alignItems={{ sm: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              label="Street address"
              placeholder="e.g. 100 Capitol Ave, Frankfort, KY 40601"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                setAddressError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onAddressSearch();
              }}
              disabled={addressLoading || !mapReady}
              helperText="Street-level geocoding — more precise than ZIP for district boundaries."
            />
            <Button
              variant="outlined"
              onClick={() => void onAddressSearch()}
              disabled={addressLoading || !mapReady || !MAPBOX_TOKEN}
              sx={{ flexShrink: 0, minWidth: 140, mt: { sm: 0.5 } }}
            >
              {addressLoading ? <CircularProgress size={20} color="inherit" /> : 'Find address'}
            </Button>
          </Stack>
          {zipError && (
            <Alert severity="warning" onClose={() => setZipError(null)}>
              {zipError}
            </Alert>
          )}
          {addressError && (
            <Alert severity="warning" onClose={() => setAddressError(null)}>
              {addressError}
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary" component="span">
              District layer
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={visibleChamber}
              onChange={(_e, v: 'house' | 'senate' | null) => {
                if (v != null) setVisibleChamber(v);
              }}
              size="small"
              disabled={!mapReady}
              aria-label="Which district boundaries to show on the map"
            >
              <ToggleButton value="house">House</ToggleButton>
              <ToggleButton value="senate">Senate</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {!MAPBOX_TOKEN && !busy && (
        <Alert severity="warning">
          Add <code style={{ fontSize: '0.85em' }}>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to{' '}
          <code style={{ fontSize: '0.85em' }}>.env.local</code> (a public token from{' '}
          <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
            mapbox.com
          </a>
          ) to load the district map.
        </Alert>
      )}

      {(legError || geoError) && (
        <Alert severity="error">
          {legError || geoError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            height: { xs: 420, md: 560 },
            border: 1,
            borderColor: 'divider',
          }}
        >
          {busy && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.7)',
                zIndex: 2,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {mapReady && (
            <Box
              sx={{ width: '100%', height: '100%', minHeight: 0 }}
              onMouseLeave={() => {
                clearHoverFeatureState();
                setHoverPopup(null);
              }}
            >
            <MapGL
              ref={mapRef}
              mapLib={mapboxgl}
              mapboxAccessToken={MAPBOX_TOKEN}
              projection="mercator"
              maxBounds={KY_MAX_BOUNDS}
              initialViewState={{
                longitude: -84.87,
                latitude: 37.35,
                zoom: 6,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={KY_DISTRICT_MAPBOX_STYLE}
              onLoad={() => {
                requestAnimationFrame(() => mapRef.current?.getMap()?.resize());
              }}
              onClick={onMapClick}
              onMouseMove={onMouseMove}
              interactiveLayerIds={[
                ...(showHouseLayer ? [`${SL_SOURCE_HOUSE}-fill`] : []),
                ...(showSenateLayer ? [`${SL_SOURCE_SENATE}-fill`] : []),
              ]}
            >
              <NavigationControl position="top-right" showCompass={false} />
              <Source id={SL_MASK} type="geojson" data={OUTSIDE_KY_MASK_URL}>
                <Layer
                  id={`${SL_MASK}-fill`}
                  type="fill"
                  paint={{
                    'fill-color': OUTSIDE_KY_MASK_FILL,
                    'fill-opacity': 1,
                  }}
                />
              </Source>
              <Source id={SL_SOURCE_HOUSE} type="geojson" data={HOUSE_GEOJSON_URL} promoteId="GEOID">
                <Layer
                  id={`${SL_SOURCE_HOUSE}-fill`}
                  type="fill"
                  paint={{
                    'fill-color': [
                      'case',
                      ['boolean', ['feature-state', 'hover'], false],
                      HOUSE_HOVER_OVERLAY,
                      HOUSE_FILL,
                    ],
                    'fill-opacity': 1,
                  }}
                  layout={{ visibility: showHouseLayer ? 'visible' : 'none' }}
                />
                <Layer
                  id={`${SL_SOURCE_HOUSE}-outline`}
                  type="line"
                  paint={{
                    'line-color': HOUSE_OUTLINE,
                    'line-width': [
                      'case',
                      ['==', ['to-string', ['get', 'NAME']], selectedHouseName ?? ''],
                      4,
                      2.5,
                    ],
                    'line-opacity': 1,
                  }}
                  layout={{ visibility: showHouseLayer ? 'visible' : 'none' }}
                />
                <Layer
                  id={`${SL_SOURCE_HOUSE}-labels`}
                  type="symbol"
                  layout={{
                    visibility: showHouseLayer ? 'visible' : 'none',
                    'text-field': ['concat', 'H-', ['to-string', ['get', 'NAME']]],
                    'text-font': DISTRICT_LABEL.font,
                    'text-size': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      5,
                      8,
                      7.5,
                      10,
                      9,
                      11,
                      12,
                      13,
                    ],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-anchor': 'center',
                    'text-padding': 4,
                  }}
                  paint={{
                    'text-color': DISTRICT_LABEL.textColor,
                    'text-halo-color': DISTRICT_LABEL.haloColor,
                    'text-halo-width': DISTRICT_LABEL.haloWidth,
                    'text-halo-blur': DISTRICT_LABEL.haloBlur,
                  }}
                />
              </Source>
              <Source id={SL_SOURCE_SENATE} type="geojson" data={SENATE_GEOJSON_URL} promoteId="GEOID">
                <Layer
                  id={`${SL_SOURCE_SENATE}-fill`}
                  type="fill"
                  paint={{
                    'fill-color': [
                      'case',
                      ['boolean', ['feature-state', 'hover'], false],
                      SENATE_HOVER_OVERLAY,
                      SENATE_FILL,
                    ],
                    'fill-opacity': 1,
                  }}
                  layout={{ visibility: showSenateLayer ? 'visible' : 'none' }}
                />
                <Layer
                  id={`${SL_SOURCE_SENATE}-outline`}
                  type="line"
                  paint={{
                    'line-color': SENATE_OUTLINE,
                    'line-width': [
                      'case',
                      ['==', ['to-string', ['get', 'NAME']], selectedSenateName ?? ''],
                      4,
                      2.5,
                    ],
                    'line-opacity': 1,
                  }}
                  layout={{ visibility: showSenateLayer ? 'visible' : 'none' }}
                />
                <Layer
                  id={`${SL_SOURCE_SENATE}-labels`}
                  type="symbol"
                  layout={{
                    visibility: showSenateLayer ? 'visible' : 'none',
                    'text-field': ['concat', 'S-', ['to-string', ['get', 'NAME']]],
                    'text-font': DISTRICT_LABEL.font,
                    'text-size': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      5,
                      8,
                      7.5,
                      10,
                      9,
                      11,
                      12,
                      13,
                    ],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-anchor': 'center',
                    'text-padding': 4,
                  }}
                  paint={{
                    'text-color': DISTRICT_LABEL.textColor,
                    'text-halo-color': DISTRICT_LABEL.haloColor,
                    'text-halo-width': DISTRICT_LABEL.haloWidth,
                    'text-halo-blur': DISTRICT_LABEL.haloBlur,
                  }}
                />
              </Source>
              {marker && (
                <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
                  <MapPin
                    size={MAP_MARKER_PIN.size}
                    strokeWidth={MAP_MARKER_PIN.strokeWidth}
                    color={MAP_MARKER_PIN.color}
                    fill={MAP_MARKER_PIN.fill}
                    aria-hidden
                  />
                </Marker>
              )}
              {hoverPopup && (
                <Popup
                  longitude={hoverPopup.lng}
                  latitude={hoverPopup.lat}
                  closeButton={false}
                  closeOnClick={false}
                  anchor="bottom"
                  offset={[0, -6]}
                  maxWidth="360px"
                >
                  <DistrictMapMemberTooltip model={hoverPopup.model} />
                </Popup>
              )}
            </MapGL>
            </Box>
          )}
          <Typography
            variant="caption"
            component="div"
            sx={{
              px: 1,
              py: 0.75,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            Basemap © Mapbox © OpenStreetMap and other contributors · District boundaries U.S. Census (2022) · Outside
            Kentucky is covered using a state outline mask (Census).
          </Typography>
        </Paper>

        <Stack spacing={2}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              borderRadius: 2,
              borderLeft: 4,
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="subtitle1" component="div" fontWeight={700} sx={{ mb: 1 }}>
              Two legislators, two districts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Every Kentucky address has <strong>two</strong> state legislators: a House member (one of{' '}
              <strong>100</strong> smaller districts) and a senator (one of <strong>38</strong> larger districts). District
              numbers are not interchangeable — you always have both a House representative and a state senator for this
              address.
            </Typography>
          </Paper>

          <Accordion elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight={700}>
                How to contact your legislators
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" component="ul" sx={{ m: 0, pl: 2.5 }}>
                <li>Call or email the capitol number or address listed in the LRC directory or on your member’s profile page.</li>
                <li>Committee hearing calendars are on the LRC site—anyone can attend or watch a livestream when offered.</li>
                <li>Written committee testimony and bill comments follow each committee’s published rules; check the docket for deadlines.</li>
                <li>For formal letters, mention your address so offices know you are a constituent of that district.</li>
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Selected districts
            </Typography>
            {zipResolvedLabel && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                ZIP {zipResolvedLabel}: districts are from the point geocoded for that postal area (same logic as map
                click).
              </Typography>
            )}
            {addressResolvedLabel && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                <strong>Address</strong> {addressResolvedLabel}: districts are from the geocoded point (Mapbox, biased
                to Kentucky).
              </Typography>
            )}
            {!selectedHouseName && !selectedSenateName && (
              <Typography variant="body2" color="text.secondary">
                Click the map or search by ZIP to see your state House and Senate districts and representatives from our
                roster.
              </Typography>
            )}
            {selectedHouseName && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>House:</strong> District {selectedHouseName}
                {!selectedHouseLeg &&
                  (legislators.length === 0 && !legLoading
                    ? ' — load the legislator roster (Supabase) to see your representative.'
                    : ' — no roster match for this district (check district data in sync).')}
              </Typography>
            )}
            {selectedSenateName && (
              <Typography variant="body2" sx={{ mb: selectedHouseLeg || selectedSenateLeg ? 2 : 0 }}>
                <strong>Senate:</strong> District {selectedSenateName}
                {!selectedSenateLeg &&
                  (legislators.length === 0 && !legLoading
                    ? ' — load the legislator roster (Supabase) to see your senator.'
                    : ' — no roster match for this district (check district data in sync).')}
              </Typography>
            )}
          </Paper>

          {selectedHouseLeg && (
            <MemberCard
              leg={selectedHouseLeg}
              showDistrictInSubtitle={false}
              profileHref={memberProfilePath(selectedHouseLeg)}
            />
          )}
          {selectedSenateLeg && (
            <MemberCard
              leg={selectedSenateLeg}
              showDistrictInSubtitle={false}
              profileHref={memberProfilePath(selectedSenateLeg)}
            />
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
