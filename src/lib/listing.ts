import type { Prisma } from "@prisma/client";

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
