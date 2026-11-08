import type { KyElectionParty, KySeatOutcome } from '@/lib/ky-2026-election-seat-changes';
import { HatchPatterns, seatFill } from './election-chart-colors';
import { seatTip } from './seat-tip';

const R = 100;
const PAD = 2;

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
      points.push({ x: R + PAD + dotR + r * R * Math.cos(angle), y: R + PAD + dotR - r * R * Math.sin(angle), angle, r });
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
  hatchId,
}: {
  outcomes: KySeatOutcome[];
  rows: number;
  innerRatio: number;
  /** Unique per chart on the page: pattern ids are document-global. */
  hatchId: string;
  /** Accessible summary of the whole chart. */
  label: string;
}) {
  const { points, dotR } = hemicycleLayout(outcomes.length, rows, innerRatio);
  const seats = orderSeats(outcomes);
  const size = 2 * (R + PAD + dotR);
  return (
    <svg
      viewBox={`0 0 ${size.toFixed(1)} ${(R + 2 * PAD + 2 * dotR).toFixed(1)}`}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      <HatchPatterns id={hatchId} spacing={2.2} line={0.9} />
      {seats.map((o, i) => {
        const p = points[i];
        const tip = seatTip(o);
        const party: KyElectionParty = o.after;
        return (
          <circle
            key={`${o.chamber}-${o.district}`}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r={dotR.toFixed(2)}
            fill={seatFill(party, Boolean(o.change), hatchId)}
            data-tip-title={tip.title}
            data-tip-detail={tip.detail}
          />
        );
      })}
    </svg>
  );
}
