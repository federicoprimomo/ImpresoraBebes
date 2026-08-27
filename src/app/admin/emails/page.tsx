import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_LABELS,
  type EmailTemplateKey,
  getEmailTemplate,
} from "@/lib/email";

export const dynamic = "force-dynamic";

const TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATE_DEFAULTS) as EmailTemplateKey[];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

const SAVE_BUTTON =
  "flex h-10 w-fit items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover";

export default async function AdminEmailsPage() {
  await requireAdmin();

  const templates = await Promise.all(
    TEMPLATE_KEYS.map((key) => getEmailTemplate(key)),
  );

  async function saveTemplate(formData: FormData) {
    "use server";
    await requireAdmin();
    const key = String(formData.get("key") ?? "") as EmailTemplateKey;
    if (!TEMPLATE_KEYS.includes(key)) throw new Error("Plantilla inválida.");

    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const enabled = formData.get("enabled") === "on";
    if (!subject || !body) {
      throw new Error("Asunto y cuerpo son obligatorios.");
    }

    await prisma.emailTemplate.upsert({
      where: { key },
      create: { key, subject, body, enabled },
      update: { subject, body, enabled },
    });
    revalidatePath("/admin/emails");
  }

  async function resetTemplate(formData: FormData) {
    "use server";
    await requireAdmin();
    const key = String(formData.get("key") ?? "") as EmailTemplateKey;
    if (!TEMPLATE_KEYS.includes(key)) throw new Error("Plantilla inválida.");
    await prisma.emailTemplate.deleteMany({ where: { key } });
    revalidatePath("/admin/emails");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:underline">
          ← Panel de administración
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Plantillas de email
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Un email por cada evento del flujo de una orden. Usá las variables
        entre llaves dobles (por ejemplo{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          {"{{listingTitle}}"}
        </code>
        ) — se completan solas al enviarse. El cuerpo acepta el mismo formato
        simple que el resto del contenido editable:{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          # Encabezado
        </code>
        , listas con{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          -{" "}
        </code>
        , párrafos separados por una línea en blanco.
      </p>
      <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Sin RESEND_API_KEY configurada no se envía ningún email — ver el
        panel de configuración en{" "}
        <Link href="/admin" className="underline">
          /admin
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {templates.map((template) => {
          const key = template.key as EmailTemplateKey;
          const variables = Array.from(
            new Set([
              ...EMAIL_TEMPLATE_DEFAULTS[key].subject.matchAll(/{{\s*(\w+)\s*}}/g),
              ...EMAIL_TEMPLATE_DEFAULTS[key].body.matchAll(/{{\s*(\w+)\s*}}/g),
            ]).values(),
          ).map((match) => match[1]);

          return (
            <section
              key={key}
              className="rounded-xl border border-black/10 p-5 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {EMAIL_TEMPLATE_LABELS[key]}
                </p>
                <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-400">
                  {key}
                </span>
              </div>
              {variables.length > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Variables: {variables.map((v) => `{{${v}}}`).join(", ")}
                </p>
              ) : null}

              <form action={saveTemplate} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="key" value={key} />
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Asunto
                  </span>
                  <input
                    name="subject"
                    defaultValue={template.subject}
                    className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Cuerpo
                  </span>
                  <textarea
                    name="body"
                    defaultValue={template.body}
                    rows={6}
                    className="rounded-lg border border-black/10 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={template.enabled}
                    className="h-4 w-4 rounded border-black/20 dark:border-white/20"
                  />
                  Activo
                </label>
                <div className="flex gap-3">
                  <button type="submit" className={SAVE_BUTTON}>
                    Guardar
                  </button>
                  <button
                    type="submit"
                    formAction={resetTemplate}
                    className="flex h-10 w-fit items-center justify-center rounded-full border border-black/10 px-5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
                  >
                    Restaurar default
                  </button>
                </div>
              </form>
            </section>
          );
        })}
      </div>
    </main>
  );
}
