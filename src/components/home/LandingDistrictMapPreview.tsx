'use client';

import MapGL, { Layer, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const HOUSE_GEOJSON_URL = '/geo/ky-sldl.geojson';
const SENATE_GEOJSON_URL = '/geo/ky-sldu.geojson';
const OUTSIDE_KY_MASK_URL = '/geo/ky-outside-mask.geojson';

const KY_BOUNDS: [[number, number], [number, number]] = [
  [-89.9, 36.4],
  [-81.45, 39.35],
];

/** Static district preview for the marketing homepage (Mapbox loaded via dynamic import). */
export function LandingDistrictMapPreview() {
  return (
    <MapGL
      initialViewState={{ bounds: KY_BOUNDS, fitBoundsOptions: { padding: 20 } }}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/light-v11"
      maxBounds={KY_BOUNDS}
      style={{ width: '100%', height: '100%' }}
      interactive={false}
    >
      <Source id="ky-sldl" type="geojson" data={HOUSE_GEOJSON_URL}>
        <Layer id="house-fill" type="fill" paint={{ 'fill-color': '#D6C5E3', 'fill-opacity': 0.6 }} />
        <Layer id="house-outline" type="line" paint={{ 'line-color': '#7637A6', 'line-width': 0.75 }} />
      </Source>
      <Source id="ky-sldu" type="geojson" data={SENATE_GEOJSON_URL}>
        <Layer id="senate-fill" type="fill" paint={{ 'fill-color': '#CEDFC3', 'fill-opacity': 0 }} />
        <Layer
          id="senate-outline"
          type="line"
          paint={{ 'line-color': '#4A5C3E', 'line-width': 0.75, 'line-opacity': 0 }}
        />
      </Source>
      <Source id="ky-mask" type="geojson" data={OUTSIDE_KY_MASK_URL}>
        <Layer id="outside-mask" type="fill" paint={{ 'fill-color': '#f5f5f5', 'fill-opacity': 0.96 }} />
      </Source>
      <NavigationControl position="top-right" showCompass={false} />
    </MapGL>
  );
}
