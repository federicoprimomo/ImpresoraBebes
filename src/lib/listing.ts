import type { Prisma, Provincia } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseArgentinaDateTimeLocal } from "@/lib/format";
import { PROVINCIA_OPTIONS } from "@/lib/argentina";
import { LOCALIDADES_ARGENTINA } from "@/lib/localidades-argentina";

/**
 * Una publicación con fecha de evento pasada no debería seguir
 * ofreciéndose — nadie compra una entrada para algo que ya sucedió. Esto
 * es aparte del `status` de la publicación (que sigue en ACTIVE; no hay
 * un cron que la pase a otra cosa, ver nota en /listings). Sin fecha
 * cargada ("a confirmar") no cuenta como pasada.
 */
export function isEventPast(eventDate: Date | string | null | undefined): boolean {
  if (!eventDate) return false;
  return new Date(eventDate).getTime() < Date.now();
}

/**
 * Fragmento de `where` para Prisma: excluye publicaciones con evento ya
 * pasado sin tocar las que no tienen fecha cargada. Para usar junto a
 * `status: "ACTIVE"` en /listings.
 */
export function notPastEventWhere(): Prisma.ListingWhereInput {
  return { OR: [{ eventDate: null }, { eventDate: { gte: new Date() } }] };
}

export type ParsedListingFields = {
  title: string;
  artistName: string | null;
  description: string | null;
  eventDate: Date | null;
  priceArs: number;
  platform: string | null;
  provincia: Provincia | null;
  localidad: string | null;
  genreId: string | null;
  subgenreId: string | null;
  isPublic: boolean;
};

/**
 * Valida y normaliza los campos de texto/select de una publicación,
 * compartido entre crear (`/listings/new`) y editar
 * (`/listings/[id]/edit`) — la foto se maneja aparte en cada server
 * action porque "reemplazar opcionalmente" es distinto a "subir por
 * primera vez". Tira `Error` con mensaje en español, listo para mostrar.
 */
export async function parseListingFields(formData: FormData): Promise<ParsedListingFields> {
  const title = String(formData.get("title") ?? "").trim();
  const artistName = String(formData.get("artistName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDateRaw = String(formData.get("eventDate") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const provinciaRaw = String(formData.get("provincia") ?? "").trim();
  const localidad = String(formData.get("localidad") ?? "").trim();
  const genreId = String(formData.get("genreId") ?? "").trim();
  const subgenreId = String(formData.get("subgenreId") ?? "").trim();
  const isPublic = String(formData.get("visibility") ?? "public") !== "private";

  const priceArs = Math.round(Number(priceRaw.replace(",", ".")) * 100);

  if (!title || !Number.isFinite(priceArs) || priceArs <= 0) {
    throw new Error("Completá al menos el título y un precio válido.");
  }

  let provincia: Provincia | null = null;
  if (provinciaRaw) {
    const match = PROVINCIA_OPTIONS.find((option) => option.value === provinciaRaw);
    if (!match) throw new Error("Provincia inválida.");
    provincia = match.value;
  }

  // La localidad viene de un <select> precargado (LOCALIDADES_ARGENTINA),
  // así que igual que con género/subgénero, se valida que pertenezca a la
  // provincia elegida — el filtrado del segundo <select> es solo de UI.
  let localidadValida: string | null = null;
  if (localidad) {
    if (!provincia) throw new Error("Elegí una provincia antes de la localidad.");
    if (!LOCALIDADES_ARGENTINA[provincia].includes(localidad)) {
      throw new Error("Localidad inválida para la provincia elegida.");
    }
    localidadValida = localidad;
  }

  // Si eligió subgénero tiene que haber elegido el género al que pertenece
  // — se valida acá porque el filtrado del segundo <select> es solo de UI.
  let validGenreId: string | null = null;
  let validSubgenreId: string | null = null;
  if (genreId) {
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: { subgenres: true },
    });
    if (!genre) throw new Error("Género inválido.");
    validGenreId = genre.id;
    if (subgenreId) {
      const subgenre = genre.subgenres.find((s) => s.id === subgenreId);
      if (!subgenre) throw new Error("Subgénero inválido para el género elegido.");
      validSubgenreId = subgenre.id;
    }
  }

  return {
    title,
    artistName: artistName || null,
    description: description || null,
    eventDate: parseArgentinaDateTimeLocal(eventDateRaw),
    priceArs,
    platform: platform || null,
    provincia,
    localidad: localidadValida,
    genreId: validGenreId,
    subgenreId: validSubgenreId,
    isPublic,
  };
}
