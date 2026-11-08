import { Box, Typography } from '@mui/material';
import { KY_DISTRICT_MAP_SVG, type KyDistrictShape } from '@/lib/generated/ky-district-map-svg';
import { kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
import type { KySeatOutcome } from '@/lib/ky-2026-election-seat-changes';
import { HatchPatterns, seatFill } from './election-chart-colors';
import { seatTip } from './seat-tip';

const MAP = KY_DISTRICT_MAP_SVG;
const INSET_X = 8;
const INSET_Y = 8;
const LABEL_TEXT = '#0F172A'; // slate-900 — text token, never the party color

function insideFrame([x, y]: [number, number]): boolean {
  const f = MAP.louisvilleFrame;
  return x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height;
}

/** Rendered smaller than this (frame units) → the label sits beside the district with a leader. */
const SMALL = 30;

/**
 * `linked`: the one copy of a changed district (state map or inset, whichever labels it)
 * that is a link, so each changed district is a single keyboard stop.
 */
function DistrictShape({
  o,
  shape,
  linked,
  hatchId,
}: {
  o: KySeatOutcome;
  shape: KyDistrictShape;
  linked: boolean;
  hatchId: string;
}) {
  const tip = seatTip(o);
  const path = (
    <path
      d={shape.d}
      fill={seatFill(o.after, Boolean(o.change), hatchId)}
      stroke="#FFFFFF"
      strokeWidth={1}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      data-tip-title={tip.title}
      data-tip-detail={tip.detail}
    />
  );
  if (!o.change || !linked) return path;
  const ref = { chamber: o.chamber, districtNumber: o.district };
  return (
    <a href={kyDistrictPath(ref)} aria-label={`${kyDistrictShortName(ref)}: ${tip.title}, ${o.change.incumbent.party} to ${o.after}`}>
      {path}
    </a>
  );
}

function DistrictLabel({ district, shape, className }: { district: number; shape: KyDistrictShape; className?: string }) {
  const [x0, y0, x1, y1] = shape.bbox;
  const small = x1 - x0 < SMALL || y1 - y0 < SMALL;
  const midY = (y0 + y1) / 2;
  const text = {
    fontSize: 15,
    fontWeight: 700,
    fill: LABEL_TEXT,
    stroke: '#FFFFFF',
    strokeWidth: 3,
    paintOrder: 'stroke' as const,
    dominantBaseline: 'central' as const,
  };
  if (!small) {
    return (
      <text
        className={className}
        x={shape.label[0]}
        y={shape.label[1]}
        textAnchor="middle"
        pointerEvents="none"
        aria-hidden="true"
        {...text}
      >
        {district}
      </text>
    );
  }
  // Too small to hold its number: label to the right with a short leader.
  return (
    <g pointerEvents="none" aria-hidden="true">
      <line x1={x1 + 1} y1={midY} x2={x1 + 9} y2={midY} stroke={LABEL_TEXT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text className={className} x={x1 + 11} y={midY} textAnchor="start" {...text}>
        {district}
      </text>
    </g>
  );
}

/**
 * Statewide district map shaded by party after the election, seats that changed party in
 * full color and labeled, with a Louisville inset in the empty north-west corner of the
 * frame. Changed districts are links to their district pages.
 */
export function DistrictChangeMap({
  chamber,
  outcomes,
  label,
}: {
  chamber: 'house' | 'senate';
  outcomes: KySeatOutcome[];
  label: string;
}) {
  const shapes = MAP[chamber];
  const inset = MAP.insetSize;
  const frame = MAP.louisvilleFrame;
  const byDistrict = new Map(outcomes.map((o) => [o.district, o]));
  // Draw unchanged districts first so changed districts' focus/hover strokes sit on top.
  const ordered = [...outcomes].sort((a, b) => Number(Boolean(a.change)) - Number(Boolean(b.change)));
  const changed = outcomes.filter((o) => o.change);
  const stateHatch = `${chamber}-map-hatch`;
  const insetHatch = `${chamber}-inset-hatch`;

  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        position: 'relative',
        // State-map labels are in map units, so they need a bigger size where the map is drawn small.
        '& .state-label': { fontSize: { xs: 34, sm: 15 }, strokeWidth: { xs: 6, sm: 3 } },
        // The leader only lines up when the inset is overlaid on the map (sm and up).
        '& .inset-leader': { display: { xs: 'none', sm: 'inline' } },
      }}
    >
      <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <HatchPatterns id={stateHatch} spacing={7} line={2.6} />
        {ordered.map((o) => {
          const shape = shapes.districts[o.district];
          return shape ? (
            <DistrictShape key={o.district} o={o} shape={shape} linked={!insideFrame(shape.label)} hatchId={stateHatch} />
          ) : null;
        })}
        {changed
          .filter((o) => !insideFrame(shapes.districts[o.district].label))
          .map((o) => (
            <DistrictLabel key={o.district} district={o.district} shape={shapes.districts[o.district]} className="state-label" />
          ))}
        <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill="none" stroke="#475569" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line
          className="inset-leader"
          x1={frame.x}
          y1={frame.y}
          x2={INSET_X + inset.width}
          y2={INSET_Y}
          stroke="#94A3B8"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Louisville inset: overlaid in the empty north-west corner on wider screens, below the map on phones. */}
      <Box
        sx={{
          position: { xs: 'static', sm: 'absolute' },
          left: { sm: `${(INSET_X / MAP.width) * 100}%` },
          top: { sm: `${(INSET_Y / MAP.height) * 100}%` },
          width: { xs: '64%', sm: `${(inset.width / MAP.width) * 100}%` },
          mt: { xs: 1.5, sm: 0 },
        }}
      >
        <svg viewBox={`0 0 ${inset.width} ${inset.height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <HatchPatterns id={insetHatch} spacing={5} line={1.9} />
          <rect width={inset.width} height={inset.height} fill="#F8FAFC" />
          {Object.entries(shapes.inset)
            .map(([n, shape]) => ({ o: byDistrict.get(Number(n)), shape }))
            .sort((a, b) => Number(Boolean(a.o?.change)) - Number(Boolean(b.o?.change)))
            .map(({ o, shape }) =>
              o ? (
                <DistrictShape
                  key={o.district}
                  o={o}
                  shape={shape}
                  linked={insideFrame(shapes.districts[o.district].label)}
                  hatchId={insetHatch}
                />
              ) : null,
            )}
          {changed
            .filter((o) => shapes.inset[o.district] && insideFrame(shapes.districts[o.district].label))
            .map((o) => (
              <DistrictLabel key={o.district} district={o.district} shape={shapes.inset[o.district]} />
            ))}
          <rect width={inset.width} height={inset.height} fill="none" stroke="#475569" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <Typography component="p" variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
          Louisville area
        </Typography>
      </Box>
    </Box>
  );
}
