import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import { parseListingFields, isEventPast } from "@/lib/listing";
import { toArgentinaDateTimeLocalInput } from "@/lib/format";
import { DELIVERY_PLATFORMS } from "@/lib/argentina";
import { getGenresWithSubgenres } from "@/lib/genres";
import { getFeePercentages, type FeePercentages } from "@/lib/fees";
import { captureError } from "@/lib/monitoring";
import { GenreSubgenreSelect } from "@/components/genre-subgenre-select";
import { ProvinciaLocalidadSelect } from "@/components/provincia-localidad-select";
import { PriceFeeEstimate } from "@/components/price-fee-estimate";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — igual que en /listings/new.
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Igual que en /listings/new: si la config de comisión está mal, no puede
// tirar abajo el form de editar.
function getSafeFeePercentages(): FeePercentages {
  try {
    return getFeePercentages();
  } catch (error) {
    console.error("Config de comisión inválida, usando default 10% vendedor", error);
    captureError(error);
    return { buyerFeePct: 0, sellerFeePct: 0.1 };
  }
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [listing, genres] = await Promise.all([
    prisma.listing.findUnique({ where: { id } }),
    getGenresWithSubgenres(),
  ]);

  if (!listing || listing.sellerId !== session.user.id) {
    notFound();
  }

  // Igual que "Editar" en /listings/mine: solo tiene sentido tocar una
  // publicación mientras sigue activa o pausada — una vendida, reservada
  // (hay una compra en curso) o cancelada no se edita más.
  if (listing.status !== "ACTIVE" && listing.status !== "PAUSED") {
    redirect("/listings/mine");
  }

  async function updateListing(formData: FormData) {
    "use server";

    const editorSession = await auth();
    if (!editorSession?.user) redirect("/login");

    const current = await prisma.listing.findUnique({ where: { id } });
    if (!current || current.sellerId !== editorSession.user.id) {
      throw new Error("Publicación no encontrada.");
    }
    if (current.status !== "ACTIVE" && current.status !== "PAUSED") {
      throw new Error("Esta publicación ya no se puede editar.");
    }

    const fields = await parseListingFields(formData);
    const photo = formData.get("photo");

    let photoStorageKey = current.photoStorageKey;
    let photoContentType = current.photoContentType;
    if (photo instanceof File && photo.size > 0) {
      if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
        throw new Error("La foto tiene que ser PNG, JPG o WEBP.");
      }
      if (photo.size > MAX_PHOTO_SIZE_BYTES) {
        throw new Error("La foto es demasiado grande (máximo 5MB).");
      }
      const buffer = Buffer.from(await photo.arrayBuffer());
      // Igual que en uploadDelivery: se guarda el blob nuevo primero y
      // recién se borra el viejo después de que la fila ya apunta al
      // nuevo — si algo falla en el medio, en el peor caso queda un blob
      // huérfano, nunca una publicación sin foto por un error a mitad de
      // camino.
      photoStorageKey = await saveFile(buffer, photo.type);
      photoContentType = photo.type;
    }

    await prisma.listing.update({
      where: { id },
      data: {
        title: fields.title,
        artistName: fields.artistName,
        description: fields.description,
        eventDate: fields.eventDate,
        priceArs: fields.priceArs,
        platform: fields.platform,
        provincia: fields.provincia,
        localidad: fields.localidad,
        genreId: fields.genreId,
        subgenreId: fields.subgenreId,
        photoStorageKey,
        photoContentType,
        isPublic: fields.isPublic,
      },
    });

    if (photo instanceof File && photo.size > 0 && current.photoStorageKey) {
      await deleteFile(current.photoStorageKey);
    }

    redirect(`/listings/${id}`);
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Editar publicación
      </h1>

      {isEventPast(listing.eventDate) ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          La fecha de este evento ya pasó. Podés corregir los datos, pero
          mientras siga así no va a ser comprable.
        </p>
      ) : null}

      <form action={updateListing} encType="multipart/form-data" className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre del evento
          <input
            name="title"
            required
            defaultValue={listing.title}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Artista / banda (opcional)
          <input
            name="artistName"
            defaultValue={listing.artistName ?? ""}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descripción adicional (opcional)
          <textarea
            name="description"
            rows={3}
            defaultValue={listing.description ?? ""}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <GenreSubgenreSelect
          genres={genres}
          defaultGenreId={listing.genreId ?? ""}
          defaultSubgenreId={listing.subgenreId ?? ""}
        />

        <PriceFeeEstimate
          {...getSafeFeePercentages()}
          defaultValue={(listing.priceArs / 100).toString()}
        />

        <label className="flex flex-col gap-1 text-sm">
          Fecha y hora del evento (opcional)
          <input
            type="datetime-local"
            name="eventDate"
            defaultValue={toArgentinaDateTimeLocalInput(listing.eventDate)}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <ProvinciaLocalidadSelect
          defaultProvincia={listing.provincia ?? ""}
          defaultLocalidad={listing.localidad ?? ""}
        />

        <label className="flex flex-col gap-1 text-sm">
          Plataforma de envío de la entrada (opcional)
          <input
            name="platform"
            list="delivery-platforms"
            defaultValue={listing.platform ?? ""}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
          <datalist id="delivery-platforms">
            {DELIVERY_PLATFORMS.map((platform) => (
              <option key={platform} value={platform} />
            ))}
          </datalist>
        </label>

        {listing.photoStorageKey ? (
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={`/api/listings/${listing.id}/photo`}
                alt={listing.title}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs text-zinc-500">Foto actual</p>
          </div>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          {listing.photoStorageKey ? "Reemplazar foto (opcional)" : "Foto del evento (opcional)"}
          <input
            type="file"
            name="photo"
            accept="image/png,image/jpeg,image/webp"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-muted-foreground dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">
            Visibilidad
          </legend>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked={listing.isPublic}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">Pública</span>
              <span className="block text-xs text-zinc-500">
                Aparece en el buscador de /listings, para cualquiera.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked={!listing.isPublic}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">Privada</span>
              <span className="block text-xs text-zinc-500">
                No se lista en ningún lado — solo entra quien tenga el link
                directo.
              </span>
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
