"use client";

// Root error boundary — also reports uncaught React render errors to Sentry
// (a no-op when no DSN is configured). Only renders if the root layout itself
// throws, which is rare; normal route errors use per-segment error.tsx files.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          color: "#1f2937",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            We hit an unexpected error. Please try again.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "white",
              padding: "10px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
