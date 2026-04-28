"use client";

import { useEffect } from "react";

/**
 * Global error boundary for the entire application.
 *
 * This catches errors that break the root layout itself. It must render
 * its own <html> and <body> tags since the root layout is not available.
 * Because no I18n provider exists at this level, text is hardcoded in English.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          fontFamily:
            "Inter, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          textAlign: "center",
          padding: "1rem",
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: "3rem", margin: 0 }}>Oops</h1>
        <p style={{ fontSize: "1rem", color: "#505050", margin: "0.75rem 0" }}>
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            borderRadius: "9999px",
            backgroundColor: "#7e10c2",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
