import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGenresWithSubgenres } from "@/lib/genres";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

/** Se revalida acá y no en la landing/listings: el género/subgénero solo
 * se muestra en el form de publicar y en el filtro de /listings. */
function revalidateListingPages() {
  revalidatePath("/listings");
  revalidatePath("/listings/new");
  revalidatePath("/admin/categories");
}

const SAVE_BUTTON =
  "flex h-9 w-fit items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover";
const DELETE_BUTTON =
  "flex h-9 w-fit items-center justify-center rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950";
const ADD_BUTTON =
  "flex h-9 w-fit items-center justify-center rounded-full border border-dashed border-black/20 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const genres = await getGenresWithSubgenres();

  async function createGenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Ponele un nombre al género.");
    const maxOrder = await prisma.genre.aggregate({ _max: { order: true } });
    await prisma.genre.create({ data: { name, order: (maxOrder._max.order ?? -1) + 1 } });
    revalidateListingPages();
  }

  async function saveGenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const order = Number(formData.get("order") ?? 0);
    if (!id || !name) throw new Error("Falta el id o el nombre.");
    await prisma.genre.update({
      where: { id },
      data: { name, order: Number.isFinite(order) ? order : 0 },
    });
    revalidateListingPages();
  }

  async function deleteGenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Falta el id.");
    // Las publicaciones que usaban este género (o alguno de sus
    // subgéneros) quedan con genreId/subgenreId en null — no se borran.
    await prisma.genre.delete({ where: { id } });
    revalidateListingPages();
  }

  async function createSubgenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const genreId = String(formData.get("genreId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!genreId || !name) throw new Error("Falta el género o el nombre.");
    const maxOrder = await prisma.subgenre.aggregate({
      where: { genreId },
      _max: { order: true },
    });
    await prisma.subgenre.create({
      data: { genreId, name, order: (maxOrder._max.order ?? -1) + 1 },
    });
    revalidateListingPages();
  }

  async function saveSubgenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const order = Number(formData.get("order") ?? 0);
    if (!id || !name) throw new Error("Falta el id o el nombre.");
    await prisma.subgenre.update({
      where: { id },
      data: { name, order: Number.isFinite(order) ? order : 0 },
    });
    revalidateListingPages();
  }

  async function deleteSubgenre(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Falta el id.");
    await prisma.subgenre.delete({ where: { id } });
    revalidateListingPages();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:underline">
          ← Panel de administración
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Géneros y subgéneros
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Esta lista es la que ve quien publica una entrada (para elegir género
        y subgénero) y la que arma el filtro en /listings. Borrar un género o
        subgénero no borra publicaciones — solo les saca esa etiqueta.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {genres.map((genre) => (
          <section
            key={genre.id}
            className="rounded-xl border border-black/10 p-5 dark:border-white/10"
          >
            <form action={saveGenre} className="flex items-start gap-3">
              <input type="hidden" name="id" value={genre.id} />
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-950 dark:text-zinc-50">Género</span>
                <input
                  name="name"
                  defaultValue={genre.name}
                  className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                />
              </label>
              <label className="flex w-20 flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-950 dark:text-zinc-50">Orden</span>
                <input
                  type="number"
                  name="order"
                  defaultValue={genre.order}
                  className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                />
              </label>
              <div className="mt-6 flex gap-2">
                <button type="submit" className={SAVE_BUTTON}>
                  Guardar
                </button>
                <button type="submit" formAction={deleteGenre} className={DELETE_BUTTON}>
                  Eliminar
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Subgéneros ({genre.subgenres.length})
              </p>
              {genre.subgenres.map((subgenre) => (
                <form key={subgenre.id} action={saveSubgenre} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={subgenre.id} />
                  <input
                    name="name"
                    defaultValue={subgenre.name}
                    className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-transparent"
                  />
                  <input
                    type="number"
                    name="order"
                    defaultValue={subgenre.order}
                    className="w-16 rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-transparent"
                  />
                  <button
                    type="submit"
                    className="flex h-8 items-center justify-center rounded-full bg-brand px-3 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
                  >
                    Guardar
                  </button>
                  <button
                    type="submit"
                    formAction={deleteSubgenre}
                    className="flex h-8 items-center justify-center rounded-full border border-red-300 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Eliminar
                  </button>
                </form>
              ))}

              <form action={createSubgenre} className="mt-2 flex items-center gap-3">
                <input type="hidden" name="genreId" value={genre.id} />
                <input
                  name="name"
                  placeholder="Nuevo subgénero"
                  required
                  className="flex-1 rounded-lg border border-dashed border-black/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
                />
                <button type="submit" className={ADD_BUTTON}>
                  Agregar
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>

      <form
        action={createGenre}
        className="mt-6 flex items-end gap-3 rounded-xl border border-dashed border-black/20 p-5 dark:border-white/20"
      >
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Nuevo género</span>
          <input
            name="name"
            placeholder="Ej: Deportes"
            required
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
          />
        </label>
        <button type="submit" className={SAVE_BUTTON}>
          Agregar género
        </button>
      </form>
    </main>
  );
}
