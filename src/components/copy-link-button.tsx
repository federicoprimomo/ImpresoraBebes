"use client";

import { useState } from "react";

import { LinkIcon, CheckCircleIcon } from "@/components/icons";

/**
 * Copia la URL absoluta de la publicación al portapapeles — necesita ser
 * client component por `navigator.clipboard` y el feedback visual
 * momentáneo ("¡Copiado!"). El link en sí (armado con NEXT_PUBLIC_APP_URL)
 * se calcula server-side y se pasa como prop, no acá.
 */
export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Si el navegador no permite clipboard (ej. http sin permisos),
          // no rompemos nada — el usuario puede copiar el link a mano.
        }
      }}
    >
      {copied ? (
        <>
          <CheckCircleIcon className="h-4 w-4" />
          ¡Copiado!
        </>
      ) : (
        <>
          <LinkIcon className="h-4 w-4" />
          Copiar link
        </>
      )}
    </button>
  );
}
