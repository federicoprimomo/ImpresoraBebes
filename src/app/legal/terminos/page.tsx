import { SimpleMarkdown } from "@/lib/simple-markdown";
import { getSiteContent } from "@/lib/site-content";

export const metadata = { title: "Términos y condiciones — Escrow.ar" };

export default async function TerminosPage() {
  const body = await getSiteContent("legal.terminos.body");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Términos y condiciones
      </h1>
      <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Borrador de referencia — describe cómo funciona el servicio tal
        como está construido hoy. No reemplaza una revisión por un
        abogado antes de publicarse como términos vinculantes.
      </p>

      <SimpleMarkdown
        text={body}
        className="mt-8 text-sm text-zinc-700 dark:text-zinc-300"
      />
    </main>
  );
}
