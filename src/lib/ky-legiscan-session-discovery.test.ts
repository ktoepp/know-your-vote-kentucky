import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  fetchLatestNonEmptySessionRoster,
  findLegiscanSessionByName,
  parseKySessionName,
  sortKySessionsNewestFirst,
} from "./ky-legiscan-session-discovery";
import type { LegiScanSession } from "./ky-legiscan-client";

const s = (session_id: number, year: number, session_name: string, special = 0): LegiScanSession => ({
  session_id,
  state_id: 17,
  year_start: year,
  year_end: year,
  session_name,
  special,
});

const LIST = [
  s(2179, 2025, "2025 Regular Session"),
  s(2247, 2026, "2026 Regular Session"),
  s(1993, 2022, "2022 Special Session", 1),
  s(1853, 2022, "2022 Regular Session"),
];

describe("sortKySessionsNewestFirst", () => {
  test("orders by year, then session id, without mutating the input", () => {
    const before = LIST.map((x) => x.session_id);
    assert.deepEqual(
      sortKySessionsNewestFirst(LIST).map((x) => x.session_id),
      [2247, 2179, 1993, 1853],
    );
    assert.deepEqual(LIST.map((x) => x.session_id), before);
  });

  test("a newly listed session sorts first with no id configured", () => {
    const withNew = [...LIST, s(2300, 2027, "2027 Regular Session")];
    assert.equal(sortKySessionsNewestFirst(withNew)[0]!.session_name, "2027 Regular Session");
  });
});

describe("findLegiscanSessionByName", () => {
  test("returns null while LegiScan has not published the session", () => {
    assert.equal(findLegiscanSessionByName(LIST, "2027 Regular Session"), null);
  });

  test("matches by name once published", () => {
    const withNew = [...LIST, s(2300, 2027, "2027 Regular Session")];
    assert.equal(findLegiscanSessionByName(withNew, "2027 Regular Session")?.session_id, 2300);
  });

  test("falls back to year + type when the upstream title differs", () => {
    const withNew = [...LIST, s(2300, 2027, "2027 Regular Session (Prefiles)")];
    assert.equal(findLegiscanSessionByName(withNew, "2027 Regular Session")?.session_id, 2300);
  });

  test("does not confuse a special session with the regular one", () => {
    assert.equal(findLegiscanSessionByName(LIST, "2022 Special Session")?.session_id, 1993);
    assert.equal(findLegiscanSessionByName(LIST, "2022 Regular Session")?.session_id, 1853);
    assert.equal(findLegiscanSessionByName([s(1993, 2022, "2022 1st Special", 1)], "2022 Regular Session"), null);
  });
});

describe("parseKySessionName", () => {
  test("parses regular and special labels and rejects others", () => {
    assert.deepEqual(parseKySessionName("2027 Regular Session"), { year: 2027, special: false });
    assert.deepEqual(parseKySessionName(" 2022 special session "), { year: 2022, special: true });
    assert.equal(parseKySessionName("27RS"), null);
  });
});

describe("fetchLatestNonEmptySessionRoster", () => {
  test("falls back one session while the new session has no roster", async () => {
    const asked: number[] = [];
    const withNew = [...LIST, s(2300, 2027, "2027 Regular Session")];
    const roster = await fetchLatestNonEmptySessionRoster(withNew, async (id) => {
      asked.push(id);
      return id === 2247 ? [{ people_id: 1 }] : [];
    });
    assert.equal(roster?.session.session_id, 2247);
    assert.deepEqual(asked, [2300, 2247]);
  });

  test("stops after maxSessions and returns null", async () => {
    const asked: number[] = [];
    const roster = await fetchLatestNonEmptySessionRoster(LIST, async (id) => {
      asked.push(id);
      return [];
    });
    assert.equal(roster, null);
    assert.equal(asked.length, 2);
  });
});
