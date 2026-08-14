"use client";

import { useEffect } from "react";

/**
 * Last resort: this replaces the root layout, so it cannot rely on any of the
 * app's chrome, fonts or CSS variables being mounted. Styling is inline for
 * that reason — if globals.css were the thing that failed, class names here
 * would render an unreadable page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          color: "#111",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#b45309",
            }}
          >
            Error
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.5rem", fontWeight: 500 }}>
            Acoustic Ledger couldn&apos;t load
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
            Something failed before the page could render.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: "2rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#666",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
