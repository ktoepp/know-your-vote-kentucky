import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildUnsubscribeUpdate,
  parseUnsubscribeList,
  unsubscribeSuccessCopy,
} from "./unsubscribe-update";

const NOW = "2026-11-05T12:00:00.000Z";

describe("parseUnsubscribeList", () => {
  test("reads my_legislators", () => {
    assert.equal(parseUnsubscribeList("my_legislators"), "my_legislators");
  });

  test("reads all", () => {
    assert.equal(parseUnsubscribeList("all"), "all");
  });

  test("missing value means all", () => {
    assert.equal(parseUnsubscribeList(null), "all");
    assert.equal(parseUnsubscribeList(undefined), "all");
    assert.equal(parseUnsubscribeList(""), "all");
  });

  test("unknown value means all (the stronger opt-out)", () => {
    assert.equal(parseUnsubscribeList("digest"), "all");
    assert.equal(parseUnsubscribeList("MY_LEGISLATORS"), "all");
    assert.equal(parseUnsubscribeList(" my_legislators"), "all");
  });

  test("an unknown list builds the all-mail update", () => {
    assert.deepEqual(
      buildUnsubscribeUpdate(parseUnsubscribeList("bogus"), NOW),
      buildUnsubscribeUpdate("all", NOW),
    );
  });
});

describe("buildUnsubscribeUpdate", () => {
  test("all stops the digest and the weekly email", () => {
    assert.deepEqual(buildUnsubscribeUpdate("all", NOW), {
      digest_frequency: "off",
      unsubscribed_all_at: NOW,
      digest_user_disabled: true,
      my_legislators_weekly: false,
    });
  });

  test("all clears my_legislators_weekly", () => {
    const update = buildUnsubscribeUpdate("all", NOW);
    assert.equal(update.my_legislators_weekly, false);
  });

  test("my_legislators has exactly one key", () => {
    const update = buildUnsubscribeUpdate("my_legislators", NOW);
    assert.deepEqual(Object.keys(update), ["my_legislators_weekly"]);
    assert.deepEqual(update, { my_legislators_weekly: false });
  });

  test("my_legislators leaves the digest fields out of the update", () => {
    const update = buildUnsubscribeUpdate("my_legislators", NOW);
    assert.equal("digest_frequency" in update, false);
    assert.equal("unsubscribed_all_at" in update, false);
    assert.equal("digest_user_disabled" in update, false);
  });
});

describe("unsubscribeSuccessCopy", () => {
  test("my_legislators copy says digests are not affected", () => {
    const copy = unsubscribeSuccessCopy("my_legislators");
    assert.equal(copy.title, "Weekly legislator email stopped");
    assert.match(copy.body, /Bill digest emails are not affected\./);
  });

  test("all copy covers both email kinds", () => {
    const copy = unsubscribeSuccessCopy("all");
    assert.equal(copy.title, "Email updates stopped");
    assert.match(copy.body, /digest or weekly legislator emails/);
  });

  test("copy has no em dash or semicolon", () => {
    for (const list of ["all", "my_legislators"] as const) {
      const { title, body } = unsubscribeSuccessCopy(list);
      assert.doesNotMatch(`${title} ${body}`, /[—;]/);
    }
  });
});
