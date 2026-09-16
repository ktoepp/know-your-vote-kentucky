/**
 * Shared ids + asset URLs for the district explorer and its Mapbox canvas.
 * No browser-only imports here — `DistrictMapExplorer` renders on the server.
 */
export const SL_SOURCE_HOUSE = 'ky-sldl';
export const SL_SOURCE_SENATE = 'ky-sldu';
export const SL_MASK = 'ky-outside-mask';

/** Served from `public/geo/`; the same paths feed point-in-polygon lookups and the map. */
export const HOUSE_GEOJSON_URL = '/geo/ky-sldl.geojson';
export const SENATE_GEOJSON_URL = '/geo/ky-sldu.geojson';
/** World-with-hole polygon from Census state outline + @turf/mask (see scripts/build-ky-outside-mask.ts). */
export const OUTSIDE_KY_MASK_URL = '/geo/ky-outside-mask.geojson';
/** Roster endpoint the explorer's `useKyMembersBrowseRoster` fetches. */
export const MEMBERS_ROSTER_URL = '/api/roster/members';
