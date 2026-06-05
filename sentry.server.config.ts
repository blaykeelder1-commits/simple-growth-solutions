// Sentry — server runtime. No-op unless SENTRY_DSN is set, so the build and
// runtime are completely unaffected until you add the DSN in Render env.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
    // Don't send PII by default.
    sendDefaultPii: false,
  });
}
