import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
  myLegislatorsDistrictsError,
  normalizeMyLegislatorsPatch,
  type StoredMyLegislators,
} from "./ky-notification-preferences";

function ok(body: Record<string, unknown>) {
  const r = normalizeMyLegislatorsPatch(body);
  assert.equal(r.ok, true, r.ok ? undefined : r.error);
  return r.ok ? r.patch : {};
}

function err(body: Record<string, unknown>) {
  const r = normalizeMyLegislatorsPatch(body);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
}

describe("normalizeMyLegislatorsPatch: ranges", () => {
  test("accepts the House range 1 to 100", () => {
    assert.deepEqual(ok({ house_district: 1 }), { house_district: 1 });
    assert.deepEqual(ok({ house_district: 100 }), { house_district: 100 });
  });

  test("rejects House districts outside 1 to 100", () => {
    assert.match(err({ house_district: 0 }), /house_district/);
    assert.match(err({ house_district: 101 }), /house_district/);
    assert.match(err({ house_district: -5 }), /house_district/);
  });

  test("accepts the Senate range 1 to 38", () => {
    assert.deepEqual(ok({ senate_district: 1 }), { senate_district: 1 });
    assert.deepEqual(ok({ senate_district: 38 }), { senate_district: 38 });
  });

  test("rejects Senate districts outside 1 to 38", () => {
    assert.match(err({ senate_district: 0 }), /senate_district/);
    assert.match(err({ senate_district: 39 }), /senate_district/);
    // A valid House number is not a valid Senate number.
    assert.match(err({ senate_district: 60 }), /senate_district/);
  });
});

describe("normalizeMyLegislatorsPatch: null and types", () => {
  test("null clears a district", () => {
    assert.deepEqual(ok({ house_district: null, senate_district: null }), {
      house_district: null,
      senate_district: null,
    });
  });

  test("rejects non-integer districts", () => {
    assert.match(err({ house_district: 12.5 }), /house_district/);
    assert.match(err({ house_district: "12" }), /house_district/);
    assert.match(err({ senate_district: true }), /senate_district/);
    assert.match(err({ senate_district: Number.NaN }), /senate_district/);
    assert.match(err({ house_district: [12] }), /house_district/);
  });

  test("my_legislators_weekly must be a boolean", () => {
    assert.deepEqual(ok({ my_legislators_weekly: true }), { my_legislators_weekly: true });
    assert.deepEqual(ok({ my_legislators_weekly: false }), { my_legislators_weekly: false });
    assert.match(err({ my_legislators_weekly: "true" }), /my_legislators_weekly/);
    assert.match(err({ my_legislators_weekly: 1 }), /my_legislators_weekly/);
    assert.match(err({ my_legislators_weekly: null }), /my_legislators_weekly/);
  });

  test("absent keys stay absent and other keys are ignored", () => {
    assert.deepEqual(ok({}), {});
    assert.deepEqual(ok({ digest_frequency: "weekly" }), {});
  });
});

const EMPTY: StoredMyLegislators = {
  my_legislators_weekly: false,
  house_district: null,
  senate_district: null,
};

describe("myLegislatorsDistrictsError", () => {
  test("turning on without districts is rejected", () => {
    assert.equal(
      myLegislatorsDistrictsError({ my_legislators_weekly: true }, EMPTY),
      MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
    );
    assert.equal(
      myLegislatorsDistrictsError({ my_legislators_weekly: true }, null),
      MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
    );
  });

  test("turning on with only one district is rejected", () => {
    assert.equal(
      myLegislatorsDistrictsError({ my_legislators_weekly: true, house_district: 12 }, EMPTY),
      MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
    );
    assert.equal(
      myLegislatorsDistrictsError({ my_legislators_weekly: true, senate_district: 7 }, EMPTY),
      MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
    );
  });

  test("turning on with both districts in the patch is allowed", () => {
    assert.equal(
      myLegislatorsDistrictsError(
        { my_legislators_weekly: true, house_district: 12, senate_district: 7 },
        EMPTY,
      ),
      null,
    );
  });

  test("turning on with stored districts is allowed", () => {
    assert.equal(
      myLegislatorsDistrictsError(
        { my_legislators_weekly: true },
        { my_legislators_weekly: false, house_district: 12, senate_district: 7 },
      ),
      null,
    );
  });

  test("a patch district combines with a stored district", () => {
    assert.equal(
      myLegislatorsDistrictsError(
        { my_legislators_weekly: true, house_district: 40 },
        { my_legislators_weekly: false, house_district: null, senate_district: 7 },
      ),
      null,
    );
  });

  test("clearing a district while subscribed is rejected", () => {
    assert.equal(
      myLegislatorsDistrictsError(
        { house_district: null },
        { my_legislators_weekly: true, house_district: 12, senate_district: 7 },
      ),
      MY_LEGISLATORS_DISTRICTS_REQUIRED_ERROR,
    );
  });

  test("turning off or setting districts while off needs nothing else", () => {
    assert.equal(myLegislatorsDistrictsError({ my_legislators_weekly: false }, EMPTY), null);
    assert.equal(myLegislatorsDistrictsError({ house_district: 12 }, EMPTY), null);
    assert.equal(
      myLegislatorsDistrictsError(
        { my_legislators_weekly: false, house_district: null, senate_district: null },
        { my_legislators_weekly: true, house_district: 12, senate_district: 7 },
      ),
      null,
    );
  });
});
