"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import "./globals.css";

/**
 * Red de contención para errores que rompen el root layout entero (no los
 * comunes de una página, esos los agarra error.tsx si hiciera falta). Tiene
 * que definir su propio <html>/<body> porque reemplaza el layout, no lo
 * envuelve. Sentry.captureException acá es la única forma de enterarnos de
 * este tipo de falla — nunca pasa por onRequestError de instrumentation.ts.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center font-sans">
        <p className="text-lg font-semibold text-zinc-950">Algo salió mal</p>
        <p className="max-w-sm text-sm text-zinc-600">
          Tuvimos un error inesperado. Ya quedó registrado — probá recargar
          la página en un momento.
        </p>
      </body>
    </html>
  );
}
