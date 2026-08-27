import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { parseListingFields } from "@/lib/listing";
import { DELIVERY_PLATFORMS } from "@/lib/argentina";
import { getGenresWithSubgenres } from "@/lib/genres";
import { getFeePercentages, type FeePercentages } from "@/lib/fees";
import { captureError } from "@/lib/monitoring";
import { GenreSubgenreSelect } from "@/components/genre-subgenre-select";
import { ProvinciaLocalidadSelect } from "@/components/provincia-localidad-select";
import { PriceFeeEstimate } from "@/components/price-fee-estimate";

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

  const fields = await parseListingFields(formData);
  const photo = formData.get("photo");

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

        <ProvinciaLocalidadSelect />

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

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">
            Visibilidad
          </legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="visibility" value="public" defaultChecked className="mt-0.5" />
            <span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">Pública</span>
              <span className="block text-xs text-zinc-500">
                Aparece en el buscador de /listings, para cualquiera.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="visibility" value="private" className="mt-0.5" />
            <span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">Privada</span>
              <span className="block text-xs text-zinc-500">
                No se lista en ningún lado — solo entra quien tenga el link
                directo (podés compartirlo después de publicar).
              </span>
            </span>
          </label>
        </fieldset>

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
