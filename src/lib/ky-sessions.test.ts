import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  KY_BILL_SESSION_OPTIONS,
  KY_SESSIONS,
  getCivicDataSessionName,
  getInterimPeriod,
  getKyBillSessionFilterOptions,
  getMostRecentStartedSession,
  getNextScheduledRegularSession,
  getSessionPhase,
} from "./ky-sessions";

const at = (iso: string) => new Date(`${iso}T15:00:00Z`);

describe("a scheduled session that has not convened", () => {
  test("does not become the current session for bill pages", () => {
    assert.equal(getCivicDataSessionName(at("2026-10-01")), "2026 Regular Session");
    assert.equal(getMostRecentStartedSession(at("2027-01-04")).name, "2026 Regular Session");
  });

  test("is hidden from filter dropdowns but stays a valid label", () => {
    assert.ok(KY_BILL_SESSION_OPTIONS.includes("2027 Regular Session"));
    assert.ok(!getKyBillSessionFilterOptions(at("2026-10-01")).includes("2027 Regular Session"));
    assert.equal(getKyBillSessionFilterOptions(at("2027-01-05"))[0], "2027 Regular Session");
  });

  test("closes the interim the day before it convenes", () => {
    const interim = getInterimPeriod(at("2026-10-01"));
    assert.equal(interim?.end, "2027-01-04");
    assert.equal(interim?.nextSession?.name, "2027 Regular Session");
    assert.equal(getNextScheduledRegularSession(at("2026-10-01"))?.name, "2027 Regular Session");
  });
});

describe("2027 Regular Session phases (LRC calendar posted 2026-09-10)", () => {
  test("interim until it convenes, then in session", () => {
    assert.equal(getSessionPhase(at("2027-01-04")), "interim");
    assert.equal(getSessionPhase(at("2027-01-05")), "in_session");
    assert.equal(getCivicDataSessionName(at("2027-01-05")), "2027 Regular Session");
  });

  test("veto recess Mar 13–24, final days Mar 25–30, interim after", () => {
    assert.equal(getSessionPhase(at("2027-03-12")), "in_session");
    assert.equal(getSessionPhase(at("2027-03-13")), "veto_recess");
    assert.equal(getSessionPhase(at("2027-03-24")), "veto_recess");
    assert.equal(getSessionPhase(at("2027-03-25")), "final_days");
    assert.equal(getSessionPhase(at("2027-03-30")), "final_days");
    assert.equal(getSessionPhase(at("2027-03-31")), "interim");
    assert.equal(getCivicDataSessionName(at("2027-06-01")), "2027 Regular Session");
  });
});

test("KY_SESSIONS stays newest first", () => {
  const starts = KY_SESSIONS.map((s) => s.start);
  assert.deepEqual(starts, [...starts].sort().reverse());
});
