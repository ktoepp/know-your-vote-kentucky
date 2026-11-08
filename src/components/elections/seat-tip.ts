import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
import type { KySeatOutcome } from '@/lib/ky-2026-election-seat-changes';

/**
 * What a seat's tooltip / info card says, as data attributes on the mark: who holds the
 * seat (the name leads), the district, what happened, and where to read more.
 */
export function seatTipAttrs(o: KySeatOutcome): Record<string, string> {
  const ref = { chamber: o.chamber, districtNumber: o.district };
  const abbr = formatPartyLetterAbbrev;
  let status: string;
  if (o.change) {
    const { incumbent } = o.change;
    status = incumbent.onBallot
      ? `Changed ${abbr(o.before)} to ${abbr(o.after)}: defeated ${incumbent.name} (${abbr(incumbent.party)})`
      : `Changed ${abbr(o.before)} to ${abbr(o.after)}: seat held by ${incumbent.name} (${abbr(incumbent.party)}), who was not on the ballot`;
  } else {
    status = o.onBallot ? 'Party unchanged' : 'Not on the 2026 ballot';
  }
  return {
    'data-tip-title': `${o.holder} (${abbr(o.after)})`,
    'data-tip-district': kyDistrictShortName(ref),
    'data-tip-detail': status,
    'data-tip-href': kyDistrictPath(ref),
  };
}
