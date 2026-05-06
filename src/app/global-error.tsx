'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
