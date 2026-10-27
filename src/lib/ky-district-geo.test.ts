import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { zipCenterNotice } from "./ky-district-geo";

describe("zipCenterNotice", () => {
  test("returns the exact notice with the ZIP substituted", () => {
    assert.equal(
      zipCenterNotice("40004"),
      "Based on the center of ZIP 40004. District lines can split a ZIP code, so a street address is more precise.",
    );
  });

  test("substitutes any ZIP", () => {
    assert.match(zipCenterNotice("40202"), /^Based on the center of ZIP 40202\. /);
  });

  test("contains no em dash and no semicolon (voice guide)", () => {
    const notice = zipCenterNotice("40004");
    assert.equal(notice.includes("—"), false);
    assert.equal(notice.includes(";"), false);
  });
});
