/**
 * Pure predicates that decide which browser exceptions are non-actionable noise.
 *
 * Shared by PostHog's `before_send` and Sentry's `beforeSend` in
 * `instrumentation-client.ts` so the two backends agree on what counts as a real
 * crash. Kept free of side effects and browser globals so they can be unit tested
 * with `npm test`.
 */

export type StackFrameLike = { filename?: string; source?: string; function?: string };
export type ExceptionLike = {
  type?: string;
  value?: string;
  stacktrace?: { frames?: StackFrameLike[] } | null;
};

/**
 * Benign "view transition skipped" browser noise.
 *
 * When react-dom / the browser starts a View Transition during a navigation and
 * the tab is hidden (backgrounded) or being unloaded before the transition can
 * run, the browser aborts it with a DOMException (InvalidStateError). This is
 * expected behavior — the user isn't looking at the page and nothing is actually
 * broken — but the resulting unhandled rejection is picked up by PostHog Error
 * Tracking (capture_exceptions) and by Sentry, creating a non-actionable "new
 * issue" that pages us in Slack.
 *
 * Chromium surfaces two different messages for the same condition:
 *   - spec-compliant: "Skipping view transition because document visibility state has become hidden."
 *   - generic:        "Transition was aborted because of invalid state."
 * (see https://github.com/facebook/react/issues/34098)
 *
 * We drop both from our telemetry. This message only ever fires while the tab is
 * hidden, so suppressing it cannot mask a bug a user could actually observe.
 */
export const BENIGN_VIEW_TRANSITION_ERROR =
  /Skipping view transition because document visibility|view transition was skipped because document visibility|Transition was aborted because of invalid state/i;

export const isBenignViewTransitionError = (
  exceptions: ExceptionLike[],
  topLevelMessage = "",
): boolean =>
  BENIGN_VIEW_TRANSITION_ERROR.test(topLevelMessage) ||
  exceptions.some(
    (ex) =>
      BENIGN_VIEW_TRANSITION_ERROR.test(ex?.value ?? "") ||
      BENIGN_VIEW_TRANSITION_ERROR.test(ex?.type ?? ""),
  );

/**
 * Errors thrown by scripts we do not ship.
 *
 * Mobile in-app browsers (Facebook/Instagram/Bing webviews), iOS content blockers and
 * desktop extensions inject their own JavaScript into the page. When that code throws,
 * the browser still fires our `window.onerror`, so PostHog and Sentry open an issue
 * against *our* app for a crash in code we cannot read, reproduce or patch. Because the
 * injected script is not a document resource, its stack frames carry no filename at all
 * — every frame is `{ function, lineno, colno }` with nothing to attribute it to.
 *
 * Anything thrown by our own bundle is attributable: every frame names a
 * `/_next/static/chunks/*.js` file (or the document, for the one inline Typekit loader).
 * So "the stack has frames, but not one of them names a source" is a reliable marker for
 * third-party injection, and dropping those keeps the crash signal actionable.
 *
 * Deliberately narrow: exceptions with *no* frames at all (e.g. a `SyntaxError` from an
 * old browser failing to parse our bundle — a real, if unfixable, signal) are kept.
 */
const hasNoAttributableSource = (ex: ExceptionLike | undefined): boolean => {
  const frames = ex?.stacktrace?.frames ?? [];
  if (frames.length === 0) return false;
  return frames.every((f) => !(f?.filename || f?.source || "").trim());
};

/** True when every exception in the chain came from an unattributable (injected) script. */
export const isInjectedThirdPartyError = (exceptions: ExceptionLike[]): boolean =>
  exceptions.length > 0 && exceptions.every(hasNoAttributableSource);

/**
 * React streaming-SSR segment swap failing because the placeholder is gone.
 *
 * On routes with a `loading.tsx` React streams Suspense segments and injects tiny
 * inline scripts (`$RS` "replace segment", `$RC` "complete boundary") that look up
 * the placeholder node by id and call `parentNode.removeChild` on it. If something
 * has already rewritten the DOM mid-stream — a browser extension, Edge/Chrome
 * translate or reader mode, or the user navigating away — the lookup returns
 * null and the script throws `Cannot read properties of null (reading 'parentNode')`.
 * That code is React's, not ours, and the condition is outside our control
 * (react issue: "TypeError: Cannot read properties of null (reading 'parentNode') at $RS").
 *
 * Two shapes are dropped, both requiring the exact `parentNode` message:
 *   - the *top* frame is `$RS`/`$RC` (the script is attributable), or
 *   - the exception carries **no frames at all**. The inline `$RS`/`$RC` scripts are
 *     not a document resource, and Edge has been seen reporting the throw with no
 *     stacktrace whatsoever, which used to slip past this guard and open an issue.
 * A real regression in our own code that reads `parentNode` would still carry
 * `/_next/static/chunks/*.js` frames and is kept.
 */
const REACT_STREAM_SWAP_FN = /^\$R[SC]$/;
const REACT_STREAM_SWAP_MSG = /reading 'parentNode'/;
export const isReactStreamSwapError = (exceptions: ExceptionLike[]): boolean =>
  exceptions.some((ex) => {
    if (!REACT_STREAM_SWAP_MSG.test(ex?.value ?? "")) return false;
    const frames = ex?.stacktrace?.frames ?? [];
    if (frames.length === 0) return true;
    // Sentry lists frames outermost-first; PostHog innermost-first. Check both ends.
    const first = frames[0]?.function ?? "";
    const last = frames[frames.length - 1]?.function ?? "";
    return REACT_STREAM_SWAP_FN.test(first) || REACT_STREAM_SWAP_FN.test(last);
  });

/**
 * Next.js chunk fetch failing after a deploy replaced the build.
 *
 * Heavy code is split into click-time chunks (Mapbox district explorer, Lottie, the
 * deferred Sentry SDK). A tab that was open across a deploy still holds the old build
 * manifest and asks for a content-hashed `/_next/static/chunks/*.js` that Vercel no
 * longer serves; webpack surfaces that as `ChunkLoadError: Loading chunk N failed`.
 * `src/lib/chunk-reload.ts` recovers with a one-shot hard reload, so the first such
 * error in a session is not a crash anyone can act on and is dropped. A second one in
 * the same session means the reload did not help and is kept (see
 * `isRecoverableChunkLoadError`).
 */
const CHUNK_LOAD_TYPE = /^ChunkLoadError$/;
const CHUNK_LOAD_MSG = /Loading (?:CSS )?chunk [\w-]+ failed/;
export const isChunkLoadError = (ex: ExceptionLike | Error | undefined): boolean => {
  if (!ex) return false;
  const type = ex instanceof Error ? ex.name : ex.type;
  const message = ex instanceof Error ? ex.message : ex.value;
  return CHUNK_LOAD_TYPE.test(type ?? "") || CHUNK_LOAD_MSG.test(message ?? "");
};

/**
 * True when the exception is a chunk-load failure the page is about to recover from
 * on its own. `alreadyReloaded` is whether this session has already spent its one
 * reload: when it has, the failure is real and must stay reportable.
 */
export const isRecoverableChunkLoadError = (
  exceptions: ExceptionLike[],
  alreadyReloaded: boolean,
): boolean => !alreadyReloaded && exceptions.some(isChunkLoadError);

export type DropExceptionContext = {
  /** Top-level message PostHog puts on `$exception_message` (absent in Sentry). */
  topLevelMessage?: string;
  /** Whether this session has already performed its one-shot chunk-error reload. */
  chunkReloadSpent: boolean;
};

/**
 * Single decision point for both telemetry backends: true when the exception chain is
 * known non-actionable noise and the event should be discarded.
 */
export const shouldDropException = (
  exceptions: ExceptionLike[],
  ctx: DropExceptionContext,
): boolean =>
  isBenignViewTransitionError(exceptions, ctx.topLevelMessage ?? "") ||
  isInjectedThirdPartyError(exceptions) ||
  isReactStreamSwapError(exceptions) ||
  isRecoverableChunkLoadError(exceptions, ctx.chunkReloadSpent);
