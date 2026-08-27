import * as Sentry from "@sentry/nextjs";

/**
 * Contraparte en el navegador de instrumentation.ts. Misma lógica: sin
 * NEXT_PUBLIC_SENTRY_DSN, Sentry.init() queda inerte — no manda nada.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
