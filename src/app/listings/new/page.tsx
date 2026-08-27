import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { PROVINCIA_OPTIONS, DELIVERY_PLATFORMS } from "@/lib/argentina";
import { getGenresWithSubgenres } from "@/lib/genres";
import { getFeePercentages, type FeePercentages } from "@/lib/fees";
import { captureError } from "@/lib/monitoring";
import { GenreSubgenreSelect } from "@/components/genre-subgenre-select";
import { PriceFeeEstimate } from "@/components/price-fee-estimate";
import type { Provincia } from "@prisma/client";

// Igual que en la landing (getFeeExample): si la config de comisión está
// mal (env var inválida), que se rompa el cálculo en vivo del form no
// puede tirar abajo la página entera de publicar — degradamos al default.
function getSafeFeePercentages(): FeePercentages {
  try {
    return getFeePercentages();
  } catch (error) {
    console.error("Config de comisión inválida, usando default 10% vendedor", error);
    captureError(error);
    return { buyerFeePct: 0, sellerFeePct: 0.1 };
  }
}

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — de sobra para una foto del evento.
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function createListing(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

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
  const photo = formData.get("photo");

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

  let photoStorageKey: string | null = null;
  let photoContentType: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      throw new Error("La foto tiene que ser PNG, JPG o WEBP.");
    }
    if (photo.size > MAX_PHOTO_SIZE_BYTES) {
      throw new Error("La foto es demasiado grande (máximo 5MB).");
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    photoStorageKey = await saveFile(buffer, photo.type);
    photoContentType = photo.type;
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      artistName: artistName || null,
      description: description || null,
      eventDate: eventDateRaw ? new Date(eventDateRaw) : null,
      priceArs,
      platform: platform || null,
      provincia,
      localidad: localidad || null,
      genreId: validGenreId,
      subgenreId: validSubgenreId,
      photoStorageKey,
      photoContentType,
      // El modelo de datos tiene un campo `quantity`, pero todavía no hay
      // lógica de stock (decremento atómico, disponibilidad parcial, etc.)
      // — se vende de a una entrada por publicación hasta que eso se
      // construya. Ofrecer "cantidad" en el form prometía algo que no se
      // cumplía: la primera venta agotaba la publicación entera sin avisar.
      quantity: 1,
      sellerId: session.user.id,
    },
  });

  redirect(`/listings/${listing.id}`);
}

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [connectedAccount, genres] = await Promise.all([
    prisma.connectedAccount.findUnique({ where: { userId: session.user.id } }),
    getGenresWithSubgenres(),
  ]);

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Publicar una entrada
      </h1>

      {connectedAccount?.status !== "CONNECTED" ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Todavía no conectaste tu cuenta de Mercado Pago. Vas a poder
          publicar, pero necesitás{" "}
          <a href="/account/mercadopago" className="underline">
            conectarla
          </a>{" "}
          antes de que alguien te pueda comprar.
        </p>
      ) : null}

      <form action={createListing} encType="multipart/form-data" className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre del evento
          <input
            name="title"
            required
            placeholder="Ej: Recital de Bandalos Chinos"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Artista / banda (opcional)
          <input
            name="artistName"
            placeholder="Ej: Bandalos Chinos"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descripción adicional (opcional)
          <textarea
            name="description"
            rows={3}
            placeholder="Sector, fila, cualquier detalle que ayude a quien compra"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <GenreSubgenreSelect genres={genres} />

        <label className="flex flex-col gap-1 text-sm">
          Fecha y hora del evento (opcional)
          <input
            type="datetime-local"
            name="eventDate"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Provincia (opcional)
            <select
              name="provincia"
              defaultValue=""
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
            >
              <option value="">Sin especificar</option>
              {PROVINCIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1 text-sm">
            Localidad / zona (opcional)
            <input
              name="localidad"
              placeholder="Ej: Palermo, La Plata..."
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Plataforma de envío de la entrada (opcional)
          <input
            name="platform"
            list="delivery-platforms"
            placeholder="Ej: Ticketek"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
          <datalist id="delivery-platforms">
            {DELIVERY_PLATFORMS.map((platform) => (
              <option key={platform} value={platform} />
            ))}
          </datalist>
        </label>
        <p className="-mt-2 text-xs text-zinc-500">
          Es solo informativo, para que quien compra sepa por dónde va a
          recibirla. La entrega en sí siempre se sube manualmente acá una vez
          que la venta está iniciada.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Foto del evento (opcional)
          <input
            type="file"
            name="photo"
            accept="image/png,image/jpeg,image/webp"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-muted-foreground dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <PriceFeeEstimate {...getSafeFeePercentages()} />

        <p className="text-xs text-zinc-500">
          Por ahora cada publicación es para una sola entrada. Si tenés más
          de una para vender, publicalas por separado.
        </p>

        <button
          type="submit"
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Publicar
        </button>
      </form>
    </main>
  );
}
