'use client';

import React, { forwardRef } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from 'react-map-gl/mapbox';
import mapboxgl, { type MapMouseEvent } from 'mapbox-gl';
import { MapPin } from 'lucide-react';
import type { DistrictMapTooltipModel } from '@/components/members/DistrictMapMemberTooltip';
import {
  DISTRICT_LABEL,
  HOUSE_FILL,
  HOUSE_HOVER_OVERLAY,
  HOUSE_OUTLINE,
  HOUSE_SELECTED_FILL,
  MAP_MARKER_PIN,
  OUTSIDE_KY_MASK_FILL,
  SENATE_FILL,
  SENATE_HOVER_OVERLAY,
  SENATE_OUTLINE,
  SENATE_SELECTED_FILL,
} from '@/components/members/district-map-tokens';
import { KY_DISTRICT_MAPBOX_STYLE } from '@/lib/ky-district-mapbox-style';
import {
  HOUSE_GEOJSON_URL,
  OUTSIDE_KY_MASK_URL,
  SENATE_GEOJSON_URL,
  SL_MASK,
  SL_SOURCE_HOUSE,
  SL_SOURCE_SENATE,
} from '@/components/members/district-map-sources';

import 'mapbox-gl/dist/mapbox-gl.css';

/** Panning limits (Kentucky + small margin). */
const KY_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-89.9, 36.4],
  [-81.45, 39.35],
];

const LABEL_TEXT_SIZE: mapboxgl.ExpressionSpecification = [
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
];

export interface DistrictMapCanvasProps {
  mapboxToken: string;
  showHouseLayer: boolean;
  showSenateLayer: boolean;
  selectedHouseName: string | null;
  selectedSenateName: string | null;
  marker: { lng: number; lat: number } | null;
  hoverPopup: { lng: number; lat: number; model: DistrictMapTooltipModel } | null;
  renderHoverChip: (model: DistrictMapTooltipModel) => React.ReactNode;
  onLoad: () => void;
  onClick: (e: MapMouseEvent) => void;
  onMouseMove: (e: MapMouseEvent) => void;
}

/**
 * The Mapbox GL part of the district explorer, split into its own chunk so the
 * search form, boundary data, point-in-polygon lookup and result cards render
 * before the ~450KB map library has downloaded. Loaded via `next/dynamic`
 * (`ssr: false`) from `DistrictMapExplorer`; everything stateful stays there.
 */
export const DistrictMapCanvas = forwardRef<MapRef, DistrictMapCanvasProps>(function DistrictMapCanvas(
  {
    mapboxToken,
    showHouseLayer,
    showSenateLayer,
    selectedHouseName,
    selectedSenateName,
    marker,
    hoverPopup,
    renderHoverChip,
    onLoad,
    onClick,
    onMouseMove,
  },
  ref,
) {
  return (
    <MapGL
      ref={ref}
      mapLib={mapboxgl}
      mapboxAccessToken={mapboxToken}
      projection="mercator"
      maxBounds={KY_MAX_BOUNDS}
      initialViewState={{
        longitude: -84.87,
        latitude: 37.35,
        zoom: 6,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={KY_DISTRICT_MAPBOX_STYLE}
      onLoad={onLoad}
      onClick={onClick}
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
              ['==', ['to-string', ['get', 'NAME']], selectedHouseName ?? '__none__'],
              HOUSE_SELECTED_FILL,
              ['boolean', ['feature-state', 'hover'], false],
              HOUSE_HOVER_OVERLAY,
              HOUSE_FILL,
            ],
            'fill-opacity': 1,
            'fill-color-transition': { duration: 120, delay: 0 },
          } as mapboxgl.FillPaint}
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
              2.5,
              1,
            ],
            'line-opacity': [
              'case',
              ['==', ['to-string', ['get', 'NAME']], selectedHouseName ?? ''],
              1,
              0.55,
            ],
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
            'text-size': LABEL_TEXT_SIZE,
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
              ['==', ['to-string', ['get', 'NAME']], selectedSenateName ?? '__none__'],
              SENATE_SELECTED_FILL,
              ['boolean', ['feature-state', 'hover'], false],
              SENATE_HOVER_OVERLAY,
              SENATE_FILL,
            ],
            'fill-opacity': 1,
            'fill-color-transition': { duration: 120, delay: 0 },
          } as mapboxgl.FillPaint}
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
              2.5,
              1,
            ],
            'line-opacity': [
              'case',
              ['==', ['to-string', ['get', 'NAME']], selectedSenateName ?? ''],
              1,
              0.55,
            ],
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
            'text-size': LABEL_TEXT_SIZE,
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
          className="district-map-hover-popup"
          longitude={hoverPopup.lng}
          latitude={hoverPopup.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -10]}
          maxWidth="none"
        >
          {renderHoverChip(hoverPopup.model)}
        </Popup>
      )}
    </MapGL>
  );
});

export default DistrictMapCanvas;
