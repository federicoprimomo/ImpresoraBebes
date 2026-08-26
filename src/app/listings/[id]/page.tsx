import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderFees } from "@/lib/fees";
import { formatArsCents, formatDateTime } from "@/lib/format";

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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        {listing.eventDate ? formatDateTime(listing.eventDate) : "Fecha a confirmar"}
      </p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        {listing.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Vende {listing.seller.name ?? listing.seller.email}
      </p>

      {listing.description ? (
        <p className="mt-6 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {listing.description}
        </p>
      ) : null}

      <div className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">Precio de la entrada</dt>
            <dd>{formatArsCents(fees.priceArs)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">
              Comisión de la plataforma
            </dt>
            <dd>{formatArsCents(fees.buyerFeeArs)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/10">
            <dt>Total a pagar</dt>
            <dd>{formatArsCents(fees.amountArs)}</dd>
          </div>
        </dl>

        {listing.status !== "ACTIVE" ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Esta entrada ya no está disponible.
          </p>
        ) : isOwnListing ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Esta es tu propia publicación.
          </p>
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
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Comprar con tarjeta
            </Link>
          ) : (
            <Link
              href="/login"
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Ingresá para comprar
            </Link>
          )
        ) : null}
      </div>
    </main>
  );
}
