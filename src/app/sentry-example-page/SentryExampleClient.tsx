"use client";

import * as Sentry from "@sentry/nextjs";
import { useState, type CSSProperties } from "react";

export function SentryExampleClient() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>Sentry verification</h1>
      <p style={{ color: "#444", lineHeight: 1.5 }}>
        Use these actions to confirm errors and messages reach your Sentry project. Remove or disable this route
        when you are done testing.
      </p>
      <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0 }}>
        <li>
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              throw new Error("Sentry example: client throw (delete after verifying)");
            }}
            style={buttonStyle}
          >
            Throw uncaught error (client)
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              Sentry.captureException(new Error("Sentry example: captureException (client)"));
              setStatus("Sent captureException — check Sentry Issues in ~30s.");
            }}
            style={buttonStyle}
          >
            captureException (client)
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              Sentry.captureMessage("Sentry example: captureMessage (client)", "info");
              setStatus("Sent captureMessage — check Sentry Issues / Logs.");
            }}
            style={buttonStyle}
          >
            captureMessage info (client)
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={async () => {
              setStatus("Requesting server test…");
              try {
                const res = await fetch("/api/sentry-example-api", { method: "GET" });
                const body = await res.text();
                setStatus(`Server route returned ${res.status}: ${body.slice(0, 200)}`);
              } catch (e) {
                setStatus(String(e));
              }
            }}
            style={buttonStyle}
          >
            Trigger server route error
          </button>
        </li>
      </ul>
      {status ? (
        <p style={{ marginTop: 16, color: "#166534", fontSize: "0.9rem" }}>{status}</p>
      ) : null}
    </main>
  );
}

const buttonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#1e40af",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.9rem",
};
