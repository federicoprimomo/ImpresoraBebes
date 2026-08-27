import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { isPublicBrowsingEnabled } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const [session, publicBrowsing] = await Promise.all([auth(), isPublicBrowsingEnabled()]);
  const isAdmin = session?.user?.role === "ADMIN";

  if (!publicBrowsing && !isAdmin) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Entradas en venta
        </h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          La búsqueda pública de entradas no está disponible por el momento. Si tenés
          el link directo a una entrada puntual, podés seguir usándolo con normalidad.
        </p>
      </main>
    );
  }

  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { name: true, email: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Entradas en venta
        </h1>
        <Link
          href="/listings/new"
          className="text-sm font-medium hover:underline"
        >
          Publicar una entrada
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          Todavía no hay entradas publicadas.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/listings/${listing.id}`}
                className="flex items-center justify-between rounded-xl border border-black/10 p-5 transition-colors hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {listing.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {listing.eventDate
                      ? formatDateTime(listing.eventDate)
                      : "Fecha a confirmar"}{" "}
                    · Vende {listing.seller.name ?? listing.seller.email}
                  </p>
                </div>
                <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatArsCents(listing.priceArs)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
