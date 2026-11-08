import type { KyElectionParty } from '@/lib/ky-2026-election-seat-changes';

/**
 * Party colors for election charts. Full strength = the site's `--party-d` / `--party-r`
 * tokens, used for seats that changed party (the story). The tints mark seats that did
 * not change (context).
 *
 * Validated with the dataviz skill's validate_palette.js (light, surface #ffffff,
 * --pairs all) on all four: CVD worst ΔE 11.2, normal-vision worst ΔE 16.8, both PASS.
 * The tints sit below 3:1 on white (WARN), so every chart ships with direct labels and
 * the seat list as its table view. Changed seats also carry a non-color cue: labels on
 * the map, and grouping at the party boundary in the seat charts.
 */
export const PARTY_FILL: Record<KyElectionParty, { changed: string; unchanged: string }> = {
  Democratic: { changed: '#4338CA', unchanged: '#8E92E2' },
  Republican: { changed: '#BE123C', unchanged: '#E8899C' },
};

export function seatFill(party: KyElectionParty, changed: boolean): string {
  return PARTY_FILL[party][changed ? 'changed' : 'unchanged'];
}
