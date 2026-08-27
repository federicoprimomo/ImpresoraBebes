import * as Sentry from "@sentry/nextjs";

/**
 * Monitoreo de errores en producción (ver lib/monitoring.ts para el resto
 * de la integración). Mismo patrón "apagado si falta configurar" que ARCA
 * y el email: Sentry.init() con dsn undefined no manda nada a ningún
 * lado, solo queda como no-op — no hace falta un chequeo manual acá.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // No mandamos PII (emails, nombres) a Sentry por defecto — este es
      // un marketplace de pagos, no hace falta ese riesgo extra.
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
