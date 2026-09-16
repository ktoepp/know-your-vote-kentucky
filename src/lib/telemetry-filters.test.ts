import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isChunkLoadError,
  isInjectedThirdPartyError,
  isReactStreamSwapError,
  isRecoverableChunkLoadError,
  shouldDropException,
  type ExceptionLike,
} from "./telemetry-filters";

const PARENT_NODE_MSG = "Cannot read properties of null (reading 'parentNode')";
const ownFrame = (fn: string) => ({
  filename: "https://www.kyvky.com/_next/static/chunks/app/bills/page-abc123.js",
  function: fn,
});

describe("isReactStreamSwapError", () => {
  test("drops a frameless $exception_list entry with the parentNode message (Edge shape)", () => {
    // Exactly what PostHog issue 01a0aa99-2eba-7451-8cec-b596b399f8c3 carried:
    // type + value + mechanism, no stacktrace key at all.
    const exceptions: ExceptionLike[] = [{ type: "TypeError", value: PARENT_NODE_MSG }];
    assert.equal(isReactStreamSwapError(exceptions), true);
  });

  test("drops when the top frame is $RS or $RC (either frame order)", () => {
    const innermostFirst: ExceptionLike[] = [
      { type: "TypeError", value: PARENT_NODE_MSG, stacktrace: { frames: [{ function: "$RS" }] } },
    ];
    const outermostFirst: ExceptionLike[] = [
      {
        type: "TypeError",
        value: PARENT_NODE_MSG,
        stacktrace: { frames: [{ function: "$RC" }, { function: "removeChild" }] },
      },
    ];
    assert.equal(isReactStreamSwapError(innermostFirst), true);
    assert.equal(isReactStreamSwapError(outermostFirst), true);
  });

  test("keeps a parentNode error that carries attributable frames from our bundle", () => {
    const exceptions: ExceptionLike[] = [
      {
        type: "TypeError",
        value: PARENT_NODE_MSG,
        stacktrace: { frames: [ownFrame("onClick"), ownFrame("BillDetailView")] },
      },
    ];
    assert.equal(isReactStreamSwapError(exceptions), false);
  });

  test("keeps a frameless error with a different message", () => {
    assert.equal(
      isReactStreamSwapError([{ type: "TypeError", value: "Cannot read properties of null (reading 'foo')" }]),
      false,
    );
    assert.equal(isReactStreamSwapError([{ type: "SyntaxError", value: "Unexpected token" }]), false);
    assert.equal(isReactStreamSwapError([]), false);
  });
});

describe("isInjectedThirdPartyError", () => {
  test("still keeps frameless exceptions (deliberately narrow)", () => {
    assert.equal(isInjectedThirdPartyError([{ type: "SyntaxError", value: "Unexpected token" }]), false);
  });
  test("drops when no frame names a source", () => {
    assert.equal(
      isInjectedThirdPartyError([{ value: "x", stacktrace: { frames: [{ function: "a" }, { function: "b" }] } }]),
      true,
    );
  });
});

describe("isChunkLoadError", () => {
  test("matches by exception type or by webpack message, for both event and Error shapes", () => {
    assert.equal(isChunkLoadError({ type: "ChunkLoadError", value: "Loading chunk 7122 failed." }), true);
    assert.equal(isChunkLoadError({ type: "Error", value: "Loading chunk 7122 failed.\n(error: https://www.kyvky.com/_next/static/chunks/7122-405b84ea02c65c61.js)" }), true);
    assert.equal(isChunkLoadError({ type: "Error", value: "Loading CSS chunk 12 failed." }), true);
    const err = new Error("Loading chunk 7122 failed.");
    err.name = "ChunkLoadError";
    assert.equal(isChunkLoadError(err), true);
  });
  test("does not match unrelated errors", () => {
    assert.equal(isChunkLoadError({ type: "TypeError", value: "x is not a function" }), false);
    assert.equal(isChunkLoadError(new Error("Failed to fetch")), false);
    assert.equal(isChunkLoadError(undefined), false);
  });
});

describe("isRecoverableChunkLoadError", () => {
  const chunk: ExceptionLike[] = [{ type: "ChunkLoadError", value: "Loading chunk 7122 failed." }];
  test("drops the first chunk failure in a session (a reload is about to fix it)", () => {
    assert.equal(isRecoverableChunkLoadError(chunk, false), true);
  });
  test("keeps a chunk failure once the session already reloaded (genuinely missing chunk)", () => {
    assert.equal(isRecoverableChunkLoadError(chunk, true), false);
  });
});

describe("shouldDropException (shared PostHog before_send / Sentry beforeSend decision)", () => {
  test("drops the frameless parentNode event regardless of reload state", () => {
    const exceptions: ExceptionLike[] = [{ type: "TypeError", value: PARENT_NODE_MSG }];
    assert.equal(shouldDropException(exceptions, { topLevelMessage: PARENT_NODE_MSG, chunkReloadSpent: false }), true);
    assert.equal(shouldDropException(exceptions, { chunkReloadSpent: true }), true);
  });

  test("keeps a real crash with /_next/static/chunks frames unchanged", () => {
    const exceptions: ExceptionLike[] = [
      { type: "TypeError", value: "x is not a function", stacktrace: { frames: [ownFrame("handleClick")] } },
    ];
    assert.equal(shouldDropException(exceptions, { chunkReloadSpent: false }), false);
  });

  test("drops the view-transition abort via the top-level PostHog message", () => {
    assert.equal(
      shouldDropException([], {
        topLevelMessage: "Skipping view transition because document visibility state has become hidden.",
        chunkReloadSpent: false,
      }),
      true,
    );
  });

  test("keeps an unrecovered chunk failure so a missing chunk stays reportable", () => {
    assert.equal(
      shouldDropException([{ type: "ChunkLoadError", value: "Loading chunk 7122 failed." }], { chunkReloadSpent: true }),
      false,
    );
  });
});
