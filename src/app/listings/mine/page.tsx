import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { isEventPast } from "@/lib/listing";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { WhatsAppIcon } from "@/components/icons";
import { pauseListing, resumeListing, cancelListing } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  RESERVED: "Con una compra en curso",
  SOLD: "Vendida",
  CANCELLED: "Cancelada",
};

const actionButtonClass =
  "flex h-8 items-center justify-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[.06]";

export default async function MyListingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // A propósito sin filtrar por status, isPublic ni fecha del evento —
  // esta es la única pantalla donde alguien tiene que poder encontrar
  // TODO lo que publicó, esté vencida, vendida, privada o lo que sea.
  const listings = await prisma.listing.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      genre: { select: { name: true } },
      subgenre: { select: { name: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Mis publicaciones
        </h1>
        <Link
          href="/listings/new"
          className="flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Publicar entrada
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          Todavía no publicaste ninguna entrada.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {listings.map((listing) => {
            const eventPast = isEventPast(listing.eventDate);
            const canEdit = listing.status === "ACTIVE" || listing.status === "PAUSED";
            const listingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/listings/${listing.id}`;
            const whatsappText = `¡Mirá esta entrada en Escrow.ar! ${listing.title} — ${formatArsCents(listing.priceArs)}\n${listingUrl}`;

            return (
              <li
                key={listing.id}
                className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 dark:border-white/10"
              >
                <Link
                  href={`/listings/${listing.id}`}
                  className="flex flex-col gap-2 transition-colors hover:opacity-80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {listing.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {listing.eventDate ? formatDateTime(listing.eventDate) : "Fecha a confirmar"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-medium text-brand-muted-foreground">
                        {STATUS_LABELS[listing.status] ?? listing.status}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {listing.isPublic ? "Pública" : "Privada"}
                      </span>
                      {eventPast ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Evento finalizado
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {formatArsCents(listing.priceArs)}
                  </p>
                </Link>

                <div className="flex flex-wrap gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                  <CopyLinkButton url={listingUrl} className={actionButtonClass} />
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={actionButtonClass}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                    <Link href={`/listings/${listing.id}/edit`} className={actionButtonClass}>
                      Editar
                    </Link>

                    {listing.status === "ACTIVE" ? (
                      <form action={pauseListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button type="submit" className={actionButtonClass}>
                          Pausar
                        </button>
                      </form>
                    ) : null}

                    {listing.status === "PAUSED" ? (
                      <form action={resumeListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          disabled={eventPast}
                          className={`${actionButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                          title={eventPast ? "La fecha del evento ya pasó" : undefined}
                        >
                          Reanudar
                        </button>
                      </form>
                    ) : null}

                    <form action={cancelListing}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <ConfirmSubmitButton
                        confirmMessage="¿Eliminar esta publicación? Va a dejar de estar visible y no se puede deshacer desde acá."
                        className={`${actionButtonClass} text-red-700 dark:text-red-400`}
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
