import type { KyElectionParty, KySeatOutcome } from '@/lib/ky-2026-election-seat-changes';
import { PARTY_COLOR, PARTY_WASH } from './election-chart-colors';
import { seatTipAttrs } from './seat-tip';

const R = 100;
/**
 * Fixed outer margin (chart units), larger than any chamber's dot radius, so every seat
 * chart shares one aspect ratio and side-by-side charts line up.
 */
const MARGIN = 10;
/** Ring stroke for unchanged seats, in chart units (~1.7px at typical sizes). */
const RING = 0.95;

interface SeatPoint {
  x: number;
  y: number;
  angle: number;
  r: number;
}

/**
 * Parliament-chart layout: concentric rows, seats per row proportional to the row's
 * radius, every seat then ordered by angle so parties fill left to right as wedges.
 */
export function hemicycleLayout(seats: number, rows: number, innerRatio: number): { points: SeatPoint[]; dotR: number } {
  const radii = Array.from({ length: rows }, (_, i) => innerRatio + ((1 - innerRatio) * i) / (rows - 1));
  const total = radii.reduce((a, b) => a + b, 0);
  const perRow = radii.map((r) => Math.round((r / total) * seats));
  perRow[rows - 1] += seats - perRow.reduce((a, b) => a + b, 0);

  const rowGap = (1 - innerRatio) / (rows - 1);
  const arcGap = Math.min(...radii.map((r, i) => (Math.PI * r) / Math.max(1, perRow[i] - 1)));
  const dotR = 0.42 * Math.min(rowGap, arcGap) * R;

  const points: SeatPoint[] = [];
  radii.forEach((r, i) => {
    const n = perRow[i];
    for (let j = 0; j < n; j++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1));
      points.push({ x: R + MARGIN + r * R * Math.cos(angle), y: R + MARGIN - r * R * Math.sin(angle), angle, r });
    }
  });
  // Left to right; within the same angle, inner row first.
  points.sort((a, b) => b.angle - a.angle || a.r - b.r);
  return { points, dotR };
}

/** Democratic seats on the left, Republican on the right; seats that changed sit at the boundary. */
function orderSeats(outcomes: KySeatOutcome[]): KySeatOutcome[] {
  const rank = (o: KySeatOutcome) => {
    const changed = Boolean(o.change);
    if (o.after === 'Democratic') return changed ? 1 : 0;
    return changed ? 2 : 3;
  };
  return [...outcomes].sort((a, b) => rank(a) - rank(b) || a.district - b.district);
}

export function SeatHemicycle({
  outcomes,
  rows,
  innerRatio,
  label,
}: {
  outcomes: KySeatOutcome[];
  rows: number;
  innerRatio: number;
  /** Accessible summary of the whole chart. */
  label: string;
}) {
  const { points, dotR } = hemicycleLayout(outcomes.length, rows, innerRatio);
  const seats = orderSeats(outcomes);
  const width = 2 * (R + MARGIN);
  return (
    <svg
      viewBox={`0 0 ${width} ${R + 2 * MARGIN}`}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {seats.map((o, i) => {
        const p = points[i];
        const party: KyElectionParty = o.after;
        const changed = Boolean(o.change);
        // Changed: solid. No change: an outlined ring on the party wash (the stroke sits
        // inside the dot's footprint so rings and solid dots are the same size).
        return (
          <circle
            key={`${o.chamber}-${o.district}`}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r={(changed ? dotR : dotR - RING / 2).toFixed(2)}
            fill={changed ? PARTY_COLOR[party] : PARTY_WASH[party]}
            stroke={changed ? undefined : PARTY_COLOR[party]}
            strokeWidth={changed ? undefined : RING}
            {...seatTipAttrs(o)}
          />
        );
      })}
    </svg>
  );
}
