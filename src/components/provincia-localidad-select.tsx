"use client";

import { useState } from "react";
import type { Provincia } from "@prisma/client";

import { PROVINCIA_OPTIONS } from "@/lib/argentina";
import { LOCALIDADES_ARGENTINA } from "@/lib/localidades-argentina";

/**
 * Selects dependientes: elegir una provincia filtra las opciones de
 * localidad, precargadas desde el dataset oficial (ver
 * lib/localidades-argentina.ts) — no dependen de que ya haya
 * publicaciones reales en esa zona. Los `default*` son para precargar en
 * el form de editar — en el de publicar simplemente no se pasan.
 */
export function ProvinciaLocalidadSelect({
  defaultProvincia = "",
  defaultLocalidad = "",
}: {
  defaultProvincia?: Provincia | "";
  defaultLocalidad?: string;
}) {
  const [provincia, setProvincia] = useState<Provincia | "">(defaultProvincia);
  const localidades = provincia ? LOCALIDADES_ARGENTINA[provincia] : [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Provincia (opcional)
        <select
          name="provincia"
          value={provincia}
          onChange={(event) => setProvincia(event.target.value as Provincia | "")}
          className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
        >
          <option value="">Sin especificar</option>
          {PROVINCIA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1 text-sm">
        Localidad / zona (opcional)
        <select
          name="localidad"
          disabled={localidades.length === 0}
          defaultValue={defaultLocalidad}
          className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-50 dark:border-white/10 dark:bg-transparent"
        >
          <option value="">Sin especificar</option>
          {localidades.map((localidad) => (
            <option key={localidad} value={localidad}>
              {localidad}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
