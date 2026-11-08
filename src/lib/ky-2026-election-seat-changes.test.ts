import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  KY_2026_CLOSEST_RACE,
  KY_2026_ELECTION,
  KY_2026_SEAT_CHANGES,
  KY_PRE_ELECTION_SEAT_PARTIES,
  compositionAfter,
  seatChangesBetween,
  seatOutcomes,
  winningMargin,
} from './ky-2026-election-seat-changes';

const margin = (r: { votes: number }[]) => r[0].votes - r[1].votes;
const lastName = (name: string) => name.trim().split(/\s+/).pop()!.toLowerCase();

describe('KY_2026_SEAT_CHANGES', () => {
  test('every row is a real party change', () => {
    for (const c of KY_2026_SEAT_CHANGES) {
      assert.notEqual(c.results[0].party, c.incumbent.party, `${c.chamber} ${c.district}`);
    }
  });

  test('the winner is listed first and has the most votes', () => {
    for (const c of KY_2026_SEAT_CHANGES) {
      const top = Math.max(...c.results.map((r) => r.votes));
      assert.equal(c.results[0].votes, top, `${c.chamber} ${c.district}`);
      assert.ok(margin(c.results) > 0, `${c.chamber} ${c.district} is not a tie`);
    }
  });

  test('districts are unique and were on the 2026 ballot', () => {
    const keys = KY_2026_SEAT_CHANGES.map((c) => `${c.chamber}-${c.district}`);
    assert.equal(new Set(keys).size, keys.length);
    for (const c of KY_2026_SEAT_CHANGES) {
      if (c.chamber === 'house') assert.ok(c.district >= 1 && c.district <= 100);
      // Only even-numbered Senate districts were up in 2026.
      else assert.ok(c.district >= 2 && c.district <= 38 && c.district % 2 === 0);
    }
  });

  test('an incumbent on the ballot appears in the results under the same party', () => {
    for (const c of KY_2026_SEAT_CHANGES) {
      const match = c.results.find(
        (r) => r.party === c.incumbent.party && lastName(r.name) === lastName(c.incumbent.name),
      );
      assert.equal(Boolean(match), c.incumbent.onBallot, `${c.chamber} ${c.district}`);
    }
  });
});

describe('composition', () => {
  test('pre-election counts fill each chamber', () => {
    const { house, senate } = KY_2026_ELECTION.compositionBefore;
    assert.equal(house.Republican + house.Democratic, 100);
    assert.equal(senate.Republican + senate.Democratic, 38);
  });

  test('post-election counts follow from the changes', () => {
    assert.deepEqual(compositionAfter('house'), { Republican: 74, Democratic: 26 });
    assert.deepEqual(compositionAfter('senate'), { Republican: 30, Democratic: 8 });
  });

  test('direction counts', () => {
    assert.equal(seatChangesBetween('Republican', 'Democratic').length, 9);
    assert.equal(seatChangesBetween('Democratic', 'Republican').length, 1);
  });
});

describe('KY_PRE_ELECTION_SEAT_PARTIES / seatOutcomes', () => {
  test('snapshot covers every seat and matches the pre-election counts', () => {
    for (const chamber of ['house', 'senate'] as const) {
      const s = KY_PRE_ELECTION_SEAT_PARTIES[chamber];
      const { Republican, Democratic } = KY_2026_ELECTION.compositionBefore[chamber];
      assert.equal(s.length, Republican + Democratic);
      assert.match(s, /^[RD]+$/);
      assert.equal([...s].filter((c) => c === 'D').length, Democratic);
    }
  });

  test("each change's incumbent party matches the snapshot", () => {
    for (const c of KY_2026_SEAT_CHANGES) {
      const code = KY_PRE_ELECTION_SEAT_PARTIES[c.chamber][c.district - 1];
      assert.equal(code, c.incumbent.party[0], `${c.chamber} ${c.district}`);
    }
  });

  test('outcomes agree with compositionAfter and flag exactly the changed seats', () => {
    for (const chamber of ['house', 'senate'] as const) {
      const outcomes = seatOutcomes(chamber);
      const after = compositionAfter(chamber);
      assert.equal(outcomes.filter((o) => o.after === 'Democratic').length, after.Democratic);
      assert.equal(outcomes.filter((o) => o.after === 'Republican').length, after.Republican);
      assert.deepEqual(
        outcomes.filter((o) => o.change).map((o) => o.district),
        KY_2026_SEAT_CHANGES.filter((c) => c.chamber === chamber).map((c) => c.district).sort((a, b) => a - b),
      );
      for (const o of outcomes) assert.equal(o.before !== o.after, Boolean(o.change));
    }
  });
});

describe('winningMargin', () => {
  test('votes and points of named-candidate votes', () => {
    const m = winningMargin([
      { name: 'A', party: 'Democratic', votes: 7846 },
      { name: 'B', party: 'Republican', votes: 7630 },
    ]);
    assert.equal(m.votes, 216);
    assert.equal(m.points.toFixed(1), '1.4');
  });
});

describe('KY_2026_CLOSEST_RACE', () => {
  test('is closer than every seat that changed party and did not change party itself', () => {
    const closest = margin(KY_2026_CLOSEST_RACE.results);
    assert.ok(closest > 0);
    for (const c of KY_2026_SEAT_CHANGES) assert.ok(closest < margin(c.results));
    assert.ok(
      !KY_2026_SEAT_CHANGES.some(
        (c) => c.chamber === KY_2026_CLOSEST_RACE.chamber && c.district === KY_2026_CLOSEST_RACE.district,
      ),
    );
  });
});
