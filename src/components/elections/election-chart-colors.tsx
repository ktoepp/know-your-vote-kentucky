import type { KyElectionParty } from '@/lib/ky-2026-election-seat-changes';

/**
 * Party colors for election charts: the site's `--party-d` / `--party-r` tokens. Seats
 * that changed party are solid. Seats that did not are drawn lighter, in a style that
 * also differs by texture so it reads in grayscale and for color-blind readers:
 * - seat charts: an outlined ring (hatching on small dots causes moiré);
 * - maps: low-contrast 45° hatching over a pale wash of the party color.
 * The solid pair passes the dataviz palette validator (CVD ΔE 23.6, normal-vision ΔE 32.1).
 */
export const PARTY_COLOR: Record<KyElectionParty, string> = {
  Democratic: '#4338CA',
  Republican: '#BE123C',
};

/**
 * Ground for unchanged seats: ring interiors and the base under map hatching. Neutral
 * gray for both parties, so only the thin ring or stripe carries party color and the
 * unchanged seats stay muted next to the solid changed ones.
 */
const NEUTRAL_GROUND = '#E8EBF0';
export const PARTY_WASH: Record<KyElectionParty, string> = {
  Democratic: NEUTRAL_GROUND,
  Republican: NEUTRAL_GROUND,
};

/**
 * Hatch stripes: ~40% of the way from the wash to the party color. Kept low-contrast
 * against the wash so the stripes read as texture, not as a moiré-prone line field.
 */
const HATCH_LINE: Record<KyElectionParty, string> = {
  Democratic: '#B6B4EC',
  Republican: '#ECAAB8',
};

const CODE: Record<KyElectionParty, string> = { Democratic: 'd', Republican: 'r' };

/** One set of hatch patterns per SVG; `spacing`/`line` are in that SVG's own units. */
export function HatchPatterns({ id, spacing, line }: { id: string; spacing: number; line: number }) {
  return (
    <defs>
      {(Object.keys(PARTY_COLOR) as KyElectionParty[]).map((party) => (
        <pattern
          key={party}
          id={`${id}-${CODE[party]}`}
          patternUnits="userSpaceOnUse"
          width={spacing}
          height={spacing}
          patternTransform="rotate(45)"
        >
          <rect width={spacing} height={spacing} fill={PARTY_WASH[party]} />
          <rect width={line} height={spacing} fill={HATCH_LINE[party]} />
        </pattern>
      ))}
    </defs>
  );
}

/** Map fill: solid party color for a changed district; the SVG's hatch pattern otherwise. */
export function districtFill(party: KyElectionParty, changed: boolean, hatchId: string): string {
  return changed ? PARTY_COLOR[party] : `url(#${hatchId}-${CODE[party]})`;
}

/** Map legend swatch. 135deg in CSS draws the same "/" as rotate(45) in SVG. */
export function hatchBackground(party: KyElectionParty): string {
  return `repeating-linear-gradient(135deg, ${HATCH_LINE[party]} 0 1.5px, ${PARTY_WASH[party]} 1.5px 4px)`;
}
