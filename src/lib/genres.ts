import type { Provincia } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Géneros con sus subgéneros, ordenados — para el <select> del form de publicar y el filtro de /listings. */
export async function getGenresWithSubgenres() {
  return prisma.genre.findMany({
    orderBy: { order: "asc" },
    include: { subgenres: { orderBy: { order: "asc" } } },
  });
}

/**
 * Localidades ya usadas en publicaciones activas, para armar el filtro de
 * /listings sin mantener una base de miles de localidades a mano. Se
 * agrupa por provincia porque el mismo nombre de localidad puede repetirse
 * en más de una.
 */
export async function getUsedLocalidades(): Promise<
  Array<{ provincia: Provincia; localidad: string }>
> {
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE", localidad: { not: null }, provincia: { not: null } },
    select: { provincia: true, localidad: true },
    distinct: ["provincia", "localidad"],
  });
  return rows
    .filter((r): r is { provincia: Provincia; localidad: string } => Boolean(r.provincia && r.localidad))
    .sort((a, b) => a.localidad.localeCompare(b.localidad, "es"));
}
