/**
 * Visual tokens for the district map — edit here to change House/Senate fills,
 * outlines, mask, and pin marker styling (see also `MapPin` in DistrictMapExplorer).
 */
export const OUTSIDE_KY_MASK_FILL = 'rgba(245, 245, 245, 0.96)';

export const HOUSE_FILL = '#D6C5E3';
export const SENATE_FILL = '#CEDFC3';
export const HOUSE_OUTLINE = '#7637A6';
export const SENATE_OUTLINE = '#4A5C3E';

/** Opacity for hover overlay on district fill (same hue as outline). */
export const HOVER_OVERLAY_ALPHA = 0.4;

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Hover tint on fill — derived from outline color (Mapbox feature-state). */
export const HOUSE_HOVER_OVERLAY = hexToRgba(HOUSE_OUTLINE, HOVER_OVERLAY_ALPHA);
export const SENATE_HOVER_OVERLAY = hexToRgba(SENATE_OUTLINE, HOVER_OVERLAY_ALPHA);

/**
 * Fill for a selected (clicked) district. Uses the darker outline hue at a high
 * alpha so the selected district reads clearly *darker in value* than its pastel
 * neighbors — matching the selected-district emphasis on the per-member minimap
 * (`LegislatorDistrictMinimap`). Must stay above `HOVER_OVERLAY_ALPHA` (0.4) so a
 * selected district is always more prominent than a merely hovered one; the white
 * halo on `DISTRICT_LABEL` keeps the district number legible over the darker fill.
 */
export const HOUSE_SELECTED_FILL = hexToRgba(HOUSE_OUTLINE, 0.62);
export const SENATE_SELECTED_FILL = hexToRgba(SENATE_OUTLINE, 0.62);

/** Lucide MapPin: stroke, fill (RGBA), pixel size, stroke width */
export const MAP_MARKER_PIN = {
  color: '#1e40af',
  fill: 'rgba(30, 64, 175, 0.15)',
  size: 32,
  strokeWidth: 2,
} as const;

/**
 * Persistent district number labels (Mapbox symbol layers). Fonts must exist in the Mapbox style’s glyph set.
 * @see https://docs.mapbox.com/help/troubleshooting/change-label-font/
 */
export const DISTRICT_LABEL = {
  textColor: '#0f172a',
  haloColor: '#ffffff',
  haloWidth: 2,
  haloBlur: 0.25,
  /** Fallback stack — works with Mapbox Light and most core styles */
  font: ['Open Sans Semibold', 'Arial Unicode MS Regular'] as string[],
} as const;
