import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildMemberRollVotes,
  rollCallHistoryFromLegiscan,
  type MemberRpcVoteRow,
  type MemberVoteBill,
} from "./member-profile-data";
import type { RollCallHistoryEntry } from "./roll-call-label";

// Synthetic fixtures only. People IDs, bill IDs and roll-call numbers are invented.
const PEOPLE_KEY = "90001";

function vote(overrides: Partial<MemberRpcVoteRow> & Pick<MemberRpcVoteRow, "id" | "bill_id">): MemberRpcVoteRow {
  return {
    date: "2026-02-10",
    chamber: "house",
    description: "House: Veto Override RCS# 155",
    yea_count: 91,
    nay_count: 0,
    absent_count: 9,
    nv_count: 0,
    passed: true,
    roll_call: [
      { legislator_id: PEOPLE_KEY, vote: "Yea" },
      { legislator_id: "90002", vote: "Nay" },
    ],
    roll_call_id: 5001,
    created_at: "2026-02-11T00:00:00Z",
    ...overrides,
  };
}

const billA: MemberVoteBill = {
  id: "bill-a",
  bill_number: "HB 900",
  title: "AN ACT relating to synthetic test fixtures.",
  status: "Passed",
  session: "2026 Regular Session",
};
const billB: MemberVoteBill = { ...billA, id: "bill-b", bill_number: "HB 901" };

const historyA: RollCallHistoryEntry[] = [
  { date: "2026-01-06", action: "introduced in House", chamber: "H" },
  { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H" },
];

const bills = new Map<string, MemberVoteBill>([
  [billA.id, billA],
  [billB.id, billB],
]);

describe("buildMemberRollVotes", () => {
  test("a mislabelled 'Veto Override' row takes its label from the matching passage action", () => {
    const out = buildMemberRollVotes(
      [vote({ id: "v1", bill_id: billA.id })],
      bills,
      new Map([[billA.id, historyA]]),
      PEOPLE_KEY,
    );
    assert.equal(out.votes.length, 1);
    const row = out.votes[0]!;
    assert.equal(row.label, "House: 3rd reading, passed 91-0");
    assert.equal(row.labelMatched, true);
    assert.doesNotMatch(row.label, /veto override|RCS#/i);
    assert.equal(row.myVote, "Yea");
    assert.equal(row.myBucket, "yea");
    assert.equal(row.bill?.bill_number, "HB 900");
  });

  test("an unmatched row gets the numbered fallback and the caption flag", () => {
    const out = buildMemberRollVotes(
      [vote({ id: "v2", bill_id: billA.id, yea_count: 20, nay_count: 21, absent_count: 59 })],
      bills,
      new Map([[billA.id, historyA]]),
      PEOPLE_KEY,
    );
    const row = out.votes[0]!;
    assert.equal(row.label, "House roll call no. 155");
    assert.equal(row.labelMatched, false);
  });

  test("a bill with NULL legiscan_history uses an empty history and the fallback label", () => {
    const historyByBillId = new Map([[billB.id, rollCallHistoryFromLegiscan(null)]]);
    assert.deepEqual(historyByBillId.get(billB.id), []);
    const out = buildMemberRollVotes(
      [vote({ id: "v3", bill_id: billB.id, description: "House: Veto Override RCS# 42" })],
      bills,
      historyByBillId,
      PEOPLE_KEY,
    );
    assert.equal(out.votes[0]!.label, "House roll call no. 42");
    assert.equal(out.votes[0]!.labelMatched, false);
  });

  test("a bill missing from the history map is treated like NULL history", () => {
    const out = buildMemberRollVotes([vote({ id: "v4", bill_id: billB.id })], bills, new Map(), PEOPLE_KEY);
    assert.equal(out.votes[0]!.label, "House roll call no. 155");
    assert.equal(out.votes[0]!.labelMatched, false);
  });

  test("a same-RCS# twin pair dedupes to one row and the tally counts it once", () => {
    const rows = [
      // RPC order is date DESC, id DESC: the later-synced twin comes first.
      vote({ id: "v6", bill_id: billA.id, roll_call_id: 5002, description: "House: Third Reading RCS# 155" }),
      vote({ id: "v5", bill_id: billA.id, roll_call_id: 5001 }),
    ];
    const out = buildMemberRollVotes(rows, bills, new Map([[billA.id, historyA]]), PEOPLE_KEY);
    assert.equal(out.votes.length, 1);
    assert.equal(out.totalRollCalls, 1);
    assert.equal(out.tally.yea, 1);
    // Ties keep the earliest roll_call_id, as on the bill page.
    assert.equal(out.votes[0]!.voteId, "v5");
  });

  test("a NULL roll_call_id twin of a keyed row is dropped", () => {
    const rows = [
      vote({ id: "v7", bill_id: billA.id, roll_call_id: 5001 }),
      vote({ id: "v8", bill_id: billA.id, roll_call_id: null }),
    ];
    const out = buildMemberRollVotes(rows, bills, new Map([[billA.id, historyA]]), PEOPLE_KEY);
    assert.deepEqual(
      out.votes.map((v) => v.voteId),
      ["v7"],
    );
    assert.equal(out.totalRollCalls, 1);
  });

  test("distinct roll calls sharing a date and tally both survive, on one bill or across bills", () => {
    const rows = [
      vote({ id: "v9", bill_id: billA.id, roll_call_id: 5010, description: "House: Veto Override RCS# 160" }),
      vote({ id: "v10", bill_id: billA.id, roll_call_id: 5011, description: "House: Veto Override RCS# 161" }),
      // A NULL-id row on another bill with the same date and tally is not a twin of bill A's rows.
      vote({ id: "v11", bill_id: billB.id, roll_call_id: null, description: "House: Veto Override RCS# 162" }),
    ];
    const out = buildMemberRollVotes(rows, bills, new Map([[billA.id, historyA]]), PEOPLE_KEY);
    assert.equal(out.totalRollCalls, 3);
    assert.equal(out.tally.yea, 3);
  });

  test("keeps the RPC order and tallies each bucket", () => {
    const rows = [
      vote({ id: "v12", bill_id: billA.id, date: "2026-03-01", roll_call_id: 5020, description: "House: Veto Override RCS# 170", roll_call: [{ legislator_id: PEOPLE_KEY, vote: "Nay" }] }),
      vote({ id: "v13", bill_id: billB.id, date: "2026-02-20", roll_call_id: 5019, description: "House: Veto Override RCS# 169", roll_call: [{ legislator_id: PEOPLE_KEY, vote: "NV" }] }),
      vote({ id: "v14", bill_id: billA.id, date: "2026-02-10", roll_call_id: 5001 }),
    ];
    const out = buildMemberRollVotes(rows, bills, new Map([[billA.id, historyA]]), PEOPLE_KEY);
    assert.deepEqual(
      out.votes.map((v) => v.voteId),
      ["v12", "v13", "v14"],
    );
    assert.equal(out.tally.yea, 1);
    assert.equal(out.tally.nay, 1);
    assert.equal(out.tally.notVoting, 1);
  });

  test("no row exposes the raw description or the history", () => {
    const out = buildMemberRollVotes(
      [vote({ id: "v15", bill_id: billA.id })],
      bills,
      new Map([[billA.id, historyA]]),
      PEOPLE_KEY,
    );
    const row = out.votes[0]! as unknown as Record<string, unknown>;
    assert.equal("description" in row, false);
    assert.equal("history" in row, false);
    assert.equal("legiscan_history" in row, false);
    assert.doesNotMatch(JSON.stringify(out), /Veto Override|RCS#/);
  });
});

describe("rollCallHistoryFromLegiscan", () => {
  test("keeps date, action and chamber and skips malformed entries", () => {
    assert.deepEqual(
      rollCallHistoryFromLegiscan([
        { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H", importance: 1, chamber_id: 1 },
        { date: "2026-02-11", action: "received in Senate" },
        { date: "2026-02-12" },
        null,
        "junk",
      ]),
      [
        { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H" },
        { date: "2026-02-11", action: "received in Senate", chamber: "" },
      ],
    );
    assert.deepEqual(rollCallHistoryFromLegiscan(undefined), []);
    assert.deepEqual(rollCallHistoryFromLegiscan({}), []);
  });
});
