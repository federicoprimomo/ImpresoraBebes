import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderFees } from "@/lib/fees";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { PROVINCIA_LABELS } from "@/lib/argentina";
import { ShareButtons } from "@/components/share-buttons";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      genre: { select: { name: true } },
      subgenre: { select: { name: true } },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          connectedAccount: { select: { status: true } },
        },
      },
    },
  });

  if (!listing) notFound();

  const fees = calculateOrderFees(listing.priceArs);
  const isOwnListing = session?.user?.id === listing.sellerId;
  const sellerConnected = listing.seller.connectedAccount?.status === "CONNECTED";
  const canBuy = listing.status === "ACTIVE" && !isOwnListing && sellerConnected;

  const metaItems = [
    listing.artistName ? `Artista: ${listing.artistName}` : null,
    listing.genre ? `Género: ${listing.genre.name}${listing.subgenre ? ` / ${listing.subgenre.name}` : ""}` : null,
    listing.provincia
      ? `Ubicación: ${listing.localidad ? `${listing.localidad}, ` : ""}${PROVINCIA_LABELS[listing.provincia]}`
      : null,
    listing.platform ? `Envío por: ${listing.platform}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      {listing.photoStorageKey ? (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={`/api/listings/${listing.id}/photo`}
            alt={listing.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <p className="text-sm text-zinc-500">
          {listing.eventDate ? formatDateTime(listing.eventDate) : "Fecha a confirmar"}
        </p>
        {!listing.isPublic ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Privada
          </span>
        ) : null}
      </div>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        {listing.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Vende {listing.seller.name ?? listing.seller.email}
      </p>

      {metaItems.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          {metaItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {listing.description ? (
        <p className="mt-6 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {listing.description}
        </p>
      ) : null}

      <div className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between font-semibold">
            <dt>Total a pagar</dt>
            <dd>{formatArsCents(fees.amountArs)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-zinc-500">
          Pagás exactamente el precio publicado — la comisión de la plataforma
          la paga el vendedor.
        </p>

        {listing.status !== "ACTIVE" ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Esta entrada ya no está disponible.
          </p>
        ) : isOwnListing ? (
          <div className="mt-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Esta es tu propia publicación
              {!listing.isPublic ? " — es privada, no aparece en /listings" : ""}.
              {" "}Compartí el link para que el comprador entre directo:
            </p>
            <div className="mt-3">
              <ShareButtons
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/listings/${listing.id}`}
                title={listing.title}
              />
            </div>
          </div>
        ) : !sellerConnected ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
            El vendedor todavía no conectó su cuenta de Mercado Pago, así que
            esta entrada no se puede comprar por ahora.
          </p>
        ) : null}

        {canBuy ? (
          session?.user ? (
            <Link
              href={`/listings/${listing.id}/checkout`}
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Comprar con tarjeta
            </Link>
          ) : (
            <Link
              href="/login"
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Ingresá para comprar
            </Link>
          )
        ) : null}
      </div>
    </main>
  );
}
