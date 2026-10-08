import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ROLL_CALL_OUTCOME_POLICY,
  ROLL_CALL_OUTCOME_TOOLTIP,
  UNMATCHED_ROLL_CALL_CAPTION,
  dedupeRollCallRows,
  deriveRollCallLabel,
  historyActionMatchesTally,
  matchRollCallToHistory,
  matchVotesToHistory,
  rollCallChamberFromDesc,
  rollCallNumberFromDesc,
  rollCallOutcomeLabel,
  type RollCallHistoryEntry,
} from "./roll-call-label";

// Synthetic history modelled on Kentucky's action-string format.
const history: RollCallHistoryEntry[] = [
  { date: "2026-01-06", action: "introduced in House", chamber: "H" },
  { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H" },
  { date: "2026-03-04", action: "3rd reading, passed 38-0 with Committee Substitute (1)", chamber: "S" },
  { date: "2026-04-15", action: "veto overridden, passed 60-35", chamber: "H" },
];

describe("rollCallChamberFromDesc / rollCallNumberFromDesc", () => {
  test("reads the chamber prefix", () => {
    assert.equal(rollCallChamberFromDesc("House: Veto Override RCS# 155"), "H");
    assert.equal(rollCallChamberFromDesc("  senate: Third Reading RSN# 12"), "S");
    assert.equal(rollCallChamberFromDesc("Third Reading"), null);
    assert.equal(rollCallChamberFromDesc(null), null);
  });

  test("parses RCS# and RSN# numbers", () => {
    assert.equal(rollCallNumberFromDesc("House: Veto Override RCS# 155"), "155");
    assert.equal(rollCallNumberFromDesc("Senate: Third Reading RSN#12"), "12");
    assert.equal(rollCallNumberFromDesc("House: Third Reading"), null);
    assert.equal(rollCallNumberFromDesc(undefined), null);
  });
});

describe("historyActionMatchesTally", () => {
  test("8-0 does not match an action that says 38-0", () => {
    assert.equal(historyActionMatchesTally("3rd reading, passed 38-0", 8, 0), false);
    assert.equal(historyActionMatchesTally("3rd reading, passed 38-0", 38, 0), true);
  });

  test("8-0 does not match 8-01 and matches at the string edges", () => {
    assert.equal(historyActionMatchesTally("passed 8-01", 8, 0), false);
    assert.equal(historyActionMatchesTally("8-0", 8, 0), true);
    assert.equal(historyActionMatchesTally("passed 8-0 with Committee Substitute (1)", 8, 0), true);
  });

  test("accepts en-dash tallies and collapsed whitespace", () => {
    assert.equal(historyActionMatchesTally("3rd reading, passed 91–0", 91, 0), true);
    assert.equal(historyActionMatchesTally("3rd   reading,\npassed 91-0", 91, 0), true);
  });

  test("rejects missing or non-integer counts", () => {
    assert.equal(historyActionMatchesTally("passed 91-0", null, 0), false);
    assert.equal(historyActionMatchesTally("passed 91-0", 91, undefined), false);
    assert.equal(historyActionMatchesTally("passed 91-0", Number.NaN, 0), false);
    assert.equal(historyActionMatchesTally("", 91, 0), false);
  });
});

describe("matchRollCallToHistory", () => {
  test("prefers the same-date entry when several actions carry the tally", () => {
    const twoReadings: RollCallHistoryEntry[] = [
      { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H" },
      { date: "2026-03-20", action: "concurred in Senate Committee Substitute, passed 91-0", chamber: "H" },
    ];
    const vote = { desc: "House: Veto Override RCS# 300", yea: 91, nay: 0, date: "2026-03-20" };
    assert.equal(matchRollCallToHistory(vote, twoReadings), 1);
  });

  test("falls back to the first candidate when no date matches", () => {
    const twoReadings: RollCallHistoryEntry[] = [
      { date: "2026-02-10", action: "3rd reading, passed 91-0", chamber: "H" },
      { date: "2026-03-20", action: "concurred in Senate Committee Substitute, passed 91-0", chamber: "H" },
    ];
    const vote = { desc: "House: Veto Override RCS# 300", yea: 91, nay: 0, date: "2026-03-21" };
    assert.equal(matchRollCallToHistory(vote, twoReadings), 0);
  });

  test("does not match an action from the other chamber", () => {
    const vote = { desc: "House: Veto Override RCS# 201", yea: 38, nay: 0, date: "2026-03-04" };
    assert.equal(matchRollCallToHistory(vote, history), -1);
  });

  test("a vote with no chamber may match any chamber", () => {
    const vote = { desc: "Third Reading", yea: 38, nay: 0, date: "2026-03-04" };
    assert.equal(matchRollCallToHistory(vote, history), 2);
  });
});

describe("deriveRollCallLabel", () => {
  test("a 'Veto Override' desc whose tally matches a passage action takes its label from the history", () => {
    const result = deriveRollCallLabel(
      { desc: "House: Veto Override RCS# 155", yea: 91, nay: 0, date: "2026-02-10" },
      history,
    );
    assert.deepEqual(result, {
      label: "House: 3rd reading, passed 91-0",
      matched: true,
      chamber: "H",
      rollCallNumber: "155",
    });
  });

  test("a matched Senate roll call gets the Senate prefix", () => {
    const result = deriveRollCallLabel(
      { desc: "Senate: Third Reading RSN# 12", yea: 38, nay: 0, date: "2026-03-04" },
      history,
    );
    assert.equal(result.label, "Senate: 3rd reading, passed 38-0 with Committee Substitute (1)");
    assert.equal(result.matched, true);
  });

  test("no match gives 'House roll call no. 155'", () => {
    const result = deriveRollCallLabel(
      { desc: "House: Veto Override RCS# 155", yea: 20, nay: 21, date: "2026-03-30" },
      history,
    );
    assert.deepEqual(result, {
      label: "House roll call no. 155",
      matched: false,
      chamber: "H",
      rollCallNumber: "155",
    });
  });

  test("no match on a Senate roll call gives 'Senate roll call no. 12'", () => {
    const result = deriveRollCallLabel({ desc: "Senate: Third Reading RSN# 12", yea: 1, nay: 2 }, history);
    assert.equal(result.label, "Senate roll call no. 12");
  });

  test("no match and no number gives 'House roll call'", () => {
    const result = deriveRollCallLabel({ desc: "House: Third Reading", yea: 1, nay: 2 }, history);
    assert.equal(result.label, "House roll call");
    assert.equal(result.rollCallNumber, null);
  });

  test("no chamber and no number gives 'Roll call'", () => {
    const result = deriveRollCallLabel({ desc: null, yea: 1, nay: 2 }, history);
    assert.deepEqual(result, { label: "Roll call", matched: false, chamber: null, rollCallNumber: null });
  });

  test("the 8-0 vs 38-0 boundary leaves an 8-0 vote unmatched", () => {
    const result = deriveRollCallLabel(
      { desc: "Senate: Third Reading RSN# 40", yea: 8, nay: 0, date: "2026-03-04" },
      history,
    );
    assert.equal(result.matched, false);
    assert.equal(result.label, "Senate roll call no. 40");
  });

  test("reads the raw ky_votes spelling (description, yea_count, nay_count)", () => {
    const result = deriveRollCallLabel(
      { description: "House: Veto Override RCS# 155", yea_count: 60, nay_count: 35, date: "2026-04-15" },
      history,
    );
    assert.equal(result.label, "House: Veto overridden, passed 60-35");
  });

  test("no fallback label contains 'floor'", () => {
    const descs = [
      "House: Veto Override RCS# 155",
      "Senate: Third Reading RSN# 12",
      "House: Third Reading",
      "Senate: Third Reading",
      "Third Reading",
      "",
      null,
      undefined,
    ];
    for (const desc of descs) {
      const result = deriveRollCallLabel({ desc, yea: 1, nay: 2, date: "2026-01-01" }, history);
      assert.equal(result.matched, false);
      assert.doesNotMatch(result.label, /floor/i, `label for desc ${String(desc)}`);
      const empty = deriveRollCallLabel({ desc, yea: 1, nay: 2 }, []);
      assert.doesNotMatch(empty.label, /floor/i, `empty-history label for desc ${String(desc)}`);
    }
  });

  test("exports the one unmatched-roll-call caption", () => {
    assert.equal(
      UNMATCHED_ROLL_CALL_CAPTION,
      "The official bill history does not say which motion this vote was on.",
    );
  });
});

describe("matchVotesToHistory", () => {
  test("attaches matched votes by history index and returns the rest as unmatched", () => {
    const passage = { roll_call_id: 1, desc: "House: Veto Override RCS# 155", yea: 91, nay: 0, date: "2026-02-10" };
    const override = { roll_call_id: 2, desc: "House: Veto Override RCS# 400", yea: 60, nay: 35, date: "2026-04-15" };
    const orphan = { roll_call_id: 3, desc: "House: Veto Override RCS# 156", yea: 20, nay: 21, date: "2026-02-11" };
    const { attached, unmatched } = matchVotesToHistory([passage, override, orphan], history);
    assert.deepEqual(attached.get(1), [passage]);
    assert.deepEqual(attached.get(3), [override]);
    assert.equal(attached.size, 2);
    assert.deepEqual(unmatched, [orphan]);
  });
});

describe("dedupeRollCallRows", () => {
  test("drops a NULL roll_call_id twin when a keyed row has the same tally", () => {
    const keyed = { roll_call_id: 10, date: "2026-02-10", desc: "House: Veto Override RCS# 155", yea: 91, nay: 0, absent: 9, nv: 0 };
    const unkeyed = { roll_call_id: undefined, date: "2026-02-10", desc: "House: Third Reading", yea: 91, nay: 0, absent: 9, nv: 0 };
    assert.deepEqual(dedupeRollCallRows([unkeyed, keyed]), [keyed]);
  });

  test("keeps a NULL roll_call_id row whose tally no keyed row shares", () => {
    const keyed = { roll_call_id: 10, date: "2026-02-10", desc: "House: Veto Override RCS# 155", yea: 91, nay: 0, absent: 9, nv: 0 };
    const unkeyed = { roll_call_id: undefined, date: "2026-02-11", desc: "House: Third Reading", yea: 50, nay: 40, absent: 10, nv: 0 };
    assert.deepEqual(dedupeRollCallRows([keyed, unkeyed]), [keyed, unkeyed]);
  });

  test("collapses a same-RCS# twin and prefers the row with NV populated", () => {
    const first = { roll_call_id: 10, date: "2026-02-10", desc: "House: Veto Override RCS# 155", yea: 91, nay: 0, absent: 7, nv: 0 };
    const second = { roll_call_id: 11, date: "2026-02-10", desc: "House: Third Reading RCS# 155", yea: 91, nay: 0, absent: 7, nv: 2 };
    assert.deepEqual(dedupeRollCallRows([first, second]), [second]);
  });

  test("a same-RCS# twin with no NV keeps the earliest row", () => {
    const first = { roll_call_id: 10, date: "2026-02-10", desc: "Senate: Third Reading RSN# 12", yea: 38, nay: 0, absent: 0, nv: 0 };
    const second = { roll_call_id: 11, date: "2026-02-10", desc: "Senate: Third Reading W/SCS 1 RSN# 12", yea: 38, nay: 0, absent: 0, nv: 0 };
    assert.deepEqual(dedupeRollCallRows([first, second]), [first]);
  });

  test("keeps legitimate same-tally pairs with different RCS# numbers", () => {
    const a = { roll_call_id: 10, date: "2026-03-01", desc: "House: Veto Override RCS# 155", yea: 95, nay: 0, absent: 5, nv: 0 };
    const b = { roll_call_id: 11, date: "2026-03-01", desc: "House: Veto Override RCS# 156", yea: 95, nay: 0, absent: 5, nv: 0 };
    assert.deepEqual(dedupeRollCallRows([a, b]), [a, b]);
  });

  test("keeps keyed rows that carry no roll-call number", () => {
    const a = { roll_call_id: 10, date: "2026-03-01", desc: "House: Third Reading", yea: 95, nay: 0, absent: 5, nv: 0 };
    const b = { roll_call_id: 11, date: "2026-03-01", desc: "House: Third Reading", yea: 95, nay: 0, absent: 5, nv: 0 };
    assert.deepEqual(dedupeRollCallRows([a, b]), [a, b]);
  });

  test("accepts the raw ky_votes spelling (description, *_count)", () => {
    const keyed = {
      roll_call_id: 20,
      date: "2026-02-10",
      description: "House: Veto Override RCS# 155",
      yea_count: 91,
      nay_count: 0,
      absent_count: 9,
      nv_count: null,
    };
    const twin = { ...keyed, roll_call_id: 21, description: "House: Third Reading RCS# 155", nv_count: 1 };
    const unkeyed = { ...keyed, roll_call_id: null, description: "House: Third Reading" };
    const distinct = { ...keyed, roll_call_id: 22, description: "House: Veto Override RCS# 156" };
    assert.deepEqual(dedupeRollCallRows([unkeyed, keyed, twin, distinct]), [twin, distinct]);
  });
});

describe("rollCallOutcomeLabel (WS3-03a)", () => {
  test("'none' never shows a chip", () => {
    assert.equal(rollCallOutcomeLabel(true, "none"), null);
    assert.equal(rollCallOutcomeLabel(false, "none"), null);
    assert.equal(rollCallOutcomeLabel(null, "none"), null);
  });

  test("'all' labels every vote with a stored result", () => {
    assert.equal(rollCallOutcomeLabel(true, "all"), "Vote result: passed");
    assert.equal(rollCallOutcomeLabel(false, "all"), "Vote result: failed");
    assert.equal(rollCallOutcomeLabel(null, "all"), null);
  });

  test("'failed_only' labels only failed votes", () => {
    assert.equal(rollCallOutcomeLabel(true, "failed_only"), null);
    assert.equal(rollCallOutcomeLabel(false, "failed_only"), "Vote result: failed");
    assert.equal(rollCallOutcomeLabel(null, "failed_only"), null);
  });

  test("a missing result never shows a chip", () => {
    for (const policy of ["none", "all", "failed_only"] as const) {
      assert.equal(rollCallOutcomeLabel(undefined, policy), null);
    }
  });

  test("the applied policy is the owner's option (c), failed only", () => {
    assert.equal(ROLL_CALL_OUTCOME_POLICY, "failed_only");
    assert.equal(rollCallOutcomeLabel(true, ROLL_CALL_OUTCOME_POLICY), null);
    assert.equal(rollCallOutcomeLabel(false, ROLL_CALL_OUTCOME_POLICY), "Vote result: failed");
  });
});

describe("WS3-03a copy rules", () => {
  const strings = [
    UNMATCHED_ROLL_CALL_CAPTION,
    ROLL_CALL_OUTCOME_TOOLTIP,
    rollCallOutcomeLabel(true, "all"),
    rollCallOutcomeLabel(false, "all"),
  ];

  test("new strings have no em dash and no semicolon", () => {
    for (const s of strings) {
      assert.ok(s, "expected a string");
      assert.doesNotMatch(s, /\u2014/, `em dash in: ${s}`);
      assert.doesNotMatch(s, /;/, `semicolon in: ${s}`);
    }
  });

  test("the tooltip is the exact WP copy", () => {
    assert.equal(ROLL_CALL_OUTCOME_TOOLTIP, "This is the result of this one vote, not the status of the bill.");
  });

  test("unmatched row titles never say \"floor\"", () => {
    const unmatched = deriveRollCallLabel(
      { date: "2026-02-11", desc: "House: Veto Override RCS# 156", yea: 20, nay: 21 },
      history,
    );
    assert.equal(unmatched.label, "House roll call no. 156");
    assert.doesNotMatch(unmatched.label, /floor/i);
  });
});
