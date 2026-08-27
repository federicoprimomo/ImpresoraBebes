"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * <select> que manda el <form> apenas cambia — así el filtro de /listings
 * se aplica solo, sin que alguien en el celular tenga que buscar un botón
 * "Buscar" aparte. El form en sí sigue siendo un GET normal (sin JS server
 * action), esto es puro progressive enhancement de UX.
 */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(event) => {
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
