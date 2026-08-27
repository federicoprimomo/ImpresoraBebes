"use client";

import { useState } from "react";

type GenreOption = {
  id: string;
  name: string;
  subgenres: Array<{ id: string; name: string }>;
};

/**
 * Selects dependientes: elegir un género filtra las opciones de subgénero.
 * Necesita ser client component porque el filtrado es puramente de UI (el
 * form sigue siendo un <form action={serverAction}> normal — esto solo
 * decide qué mostrar en el segundo <select>, la validación real pasa del
 * lado del server).
 */
export function GenreSubgenreSelect({ genres }: { genres: GenreOption[] }) {
  const [genreId, setGenreId] = useState("");
  const subgenres = genres.find((g) => g.id === genreId)?.subgenres ?? [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Género (opcional)
        <select
          name="genreId"
          value={genreId}
          onChange={(event) => setGenreId(event.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
        >
          <option value="">Sin especificar</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1 text-sm">
        Subgénero (opcional)
        <select
          name="subgenreId"
          disabled={subgenres.length === 0}
          defaultValue=""
          className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-50 dark:border-white/10 dark:bg-transparent"
        >
          <option value="">Sin especificar</option>
          {subgenres.map((subgenre) => (
            <option key={subgenre.id} value={subgenre.id}>
              {subgenre.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
