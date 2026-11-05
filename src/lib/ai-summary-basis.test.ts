import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AI_SUMMARY_DESCRIPTION_BASIS_LINE,
  SHOW_AUDIENCE_CLAUSE,
  aiSummaryBasisLine,
  stripAudienceClause,
} from "./ai-summary-basis";

describe("stripAudienceClause", () => {
  test("returns the text before the label, trimmed", () => {
    const summary =
      "This bill requires 60 days notice before resurfacing.\n\nWho it may affect: residents of cities across Kentucky.";
    assert.equal(stripAudienceClause(summary), "This bill requires 60 days notice before resurfacing.");
  });

  test("returns the input unchanged when the label is absent", () => {
    const summary = "This bill updates wording to gender-neutral language.  ";
    assert.equal(stripAudienceClause(summary), summary);
    assert.equal(stripAudienceClause(""), "");
  });

  test("returns an empty string when the summary is only the clause", () => {
    assert.equal(stripAudienceClause("Who it may affect: veterans."), "");
  });
});

describe("aiSummaryBasisLine", () => {
  test("description basis returns the description line", () => {
    assert.equal(aiSummaryBasisLine({ kind: "description" }), AI_SUMMARY_DESCRIPTION_BASIS_LINE);
    assert.equal(
      AI_SUMMARY_DESCRIPTION_BASIS_LINE,
      "Written by AI from the bill's title and official description, not the full bill text.",
    );
  });

  test("bill_text basis falls back to the description line until WS3-09d", () => {
    assert.equal(
      aiSummaryBasisLine({ kind: "bill_text", versionLabel: "Enrolled", date: null }),
      AI_SUMMARY_DESCRIPTION_BASIS_LINE,
    );
  });

  test("neither basis line contains an em dash or a semicolon", () => {
    const lines = [
      aiSummaryBasisLine({ kind: "description" }),
      aiSummaryBasisLine({ kind: "bill_text", versionLabel: "Committee Substitute", date: "2026-03-04" }),
    ];
    for (const line of lines) {
      assert.ok(!line.includes("—"), `em dash in: ${line}`);
      assert.ok(!line.includes(";"), `semicolon in: ${line}`);
    }
  });

  test("the audience clause is hidden at render (owner decision WS3-04 (2) = b)", () => {
    assert.equal(SHOW_AUDIENCE_CLAUSE, false);
  });
});
