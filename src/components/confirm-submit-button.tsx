"use client";

import type { ReactNode } from "react";

/**
 * Botón de submit con un `confirm()` nativo antes de disparar la acción —
 * para el "Eliminar" de /listings/mine. No hace falta nada más elaborado
 * (modal, etc.): alcanza con evitar el click accidental en una acción que,
 * aunque es reversible a nivel de datos (soft-delete a CANCELLED), el
 * usuario la percibe como definitiva.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
