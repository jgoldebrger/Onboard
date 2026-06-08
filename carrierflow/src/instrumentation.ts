export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (dsn) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      });
    }
  }
}
