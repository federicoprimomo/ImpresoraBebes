import { prisma } from "@/lib/prisma";

/** Géneros con sus subgéneros, ordenados — para el <select> del form de publicar y el filtro de /listings. */
export async function getGenresWithSubgenres() {
  return prisma.genre.findMany({
    orderBy: { order: "asc" },
    include: { subgenres: { orderBy: { order: "asc" } } },
  });
}

/**
 * Set inicial de géneros/subgéneros — para que /admin/categories no
 * arranque vacío y el form de publicar tenga algo útil desde el primer
 * día. Es solo un punto de partida: el admin puede agregar, renombrar o
 * borrar lo que quiera desde ahí después. Ver prisma/seed.ts para cómo se
 * carga (upsert por nombre, nunca pisa lo que el admin ya haya tocado).
 */
export const GENRE_DEFAULTS: Array<{ name: string; subgenres: string[] }> = [
  {
    name: "Música",
    subgenres: [
      "Rock",
      "Pop",
      "Cumbia",
      "Cuarteto",
      "Folclore",
      "Tango",
      "Electrónica",
      "Reggaetón / Urbano",
      "Trap",
      "Jazz",
      "Clásica",
    ],
  },
  {
    name: "Deportes",
    subgenres: ["Fútbol", "Básquet", "Tenis", "Rugby", "Vóley", "Boxeo / MMA", "Automovilismo"],
  },
  {
    name: "Teatro y espectáculos",
    subgenres: ["Comedia", "Drama", "Stand-up", "Musical", "Infantil"],
  },
  {
    name: "Festivales",
    subgenres: [],
  },
];
