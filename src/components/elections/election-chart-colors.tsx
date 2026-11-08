import type { KyElectionParty } from '@/lib/ky-2026-election-seat-changes';

/**
 * Party colors for election charts: the site's `--party-d` / `--party-r` tokens. Seats
 * that changed party are solid; seats that did not are 45° hatching in the same color
 * over a pale wash of it, so "changed" vs "no change" reads by texture as well as tone
 * (also in grayscale and for color-blind readers). The solid pair passes the dataviz
 * palette validator (CVD ΔE 23.6, normal-vision ΔE 32.1).
 */
export const PARTY_COLOR: Record<KyElectionParty, string> = {
  Democratic: '#4338CA',
  Republican: '#BE123C',
};

/** Pale ground under the hatching, so district edges (white strokes) still show. */
const HATCH_GROUND: Record<KyElectionParty, string> = {
  Democratic: '#ECEDFB',
  Republican: '#FBECEF',
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
          <rect width={spacing} height={spacing} fill={HATCH_GROUND[party]} />
          <rect width={line} height={spacing} fill={PARTY_COLOR[party]} />
        </pattern>
      ))}
    </defs>
  );
}

/** Solid party color for a changed seat; the SVG's hatch pattern for an unchanged one. */
export function seatFill(party: KyElectionParty, changed: boolean, hatchId: string): string {
  return changed ? PARTY_COLOR[party] : `url(#${hatchId}-${CODE[party]})`;
}

/** The same hatch for HTML legend swatches. 135deg in CSS draws the same "/" as rotate(45) in SVG. */
export function hatchBackground(party: KyElectionParty): string {
  const c = PARTY_COLOR[party];
  const g = HATCH_GROUND[party];
  return `repeating-linear-gradient(135deg, ${c} 0 1.5px, ${g} 1.5px 4px)`;
}
