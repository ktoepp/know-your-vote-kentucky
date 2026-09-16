'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { reloadOnChunkLoadError } from "@/lib/chunk-reload";

/**
 * Root error UI when the root layout fails. Must include html/body.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/global-error
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A chunk missing after a deploy is recovered with a one-shot reload (see
    // src/lib/chunk-reload.ts); `reset()` would re-run the same stale import.
    if (reloadOnChunkLoadError(error)) return;
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui,sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
        <p style={{ color: '#444' }}>{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            cursor: 'pointer',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#1e40af',
            color: '#fff',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
