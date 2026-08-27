import * as Sentry from "@sentry/nextjs";

/**
 * Reporta un error a Sentry. Sin SENTRY_DSN configurada (ver
 * instrumentation.ts), Sentry.init() nunca se activó de verdad y esto
 * queda como no-op — no hace falta un chequeo manual acá, mismo patrón que
 * el resto de las integraciones opcionales de la app.
 *
 * Se usa en los catch que ya logueaban con console.error pero no
 * relanzaban el error (webhooks, workers, envío de mail/factura) — esos
 * nunca llegan a onRequestError de instrumentation.ts porque no rompen la
 * respuesta, así que sin esto una falla silenciosa ahí no se entera nadie.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
