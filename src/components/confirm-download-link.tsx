"use client";

import type { ReactNode } from "react";

/**
 * Como ConfirmSubmitButton, pero para el link de descarga de la entrega
 * (una navegación GET, no un submit de form) — confirm() nativo antes de
 * disparar la descarga, porque a partir de ahí el comprador ya no puede
 * abrir un reclamo (ver canOpenDispute / openDispute()).
 */
export function ConfirmDownloadLink({
  href,
  confirmMessage,
  className,
  children,
}: {
  href: string;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </a>
  );
}
