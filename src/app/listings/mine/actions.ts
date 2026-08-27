"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEventPast } from "@/lib/listing";

async function getOwnedListing(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) {
    throw new Error("Publicación no encontrada.");
  }
  return listing;
}

/** Oculta la publicación sin darla de baja — vuelve a ACTIVE con "Reanudar". */
export async function pauseListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await getOwnedListing(listingId, session.user.id);

  if (listing.status !== "ACTIVE") {
    throw new Error("Solo se puede pausar una publicación activa.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "PAUSED" } });
  revalidatePath("/listings/mine");
}

export async function resumeListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await getOwnedListing(listingId, session.user.id);

  if (listing.status !== "PAUSED") {
    throw new Error("Solo se puede reanudar una publicación pausada.");
  }
  if (isEventPast(listing.eventDate)) {
    throw new Error("No se puede reanudar: la fecha del evento ya pasó.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "ACTIVE" } });
  revalidatePath("/listings/mine");
}

/**
 * "Eliminar" desde la UI, pero nunca un borrado real de la fila: Order
 * tiene un FK obligatorio a Listing, y aunque no lo tuviera queremos
 * conservar el historial. Pasa a CANCELLED, que ya es invisible/no
 * comprable en todos lados (mismo tratamiento que cuando el vendedor "da
 * de baja" una publicación).
 */
export async function cancelListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await getOwnedListing(listingId, session.user.id);

  if (listing.status !== "ACTIVE" && listing.status !== "PAUSED") {
    throw new Error(
      "Esta publicación no se puede eliminar (ya tiene una compra en curso, está vendida o ya estaba eliminada).",
    );
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
  revalidatePath("/listings/mine");
}
