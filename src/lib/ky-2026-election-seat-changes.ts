/**
 * Kentucky General Assembly seats that changed party in the November 3, 2026 general
 * election. Hand-maintained: one-time reference data, not a sync.
 *
 * Source: Kentucky State Board of Elections election-night reporting, statewide view
 * (`KY_2026_ELECTION.sourceUrl`), read 2026-11-08 at its "Last Updated 11/8/2026
 * 12:35:53 PM" timestamp with all 120 counties and 3,189 precincts reporting. The
 * winner and party of all 119 legislative contests were diffed against the
 * `ky_legislators` active roster; the 10 districts below are every seat whose winning
 * party differs from the incumbent's. Candidate names and vote totals are as listed on
 * that page, converted from its CAPITALIZED surnames to normal case.
 *
 * RESULTS ARE UNOFFICIAL. When the State Board of Elections certifies the 2026 general
 * election, re-check every row and the close race below against the certified totals,
 * then set `resultsStatus` to 'certified' and update `resultsAsOf`.
 */

export type KyElectionParty = 'Republican' | 'Democratic';

export interface KyElectionCandidateResult {
  name: string;
  party: KyElectionParty;
  votes: number;
}

export interface KySeatChange {
  chamber: 'house' | 'senate';
  district: number;
  /** The member holding the seat on election day (still in office until January 2027). */
  incumbent: {
    /** Display name as stored in `ky_legislators`. */
    name: string;
    party: KyElectionParty;
    /** `ky_legislators.profile_slug`; profile pages resolve inactive members too. */
    profileSlug: string;
    /** False when the incumbent was not a candidate in the general election (open seat). */
    onBallot: boolean;
  };
  /** Every named candidate in the contest, winner first. Write-ins excluded. */
  results: [KyElectionCandidateResult, ...KyElectionCandidateResult[]];
}

export const KY_2026_ELECTION = {
  electionDate: '2026-11-03',
  resultsStatus: 'unofficial' as 'unofficial' | 'certified',
  /** Calendar date of the source page's "Last Updated" timestamp. */
  resultsAsOf: '2026-11-08',
  sourceName: 'Kentucky State Board of Elections',
  sourceUrl: 'https://vrsws.sos.ky.gov/liveresults?id=2',
  /** Seats on the 2026 ballot: all 100 House seats, the 19 even-numbered Senate districts. */
  seatsOnBallot: { house: 100, senate: 19 },
  /** Chamber seats held by each party going into the election (`ky_legislators`, 2026-11-08). */
  compositionBefore: {
    house: { Republican: 80, Democratic: 20 },
    senate: { Republican: 32, Democratic: 6 },
  },
} as const;

export const KY_2026_SEAT_CHANGES: readonly KySeatChange[] = [
  {
    chamber: 'house',
    district: 28,
    incumbent: { name: 'Jared Bauman', party: 'Republican', profileSlug: 'jared-bauman', onBallot: true },
    results: [
      { name: 'Almaria Baker', party: 'Democratic', votes: 7090 },
      { name: 'Jared A. Bauman', party: 'Republican', votes: 6116 },
    ],
  },
  {
    chamber: 'house',
    district: 29,
    incumbent: { name: 'Chris Lewis', party: 'Republican', profileSlug: 'chris-lewis', onBallot: true },
    results: [
      { name: 'Cassie Blausey', party: 'Democratic', votes: 9596 },
      { name: 'Chris Lewis', party: 'Republican', votes: 8647 },
    ],
  },
  {
    chamber: 'house',
    district: 31,
    incumbent: { name: 'Susan Witten', party: 'Republican', profileSlug: 'susan-witten', onBallot: true },
    results: [
      { name: 'Tim Hall', party: 'Democratic', votes: 10375 },
      { name: 'Susan Tyler Witten', party: 'Republican', votes: 7825 },
    ],
  },
  {
    chamber: 'house',
    district: 33,
    incumbent: { name: 'Jason Nemes', party: 'Republican', profileSlug: 'jason-nemes', onBallot: true },
    results: [
      { name: 'Jennifer Hardin', party: 'Democratic', votes: 9857 },
      { name: 'Jason Michael Nemes', party: 'Republican', votes: 9323 },
    ],
  },
  {
    chamber: 'house',
    district: 39,
    incumbent: { name: 'Matt Lockett', party: 'Republican', profileSlug: 'matt-lockett', onBallot: true },
    results: [
      { name: 'Ryan Stanford', party: 'Democratic', votes: 7846 },
      { name: 'Matt Lockett', party: 'Republican', votes: 7630 },
    ],
  },
  {
    chamber: 'house',
    district: 48,
    incumbent: { name: 'Ken Fleming', party: 'Republican', profileSlug: 'ken-fleming', onBallot: true },
    results: [
      { name: 'Suhas Kulkarni', party: 'Democratic', votes: 11446 },
      { name: 'Ken Fleming', party: 'Republican', votes: 10635 },
    ],
  },
  {
    chamber: 'house',
    district: 65,
    incumbent: { name: 'Stephanie Dietz', party: 'Republican', profileSlug: 'stephanie-dietz', onBallot: true },
    results: [
      { name: 'Aaron John Currin', party: 'Democratic', votes: 7648 },
      { name: 'Stephanie A. Dietz', party: 'Republican', votes: 6769 },
    ],
  },
  {
    chamber: 'house',
    district: 95,
    incumbent: { name: 'Ashley Laferty', party: 'Democratic', profileSlug: 'ashley-laferty', onBallot: false },
    results: [
      { name: 'Tanner Hesterberg', party: 'Republican', votes: 8452 },
      { name: 'Johnny Ray Turner', party: 'Democratic', votes: 5598 },
    ],
  },
  {
    chamber: 'senate',
    district: 6,
    incumbent: { name: 'Lindsey Tichenor', party: 'Republican', profileSlug: 'lindsey-tichenor', onBallot: true },
    results: [
      { name: 'Christian Furman', party: 'Democratic', votes: 24735 },
      { name: 'Lindsey Tichenor', party: 'Republican', votes: 23582 },
    ],
  },
  {
    chamber: 'senate',
    district: 36,
    incumbent: { name: 'Julie Adams', party: 'Republican', profileSlug: 'julie-adams', onBallot: true },
    results: [
      { name: 'Sarah Cole McIntosh', party: 'Democratic', votes: 26755 },
      { name: 'Julie Raque Adams', party: 'Republican', votes: 24663 },
    ],
  },
];

/**
 * The narrowest legislative contest statewide in the unofficial count. The seat did not
 * change party, but a recanvass or recount here is the likeliest way this list changes.
 */
export const KY_2026_CLOSEST_RACE: {
  chamber: 'house' | 'senate';
  district: number;
  results: [KyElectionCandidateResult, KyElectionCandidateResult];
} = {
  chamber: 'house',
  district: 36,
  results: [
    { name: 'John F. Hodgson', party: 'Republican', votes: 10389 },
    { name: 'William "Woody" Zorn', party: 'Democratic', votes: 10289 },
  ],
};

/**
 * Party of every seat going into the election, one character per district starting at
 * district 1 (`R` / `D`). Snapshot of the active `ky_legislators` roster on 2026-11-08,
 * frozen here because the roster turns over in January and would then describe the
 * winners instead. Senate odd-numbered seats were not on the 2026 ballot.
 */
export const KY_PRE_ELECTION_SEAT_PARTIES = {
  house:
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRDRDRDDRRDRDDDDDDDRRRRRRRRRRDRRRRRRRRRDRRRRRRRDDDRDRRRRRRRRRRRRRDRDRRRRR',
  senate: 'RRRRRRRRRRRRDRRRRRDRRRRRRDRRRRRRDRDRDR',
} as const;

export type KyChamberComposition = Record<KyElectionParty, number>;

export interface KySeatOutcome {
  chamber: 'house' | 'senate';
  district: number;
  before: KyElectionParty;
  after: KyElectionParty;
  /** The matching row of `KY_2026_SEAT_CHANGES` when the seat changed party. */
  change: KySeatChange | null;
}

const PARTY_CODE: Record<string, KyElectionParty> = { R: 'Republican', D: 'Democratic' };

/** Every seat in a chamber with its party before and after the election, district 1 first. */
export function seatOutcomes(
  chamber: 'house' | 'senate',
  changes: readonly KySeatChange[] = KY_2026_SEAT_CHANGES,
): KySeatOutcome[] {
  return [...KY_PRE_ELECTION_SEAT_PARTIES[chamber]].map((code, i) => {
    const district = i + 1;
    const before = PARTY_CODE[code];
    const change = changes.find((c) => c.chamber === chamber && c.district === district) ?? null;
    return { chamber, district, before, after: change ? change.results[0].party : before, change };
  });
}

/** Winner's lead over the runner-up, in votes and in points of all named-candidate votes. */
export function winningMargin(results: readonly KyElectionCandidateResult[]): {
  votes: number;
  points: number;
} {
  const total = results.reduce((sum, r) => sum + r.votes, 0);
  const votes = results[0].votes - (results[1]?.votes ?? 0);
  return { votes, points: total > 0 ? (votes / total) * 100 : 0 };
}

/** Seats per party after the election: the pre-election count adjusted by each change. */
export function compositionAfter(
  chamber: 'house' | 'senate',
  changes: readonly KySeatChange[] = KY_2026_SEAT_CHANGES,
): KyChamberComposition {
  const after: KyChamberComposition = { ...KY_2026_ELECTION.compositionBefore[chamber] };
  for (const c of changes) {
    if (c.chamber !== chamber) continue;
    after[c.incumbent.party] -= 1;
    after[c.results[0].party] += 1;
  }
  return after;
}

/** Changes in one direction, e.g. seats a Democratic candidate won from a Republican incumbent. */
export function seatChangesBetween(
  from: KyElectionParty,
  to: KyElectionParty,
  changes: readonly KySeatChange[] = KY_2026_SEAT_CHANGES,
): KySeatChange[] {
  return changes.filter((c) => c.incumbent.party === from && c.results[0].party === to);
}
