// Next.js instrumentation hook — loads the Sentry server/edge init for the
// matching runtime. The configs themselves no-op unless SENTRY_DSN is set.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
