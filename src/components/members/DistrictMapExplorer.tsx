'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MapGL, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from 'react-map-gl/mapbox';
import mapboxgl, { type MapMouseEvent } from 'mapbox-gl';
import bbox from '@turf/bbox';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NextLink from 'next/link';
import { Search as SearchIcon } from '@mui/icons-material';
import { MapPin } from 'lucide-react';
import type { Feature, FeatureCollection } from 'geojson';
import type { KYLegislator } from '@/types/kentucky';
import { useKyMembersBrowseRoster } from '@/lib/use-ky-members-browse-roster';
import { withTimeout } from '@/lib/async-utils';
import {
  districtNameFromCensusFeature,
  findDistrictFeatureAtPoint,
  parseKyDistrictNumber,
} from '@/lib/ky-district-geo';
import { MemberCard } from '@/components/members/MemberCard';
import { memberProfilePath } from '@/lib/ky-member-utils';
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
import { mapboxGeocodeAddress, mapboxGeocodeSuggest, type MapboxGeocodeSuggestion } from '@/lib/mapbox-geocode';

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
  const { roster: legislators, loading: legLoading, error: legError } = useKyMembersBrowseRoster();

  const [houseFc, setHouseFc] = useState<FeatureCollection | null>(null);
  const [senateFc, setSenateFc] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  /**
   * Exactly one chamber's district fill is shown at a time (House or Senate), so the map
   * always has one active boundary layer.
   */
  const [visibleChamber, setVisibleChamber] = useState<'house' | 'senate'>('house');
  const showHouseLayer = visibleChamber === 'house';
  const showSenateLayer = visibleChamber === 'senate';

  const [selectedHouseName, setSelectedHouseName] = useState<string | null>(null);
  const [selectedSenateName, setSelectedSenateName] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [marker, setMarker] = useState<{ lng: number; lat: number } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxGeocodeSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

  const [hoverPopup, setHoverPopup] = useState<{
    lng: number;
    lat: number;
    model: DistrictMapTooltipModel;
  } | null>(null);

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

  const activeLegislators = useMemo(() => legislators.filter((l) => l.active), [legislators]);

  const houseByDistrict = useMemo(() => {
    const m = new Map<string, KYLegislator>();
    for (const leg of activeLegislators) {
      if (leg.chamber !== 'house') continue;
      const k = parseKyDistrictNumber(leg.district);
      if (k) m.set(k, leg);
    }
    return m;
  }, [activeLegislators]);

  const senateByDistrict = useMemo(() => {
    const m = new Map<string, KYLegislator>();
    for (const leg of activeLegislators) {
      if (leg.chamber !== 'senate') continue;
      const k = parseKyDistrictNumber(leg.district);
      if (k) m.set(k, leg);
    }
    return m;
  }, [activeLegislators]);

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
      setResolvedLabel(null);
      setSearchError(null);
      resolvePoint(lngLat.lng, lngLat.lat);
      setMarker({ lng: lngLat.lng, lat: lngLat.lat });
    },
    [resolvePoint],
  );

  const onSearch = useCallback(async (query?: string) => {
    const q = (query ?? searchInput).trim();
    setSearchError(null);
    if (!q) return;
    const isZip = /^\d{5}$/.test(q);
    setSearchLoading(true);
    try {
      if (isZip) {
        const res = await fetch(`/api/geo/zip?zip=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { error?: string; lat?: number; lng?: number };
        if (!res.ok || data.lat == null || data.lng == null) {
          setSearchError(data.error || 'ZIP code not found.');
          return;
        }
        setResolvedLabel(`ZIP ${q}`);
        setMarker({ lng: data.lng, lat: data.lat });
        resolvePoint(data.lng, data.lat);
        mapRef.current?.getMap()?.easeTo({ center: [data.lng, data.lat], zoom: 10.5, duration: 900 });
      } else {
        if (!MAPBOX_TOKEN) {
          setSearchError('Address search requires a Mapbox token.');
          return;
        }
        const g = await mapboxGeocodeAddress(q, MAPBOX_TOKEN);
        if (!g) {
          setSearchError('No location found. Try adding city and state, e.g. "123 Main St, Louisville, KY".');
          return;
        }
        setResolvedLabel(g.placeName);
        setMarker({ lng: g.lng, lat: g.lat });
        resolvePoint(g.lng, g.lat);
        mapRef.current?.getMap()?.easeTo({ center: [g.lng, g.lat], zoom: 11, duration: 900 });
      }
    } catch {
      setSearchError('Search failed. Try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchInput, resolvePoint]);

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

  useEffect(() => {
    if (!MAPBOX_TOKEN || searchInput.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSuggestLoading(true);
      void mapboxGeocodeSuggest(searchInput, MAPBOX_TOKEN, { limit: 5 })
        .then(setSuggestions)
        .finally(() => setSuggestLoading(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Auto-search from ?address= URL param (e.g. from the landing page search)
  useEffect(() => {
    const addr = searchParams.get('address');
    if (!addr || !mapReady) return;
    setSearchInput(addr);
    void onSearch(addr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  return (
    <Stack spacing={2}>
      {/* Search + layer toggle */}
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); void onSearch(); }}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: { xs: 'stretch', sm: 'center' },
          flexWrap: 'wrap',
        }}
      >
        <Autocomplete
          freeSolo
          options={suggestions}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.placeName)}
          inputValue={searchInput}
          onInputChange={(_e, v) => {
            setSearchInput(v);
            setSearchError(null);
          }}
          onChange={(_e, v) => {
            if (v && typeof v !== 'string') {
              setSearchInput(v.placeName);
              void onSearch(v.placeName);
            }
          }}
          loading={suggestLoading}
          disabled={searchLoading || !mapReady}
          sx={{ flex: '1 1 260px', maxWidth: 480 }}
          renderInput={(params) => (
            <TextField
              {...params}
              // WCAG 3.3.2: placeholder is not a label — provide both a
              // screen-reader-visible label and the placeholder hint.
              label="Address or ZIP code"
              placeholder="Enter your address or ZIP code"
              InputLabelProps={{
                ...params.InputLabelProps,
                shrink: true,
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={searchLoading || !mapReady || !searchInput.trim()}
          sx={{ flexShrink: 0, minWidth: 100 }}
        >
          {searchLoading ? <CircularProgress size={18} color="inherit" /> : 'Search'}
        </Button>
        <ToggleButtonGroup
          exclusive
          value={visibleChamber}
          onChange={(_e, v: 'house' | 'senate' | null) => { if (v != null) setVisibleChamber(v); }}
          size="small"
          disabled={!mapReady}
          aria-label="District layer"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="house">House</ToggleButton>
          <ToggleButton value="senate">Senate</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {searchError && (
        <Alert severity="warning" onClose={() => setSearchError(null)}>
          {searchError}
        </Alert>
      )}

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
            // WCAG 2.5.5: Mapbox NavigationControl buttons default to 29×29.
            // Bump to 44×44 on touch viewports; keep compact on desktop.
            '& .mapboxgl-ctrl-group button': {
              width: { xs: 44, md: 29 },
              height: { xs: 44, md: 29 },
            },
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
                    focusable={false}
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
                  <DistrictMapMemberTooltip model={hoverPopup.model} legislatorRoster={legislators} />
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
          {/* Result state */}
          {!marker ? (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Search your address above, or select anywhere on the map to find your House and Senate districts and representatives.
              </Typography>
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1.5 }}>
                Every Kentucky address has two state legislators — a House member (100 districts) and a senator (38 districts).
              </Typography>
            </Paper>
          ) : !selectedHouseName && !selectedSenateName ? (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                We couldn&apos;t match a Kentucky district at this location. Try a full street address in Kentucky, or select inside the state on the map.
              </Typography>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              {resolvedLabel && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {resolvedLabel}
                </Typography>
              )}
              <Stack spacing={0.5}>
                {selectedHouseName && (
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 700 }}>House</Box>
                    {' · District '}{selectedHouseName}
                  </Typography>
                )}
                {selectedSenateName && (
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 700 }}>Senate</Box>
                    {' · District '}{selectedSenateName}
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}

          {selectedHouseLeg && (
            <MemberCard
              leg={selectedHouseLeg}
              showDistrictInSubtitle={false}
              profileHref={memberProfilePath(selectedHouseLeg)}
              legislatorRoster={legislators}
            />
          )}
          {selectedSenateLeg && (
            <MemberCard
              leg={selectedSenateLeg}
              showDistrictInSubtitle={false}
              profileHref={memberProfilePath(selectedSenateLeg)}
              legislatorRoster={legislators}
            />
          )}

          <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={600}>
                How to contact your legislators
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 1.5 }}>
                During session, call the Legislative Message Line at{' '}
                <strong>1-800-372-7181</strong> to leave a message for your representative, senator, or a
                committee. For meeting schedules and agendas, see our{' '}
                <MuiLink component={NextLink} href="/meetings" fontWeight={600}>
                  committee meetings
                </MuiLink>{' '}
                page (synced from the LRC calendar).
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                More official channels — KET livestreams, Bill Watch, and capitol phone numbers — are on{' '}
                <MuiLink component={NextLink} href="/legislature/resources" fontWeight={600}>
                  Frankfort resources
                </MuiLink>
                .
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Box>
    </Stack>
  );
}
