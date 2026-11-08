import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { kyDistrictShortName } from '@/lib/ky-district-pages';
import type { KySeatOutcome } from '@/lib/ky-2026-election-seat-changes';

/** Tooltip text for one seat: the result leads, the district follows. */
export function seatTip(o: KySeatOutcome): { title: string; detail: string } {
  const district = kyDistrictShortName({ chamber: o.chamber, districtNumber: o.district });
  if (o.change) {
    const [winner] = o.change.results;
    const { incumbent } = o.change;
    const abbr = formatPartyLetterAbbrev;
    return {
      title: `${winner.name} (${abbr(winner.party)}) won`,
      detail: incumbent.onBallot
        ? `${district} · defeated ${incumbent.name} (${abbr(incumbent.party)})`
        : `${district} · open seat, previously ${incumbent.party}`,
    };
  }
  const onBallot = o.chamber === 'house' || o.district % 2 === 0;
  return {
    title: `${o.after} · ${onBallot ? 'no change' : 'not on the 2026 ballot'}`,
    detail: district,
  };
}
