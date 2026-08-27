import Image from "next/image";
import Link from "next/link";
import type { Prisma, Provincia } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { isPublicBrowsingEnabled } from "@/lib/site-content";
import { PROVINCIA_LABELS, PROVINCIA_OPTIONS } from "@/lib/argentina";
import { LOCALIDADES_ARGENTINA } from "@/lib/localidades-argentina";
import { getGenresWithSubgenres } from "@/lib/genres";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  provincia?: string;
  localidad?: string;
  genreId?: string;
  subgenreId?: string;
  fecha?: string;
  orden?: string;
};

const FECHA_OPTIONS = [
  { value: "", label: "Cualquier fecha" },
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Próximos 7 días" },
  { value: "mes", label: "Próximos 30 días" },
] as const;

const ORDEN_OPTIONS = [
  { value: "fecha", label: "Fecha del evento" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
] as const;

function fechaRange(fecha: string | undefined): { gte: Date; lte?: Date } | null {
  if (!fecha) return null;
  const now = new Date();
  if (fecha === "hoy") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lte: end };
  }
  if (fecha === "semana") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { gte: now, lte: end };
  }
  if (fecha === "mes") {
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { gte: now, lte: end };
  }
  return null;
}

const inputClass =
  "h-10 rounded-lg border border-black/10 px-3 text-sm dark:border-white/10 dark:bg-transparent dark:[color-scheme:dark]";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
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

  const q = params.q?.trim() ?? "";
  const provincia = params.provincia?.trim() ?? "";
  const localidad = params.localidad?.trim() ?? "";
  const genreId = params.genreId?.trim() ?? "";
  const subgenreId = params.subgenreId?.trim() ?? "";
  const fecha = params.fecha?.trim() ?? "";
  const orden = params.orden?.trim() || "fecha";

  const genres = await getGenresWithSubgenres();

  const selectedGenre = genres.find((g) => g.id === genreId);
  // Si el subgenreId de la URL no pertenece al género seleccionado (típico
  // al cambiar de género con un subgénero ya elegido, o un link viejo tras
  // reordenar categorías), se ignora — así el filtro real y lo que
  // muestra el <select> (que de todos modos cae a "Todos" si no matchea
  // ninguna opción) quedan siempre consistentes.
  const effectiveSubgenreId = selectedGenre?.subgenres.some((s) => s.id === subgenreId)
    ? subgenreId
    : "";
  // Localidad depende de elegir provincia primero — el dataset completo
  // (LOCALIDADES_ARGENTINA) no depende de que ya haya publicaciones reales
  // en esa zona, a diferencia de antes.
  const localidadOptions: string[] = provincia
    ? (LOCALIDADES_ARGENTINA[provincia as Provincia] ?? [])
    : [];
  // Mismo caso que con subgenreId: si la localidad de la URL no pertenece
  // a la provincia elegida (cambiaste de provincia con una localidad ya
  // tildada), se ignora en vez de dejar un filtro fantasma.
  const effectiveLocalidad = localidadOptions.includes(localidad) ? localidad : "";

  const where: Prisma.ListingWhereInput = { status: "ACTIVE", isPublic: true };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { artistName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (provincia) where.provincia = provincia as Provincia;
  if (effectiveLocalidad) where.localidad = effectiveLocalidad;
  if (genreId) where.genreId = genreId;
  if (effectiveSubgenreId) where.subgenreId = effectiveSubgenreId;
  const range = fechaRange(fecha);
  if (range) where.eventDate = range;

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    orden === "precio_asc"
      ? [{ priceArs: "asc" }]
      : orden === "precio_desc"
        ? [{ priceArs: "desc" }]
        : [{ eventDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];

  const listings = await prisma.listing.findMany({
    where,
    orderBy,
    take: 60,
    include: {
      genre: { select: { name: true } },
      subgenre: { select: { name: true } },
      seller: { select: { name: true, email: true } },
    },
  });

  const hasFilters = Boolean(
    q || provincia || effectiveLocalidad || genreId || effectiveSubgenreId || fecha,
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Entradas en venta
        </h1>
        <Link href="/listings/new" className="text-sm font-medium hover:underline">
          Publicar una entrada
        </Link>
      </div>

      <form className="mt-6 rounded-xl border border-black/10 p-4 dark:border-white/10" method="get">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Buscar
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Evento o artista..."
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Provincia
            <AutoSubmitSelect name="provincia" defaultValue={provincia} className={inputClass}>
              <option value="">Todas</option>
              {PROVINCIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Localidad / zona
            <AutoSubmitSelect
              name="localidad"
              defaultValue={effectiveLocalidad}
              disabled={localidadOptions.length === 0}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="">{provincia ? "Todas" : "Elegí una provincia primero"}</option>
              {localidadOptions.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Fecha
            <AutoSubmitSelect name="fecha" defaultValue={fecha} className={inputClass}>
              {FECHA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Género
            <AutoSubmitSelect name="genreId" defaultValue={genreId} className={inputClass}>
              <option value="">Todos</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Subgénero
            <AutoSubmitSelect
              name="subgenreId"
              defaultValue={effectiveSubgenreId}
              disabled={!selectedGenre || selectedGenre.subgenres.length === 0}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="">Todos</option>
              {(selectedGenre?.subgenres ?? []).map((subgenre) => (
                <option key={subgenre.id} value={subgenre.id}>
                  {subgenre.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Ordenar por
            <AutoSubmitSelect name="orden" defaultValue={orden} className={inputClass}>
              {ORDEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex h-10 flex-1 items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Buscar
            </button>
            {hasFilters ? (
              <Link
                href="/listings"
                className="flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {listings.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
          {hasFilters
            ? "No hay entradas que coincidan con esos filtros."
            : "Todavía no hay entradas publicadas."}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/listings/${listing.id}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 transition-colors hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
                  {listing.photoStorageKey ? (
                    <Image
                      src={`/api/listings/${listing.id}/photo`}
                      alt={listing.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  {listing.genre ? (
                    <span className="w-fit rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-medium text-brand-muted-foreground">
                      {listing.genre.name}
                      {listing.subgenre ? ` · ${listing.subgenre.name}` : ""}
                    </span>
                  ) : null}
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {listing.title}
                  </p>
                  {listing.artistName ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {listing.artistName}
                    </p>
                  ) : null}
                  <p className="text-sm text-zinc-500">
                    {listing.eventDate ? formatDateTime(listing.eventDate) : "Fecha a confirmar"}
                  </p>
                  {listing.provincia ? (
                    <p className="text-sm text-zinc-500">
                      {listing.localidad ? `${listing.localidad}, ` : ""}
                      {PROVINCIA_LABELS[listing.provincia]}
                    </p>
                  ) : null}
                  <p className="mt-auto pt-2 font-semibold text-zinc-950 dark:text-zinc-50">
                    {formatArsCents(listing.priceArs)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
