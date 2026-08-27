import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setSiteContent, getSiteContentMap } from "@/lib/site-content";

export const dynamic = "force-dynamic";

/**
 * Páginas donde el contenido editado acá se muestra, para saber qué
 * revalidar después de guardar. Como todas ya renderizan dinámico (leen de
 * Prisma en cada request), esto no hace falta para que el dato esté
 * fresco — es solo para que un `router.refresh()` implícito del navegador
 * no tape el cambio recién guardado detrás de una respuesta cacheada.
 */
function revalidatePublicPages() {
  revalidatePath("/");
  revalidatePath("/legal/terminos");
  revalidatePath("/legal/privacidad");
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

function field(
  label: string,
  name: string,
  value: string,
  { multiline = false, rows = 3 }: { multiline?: boolean; rows?: number } = {},
) {
  return (
    <label key={name} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-950 dark:text-zinc-50">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={value}
          rows={rows}
          className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
        />
      ) : (
        <input
          name={name}
          defaultValue={value}
          className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
        />
      )}
    </label>
  );
}

const SAVE_BUTTON =
  "flex h-10 w-fit items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover";

export default async function AdminContentPage() {
  await requireAdmin();

  const [content, faqItems] = await Promise.all([
    getSiteContentMap([
      "hero.eyebrow",
      "hero.title",
      "hero.subtitle",
      "problem.title",
      "problem.body1",
      "problem.body2",
      "cta.title",
      "cta.subtitle",
      "legal.terminos.body",
      "legal.privacidad.body",
    ] as const),
    prisma.faqItem.findMany({ orderBy: { order: "asc" } }),
  ]);

  async function saveHero(formData: FormData) {
    "use server";
    await requireAdmin();
    await setSiteContent("hero.eyebrow", String(formData.get("hero.eyebrow") ?? ""));
    await setSiteContent("hero.title", String(formData.get("hero.title") ?? ""));
    await setSiteContent("hero.subtitle", String(formData.get("hero.subtitle") ?? ""));
    revalidatePublicPages();
  }

  async function saveProblem(formData: FormData) {
    "use server";
    await requireAdmin();
    await setSiteContent("problem.title", String(formData.get("problem.title") ?? ""));
    await setSiteContent("problem.body1", String(formData.get("problem.body1") ?? ""));
    await setSiteContent("problem.body2", String(formData.get("problem.body2") ?? ""));
    revalidatePublicPages();
  }

  async function saveCta(formData: FormData) {
    "use server";
    await requireAdmin();
    await setSiteContent("cta.title", String(formData.get("cta.title") ?? ""));
    await setSiteContent("cta.subtitle", String(formData.get("cta.subtitle") ?? ""));
    revalidatePublicPages();
  }

  async function saveLegal(formData: FormData) {
    "use server";
    await requireAdmin();
    await setSiteContent(
      "legal.terminos.body",
      String(formData.get("legal.terminos.body") ?? ""),
    );
    await setSiteContent(
      "legal.privacidad.body",
      String(formData.get("legal.privacidad.body") ?? ""),
    );
    revalidatePublicPages();
  }

  async function saveFaqItem(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const question = String(formData.get("question") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();
    const order = Number(formData.get("order") ?? 0);
    if (!id || !question || !answer) {
      throw new Error("Pregunta, respuesta y orden son obligatorios.");
    }
    await prisma.faqItem.update({
      where: { id },
      data: { question, answer, order: Number.isFinite(order) ? order : 0 },
    });
    revalidatePath("/admin/content");
    revalidatePublicPages();
  }

  async function deleteFaqItem(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Falta el id.");
    await prisma.faqItem.delete({ where: { id } });
    revalidatePath("/admin/content");
    revalidatePublicPages();
  }

  async function createFaqItem(formData: FormData) {
    "use server";
    await requireAdmin();
    const question = String(formData.get("question") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();
    if (!question || !answer) {
      throw new Error("Completá pregunta y respuesta.");
    }
    const maxOrder = await prisma.faqItem.aggregate({ _max: { order: true } });
    await prisma.faqItem.create({
      data: { question, answer, order: (maxOrder._max.order ?? -1) + 1 },
    });
    revalidatePath("/admin/content");
    revalidatePublicPages();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:underline">
          ← Panel de administración
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Contenido del sitio
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Editá los textos de la landing, las preguntas frecuentes y el cuerpo
        de los legales. Los campos de texto largo aceptan{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          # Encabezado
        </code>{" "}
        y líneas que empiezan con{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          -{" "}
        </code>{" "}
        para listas; párrafos separados por una línea en blanco.
      </p>

      <section className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="font-medium text-zinc-950 dark:text-zinc-50">Portada (hero)</p>
        <form action={saveHero} className="mt-4 flex flex-col gap-4">
          {field("Etiqueta", "hero.eyebrow", content["hero.eyebrow"])}
          {field("Título", "hero.title", content["hero.title"], { multiline: true, rows: 2 })}
          {field("Subtítulo", "hero.subtitle", content["hero.subtitle"], {
            multiline: true,
            rows: 3,
          })}
          <button type="submit" className={SAVE_BUTTON}>
            Guardar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="font-medium text-zinc-950 dark:text-zinc-50">El problema</p>
        <form action={saveProblem} className="mt-4 flex flex-col gap-4">
          {field("Título", "problem.title", content["problem.title"])}
          {field("Párrafo 1", "problem.body1", content["problem.body1"], {
            multiline: true,
            rows: 4,
          })}
          {field("Párrafo 2", "problem.body2", content["problem.body2"], {
            multiline: true,
            rows: 3,
          })}
          <button type="submit" className={SAVE_BUTTON}>
            Guardar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="font-medium text-zinc-950 dark:text-zinc-50">Llamado a la acción final</p>
        <form action={saveCta} className="mt-4 flex flex-col gap-4">
          {field("Título", "cta.title", content["cta.title"])}
          {field("Subtítulo", "cta.subtitle", content["cta.subtitle"], {
            multiline: true,
            rows: 2,
          })}
          <button type="submit" className={SAVE_BUTTON}>
            Guardar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="font-medium text-zinc-950 dark:text-zinc-50">Legales</p>
        <p className="mt-1 text-xs text-zinc-500">
          Esto es el cuerpo completo de cada página legal — seguí usando{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10"># </code> para
          cada sección.
        </p>
        <form action={saveLegal} className="mt-4 flex flex-col gap-4">
          {field(
            "Términos y condiciones",
            "legal.terminos.body",
            content["legal.terminos.body"],
            { multiline: true, rows: 14 },
          )}
          {field("Privacidad", "legal.privacidad.body", content["legal.privacidad.body"], {
            multiline: true,
            rows: 14,
          })}
          <button type="submit" className={SAVE_BUTTON}>
            Guardar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="font-medium text-zinc-950 dark:text-zinc-50">
          Preguntas frecuentes ({faqItems.length})
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {faqItems.map((item) => (
            <form
              key={item.id}
              action={saveFaqItem}
              className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
            >
              <input type="hidden" name="id" value={item.id} />
              <div className="flex items-start gap-3">
                <label className="flex flex-1 flex-col gap-1.5 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Pregunta
                  </span>
                  <input
                    name="question"
                    defaultValue={item.question}
                    className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                  />
                </label>
                <label className="flex w-20 flex-col gap-1.5 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">Orden</span>
                  <input
                    type="number"
                    name="order"
                    defaultValue={item.order}
                    className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-950 dark:text-zinc-50">Respuesta</span>
                <textarea
                  name="answer"
                  defaultValue={item.answer}
                  rows={3}
                  className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                />
              </label>
              <div className="flex gap-3">
                <button type="submit" className={SAVE_BUTTON}>
                  Guardar
                </button>
                <button
                  type="submit"
                  formAction={deleteFaqItem}
                  className="flex h-10 w-fit items-center justify-center rounded-full border border-red-300 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Eliminar
                </button>
              </div>
            </form>
          ))}
        </div>

        <form
          action={createFaqItem}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-black/20 p-4 dark:border-white/20"
        >
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Agregar pregunta
          </p>
          <input
            name="question"
            placeholder="Pregunta"
            required
            className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
          />
          <textarea
            name="answer"
            placeholder="Respuesta"
            required
            rows={3}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
          />
          <button type="submit" className={SAVE_BUTTON}>
            Agregar
          </button>
        </form>
      </section>
    </main>
  );
}
