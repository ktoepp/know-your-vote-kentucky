import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TEXT_TYPE_LABELS,
  billChangedAfterIntroduction,
  selectCurrentBillText,
  textDateOrNull,
} from "./bill-text-versions";

// Synthetic legiscan_texts entries modelled on Kentucky rows (dates are often 0000-00-00).
type T = { doc_id: number; type: string; date?: string | null };

describe("textDateOrNull", () => {
  test("keeps real dates and drops KY placeholders", () => {
    assert.equal(textDateOrNull("2026-03-04"), "2026-03-04");
    assert.equal(textDateOrNull("0000-00-00"), null);
    assert.equal(textDateOrNull(""), null);
    assert.equal(textDateOrNull(undefined), null);
    assert.equal(textDateOrNull(null), null);
    assert.equal(textDateOrNull("March 4"), null);
  });
});

describe("selectCurrentBillText", () => {
  test("returns null for an empty or missing list", () => {
    assert.equal(selectCurrentBillText([]), null);
    assert.equal(selectCurrentBillText(null), null);
    assert.equal(selectCurrentBillText(undefined), null);
  });

  test("ranks by finality when every date is 0000-00-00", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Introduced", date: "0000-00-00" },
      { doc_id: 2, type: "Comm Sub", date: "0000-00-00" },
      { doc_id: 3, type: "Engrossed", date: "0000-00-00" },
      { doc_id: 4, type: "Amended", date: "0000-00-00" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 3);
  });

  test("an undated Enrolled beats a dated Engrossed", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Introduced", date: "2026-01-06" },
      { doc_id: 2, type: "Enrolled", date: "0000-00-00" },
      { doc_id: 3, type: "Engrossed", date: "2026-02-10" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 2);
  });

  test("a Comm Sub after Introduced is current", () => {
    const texts: T[] = [
      { doc_id: 10, type: "Introduced", date: "0000-00-00" },
      { doc_id: 11, type: "Comm Sub", date: "0000-00-00" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 11);
  });

  test("Chaptered outranks Enrolled regardless of array order", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Chaptered" },
      { doc_id: 2, type: "Enrolled" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 1);
  });

  test("within one type, a real date breaks the tie before array order", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Comm Sub", date: "2026-02-20" },
      { doc_id: 2, type: "Comm Sub", date: "2026-02-01" },
      { doc_id: 3, type: "Comm Sub", date: "0000-00-00" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 1);
  });

  test("within one type with no real dates, the later array index wins", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Comm Sub", date: "0000-00-00" },
      { doc_id: 2, type: "Comm Sub", date: "0000-00-00" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 2);
  });

  test("an unknown type ranks below Draft", () => {
    const texts: T[] = [
      { doc_id: 1, type: "Draft" },
      { doc_id: 2, type: "Something New" },
    ];
    assert.equal(selectCurrentBillText(texts)?.doc_id, 1);
    assert.equal(selectCurrentBillText([{ doc_id: 9, type: "Something New" }])?.doc_id, 9);
  });
});

describe("billChangedAfterIntroduction", () => {
  const introducedOnly: T[] = [{ doc_id: 1, type: "Introduced" }];

  test("true when texts include a Comm Sub", () => {
    assert.equal(billChangedAfterIntroduction([...introducedOnly, { doc_id: 2, type: "Comm Sub" }], []), true);
  });

  test("true when texts include an Amended version", () => {
    assert.equal(billChangedAfterIntroduction([...introducedOnly, { doc_id: 2, type: "Amended" }], []), true);
  });

  test("true for a committee substitute history action", () => {
    const history = [{ action: "reported favorably, 1st reading, to Calendar with Committee Substitute (1)" }];
    assert.equal(billChangedAfterIntroduction(introducedOnly, history), true);
  });

  test("true for an adopted floor amendment", () => {
    const history = [{ action: "3rd reading, Floor Amendment (2) adopted, passed 90-2" }];
    assert.equal(billChangedAfterIntroduction(introducedOnly, history), true);
  });

  test("true for a title amendment", () => {
    assert.equal(billChangedAfterIntroduction(introducedOnly, [{ action: "Title Amendment adopted" }]), true);
    assert.equal(
      billChangedAfterIntroduction(introducedOnly, [{ action: "passed 37-0 with title amendment (1)" }]),
      true,
    );
  });

  test("false for an unchanged bill, a filed-only floor amendment, and empty input", () => {
    const history = [
      { action: "introduced in House" },
      { action: "to Judiciary (H)" },
      { action: "floor amendment (1) filed" },
      { action: "3rd reading, passed 91-0" },
    ];
    assert.equal(
      billChangedAfterIntroduction([...introducedOnly, { doc_id: 2, type: "Engrossed" }], history),
      false,
    );
    assert.equal(billChangedAfterIntroduction([], []), false);
    assert.equal(billChangedAfterIntroduction(null, undefined), false);
  });
});

describe("TEXT_TYPE_LABELS", () => {
  test("labels every ranked type", () => {
    for (const type of ["Chaptered", "Enrolled", "Engrossed", "Amended", "Comm Sub", "Introduced", "Draft"]) {
      assert.ok(TEXT_TYPE_LABELS[type], type);
    }
  });
});
