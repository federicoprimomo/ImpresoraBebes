import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function createListing(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDateRaw = String(formData.get("eventDate") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "1").trim();

  const priceArs = Math.round(Number(priceRaw.replace(",", ".")) * 100);
  const quantity = Math.max(1, Math.trunc(Number(quantityRaw)) || 1);

  if (!title || !Number.isFinite(priceArs) || priceArs <= 0) {
    throw new Error("Completá al menos el título y un precio válido.");
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description: description || null,
      eventDate: eventDateRaw ? new Date(eventDateRaw) : null,
      priceArs,
      quantity,
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

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId: session.user.id },
  });

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

      <form action={createListing} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            name="title"
            required
            placeholder="Ej: Entrada campo delantero - Recital X"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descripción (opcional)
          <textarea
            name="description"
            rows={3}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fecha del evento (opcional)
          <input
            type="datetime-local"
            name="eventDate"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Precio (ARS)
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="15000"
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Cantidad de entradas
          <input
            type="number"
            name="quantity"
            defaultValue={1}
            min={1}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>

        <button
          type="submit"
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Publicar
        </button>
      </form>
    </main>
  );
}
