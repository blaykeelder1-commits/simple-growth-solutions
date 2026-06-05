// Sentry — edge runtime (middleware, edge routes). No-op unless SENTRY_DSN set.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
