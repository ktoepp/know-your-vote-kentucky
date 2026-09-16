'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { MapRef } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'mapbox-gl';
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
import { CHAMBER_TOGGLE_GROUP_SX } from '@/components/civic/GaChamberFilterBar';
import { memberProfilePath } from '@/lib/ky-member-utils';
import type { DistrictMapTooltipModel } from '@/components/members/DistrictMapMemberTooltip';
import { SignupCta } from '@/components/civic/SignupCta';
import {
  HOUSE_GEOJSON_URL,
  SENATE_GEOJSON_URL,
  SL_SOURCE_HOUSE,
  SL_SOURCE_SENATE,
} from '@/components/members/district-map-sources';
import {
  mapboxGeocodeAddress,
  mapboxGeocodeSuggest,
  mapboxGeocodeZip,
  type MapboxGeocodeSuggestion,
} from '@/lib/mapbox-geocode';
import { trackDistrictMapLookup } from '@/lib/analytics';

/**
 * Mapbox GL (~450KB gz) is the heaviest thing on this page and the lookup does
 * not need it: boundaries + roster + point-in-polygon run here. The canvas is
 * its own chunk so the form is usable and a ZIP/address resolves while the map
 * is still downloading. House/Senate colors, mask, marker pin — edit
 * `district-map-tokens.ts`.
 */
const DistrictMapCanvas = dynamic(() => import('@/components/members/DistrictMapCanvas'), {
  ssr: false,
  loading: () => null,
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

type LookupType = 'zip' | 'address' | 'map_click';

/**
 * `next=` target for the signup prompt: re-runs the same lookup after signup /
 * login (`?address=` for typed queries, `?lat=&lng=` for map clicks).
 */
function lookupReturnPath(query: string | null, marker: { lng: number; lat: number } | null): string {
  if (query) return `/members/map?address=${encodeURIComponent(query)}`;
  if (marker) return `/members/map?lat=${marker.lat.toFixed(5)}&lng=${marker.lng.toFixed(5)}`;
  return '/members/map';
}

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

function DistrictMapHoverChip({ model }: { model: DistrictMapTooltipModel }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        px: 1.25,
        py: 0.625,
        boxShadow: 2,
        pointerEvents: 'none',
        maxWidth: 220,
      }}
    >
      {model.sections.map((sec) => (
        <Box key={sec.chamberLabel}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {sec.districtSummary}
          </Typography>
          {sec.leg && (
            <Typography variant="body2" fontWeight={600} noWrap>
              {sec.leg.first_name} {sec.leg.last_name}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

function DistrictMapAnimatedMemberCard({
  leg,
  legislatorRoster,
}: {
  leg: KYLegislator;
  legislatorRoster: KYLegislator[];
}) {
  return (
    <Box
      sx={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        '@keyframes fadeSlideUp': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'fadeSlideUp 0.18s ease',
      }}
    >
      <MemberCard
        leg={leg}
        showDistrictInSubtitle={false}
        profileHref={memberProfilePath(leg)}
        legislatorRoster={legislatorRoster}
      />
    </Box>
  );
}

export default function DistrictMapExplorer() {
  const mapRef = useRef<MapRef>(null);
  const rafRef = useRef<number | null>(null);
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
  /** Query behind the current marker (ZIP or address); null for map clicks. */
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  /** Camera move requested before the map chunk mounted; applied in `onMapLoad`. */
  const pendingCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const mapLoadedRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [hoverPopup, setHoverPopup] = useState<{
    lng: number;
    lat: number;
    model: DistrictMapTooltipModel;
  } | null>(null);
  const [hoveredHouseLeg, setHoveredHouseLeg] = useState<KYLegislator | null>(null);
  const [hoveredSenateLeg, setHoveredSenateLeg] = useState<KYLegislator | null>(null);

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

  const displayHouseLeg = selectedHouseLeg ?? hoveredHouseLeg ?? null;
  const displaySenateLeg = selectedSenateLeg ?? hoveredSenateLeg ?? null;
  const isHoverPreview = !marker && (hoveredHouseLeg != null || hoveredSenateLeg != null);

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

  const resolvePoint = useCallback(
    (lng: number, lat: number, lookup: { type: LookupType; zip?: string | null }) => {
      if (!houseFc || !senateFc) return;
      const hf = findDistrictFeatureAtPoint(houseFc, lng, lat);
      const sf = findDistrictFeatureAtPoint(senateFc, lng, lat);
      const hName = districtNameFromCensusFeature(hf);
      const sName = districtNameFromCensusFeature(sf);
      setSelectedHouseName(hName);
      setSelectedSenateName(sName);
      const hNum = parseKyDistrictNumber(hName);
      const sNum = parseKyDistrictNumber(sName);
      trackDistrictMapLookup({
        zip: lookup.zip ?? null,
        lookupType: lookup.type,
        houseDistrict: hNum ? Number(hNum) : null,
        senateDistrict: sNum ? Number(sNum) : null,
      });
    },
    [houseFc, senateFc],
  );

  /** Moves the camera now, or on map load if the canvas chunk is still arriving. */
  const flyTo = useCallback((center: [number, number], zoom: number) => {
    const map = mapRef.current?.getMap();
    if (map && mapLoadedRef.current) {
      map.easeTo({ center, zoom, duration: 900 });
    } else {
      pendingCameraRef.current = { center, zoom };
    }
  }, []);

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      const { lngLat } = e;
      if (!lngLat) return;
      setResolvedLabel(null);
      setSearchError(null);
      setLastQuery(null);
      resolvePoint(lngLat.lng, lngLat.lat, { type: 'map_click' });
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
        // Mapbox postcode geocoding is a direct browser call with no per-second
        // cap; the Nominatim-backed route is the fallback (no token, or a ZIP
        // outside the Kentucky bbox the Mapbox call is biased to).
        let pt: { lat: number; lng: number } | null = MAPBOX_TOKEN
          ? await mapboxGeocodeZip(q, MAPBOX_TOKEN).catch(() => null)
          : null;
        if (!pt) {
          const res = await fetch(`/api/geo/zip?zip=${encodeURIComponent(q)}`);
          const data = (await res.json()) as { error?: string; lat?: number; lng?: number };
          if (!res.ok || data.lat == null || data.lng == null) {
            setSearchError(data.error || 'ZIP code not found.');
            return;
          }
          pt = { lat: data.lat, lng: data.lng };
        }
        setResolvedLabel(`ZIP ${q}`);
        setLastQuery(q);
        setMarker({ lng: pt.lng, lat: pt.lat });
        resolvePoint(pt.lng, pt.lat, { type: 'zip', zip: q });
        flyTo([pt.lng, pt.lat], 10.5);
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
        setLastQuery(q);
        setMarker({ lng: g.lng, lat: g.lat });
        resolvePoint(g.lng, g.lat, { type: 'address' });
        flyTo([g.lng, g.lat], 11);
      }
    } catch {
      setSearchError('Search failed. Try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchInput, resolvePoint, flyTo]);

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
      if (rafRef.current != null) return;
      const point = e.point;
      const lngLat = e.lngLat;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const map = mapRef.current?.getMap();
        if (!map) return;
        const layers: string[] = [];
        if (showHouseLayer) layers.push(`${SL_SOURCE_HOUSE}-fill`);
        if (showSenateLayer) layers.push(`${SL_SOURCE_SENATE}-fill`);
        if (layers.length === 0) {
          clearHoverFeatureState();
          map.getCanvas().style.cursor = '';
          setHoverPopup(null);
          setHoveredHouseLeg(null);
          setHoveredSenateLeg(null);
          return;
        }
        const feats = map.queryRenderedFeatures(point, { layers });
        const hasHit = feats.length > 0;
        map.getCanvas().style.cursor = hasHit ? 'pointer' : '';

        if (!hasHit) {
          clearHoverFeatureState();
          setHoverPopup(null);
          setHoveredHouseLeg(null);
          setHoveredSenateLeg(null);
          return;
        }

        const houseFeat = feats.find((f) => f.layer?.id === `${SL_SOURCE_HOUSE}-fill`) as Feature | undefined;
        const senateFeat = feats.find((f) => f.layer?.id === `${SL_SOURCE_SENATE}-fill`) as Feature | undefined;
        if (!houseFeat && !senateFeat) {
          clearHoverFeatureState();
          setHoverPopup(null);
          setHoveredHouseLeg(null);
          setHoveredSenateLeg(null);
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
          setHoveredHouseLeg(null);
          setHoveredSenateLeg(null);
          return;
        }

        const hHouseId = houseFeat
          ? parseKyDistrictNumber(districtNameFromCensusFeature(houseFeat))
          : null;
        const hSenateId = senateFeat
          ? parseKyDistrictNumber(districtNameFromCensusFeature(senateFeat))
          : null;
        setHoveredHouseLeg(hHouseId ? houseByDistrict.get(hHouseId) ?? null : null);
        setHoveredSenateLeg(hSenateId ? senateByDistrict.get(hSenateId) ?? null : null);

        const { lng, lat } = lngLat;
        setHoverPopup({ lng, lat, model });
      });
    },
    [showHouseLayer, showSenateLayer, houseByDistrict, senateByDistrict, clearHoverFeatureState],
  );

  const busy = legLoading || geoLoading;
  /** Boundaries loaded: ZIP/address lookups and click-throughs work from here. */
  const dataReady = Boolean(houseFc && senateFc && !geoError);
  /** Canvas can mount (token present). Tiles may still be loading. */
  const mapReady = dataReady && Boolean(MAPBOX_TOKEN);
  /** Address search / suggestions need the geocoder; ZIPs also work without it. */
  const searchEnabled = dataReady && !searchLoading;

  const onMapLoad = useCallback(() => {
    mapLoadedRef.current = true;
    const map = mapRef.current?.getMap();
    if (!map) return;
    requestAnimationFrame(() => map.resize());
    setMapLoaded(true);
    const pending = pendingCameraRef.current;
    if (pending) {
      pendingCameraRef.current = null;
      map.easeTo({ center: pending.center, zoom: pending.zoom, duration: 600 });
    } else if (!searchParams.get('district')) {
      // A ?chamber=&district= preselect fits its own district below.
      fitToKy();
    }
  }, [fitToKy, searchParams]);

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

  // Auto-search from ?address= (landing page search, signup return trip) or
  // restore a map-click lookup from ?lat=&lng= (signup return trip). Needs only
  // the boundary data, not the map chunk.
  useEffect(() => {
    if (!dataReady) return;
    const addr = searchParams.get('address');
    if (addr) {
      setSearchInput(addr);
      void onSearch(addr);
      return;
    }
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      setMarker({ lng, lat });
      resolvePoint(lng, lat, { type: 'map_click' });
      flyTo([lng, lat], 10.5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  // Preselect from ?chamber=&district= (member-profile locator map click-through).
  // Selection only needs the boundary data — it must work even when map tiles can't
  // load — so the camera move runs separately below, gated on mapReady.
  const preselectAppliedRef = useRef(false);
  useEffect(() => {
    if (preselectAppliedRef.current || !houseFc || !senateFc) return;
    const chamberParam = searchParams.get('chamber');
    const districtNum = parseKyDistrictNumber(searchParams.get('district'));
    if ((chamberParam !== 'house' && chamberParam !== 'senate') || !districtNum) return;
    preselectAppliedRef.current = true;
    setVisibleChamber(chamberParam);
    if (chamberParam === 'house') setSelectedHouseName(String(districtNum));
    else setSelectedSenateName(String(districtNum));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseFc, senateFc]);

  useEffect(() => {
    if (!mapLoaded || !houseFc || !senateFc) return;
    const chamberParam = searchParams.get('chamber');
    const districtNum = parseKyDistrictNumber(searchParams.get('district'));
    if ((chamberParam !== 'house' && chamberParam !== 'senate') || !districtNum) return;
    const fc = chamberParam === 'house' ? houseFc : senateFc;
    const feat = fc.features.find((f) => districtNameFromCensusFeature(f) === String(districtNum));
    const map = mapRef.current?.getMap();
    if (!feat || !map) return;
    try {
      const b = bbox(feat);
      map.fitBounds(
        [
          [b[0], b[1]],
          [b[2], b[3]],
        ],
        { padding: 72, duration: 600, maxZoom: 9 },
      );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, houseFc, senateFc]);

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
          disabled={!searchEnabled}
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
          disabled={!searchEnabled || !searchInput.trim()}
          sx={{ flexShrink: 0, minWidth: 100 }}
        >
          {searchLoading ? <CircularProgress size={18} color="inherit" /> : 'Search'}
        </Button>
        <ToggleButtonGroup
          exclusive
          value={visibleChamber}
          onChange={(_e, v: 'house' | 'senate' | null) => { if (v != null) setVisibleChamber(v); }}
          size="small"
          disabled={!dataReady}
          aria-label="District layer"
          sx={{ flexShrink: 0, ...CHAMBER_TOGGLE_GROUP_SX }}
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
              sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                '& .district-map-hover-popup.mapboxgl-popup': {
                  maxWidth: 'none !important',
                },
                '& .district-map-hover-popup .mapboxgl-popup-content': {
                  background: 'transparent',
                  padding: 0,
                  boxShadow: 'none',
                  borderRadius: 0,
                },
                '& .district-map-hover-popup .mapboxgl-popup-tip': {
                  display: 'none',
                },
              }}
              onMouseLeave={() => {
                if (rafRef.current != null) {
                  cancelAnimationFrame(rafRef.current);
                  rafRef.current = null;
                }
                clearHoverFeatureState();
                setHoverPopup(null);
                setHoveredHouseLeg(null);
                setHoveredSenateLeg(null);
              }}
            >
            <DistrictMapCanvas
              ref={mapRef}
              mapboxToken={MAPBOX_TOKEN}
              showHouseLayer={showHouseLayer}
              showSenateLayer={showSenateLayer}
              selectedHouseName={selectedHouseName}
              selectedSenateName={selectedSenateName}
              marker={marker}
              hoverPopup={hoverPopup}
              renderHoverChip={(model) => <DistrictMapHoverChip model={model} />}
              onLoad={onMapLoad}
              onClick={onMapClick}
              onMouseMove={onMouseMove}
            />
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
              <Typography variant="caption" color="text.tertiary" display="block" sx={{ mt: 1.5 }}>
                Every Kentucky address has two state legislators: a House member (100 districts) and a senator (38 districts).
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

          {isHoverPreview ? (
            <Box sx={{ opacity: 0.65, transition: 'opacity 0.15s ease' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Hover preview. Click to select.
              </Typography>
              {displayHouseLeg && (
                <Box key={displayHouseLeg.id}>
                  <DistrictMapAnimatedMemberCard leg={displayHouseLeg} legislatorRoster={legislators} />
                </Box>
              )}
              {displaySenateLeg && (
                <Box key={displaySenateLeg.id}>
                  <DistrictMapAnimatedMemberCard leg={displaySenateLeg} legislatorRoster={legislators} />
                </Box>
              )}
            </Box>
          ) : (
            <>
              {displayHouseLeg && (
                <Box key={displayHouseLeg.id}>
                  <DistrictMapAnimatedMemberCard leg={displayHouseLeg} legislatorRoster={legislators} />
                </Box>
              )}
              {displaySenateLeg && (
                <Box key={displaySenateLeg.id}>
                  <DistrictMapAnimatedMemberCard leg={displaySenateLeg} legislatorRoster={legislators} />
                </Box>
              )}
            </>
          )}

          {marker && (selectedHouseName || selectedSenateName) && (
            <SignupCta
              surface="district_map_result"
              next={lookupReturnPath(lastQuery, marker)}
              title="Keep up with your legislators"
              body="With a free account you can follow the bills they sponsor and the committees they serve on, and get an email digest when something changes."
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
                More official channels, including KET livestreams, Bill Watch, and capitol phone numbers, are on{' '}
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
